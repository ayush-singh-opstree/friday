"""
services/thread_service.py — Business logic for Thread operations with Agenda and Initial Contacts.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import (
    SnoozeRecord,
    SnoozeTargetType,
    Thread,
    ThreadPerson,
    ThreadStatus,
    TimelineEvent,
    TimelineEventType,
)
from app.repositories.people_repository import people_repository, thread_person_repository
from app.repositories.thread_repository import thread_repository
from app.schemas import ThreadCreate, ThreadUpdate


class ThreadService:

    def _get_or_404(self, db: Session, thread_id: str, user_id: str) -> Thread:
        thread = thread_repository.get_by_id(db, thread_id, user_id)
        if not thread:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Thread '{thread_id}' not found.",
            )
        return thread

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

    def get_timeline(
        self,
        db: Session,
        thread_id: str,
        user_id: str,
        event_type: Optional[TimelineEventType] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[TimelineEvent]:
        self._get_or_404(db, thread_id, user_id)
        from app.repositories.timeline_repository import timeline_repository
        return timeline_repository.get_by_thread(
            db,
            thread_id=thread_id,
            user_id=user_id,
            event_type=event_type,
            limit=limit,
            offset=offset,
        )

    def list_threads(
        self,
        db: Session,
        user_id: str,
        status: Optional[ThreadStatus] = None,
        is_pinned: Optional[bool] = None,
        sort_by: str = "attention_score",
        sort_dir: str = "desc",
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Thread], int]:
        if status is None:
            status = ThreadStatus.active

        threads = thread_repository.get_all(
            db,
            user_id=user_id,
            status=status,
            is_pinned=is_pinned,
            sort_by=sort_by,
            sort_dir=sort_dir,
            limit=limit,
            offset=offset,
        )
        total = thread_repository.count(db, user_id=user_id, status=status)
        return threads, total

    def get_thread(self, db: Session, thread_id: str, user_id: str) -> Thread:
        return self._get_or_404(db, thread_id, user_id)

    def create_thread(self, db: Session, data: ThreadCreate, user_id: str) -> Thread:
        agenda_val = data.agenda.strip()
        thread = Thread(
            id=str(uuid.uuid4()),
            user_id=user_id,
            agenda=agenda_val,
            description=data.description.strip() if data.description else None,
            is_pinned=data.is_pinned,
            going_cold_threshold_days=data.going_cold_threshold_days,
            status=ThreadStatus.active,
            attention_score=0.0,
            last_interaction_at=datetime.utcnow(),
        )
        thread = thread_repository.create(db, thread)

        # Link any initial people provided during meeting setup
        if data.person_ids:
            for pid in data.person_ids:
                person = people_repository.get_by_id(db, pid, user_id)
                if person and not thread_person_repository.get_link(db, thread.id, pid):
                    thread_person_repository.add_person_to_thread(db, thread.id, pid)

        self._emit_timeline_event(
            db,
            thread_id=thread.id,
            user_id=user_id,
            event_type=TimelineEventType.thread_created,
            reference_id=thread.id,
            metadata={"agenda": thread.agenda},
        )
        return thread

    def update_thread(
        self, db: Session, thread_id: str, data: ThreadUpdate, user_id: str
    ) -> Thread:
        thread = self._get_or_404(db, thread_id, user_id)

        updates = data.model_dump(exclude_unset=True)
        if not updates:
            return thread

        if "agenda" in updates and updates["agenda"]:
            updates["agenda"] = updates["agenda"].strip()
        if "description" in updates and updates["description"]:
            updates["description"] = updates["description"].strip()

        return thread_repository.update(db, thread, updates)

    def delete_thread(self, db: Session, thread_id: str, user_id: str) -> None:
        thread = self._get_or_404(db, thread_id, user_id)
        thread_repository.delete(db, thread)

    def archive_thread(self, db: Session, thread_id: str, user_id: str) -> Thread:
        thread = self._get_or_404(db, thread_id, user_id)
        if thread.status == ThreadStatus.archived:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Thread is already archived.",
            )
        updates = {
            "status": ThreadStatus.archived,
            "archived_at": datetime.utcnow(),
            "attention_score": 0.0,
        }
        return thread_repository.update(db, thread, updates)

    def restore_thread(self, db: Session, thread_id: str, user_id: str) -> Thread:
        thread = self._get_or_404(db, thread_id, user_id)
        if thread.status == ThreadStatus.active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Thread is already active.",
            )
        updates = {
            "status": ThreadStatus.active,
            "archived_at": None,
            "last_interaction_at": datetime.utcnow(),
        }
        return thread_repository.update(db, thread, updates)

    def snooze_thread(
        self, db: Session, thread_id: str, user_id: str, snooze_until: datetime
    ) -> Thread:
        thread = self._get_or_404(db, thread_id, user_id)

        if snooze_until.tzinfo is not None:
            snooze_until = snooze_until.astimezone(timezone.utc).replace(tzinfo=None)

        now = datetime.utcnow()
        if snooze_until <= now:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="snooze_until must be a future datetime.",
            )

        existing = (
            db.query(SnoozeRecord)
            .filter(
                SnoozeRecord.target_type == SnoozeTargetType.thread,
                SnoozeRecord.target_id == thread_id,
                SnoozeRecord.snooze_until > now,
            )
            .first()
        )
        if existing:
            db.delete(existing)
            db.commit()

        snooze = SnoozeRecord(
            id=str(uuid.uuid4()),
            user_id=user_id,
            target_type=SnoozeTargetType.thread,
            target_id=thread_id,
            snooze_until=snooze_until,
        )
        db.add(snooze)

        thread.attention_score = 0.0
        thread.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(thread)
        return thread


thread_service = ThreadService()
