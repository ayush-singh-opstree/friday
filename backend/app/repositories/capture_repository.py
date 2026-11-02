"""
repositories/capture_repository.py — Database operations for SubThread / Capture entities.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models import CaptureStatus, SubThread, SubThreadType


class CaptureRepository:

    def get_by_id(self, db: Session, capture_id: str, user_id: str) -> Optional[SubThread]:
        return (
            db.query(SubThread)
            .filter(SubThread.id == capture_id, SubThread.user_id == user_id)
            .first()
        )

    def get_all(
        self,
        db: Session,
        user_id: str,
        thread_id: Optional[str] = None,
        club_id: Optional[str] = None,
        status: Optional[CaptureStatus] = None,
        type: Optional[SubThreadType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[SubThread]:
        q = db.query(SubThread).filter(SubThread.user_id == user_id)

        if thread_id is not None:
            q = q.filter(SubThread.thread_id == thread_id)
        if club_id is not None:
            q = q.filter(SubThread.club_id == club_id)
        if status is not None:
            q = q.filter(SubThread.status == status)
        if type is not None:
            q = q.filter(SubThread.type == type)

        return (
            q.order_by(desc(SubThread.captured_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count(
        self,
        db: Session,
        user_id: str,
        thread_id: Optional[str] = None,
        club_id: Optional[str] = None,
        status: Optional[CaptureStatus] = None,
        type: Optional[SubThreadType] = None,
    ) -> int:
        q = db.query(func.count(SubThread.id)).filter(SubThread.user_id == user_id)
        if thread_id is not None:
            q = q.filter(SubThread.thread_id == thread_id)
        if club_id is not None:
            q = q.filter(SubThread.club_id == club_id)
        if status is not None:
            q = q.filter(SubThread.status == status)
        if type is not None:
            q = q.filter(SubThread.type == type)
        return q.scalar() or 0

    def create(self, db: Session, capture: SubThread) -> SubThread:
        db.add(capture)
        db.commit()
        db.refresh(capture)
        return capture

    def update(self, db: Session, capture: SubThread, updates: dict) -> SubThread:
        for field, value in updates.items():
            setattr(capture, field, value)
        capture.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(capture)
        return capture

    def delete(self, db: Session, capture: SubThread) -> None:
        db.delete(capture)
        db.commit()


capture_repository = CaptureRepository()
subthread_repository = capture_repository
