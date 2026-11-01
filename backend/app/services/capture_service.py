"""
services/capture_service.py — Business logic for Capture operations.

Layer responsibility:
  - Validates inputs (thread exists, person exists if assigned).
  - Handles Inbox logic (thread_id=None -> status='inbox', else status='filed').
  - Emits timeline event when capture is added to or assigned to a thread.
  - Touches thread.last_interaction_at when capture added or assigned.
  - Sets is_edited=True and edited_at=now on content edits.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import (
    Capture,
    CaptureStatus,
    CaptureType,
    TimelineEvent,
    TimelineEventType,
)
from app.repositories.capture_repository import capture_repository
from app.repositories.people_repository import people_repository
from app.repositories.thread_repository import thread_repository
from app.schemas import CaptureCreate, CaptureUpdate


class CaptureService:

    def _get_or_404(self, db: Session, capture_id: str, user_id: str) -> Capture:
        capture = capture_repository.get_by_id(db, capture_id, user_id)
        if not capture:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Capture '{capture_id}' not found.",
            )
        return capture

    def _emit_timeline_event(
        self,
        db: Session,
        thread_id: str,
        user_id: str,
        event_type: TimelineEventType,
        reference_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> None:
        try:
            event = TimelineEvent(
                id=str(uuid.uuid4()),
                thread_id=thread_id,
                user_id=user_id,
                type=event_type,
                reference_id=reference_id,
                event_metadata=metadata or {},
                occurred_at=datetime.utcnow(),
            )
            db.add(event)
            db.commit()
        except Exception:
            db.rollback()

    def list_captures(
        self,
        db: Session,
        user_id: str,
        thread_id: Optional[str] = None,
        status: Optional[CaptureStatus] = None,
        type: Optional[CaptureType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Capture], int]:
        captures = capture_repository.get_all(
            db,
            user_id=user_id,
            thread_id=thread_id,
            status=status,
            type=type,
            limit=limit,
            offset=offset,
        )
        total = capture_repository.count(
            db,
            user_id=user_id,
            thread_id=thread_id,
            status=status,
            type=type,
        )
        return captures, total

    def get_capture(self, db: Session, capture_id: str, user_id: str) -> Capture:
        return self._get_or_404(db, capture_id, user_id)

    def create_capture(
        self, db: Session, data: CaptureCreate, user_id: str
    ) -> Capture:
        # Validate thread if provided
        thread = None
        if data.thread_id:
            thread = thread_repository.get_by_id(db, data.thread_id, user_id)
            if not thread:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Thread '{data.thread_id}' not found.",
                )

        # Validate person if provided
        if data.person_id:
            person = people_repository.get_by_id(db, data.person_id, user_id)
            if not person:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Person '{data.person_id}' not found.",
                )

        # threadId null means Inbox, else filed
        capture_status = CaptureStatus.filed if data.thread_id else CaptureStatus.inbox
        captured_at = data.captured_at or datetime.utcnow()
        if captured_at.tzinfo is not None:
            captured_at = captured_at.astimezone(timezone.utc).replace(tzinfo=None)

        capture = Capture(
            id=str(uuid.uuid4()),
            user_id=user_id,
            thread_id=data.thread_id,
            person_id=data.person_id,
            type=data.type,
            content=data.content.strip(),
            source=data.source,
            status=capture_status,
            captured_at=captured_at,
            is_edited=False,
            edited_at=None,
        )
        capture = capture_repository.create(db, capture)

        # If filed immediately to a thread: touch last_interaction and emit timeline event
        if thread:
            thread_repository.touch_last_interaction(db, thread)
            self._emit_timeline_event(
                db,
                thread_id=thread.id,
                user_id=user_id,
                event_type=TimelineEventType.capture_added,
                reference_id=capture.id,
                metadata={"capture_type": capture.type.value, "content_snippet": capture.content[:100]},
            )

        return capture

    def update_capture(
        self, db: Session, capture_id: str, data: CaptureUpdate, user_id: str
    ) -> Capture:
        capture = self._get_or_404(db, capture_id, user_id)
        updates = data.model_dump(exclude_unset=True)
        if not updates:
            return capture

        if "thread_id" in updates and updates["thread_id"]:
            thread = thread_repository.get_by_id(db, updates["thread_id"], user_id)
            if not thread:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Thread '{updates['thread_id']}' not found.",
                )
            updates["status"] = CaptureStatus.filed

        if "person_id" in updates and updates["person_id"]:
            person = people_repository.get_by_id(db, updates["person_id"], user_id)
            if not person:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Person '{updates['person_id']}' not found.",
                )

        if "content" in updates:
            new_content = updates["content"].strip()
            if new_content != capture.content:
                updates["content"] = new_content
                updates["is_edited"] = True
                updates["edited_at"] = datetime.utcnow()

        return capture_repository.update(db, capture, updates)

    def assign_to_thread(
        self, db: Session, capture_id: str, thread_id: str, user_id: str
    ) -> Capture:
        capture = self._get_or_404(db, capture_id, user_id)
        thread = thread_repository.get_by_id(db, thread_id, user_id)
        if not thread:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Thread '{thread_id}' not found.",
            )

        updates = {
            "thread_id": thread.id,
            "status": CaptureStatus.filed,
        }
        capture = capture_repository.update(db, capture, updates)

        thread_repository.touch_last_interaction(db, thread)
        self._emit_timeline_event(
            db,
            thread_id=thread.id,
            user_id=user_id,
            event_type=TimelineEventType.capture_added,
            reference_id=capture.id,
            metadata={"assigned_from_inbox": True, "capture_type": capture.type.value},
        )
        return capture

    def delete_capture(self, db: Session, capture_id: str, user_id: str) -> None:
        capture = self._get_or_404(db, capture_id, user_id)
        capture_repository.delete(db, capture)


capture_service = CaptureService()

