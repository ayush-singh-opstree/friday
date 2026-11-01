"""
repositories/timeline_repository.py — Database operations for TimelineEvent entities.

Layer responsibility:
  - Raw query and insert operations for the TimelineEvent model.
  - Returns chronological events for a thread timeline.
"""
from typing import Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models import TimelineEvent, TimelineEventType


class TimelineRepository:
    """All DB operations for the TimelineEvent model."""

    def get_by_thread(
        self,
        db: Session,
        thread_id: str,
        user_id: str,
        event_type: Optional[TimelineEventType] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[TimelineEvent]:
        q = (
            db.query(TimelineEvent)
            .filter(
                TimelineEvent.thread_id == thread_id,
                TimelineEvent.user_id == user_id,
            )
        )
        if event_type is not None:
            q = q.filter(TimelineEvent.type == event_type)

        return (
            q.order_by(desc(TimelineEvent.occurred_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

    def create(self, db: Session, event: TimelineEvent) -> TimelineEvent:
        db.add(event)
        db.commit()
        db.refresh(event)
        return event


timeline_repository = TimelineRepository()

