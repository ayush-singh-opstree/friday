"""
repositories/thread_repository.py — Raw database operations for Thread entities.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import asc, desc, func
from sqlalchemy.orm import Session

from app.models import Thread, ThreadStatus


class ThreadRepository:

    def get_by_id(self, db: Session, thread_id: str, user_id: str) -> Optional[Thread]:
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
        sort_by: str = "attention_score",
        sort_dir: str = "desc",
        limit: int = 50,
        offset: int = 0,
    ) -> list[Thread]:
        q = db.query(Thread).filter(Thread.user_id == user_id)

        if status is not None:
            q = q.filter(Thread.status == status)

        if is_pinned is not None:
            q = q.filter(Thread.is_pinned == is_pinned)

        sort_column_map = {
            "attention_score": Thread.attention_score,
            "last_interaction_at": Thread.last_interaction_at,
            "created_at": Thread.created_at,
            "agenda": Thread.agenda,
            "title": Thread.agenda,
        }
        col = sort_column_map.get(sort_by, Thread.attention_score)
        order = desc(col) if sort_dir == "desc" else asc(col)

        return q.order_by(order).offset(offset).limit(limit).all()

    def get_active_for_attention(self, db: Session, user_id: str) -> list[Thread]:
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

    def create(self, db: Session, thread: Thread) -> Thread:
        db.add(thread)
        db.commit()
        db.refresh(thread)
        return thread

    def update(self, db: Session, thread: Thread, updates: dict) -> Thread:
        for field, value in updates.items():
            setattr(thread, field, value)
        thread.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(thread)
        return thread

    def update_attention_score(self, db: Session, thread: Thread, score: float) -> Thread:
        thread.attention_score = score
        db.commit()
        db.refresh(thread)
        return thread

    def touch_last_interaction(self, db: Session, thread: Thread) -> Thread:
        thread.last_interaction_at = datetime.utcnow()
        thread.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(thread)
        return thread

    def delete(self, db: Session, thread: Thread) -> None:
        db.delete(thread)
        db.commit()


thread_repository = ThreadRepository()
