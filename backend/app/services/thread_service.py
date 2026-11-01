"""
services/thread_service.py — Business logic for Thread operations.

Layer responsibility:
  - Validates inputs, enforces business rules from docs.
  - Calls thread_repository for all DB access.
  - Calls snooze_repository to check/create snooze records.
  - Returns ORM objects (router converts to response schemas).

Business rules (from docs/06_data_model.md and docs/03_feature_specs.md):
  - title max 100 chars; description max 500 chars
  - Archive: sets status='archived', archivedAt=now, clears attention score to 0
  - Restore: sets status='active', clears archivedAt
  - Snooze: creates a SnoozeRecord; attention score returns 0 while snoozed
  - Delete: hard delete (cascade removes captures, commitments, timeline events)
  - last_interaction_at is touched on every capture/commitment write (done in those services)
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
    ThreadStatus,
    TimelineEvent,
    TimelineEventType,
)
from app.repositories.thread_repository import thread_repository
from app.schemas import ThreadCreate, ThreadUpdate


class ThreadService:

    # ── Helpers ───────────────────────────────────────────────────────────────

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
        """Insert a timeline event row (fire-and-forget; never raises)."""
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

    def _is_snoozed(self, db: Session, thread_id: str) -> bool:
        """Return True if there is an active (not expired) snooze on this thread."""
        now = datetime.utcnow()
        record = (
            db.query(SnoozeRecord)
            .filter(
                SnoozeRecord.target_type == SnoozeTargetType.thread,
                SnoozeRecord.target_id == thread_id,
                SnoozeRecord.snooze_until > now,
            )
            .first()
        )
        return record is not None

    def get_timeline(
        self,
        db: Session,
        thread_id: str,
        user_id: str,
        event_type: Optional[TimelineEventType] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[TimelineEvent]:
        # Validate thread existence and ownership
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

    # ── List ──────────────────────────────────────────────────────────────────

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
        """
        Return (threads, total_count) for the given user + filters.
        Default shows active threads sorted by attention score.
        """
        # Default to active if no status filter provided
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

    # ── Get one ───────────────────────────────────────────────────────────────

    def get_thread(self, db: Session, thread_id: str, user_id: str) -> Thread:
        return self._get_or_404(db, thread_id, user_id)

    # ── Create ────────────────────────────────────────────────────────────────

    def create_thread(self, db: Session, data: ThreadCreate, user_id: str) -> Thread:
        """
        Create a new thread.
        Emits a 'thread_created' timeline event after creation.
        """
        thread = Thread(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            is_pinned=data.is_pinned,
            going_cold_threshold_days=data.going_cold_threshold_days,
            status=ThreadStatus.active,
            attention_score=0.0,
            last_interaction_at=datetime.utcnow(),
        )
        thread = thread_repository.create(db, thread)
        self._emit_timeline_event(
            db,
            thread_id=thread.id,
            user_id=user_id,
            event_type=TimelineEventType.thread_created,
            reference_id=thread.id,
            metadata={"title": thread.title},
        )
        return thread

    # ── Update ────────────────────────────────────────────────────────────────

    def update_thread(
        self, db: Session, thread_id: str, data: ThreadUpdate, user_id: str
    ) -> Thread:
        """
        Partial update — only apply fields that are explicitly set in the request.
        Pydantic model_dump(exclude_unset=True) gives us only the provided fields.
        """
        thread = self._get_or_404(db, thread_id, user_id)

        updates = data.model_dump(exclude_unset=True)
        if not updates:
            return thread   # nothing to do

        # Strip whitespace on text fields
        if "title" in updates and updates["title"]:
            updates["title"] = updates["title"].strip()
        if "description" in updates and updates["description"]:
            updates["description"] = updates["description"].strip()

        return thread_repository.update(db, thread, updates)

    # ── Delete ────────────────────────────────────────────────────────────────

    def delete_thread(self, db: Session, thread_id: str, user_id: str) -> None:
        thread = self._get_or_404(db, thread_id, user_id)
        thread_repository.delete(db, thread)

    # ── Archive ───────────────────────────────────────────────────────────────

    def archive_thread(self, db: Session, thread_id: str, user_id: str) -> Thread:
        """
        Archive a thread:
        - status → 'archived'
        - archivedAt → now
        - attentionScore → 0 (archived threads don't surface on Today view)
        """
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

    # ── Restore ───────────────────────────────────────────────────────────────

    def restore_thread(self, db: Session, thread_id: str, user_id: str) -> Thread:
        """
        Restore an archived thread back to active.
        Clears archivedAt and resets last_interaction_at so score recomputes naturally.
        """
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

    # ── Snooze ────────────────────────────────────────────────────────────────

    def snooze_thread(
        self, db: Session, thread_id: str, user_id: str, snooze_until: datetime
    ) -> Thread:
        """
        Snooze a thread until the given datetime.
        While snoozed, attention score is forced to 0 by the Attention Engine.
        Creates a new SnoozeRecord (replaces any existing active snooze).
        """
        thread = self._get_or_404(db, thread_id, user_id)

        # Normalise timezone: convert offset-aware (e.g. UTC ISO-8601 with 'Z') to naive UTC
        if snooze_until.tzinfo is not None:
            snooze_until = snooze_until.astimezone(timezone.utc).replace(tzinfo=None)

        now = datetime.utcnow()
        if snooze_until <= now:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="snooze_until must be a future datetime.",
            )

        # Deactivate any existing active snooze for this thread
        existing = (
            db.query(SnoozeRecord)
            .filter(
                SnoozeRecord.target_type == SnoozeTargetType.thread,
                SnoozeRecord.target_id == thread_id,
                SnoozeRecord.snooze_until > datetime.utcnow(),
            )
            .first()
        )
        if existing:
            db.delete(existing)
            db.commit()

        # Create new snooze record
        snooze = SnoozeRecord(
            id=str(uuid.uuid4()),
            user_id=user_id,
            target_type=SnoozeTargetType.thread,
            target_id=thread_id,
            snooze_until=snooze_until,
        )
        db.add(snooze)

        # Zero out the attention score immediately
        thread.attention_score = 0.0
        thread.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(thread)
        return thread


# ── Module-level singleton ─────────────────────────────────────────────────────
thread_service = ThreadService()
