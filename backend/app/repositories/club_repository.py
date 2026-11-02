"""
repositories/club_repository.py — Database operations for Club / meeting sessions.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models import Club, SubThread


class ClubRepository:

    def get_by_id(self, db: Session, club_id: str, user_id: str) -> Optional[Club]:
        return (
            db.query(Club)
            .filter(Club.id == club_id, Club.user_id == user_id)
            .first()
        )

    def get_by_thread(
        self, db: Session, thread_id: str, user_id: str, limit: int = 50, offset: int = 0
    ) -> list[Club]:
        return (
            db.query(Club)
            .filter(Club.thread_id == thread_id, Club.user_id == user_id)
            .order_by(desc(Club.started_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

    def get_active_club_for_thread(
        self, db: Session, thread_id: str, user_id: str
    ) -> Optional[Club]:
        """Return currently open/in-progress club session for this thread."""
        return (
            db.query(Club)
            .filter(
                Club.thread_id == thread_id,
                Club.user_id == user_id,
                Club.ended_at.is_(None),
            )
            .order_by(desc(Club.started_at))
            .first()
        )

    def create(self, db: Session, club: Club) -> Club:
        db.add(club)
        db.commit()
        db.refresh(club)
        return club

    def update(self, db: Session, club: Club, updates: dict) -> Club:
        for field, value in updates.items():
            setattr(club, field, value)
        club.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(club)
        return club

    def delete(self, db: Session, club: Club) -> None:
        db.delete(club)
        db.commit()


club_repository = ClubRepository()

