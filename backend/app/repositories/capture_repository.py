"""
repositories/capture_repository.py — Database operations for Capture entities.

Layer responsibility:
  - Raw CRUD queries for Capture model.
  - Queries filtered by user_id and optional thread_id, status, type, etc.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models import Capture, CaptureStatus, CaptureType


class CaptureRepository:
    """All DB operations for the Capture model."""

    def get_by_id(self, db: Session, capture_id: str, user_id: str) -> Optional[Capture]:
        return (
            db.query(Capture)
            .filter(Capture.id == capture_id, Capture.user_id == user_id)
            .first()
        )

    def get_all(
        self,
        db: Session,
        user_id: str,
        thread_id: Optional[str] = None,
        status: Optional[CaptureStatus] = None,
        type: Optional[CaptureType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Capture]:
        q = db.query(Capture).filter(Capture.user_id == user_id)

        if thread_id is not None:
            q = q.filter(Capture.thread_id == thread_id)
        if status is not None:
            q = q.filter(Capture.status == status)
        if type is not None:
            q = q.filter(Capture.type == type)

        return (
            q.order_by(desc(Capture.captured_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count(
        self,
        db: Session,
        user_id: str,
        thread_id: Optional[str] = None,
        status: Optional[CaptureStatus] = None,
        type: Optional[CaptureType] = None,
    ) -> int:
        q = db.query(func.count(Capture.id)).filter(Capture.user_id == user_id)
        if thread_id is not None:
            q = q.filter(Capture.thread_id == thread_id)
        if status is not None:
            q = q.filter(Capture.status == status)
        if type is not None:
            q = q.filter(Capture.type == type)
        return q.scalar() or 0

    def create(self, db: Session, capture: Capture) -> Capture:
        db.add(capture)
        db.commit()
        db.refresh(capture)
        return capture

    def update(self, db: Session, capture: Capture, updates: dict) -> Capture:
        for field, value in updates.items():
            setattr(capture, field, value)
        capture.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(capture)
        return capture

    def delete(self, db: Session, capture: Capture) -> None:
        db.delete(capture)
        db.commit()


capture_repository = CaptureRepository()

