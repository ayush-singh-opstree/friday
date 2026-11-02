"""
repositories/notification_repository.py — Database operations for Notification entities.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models import Notification, NotificationType, User


class NotificationRepository:
    """All DB operations for Notification and user notification preferences."""

    def get_by_id(
        self, db: Session, notification_id: str, user_id: str
    ) -> Optional[Notification]:
        return (
            db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .first()
        )

    def get_all(
        self,
        db: Session,
        user_id: str,
        is_read: Optional[bool] = None,
        type: Optional[NotificationType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Notification]:
        q = db.query(Notification).filter(Notification.user_id == user_id)

        if is_read is not None:
            q = q.filter(Notification.is_read == is_read)
        if type is not None:
            q = q.filter(Notification.type == type)

        return (
            q.order_by(desc(Notification.scheduled_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count(
        self,
        db: Session,
        user_id: str,
        is_read: Optional[bool] = None,
        type: Optional[NotificationType] = None,
    ) -> int:
        q = db.query(func.count(Notification.id)).filter(Notification.user_id == user_id)
        if is_read is not None:
            q = q.filter(Notification.is_read == is_read)
        if type is not None:
            q = q.filter(Notification.type == type)
        return q.scalar() or 0

    def unread_count(self, db: Session, user_id: str) -> int:
        return (
            db.query(func.count(Notification.id))
            .filter(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
            .scalar()
            or 0
        )

    def create(self, db: Session, notification: Notification) -> Notification:
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    def mark_read(
        self, db: Session, notification: Notification
    ) -> Notification:
        notification.is_read = True
        db.commit()
        db.refresh(notification)
        return notification

    def mark_all_read(self, db: Session, user_id: str) -> int:
        updated = (
            db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
            .update({"is_read": True}, synchronize_session=False)
        )
        db.commit()
        return updated

    def delete(self, db: Session, notification: Notification) -> None:
        db.delete(notification)
        db.commit()

    # User Preferences
    def get_user_preferences(self, db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def update_user_preferences(
        self, db: Session, user: User, updates: dict
    ) -> User:
        for field, value in updates.items():
            setattr(user, field, value)
        user.last_active_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user


notification_repository = NotificationRepository()

