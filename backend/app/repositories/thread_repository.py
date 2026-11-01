"""
repositories/thread_repository.py — Raw database operations for Thread entities.

Layer responsibility:
  - Only this layer touches the DB session directly.
  - No business logic here — just CRUD + queries.
  - All methods receive an explicit `db: Session` parameter.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import asc, desc, func
from sqlalchemy.orm import Session

from app.models import Thread, ThreadStatus


class ThreadRepository:
    """All DB operations for the Thread model."""

    # ── Read ──────────────────────────────────────────────────────────────────

    def get_by_id(self, db: Session, thread_id: str, user_id: str) -> Optional[Thread]:
        """Fetch a single thread by ID, scoped to the given user."""
        return (
            db.query(Thread)
            .filter(Thread.id == thread_id, Thread.user_id == user_id)
            .first()
        )

    def get_all(
        self,
        db: Session,
        user_id: str,
        status: Optional[ThreadStatus] = None,
        is_pinned: Optional[bool] = None,
        sort_by: str = "attention_score",   # "attention_score" | "last_interaction_at" | "created_at"
        sort_dir: str = "desc",             # "asc" | "desc"
        limit: int = 50,
        offset: int = 0,
    ) -> list[Thread]:
        """
        Return threads for a user with optional filters and sorting.
        Default: all active threads sorted by attention score descending.
        """
        q = db.query(Thread).filter(Thread.user_id == user_id)

        if status is not None:
            q = q.filter(Thread.status == status)

        if is_pinned is not None:
            q = q.filter(Thread.is_pinned == is_pinned)

        # Sorting
        sort_column_map = {
            "attention_score": Thread.attention_score,
            "last_interaction_at": Thread.last_interaction_at,
            "created_at": Thread.created_at,
            "title": Thread.title,
        }
        col = sort_column_map.get(sort_by, Thread.attention_score)
        order = desc(col) if sort_dir == "desc" else asc(col)

        return q.order_by(order).offset(offset).limit(limit).all()

    def get_active_for_attention(self, db: Session, user_id: str) -> list[Thread]:
        """
        Return all active (non-archived) threads for attention score recomputation.
        Ordered by attention score descending.
        """
        return (
            db.query(Thread)
            .filter(Thread.user_id == user_id, Thread.status == ThreadStatus.active)
            .order_by(desc(Thread.attention_score))
            .all()
        )

    def count(self, db: Session, user_id: str, status: Optional[ThreadStatus] = None) -> int:
        q = db.query(func.count(Thread.id)).filter(Thread.user_id == user_id)
        if status is not None:
            q = q.filter(Thread.status == status)
        return q.scalar() or 0

    # ── Create ────────────────────────────────────────────────────────────────

    def create(self, db: Session, thread: Thread) -> Thread:
        """Persist a new Thread ORM object and return it with DB-assigned defaults."""
        db.add(thread)
        db.commit()
        db.refresh(thread)
        return thread

    # ── Update ────────────────────────────────────────────────────────────────

    def update(self, db: Session, thread: Thread, updates: dict) -> Thread:
        """
        Apply a dictionary of field → value updates to the thread and commit.
        Always touches `updated_at` to reflect the change.
        """
        for field, value in updates.items():
            setattr(thread, field, value)
        thread.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(thread)
        return thread

    def update_attention_score(self, db: Session, thread: Thread, score: float) -> Thread:
        """Lightweight helper to persist only the attention_score field."""
        thread.attention_score = score
        db.commit()
        db.refresh(thread)
        return thread

    def touch_last_interaction(self, db: Session, thread: Thread) -> Thread:
        """Set last_interaction_at to now — called whenever activity occurs on thread."""
        thread.last_interaction_at = datetime.utcnow()
        thread.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(thread)
        return thread

    # ── Delete ────────────────────────────────────────────────────────────────

    def delete(self, db: Session, thread: Thread) -> None:
        """Hard-delete a thread and all its cascade children."""
        db.delete(thread)
        db.commit()


# ── Module-level singleton ─────────────────────────────────────────────────────
# Services import this instance — no need to instantiate per-request.
thread_repository = ThreadRepository()

