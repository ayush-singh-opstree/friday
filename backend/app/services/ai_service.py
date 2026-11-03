"""
services/ai_service.py — AI Intelligence Service for Threadwise with Gemini API.
"""
import json
import uuid
from datetime import datetime
from typing import Any, Optional

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import GEMINI_API_KEY, GEMINI_MODEL
from app.models import (
    Commitment,
    CommitmentStatus,
    SubThread,
    SubThreadType,
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

    def _call_gemini(self, system_instruction: str, user_prompt: str) -> Optional[Any]:
        if not GEMINI_API_KEY:
            return None

        models_to_try = [GEMINI_MODEL]
        for fallback_m in ["gemini-flash-lite-latest", "gemini-3.5-flash-lite"]:
            if fallback_m not in models_to_try:
                models_to_try.append(fallback_m)

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

        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
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
                    elif response.status_code in (404, 429, 503):
                        print(f"[Gemini API] model {model} returned {response.status_code}, trying next fallback model...")
                        continue
                    else:
                        print(f"[Gemini API] error {response.status_code}: {response.text}")
            except Exception as exc:
                print(f"[Gemini API] request to {model} failed: {exc}")

        return None

    def _fallback_summary(
        self, thread: Thread, captures: list[SubThread], commitments: list[Commitment]
    ) -> dict:
        last_contact = captures[0].captured_at if captures else thread.last_interaction_at
        last_summary = (
            captures[0].content[:150]
            if captures
            else f"Recent interaction regarding {thread.agenda}."
        )

        topics = [c.content[:40] for c in captures[:3]] or [thread.agenda]
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
        self, thread: Thread, captures: list[SubThread], commitments: list[Commitment]
    ) -> dict:
        summary_content = self._fallback_summary(thread, captures, commitments)
        summary_content["talking_points"] = [
            f"Status check on: {c.description}" for c in commitments if c.status == CommitmentStatus.open
        ] or [f"Catch up on {thread.agenda}", "Confirm mutual next steps"]
        return summary_content

    def summarise_thread(
        self, db: Session, thread_id: str, user_id: str, force_refresh: bool = False
    ) -> AISummariseResponse:
        thread = self._get_thread_or_404(db, thread_id, user_id)

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
            db.query(SubThread)
            .filter(SubThread.thread_id == thread_id, SubThread.user_id == user_id)
            .order_by(SubThread.captured_at.desc())
            .limit(10)
            .all()
        )
        commitments = commitment_repository.get_open_for_thread(db, thread_id)

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
                f"Thread Agenda: {thread.agenda}\n"
                f"Thread Description: {thread.description or ''}\n"
                f"Recent SubThreads/Captures:\n" + "\n".join([f"- [{c.type.value}] {c.content}" for c in captures]) + "\n"
                f"Open Commitments:\n" + "\n".join([f"- {cm.description} (Deadline: {cm.deadline or 'None'})" for cm in commitments])
            )
            llm_payload = self._call_gemini(sys_prompt, user_data)

        content = llm_payload or self._fallback_summary(thread, captures, commitments)

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
            db.query(SubThread)
            .filter(SubThread.thread_id == thread_id, SubThread.user_id == user_id)
            .order_by(SubThread.captured_at.desc())
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
                f"Thread Agenda: {thread.agenda}\n"
                f"Thread Description: {thread.description or ''}\n"
                f"Recent SubThreads/Captures:\n" + "\n".join([f"- [{c.type.value}] {c.content}" for c in captures]) + "\n"
                f"Open Commitments:\n" + "\n".join([f"- {cm.description} (Deadline: {cm.deadline or 'None'})" for cm in commitments])
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

    def _fallback_classify_line(
        self, content: str, threads: list
    ) -> AIClassifyResponse:
        content_lower = content.lower()
        if any(w in content_lower for w in ["promised", "will deliver", "committed", "commit to", "by next week", "deadline", "i will", "we will"]):
            suggested_type = SubThreadType.commitment
            confidence = 0.90
            reasoning = "Contains commitment or delivery promise."
        elif any(w in content_lower for w in ["follow up", "check back", "ping", "reach out", "send to", "todo"]):
            suggested_type = SubThreadType.follow_up
            confidence = 0.88
            reasoning = "Contains follow-up action."
        elif any(w in content_lower for w in ["decided", "agreed that", "decision", "selected", "chose", "approved"]):
            suggested_type = SubThreadType.decision
            confidence = 0.88
            reasoning = "Contains decision terms."
        elif content.strip().endswith("?") or any(w in content_lower for w in ["wonder if", "ask whether", "check if", "why", "how"]):
            suggested_type = SubThreadType.question
            confidence = 0.85
            reasoning = "Question or clarification format."
        else:
            suggested_type = SubThreadType.note
            confidence = 0.75
            reasoning = "General observation or meeting context."

        suggested_thread_id = None
        for t in threads:
            agenda = getattr(t, "agenda", None)
            if agenda and agenda.lower() in content_lower:
                suggested_thread_id = t.id
                break

        return AIClassifyResponse(
            line=content,
            suggested_type=suggested_type,
            suggested_thread_id=suggested_thread_id,
            confidence=confidence,
            reasoning=reasoning,
            source="fallback",
        )

    def classify_batch(
        self, db: Session, user_id: str, lines: list[str]
    ) -> list[AIClassifyResponse]:
        if not lines:
            return []

        threads = thread_repository.get_active_for_attention(db, user_id)
        threads_summary = [
            {"id": t.id, "title": t.agenda, "description": t.description or ""}
            for t in threads
        ]
        valid_thread_ids = {t.id for t in threads}
        valid_types = {t.value: t for t in SubThreadType}

        if GEMINI_API_KEY:
            sys_prompt = (
                "You are an intelligent classification agent for meeting captures and notes.\n"
                "You will receive an array of input lines to classify independently and match to the user's available threads.\n"
                "Allowed types: 'note', 'follow_up', 'question', 'commitment', 'decision'.\n"
                "For 'suggested_thread_id': match the input line against the 'Available User Threads' list. If the line clearly pertains to one of the user's threads, return that exact thread 'id'. If the line does not clearly belong to any existing thread, return null (it will default to Inbox).\n"
                "Return a strict JSON array where each element corresponds to one input line in the exact same order.\n"
                "CRITICAL: You MUST return an entry for EVERY input line. The output array MUST have the exact same length as the input lines array.\n"
                "[\n"
                "  {\n"
                '    "index": 0,\n'
                '    "suggested_type": "commitment",\n'
                '    "suggested_thread_id": "thread-id-from-list" or null,\n'
                '    "confidence": 0.95,\n'
                '    "reasoning": "brief explanation"\n'
                "  }\n"
                "]"
            )
            indexed_lines = [{"index": idx, "content": line} for idx, line in enumerate(lines)]
            user_prompt = (
                f"Input lines to classify (total {len(lines)} lines):\n{json.dumps(indexed_lines, indent=2)}\n\n"
                f"Available User Threads:\n{json.dumps(threads_summary, indent=2)}"
            )

            llm_res = self._call_gemini(sys_prompt, user_prompt)
            items_list = None
            if isinstance(llm_res, list):
                items_list = llm_res
            elif isinstance(llm_res, dict):
                for k in ["results", "items", "classifications", "data", "lines"]:
                    if isinstance(llm_res.get(k), list):
                        items_list = llm_res[k]
                        break
                if items_list is None and any(str(i) in llm_res for i in range(len(lines))):
                    items_list = [llm_res.get(str(i)) or llm_res.get(i) for i in range(len(lines))]
                elif items_list is None and "suggested_type" in llm_res:
                    items_list = [llm_res]

            if items_list and len(items_list) > 0:
                llm_by_idx = {}
                for idx, item in enumerate(items_list):
                    if isinstance(item, dict):
                        item_idx = item.get("index", idx)
                        llm_by_idx[item_idx] = item

                results = []
                for idx, line in enumerate(lines):
                    item = llm_by_idx.get(idx) or (items_list[idx] if idx < len(items_list) else None)
                    if item and "suggested_type" in item:
                        raw_type = str(item.get("suggested_type", "note")).lower()
                        final_type = valid_types.get(raw_type, SubThreadType.note)
                        raw_thread = item.get("suggested_thread_id")
                        final_thread_id = (
                            str(raw_thread)
                            if raw_thread and str(raw_thread) in valid_thread_ids
                            else None
                        )
                        results.append(
                            AIClassifyResponse(
                                line=line,
                                suggested_type=final_type,
                                suggested_thread_id=final_thread_id,
                                confidence=float(item.get("confidence", 0.85)),
                                reasoning=str(item.get("reasoning", "Classified by Gemini")),
                                source="ai",
                            )
                        )
                    else:
                        results.append(self._fallback_classify_line(line, threads))

                return results

        # Fallback heuristic classifier for all lines
        return [self._fallback_classify_line(line, threads) for line in lines]

    def classify_capture(
        self, db: Session, user_id: str, content: str
    ) -> AIClassifyResponse:
        results = self.classify_batch(db, user_id, [content])
        return results[0] if results else self._fallback_classify_line(content, [])


ai_service = AIService()
