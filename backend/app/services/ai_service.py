"""
services/ai_service.py — AI Intelligence Service for Threadwise using Google Gemini API.

Capabilities:
1. Summarise ('where_we_left_off') - Generates or retrieves summary of thread.
2. Pre-meeting brief ('pre_meeting_brief') - Generates talking points, key context, and open commitments.
3. Classify capture - Predicts capture type (note/action/decision/question) and thread relevance.

Dual mode:
- If GEMINI_API_KEY is configured: Calls Google Gemini API (gemini-2.5-flash via REST/httpx).
- If GEMINI_API_KEY is empty or call fails: Deterministic structured extraction fallback based on thread captures and commitments (guaranteeing offline/hackathon reliability).
"""
import json
import uuid
from datetime import datetime
from typing import Optional

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.models import (
    Capture,
    CaptureStatus,
    CaptureType,
    Commitment,
    CommitmentStatus,
    Summary,
    SummaryType,
    Thread,
    TimelineEvent,
    TimelineEventType,
)
from app.repositories.capture_repository import capture_repository
from app.repositories.commitment_repository import commitment_repository
from app.repositories.thread_repository import thread_repository
from app.schemas import (
    AIBriefResponse,
    AIClassifyResponse,
    AISummariseResponse,
    SummaryResponse,
)


class AIService:

    def _get_thread_or_404(self, db: Session, thread_id: str, user_id: str) -> Thread:
        thread = thread_repository.get_by_id(db, thread_id, user_id)
        if not thread:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Thread '{thread_id}' not found.",
            )
        return thread

    def _call_gemini(self, system_instruction: str, user_prompt: str) -> Optional[dict]:
        """
        Call Gemini generateContent endpoint with JSON response mode.
        """
        if not GEMINI_API_KEY:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"SYSTEM INSTRUCTION: {system_instruction}\n\nUSER REQUEST: {user_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2,
            },
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw_text = parts[0].get("text", "{}")
                            return json.loads(raw_text)
                else:
                    print(f"⚠️ Gemini API error {response.status_code}: {response.text}")
        except Exception as exc:
            print(f"⚠️ Gemini API request failed: {exc}")

        return None

    def _fallback_summary(
        self, thread: Thread, captures: list[Capture], commitments: list[Commitment]
    ) -> dict:
        last_contact = captures[0].captured_at if captures else thread.last_interaction_at
        last_summary = (
            captures[0].content[:150]
            if captures
            else f"Recent interaction regarding {thread.title}."
        )

        topics = [c.content[:40] for c in captures[:3]] or [thread.title]
        open_c = [c.description for c in commitments if c.status == CommitmentStatus.open][:5]
        next_steps = open_c[:2] if open_c else ["Review upcoming deliverables"]

        return {
            "last_contact_date": last_contact.isoformat() if last_contact else None,
            "last_contact_summary": last_summary,
            "key_topics": topics,
            "open_commitments": open_c,
            "next_steps": next_steps,
        }

    def _fallback_brief(
        self, thread: Thread, captures: list[Capture], commitments: list[Commitment]
    ) -> dict:
        summary_content = self._fallback_summary(thread, captures, commitments)
        summary_content["talking_points"] = [
            f"Status check on: {c.description}" for c in commitments if c.status == CommitmentStatus.open
        ] or [f"Catch up on {thread.title}", "Confirm mutual next steps"]
        return summary_content

    def summarise_thread(
        self, db: Session, thread_id: str, user_id: str, force_refresh: bool = False
    ) -> AISummariseResponse:
        thread = self._get_thread_or_404(db, thread_id, user_id)

        # Check existing cached summary
        if not force_refresh:
            cached = (
                db.query(Summary)
                .filter(
                    Summary.thread_id == thread_id,
                    Summary.user_id == user_id,
                    Summary.type == SummaryType.where_we_left_off,
                    Summary.is_stale.is_(False),
                )
                .order_by(Summary.generated_at.desc())
                .first()
            )
            if cached:
                return AISummariseResponse(
                    summary=SummaryResponse.model_validate(cached),
                    was_cached=True,
                )

        captures = (
            db.query(Capture)
            .filter(Capture.thread_id == thread_id, Capture.user_id == user_id)
            .order_by(Capture.captured_at.desc())
            .limit(10)
            .all()
        )
        commitments = commitment_repository.get_open_for_thread(db, thread_id)

        # Call Gemini or fallback
        llm_payload = None
        if GEMINI_API_KEY:
            sys_prompt = (
                "You are an executive relationship memory assistant. Return strict JSON matching: "
                "{\n"
                '  "last_contact_date": "YYYY-MM-DD" or null,\n'
                '  "last_contact_summary": "concise 1-2 sentence summary of latest interaction",\n'
                '  "key_topics": ["topic 1", "topic 2", "topic 3"],\n'
                '  "open_commitments": ["commitment 1", "commitment 2"],\n'
                '  "next_steps": ["step 1", "step 2"]\n'
                "}"
            )
            user_data = (
                f"Thread Title: {thread.title}\n"
                f"Thread Description: {thread.description or ''}\n"
                f"Recent Captures:\n" + "\n".join([f"- [{c.type.value}] {c.content}" for c in captures]) + "\n"
                f"Open Commitments:\n" + "\n".join([f"- {cm.description} (Due: {cm.due_date or 'None'})" for cm in commitments])
            )
            llm_payload = self._call_gemini(sys_prompt, user_data)

        content = llm_payload or self._fallback_summary(thread, captures, commitments)

        # Invalidate old summaries
        db.query(Summary).filter(
            Summary.thread_id == thread_id,
            Summary.type == SummaryType.where_we_left_off,
        ).update({"is_stale": True})

        summary_rec = Summary(
            id=str(uuid.uuid4()),
            thread_id=thread_id,
            user_id=user_id,
            type=SummaryType.where_we_left_off,
            content=content,
            source_captures=[c.id for c in captures],
            generated_at=datetime.utcnow(),
            is_stale=False,
        )
        db.add(summary_rec)

        # Emit timeline event
        event = TimelineEvent(
            id=str(uuid.uuid4()),
            thread_id=thread_id,
            user_id=user_id,
            type=TimelineEventType.summary_generated,
            reference_id=summary_rec.id,
            event_metadata={"type": SummaryType.where_we_left_off.value, "model": GEMINI_MODEL},
            occurred_at=datetime.utcnow(),
        )
        db.add(event)
        db.commit()
        db.refresh(summary_rec)

        return AISummariseResponse(
            summary=SummaryResponse.model_validate(summary_rec),
            was_cached=False,
        )

    def generate_brief(
        self, db: Session, thread_id: str, user_id: str
    ) -> AIBriefResponse:
        thread = self._get_thread_or_404(db, thread_id, user_id)

        captures = (
            db.query(Capture)
            .filter(Capture.thread_id == thread_id, Capture.user_id == user_id)
            .order_by(Capture.captured_at.desc())
            .limit(10)
            .all()
        )
        commitments = commitment_repository.get_open_for_thread(db, thread_id)

        llm_payload = None
        if GEMINI_API_KEY:
            sys_prompt = (
                "You are an executive assistant preparing a 30-second pre-meeting brief. Return strict JSON: "
                "{\n"
                '  "last_contact_date": "YYYY-MM-DD" or null,\n'
                '  "last_contact_summary": "concise recap",\n'
                '  "key_topics": ["topic 1", "topic 2"],\n'
                '  "open_commitments": ["commitment 1", "commitment 2"],\n'
                '  "next_steps": ["step 1"],\n'
                '  "talking_points": ["talking point 1", "talking point 2", "talking point 3"]\n'
                "}"
            )
            user_data = (
                f"Thread Title: {thread.title}\n"
                f"Thread Description: {thread.description or ''}\n"
                f"Recent Captures:\n" + "\n".join([f"- [{c.type.value}] {c.content}" for c in captures]) + "\n"
                f"Open Commitments:\n" + "\n".join([f"- {cm.description} (Due: {cm.due_date or 'None'})" for cm in commitments])
            )
            llm_payload = self._call_gemini(sys_prompt, user_data)

        content = llm_payload or self._fallback_brief(thread, captures, commitments)

        summary_rec = Summary(
            id=str(uuid.uuid4()),
            thread_id=thread_id,
            user_id=user_id,
            type=SummaryType.pre_meeting_brief,
            content=content,
            source_captures=[c.id for c in captures],
            generated_at=datetime.utcnow(),
            is_stale=False,
        )
        db.add(summary_rec)

        event = TimelineEvent(
            id=str(uuid.uuid4()),
            thread_id=thread_id,
            user_id=user_id,
            type=TimelineEventType.brief_opened,
            reference_id=summary_rec.id,
            event_metadata={"type": SummaryType.pre_meeting_brief.value, "model": GEMINI_MODEL},
            occurred_at=datetime.utcnow(),
        )
        db.add(event)
        db.commit()
        db.refresh(summary_rec)

        return AIBriefResponse(brief=SummaryResponse.model_validate(summary_rec))

    def classify_capture(
        self, db: Session, user_id: str, content: str
    ) -> AIClassifyResponse:
        threads = thread_repository.get_active_for_attention(db, user_id)
        threads_summary = [{"id": t.id, "title": t.title} for t in threads]

        if GEMINI_API_KEY:
            sys_prompt = (
                "You are an intelligent classification agent for quick captures. "
                "Allowed types: 'note', 'action', 'decision', 'question'.\n"
                "Return strict JSON matching:\n"
                "{\n"
                '  "suggested_type": "note" | "action" | "decision" | "question",\n'
                '  "suggested_thread_id": string or null,\n'
                '  "confidence": float between 0.0 and 1.0,\n'
                '  "reasoning": "brief explanation"\n'
                "}"
            )
            user_prompt = (
                f"Capture Content: {content}\n\n"
                f"Available User Threads:\n{json.dumps(threads_summary, indent=2)}"
            )
            llm_res = self._call_gemini(sys_prompt, user_prompt)
            if llm_res and "suggested_type" in llm_res:
                raw_type = str(llm_res.get("suggested_type", "note")).lower()
                valid_types = {t.value: t for t in CaptureType}
                final_type = valid_types.get(raw_type, CaptureType.note)

                return AIClassifyResponse(
                    suggested_type=final_type,
                    suggested_thread_id=llm_res.get("suggested_thread_id"),
                    confidence=float(llm_res.get("confidence", 0.85)),
                    reasoning=str(llm_res.get("reasoning", "Classified by Gemini")),
                )

        # Fallback heuristic classifier
        content_lower = content.lower()
        if any(w in content_lower for w in ["will do", "promised to", "follow up", "send over", "by tomorrow", "deadline"]):
            suggested_type = CaptureType.action
            confidence = 0.90
            reasoning = "Contains action/promise keywords."
        elif any(w in content_lower for w in ["decided", "agreed that", "decision", "selected"]):
            suggested_type = CaptureType.decision
            confidence = 0.88
            reasoning = "Contains decision terms."
        elif content.strip().endswith("?") or any(w in content_lower for w in ["wonder if", "ask whether", "check if"]):
            suggested_type = CaptureType.question
            confidence = 0.85
            reasoning = "Question or clarification format."
        else:
            suggested_type = CaptureType.note
            confidence = 0.75
            reasoning = "General observation or meeting context."

        suggested_thread_id = None
        for t in threads:
            if t.title.lower() in content_lower:
                suggested_thread_id = t.id
                break

        return AIClassifyResponse(
            suggested_type=suggested_type,
            suggested_thread_id=suggested_thread_id,
            confidence=confidence,
            reasoning=reasoning,
        )


ai_service = AIService()
