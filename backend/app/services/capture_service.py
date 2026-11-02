"""
services/capture_service.py — Business logic for SubThreads / Captures inside Clubs and Threads.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import (
    CaptureSource,
    CaptureStatus,
    Commitment,
    CommitmentStatus,
    SubThread,
    SubThreadType,
    TimelineEvent,
    TimelineEventType,
)
from app.repositories.capture_repository import capture_repository
from app.repositories.club_repository import club_repository
from app.repositories.people_repository import people_repository
from app.repositories.thread_repository import thread_repository
from app.schemas import SubThreadCreate, SubThreadUpdate


class CaptureService:

    def _get_or_404(self, db: Session, capture_id: str, user_id: str) -> SubThread:
        capture = capture_repository.get_by_id(db, capture_id, user_id)
        if not capture:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subthread '{capture_id}' not found.",
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
        club_id: Optional[str] = None,
        status: Optional[CaptureStatus] = None,
        type: Optional[SubThreadType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[SubThread], int]:
        captures = capture_repository.get_all(
            db,
            user_id=user_id,
            thread_id=thread_id,
            club_id=club_id,
            status=status,
            type=type,
            limit=limit,
            offset=offset,
        )
        total = capture_repository.count(
            db,
            user_id=user_id,
            thread_id=thread_id,
            club_id=club_id,
            status=status,
            type=type,
        )
        return captures, total

    def get_capture(self, db: Session, capture_id: str, user_id: str) -> SubThread:
        return self._get_or_404(db, capture_id, user_id)

    def create_capture(
        self, db: Session, data: SubThreadCreate, user_id: str
    ) -> SubThread:
        # If club_id is provided, resolve thread_id from club if not given
        target_thread_id = data.thread_id
        if data.club_id:
            club = club_repository.get_by_id(db, data.club_id, user_id)
            if not club:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Club '{data.club_id}' not found.",
                )
            if not target_thread_id:
                target_thread_id = club.thread_id

        thread = None
        if target_thread_id:
            thread = thread_repository.get_by_id(db, target_thread_id, user_id)
            if not thread:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Thread '{target_thread_id}' not found.",
                )

        if data.person_id:
            person = people_repository.get_by_id(db, data.person_id, user_id)
            if not person:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Person '{data.person_id}' not found.",
                )

        capture_status = CaptureStatus.filed if target_thread_id else CaptureStatus.inbox
        captured_at = data.captured_at or datetime.utcnow()
        if captured_at.tzinfo is not None:
            captured_at = captured_at.astimezone(timezone.utc).replace(tzinfo=None)

        deadline = data.deadline
        if deadline and deadline.tzinfo is not None:
            deadline = deadline.astimezone(timezone.utc).replace(tzinfo=None)

        subthread = SubThread(
            id=str(uuid.uuid4()),
            user_id=user_id,
            thread_id=target_thread_id,
            club_id=data.club_id,
            person_id=data.person_id,
            type=data.type,
            content=data.content.strip(),
            source=data.source,
            status=capture_status,
            captured_at=captured_at,
            deadline=deadline,
            is_edited=False,
            edited_at=None,
        )
        subthread = capture_repository.create(db, subthread)

        # If this subthread item is a commitment and linked to a person and thread, automatically create tracked Commitment
        if data.type == SubThreadType.commitment and target_thread_id and data.person_id:
            commitment = Commitment(
                id=str(uuid.uuid4()),
                user_id=user_id,
                thread_id=target_thread_id,
                person_id=data.person_id,
                club_id=data.club_id,
                subthread_id=subthread.id,
                description=subthread.content,
                status=CommitmentStatus.open,
                deadline=deadline,
            )
            db.add(commitment)
            db.commit()

        if thread:
            thread_repository.touch_last_interaction(db, thread)
            self._emit_timeline_event(
                db,
                thread_id=thread.id,
                user_id=user_id,
                event_type=TimelineEventType.subthread_added,
                reference_id=subthread.id,
                metadata={
                    "type": subthread.type.value,
                    "content_snippet": subthread.content[:100],
                    "club_id": data.club_id,
                },
            )

        return subthread

    def update_capture(
        self, db: Session, capture_id: str, data: SubThreadUpdate, user_id: str
    ) -> SubThread:
        capture = self._get_or_404(db, capture_id, user_id)
        updates = data.model_dump(exclude_unset=True)
        if not updates:
            return capture

        if "club_id" in updates and updates["club_id"]:
            club = club_repository.get_by_id(db, updates["club_id"], user_id)
            if not club:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Club '{updates['club_id']}' not found.",
                )

        if "person_id" in updates and updates["person_id"]:
            person = people_repository.get_by_id(db, updates["person_id"], user_id)
            if not person:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Person '{updates['person_id']}' not found.",
                )

        if "deadline" in updates and updates["deadline"]:
            dl = updates["deadline"]
            if dl.tzinfo is not None:
                updates["deadline"] = dl.astimezone(timezone.utc).replace(tzinfo=None)

        if "content" in updates:
            new_content = updates["content"].strip()
            if new_content != capture.content:
                updates["content"] = new_content
                updates["is_edited"] = True
                updates["edited_at"] = datetime.utcnow()

        return capture_repository.update(db, capture, updates)

    def assign_to_thread(
        self, db: Session, capture_id: str, thread_id: str, user_id: str, club_id: Optional[str] = None
    ) -> SubThread:
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
        if club_id:
            updates["club_id"] = club_id

        capture = capture_repository.update(db, capture, updates)
        thread_repository.touch_last_interaction(db, thread)

        return capture

    def delete_capture(self, db: Session, capture_id: str, user_id: str) -> None:
        capture = self._get_or_404(db, capture_id, user_id)
        capture_repository.delete(db, capture)


capture_service = CaptureService()
subthread_service = capture_service
