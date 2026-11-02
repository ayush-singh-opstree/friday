"""
repositories/commitment_repository.py — Database operations for Commitment entities.
"""
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models import Commitment, CommitmentStatus


class CommitmentRepository:

    def get_by_id(
        self, db: Session, commitment_id: str, user_id: str
    ) -> Optional[Commitment]:
        return (
            db.query(Commitment)
            .filter(Commitment.id == commitment_id, Commitment.user_id == user_id)
            .first()
        )

    def get_all(
        self,
        db: Session,
        user_id: str,
        thread_id: Optional[str] = None,
        person_id: Optional[str] = None,
        club_id: Optional[str] = None,
        status: Optional[CommitmentStatus] = None,
        overdue_only: bool = False,
        due_today_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Commitment]:
        q = db.query(Commitment).filter(Commitment.user_id == user_id)

        if thread_id is not None:
            q = q.filter(Commitment.thread_id == thread_id)
        if person_id is not None:
            q = q.filter(Commitment.person_id == person_id)
        if club_id is not None:
            q = q.filter(Commitment.club_id == club_id)
        if status is not None:
            q = q.filter(Commitment.status == status)

        now = datetime.utcnow()
        if overdue_only:
            q = q.filter(
                Commitment.status == CommitmentStatus.open,
                Commitment.deadline.isnot(None),
                Commitment.deadline < now,
            )
        elif due_today_only:
            start_of_day = datetime(now.year, now.month, now.day, 0, 0, 0)
            end_of_day = start_of_day + timedelta(days=1)
            q = q.filter(
                Commitment.status == CommitmentStatus.open,
                Commitment.deadline >= start_of_day,
                Commitment.deadline < end_of_day,
            )

        return (
            q.order_by(
                Commitment.deadline.asc().nullslast(),
                desc(Commitment.created_at),
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count(
        self,
        db: Session,
        user_id: str,
        thread_id: Optional[str] = None,
        person_id: Optional[str] = None,
        club_id: Optional[str] = None,
        status: Optional[CommitmentStatus] = None,
        overdue_only: bool = False,
        due_today_only: bool = False,
    ) -> int:
        q = db.query(func.count(Commitment.id)).filter(Commitment.user_id == user_id)
        if thread_id is not None:
            q = q.filter(Commitment.thread_id == thread_id)
        if person_id is not None:
            q = q.filter(Commitment.person_id == person_id)
        if club_id is not None:
            q = q.filter(Commitment.club_id == club_id)
        if status is not None:
            q = q.filter(Commitment.status == status)

        now = datetime.utcnow()
        if overdue_only:
            q = q.filter(
                Commitment.status == CommitmentStatus.open,
                Commitment.deadline.isnot(None),
                Commitment.deadline < now,
            )
        elif due_today_only:
            start_of_day = datetime(now.year, now.month, now.day, 0, 0, 0)
            end_of_day = start_of_day + timedelta(days=1)
            q = q.filter(
                Commitment.status == CommitmentStatus.open,
                Commitment.deadline >= start_of_day,
                Commitment.deadline < end_of_day,
            )
        return q.scalar() or 0

    def get_open_for_thread(
        self, db: Session, thread_id: str
    ) -> list[Commitment]:
        return (
            db.query(Commitment)
            .filter(
                Commitment.thread_id == thread_id,
                Commitment.status == CommitmentStatus.open,
            )
            .order_by(Commitment.deadline.asc().nullslast())
            .all()
        )

    def create(self, db: Session, commitment: Commitment) -> Commitment:
        db.add(commitment)
        db.commit()
        db.refresh(commitment)
        return commitment

    def update(self, db: Session, commitment: Commitment, updates: dict) -> Commitment:
        for field, value in updates.items():
            setattr(commitment, field, value)
        commitment.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(commitment)
        return commitment

    def delete(self, db: Session, commitment: Commitment) -> None:
        db.delete(commitment)
        db.commit()


commitment_repository = CommitmentRepository()
