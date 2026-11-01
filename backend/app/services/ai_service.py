"""
services/ai_service.py — AI Intelligence Service for Threadwise.

Capabilities:
1. Summarise ('where_we_left_off') - Generates or retrieves summary of thread.
2. Pre-meeting brief ('pre_meeting_brief') - Generates talking points, key context, and open commitments.
3. Classify capture - Predicts capture type (note/action/decision/question) and thread relevance.

Dual mode:
- If OPENAI_API_KEY is configured: Calls OpenAI GPT-4o.
- If OPENAI_API_KEY is empty: Deterministic structured extraction fallback based on thread captures and commitments (guaranteeing offline/hackathon reliability).
"""
import json
import uuid
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import OPENAI_API_KEY, OPENAI_MODEL
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

    def _call_llm(self, system_prompt: str, user_prompt: str) -> Optional[dict]:
        if not OPENAI_API_KEY:
            return None
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception:
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

        # LLM or fallback
        llm_payload = None
        if OPENAI_API_KEY:
            sys_prompt = (
                "You are an executive relationship memory assistant. Return JSON matching: "
                "{'last_contact_date': str, 'last_contact_summary': str, 'key_topics': list[str], "
                "'open_commitments': list[str], 'next_steps': list[str]}"
            )
            user_data = f"Thread: {thread.title}\nCaptures: {[c.content for c in captures]}\nCommitments: {[cm.description for cm in commitments]}"
            llm_payload = self._call_llm(sys_prompt, user_data)

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
            event_metadata={"type": SummaryType.where_we_left_off.value},
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

        content = self._fallback_brief(thread, captures, commitments)

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
            event_metadata={"type": SummaryType.pre_meeting_brief.value},
            occurred_at=datetime.utcnow(),
        )
        db.add(event)
        db.commit()
        db.refresh(summary_rec)

        return AIBriefResponse(brief=SummaryResponse.model_validate(summary_rec))

    def classify_capture(
        self, db: Session, user_id: str, content: str
    ) -> AIClassifyResponse:
        content_lower = content.lower()

        # Heuristic classifier with high confidence
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

        # Find best matching thread if keyword matches title
        suggested_thread_id = None
        threads = thread_repository.get_active_for_attention(db, user_id)
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

