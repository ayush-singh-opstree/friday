"""
services/club_service.py — Business logic for Club / meeting capture sessions.

Flow:
1. User starts meeting / capture session for a thread (agenda) -> creates Club (timer starts, started_at=now).
2. All notes, follow_ups, questions, commitments created during meeting are linked with club_id.
3. User ends capture -> sets ended_at=now, updates thread.last_interaction_at, logs timeline event.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import (
    CaptureSource,
    Club,
    TimelineEvent,
    TimelineEventType,
)
from app.repositories.club_repository import club_repository
from app.repositories.thread_repository import thread_repository
from app.schemas import ClubStartRequest


class ClubService:

    def _get_or_404(self, db: Session, club_id: str, user_id: str) -> Club:
        club = club_repository.get_by_id(db, club_id, user_id)
        if not club:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Club '{club_id}' not found.",
            )
        return club

    def start_club(
        self, db: Session, user_id: str, data: ClubStartRequest
    ) -> Club:
        thread = thread_repository.get_by_id(db, data.thread_id, user_id)
        if not thread:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Thread '{data.thread_id}' not found.",
            )

        now = datetime.utcnow()
        club_count = len(club_repository.get_by_thread(db, data.thread_id, user_id))
        default_name = data.name or f"Meeting Session #{club_count + 1}"

        club = Club(
            id=str(uuid.uuid4()),
            user_id=user_id,
            thread_id=data.thread_id,
            name=default_name,
            started_at=now,
            ended_at=None,
            source=data.source or CaptureSource.extension,
        )
        club = club_repository.create(db, club)

        thread_repository.touch_last_interaction(db, thread)

        # Emit timeline event
        event = TimelineEvent(
            id=str(uuid.uuid4()),
            thread_id=thread.id,
            user_id=user_id,
            type=TimelineEventType.club_started,
            reference_id=club.id,
            event_metadata={"club_name": club.name, "started_at": now.isoformat()},
            occurred_at=now,
        )
        db.add(event)
        db.commit()

        return club

    def end_club(
        self, db: Session, club_id: str, user_id: str, ended_at: Optional[datetime] = None
    ) -> Club:
        club = self._get_or_404(db, club_id, user_id)
        if club.ended_at is not None:
            return club  # already ended

        end_time = ended_at or datetime.utcnow()
        if end_time.tzinfo is not None:
            end_time = end_time.astimezone(timezone.utc).replace(tzinfo=None)

        club = club_repository.update(db, club, {"ended_at": end_time})

        thread = thread_repository.get_by_id(db, club.thread_id, user_id)
        if thread:
            thread_repository.touch_last_interaction(db, thread)

            event = TimelineEvent(
                id=str(uuid.uuid4()),
                thread_id=thread.id,
                user_id=user_id,
                type=TimelineEventType.club_ended,
                reference_id=club.id,
                event_metadata={
                    "club_name": club.name,
                    "started_at": club.started_at.isoformat(),
                    "ended_at": end_time.isoformat(),
                },
                occurred_at=end_time,
            )
            db.add(event)
            db.commit()

        return club

    def get_club(self, db: Session, club_id: str, user_id: str) -> Club:
        return self._get_or_404(db, club_id, user_id)

    def list_clubs_by_thread(
        self, db: Session, thread_id: str, user_id: str, limit: int = 50, offset: int = 0
    ) -> list[Club]:
        return club_repository.get_by_thread(db, thread_id, user_id, limit=limit, offset=offset)

    def get_active_club(
        self, db: Session, thread_id: str, user_id: str
    ) -> Optional[Club]:
        return club_repository.get_active_club_for_thread(db, thread_id, user_id)


club_service = ClubService()

