"""
services/notification_service.py — Business logic for Notifications.

Implements Feature 14: Digest and Notifications (docs/03_feature_specs.md & docs/02_prd.md):
- In-App notification list and unread badge count
- Mark notification read (individual or all)
- Manage user notification preferences (daily_digest, commitment_due, going_cold, pre_meeting_brief, reengagement_digest)
- Dispatch/Generate automated notifications based on commitments due, cold threads, and daily digest
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import (
    Commitment,
    CommitmentStatus,
    Notification,
    NotificationType,
    Thread,
    ThreadStatus,
    User,
)
from app.repositories.notification_repository import notification_repository
from app.repositories.thread_repository import thread_repository
from app.schemas import (
    NotificationCreate,
    NotificationPreferencesSchema,
    NotificationPreferencesUpdate,
)


class NotificationService:

    def _get_or_404(
        self, db: Session, notification_id: str, user_id: str
    ) -> Notification:
        notif = notification_repository.get_by_id(db, notification_id, user_id)
        if not notif:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notification '{notification_id}' not found.",
            )
        return notif

    def list_notifications(
        self,
        db: Session,
        user_id: str,
        is_read: Optional[bool] = None,
        type: Optional[NotificationType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Notification], int, int]:
        """
        Returns (notifications, total_count, unread_count)
        """
        notifications = notification_repository.get_all(
            db,
            user_id=user_id,
            is_read=is_read,
            type=type,
            limit=limit,
            offset=offset,
        )
        total = notification_repository.count(db, user_id=user_id, is_read=is_read, type=type)
        unread = notification_repository.unread_count(db, user_id=user_id)
        return notifications, total, unread

    def mark_as_read(
        self, db: Session, notification_id: str, user_id: str
    ) -> Notification:
        notif = self._get_or_404(db, notification_id, user_id)
        return notification_repository.mark_read(db, notif)

    def mark_all_as_read(self, db: Session, user_id: str) -> int:
        return notification_repository.mark_all_read(db, user_id)

    def delete_notification(
        self, db: Session, notification_id: str, user_id: str
    ) -> None:
        notif = self._get_or_404(db, notification_id, user_id)
        notification_repository.delete(db, notif)

    def get_preferences(self, db: Session, user_id: str) -> dict:
        user = notification_repository.get_user_preferences(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )
        prefs = user.notification_preferences or {}
        return {
            "daily_digest": prefs.get("dailyDigest", True),
            "commitment_due": prefs.get("commitmentDue", True),
            "going_cold": prefs.get("goingCold", True),
            "pre_meeting_brief": prefs.get("preMeetingBrief", True),
            "reengagement_digest": prefs.get("reengagementDigest", True),
            "digest_time": user.digest_time,
            "digest_enabled": user.digest_enabled,
            "email_digest_enabled": user.email_digest_enabled,
        }

    def update_preferences(
        self, db: Session, user_id: str, data: NotificationPreferencesUpdate
    ) -> dict:
        user = notification_repository.get_user_preferences(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        updates = {}
        if data.digest_time is not None:
            updates["digest_time"] = data.digest_time
        if data.digest_enabled is not None:
            updates["digest_enabled"] = data.digest_enabled
        if data.email_digest_enabled is not None:
            updates["email_digest_enabled"] = data.email_digest_enabled

        current_prefs = dict(user.notification_preferences or {})
        pref_mapping = {
            "daily_digest": "dailyDigest",
            "commitment_due": "commitmentDue",
            "going_cold": "goingCold",
            "pre_meeting_brief": "preMeetingBrief",
            "reengagement_digest": "reengagementDigest",
        }
        for attr, key in pref_mapping.items():
            val = getattr(data, attr)
            if val is not None:
                current_prefs[key] = val

        updates["notification_preferences"] = current_prefs
        user = notification_repository.update_user_preferences(db, user, updates)

        return self.get_preferences(db, user_id)

    def create_notification(
        self, db: Session, user_id: str, data: NotificationCreate
    ) -> Notification:
        sched = data.scheduled_at or datetime.utcnow()
        if sched.tzinfo is not None:
            sched = sched.astimezone(timezone.utc).replace(tzinfo=None)

        notif = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            type=data.type,
            reference_type=data.reference_type,
            reference_id=data.reference_id,
            title=data.title,
            body=data.body,
            deep_link_url=data.deep_link_url,
            scheduled_at=sched,
            sent_at=datetime.utcnow(),
            is_read=False,
        )
        return notification_repository.create(db, notif)

    def generate_system_notifications(self, db: Session, user_id: str) -> list[Notification]:
        """
        Check state of commitments and threads and generate notifications if not already generated.
        1. Commitment due within 24 hours
        2. Going cold alerts (past threshold)
        """
        prefs = self.get_preferences(db, user_id)
        generated = []
        now = datetime.utcnow()

        # 1. Commitment Due Reminders
        if prefs.get("commitment_due", True):
            in_24h = now + timedelta(hours=24)
            due_soon = (
                db.query(Commitment, Thread.title)
                .join(Thread, Commitment.thread_id == Thread.id)
                .filter(
                    Commitment.user_id == user_id,
                    Commitment.status == CommitmentStatus.open,
                    Commitment.due_date.isnot(None),
                    Commitment.due_date > now,
                    Commitment.due_date <= in_24h,
                )
                .all()
            )
            for c, thread_title in due_soon:
                # Check if notification already exists for this commitment
                exists = (
                    db.query(Notification)
                    .filter(
                        Notification.user_id == user_id,
                        Notification.type == NotificationType.commitment_due,
                        Notification.reference_id == c.id,
                    )
                    .first()
                )
                if not exists:
                    hours_left = max(1, int((c.due_date - now).total_seconds() // 3600))
                    notif = Notification(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        type=NotificationType.commitment_due,
                        reference_type="commitment",
                        reference_id=c.id,
                        title=f"Commitment Due in ~{hours_left}h: {c.description[:40]}",
                        body=f"From thread '{thread_title}'. Due: {c.due_date.strftime('%b %d, %H:%M')}",
                        deep_link_url=f"/threads/{c.thread_id}?tab=commitments",
                        scheduled_at=now,
                        sent_at=now,
                        is_read=False,
                    )
                    db.add(notif)
                    generated.append(notif)

        # 2. Going Cold Alerts
        if prefs.get("going_cold", True):
            active_threads = thread_repository.get_active_for_attention(db, user_id)
            for t in active_threads:
                interaction = t.last_interaction_at or t.created_at
                days_since = int((now - interaction).total_seconds() // 86400)
                if days_since >= t.going_cold_threshold_days:
                    # Check if cold notification sent recently (within last 3 days)
                    recent_cold_notif = (
                        db.query(Notification)
                        .filter(
                            Notification.user_id == user_id,
                            Notification.type == NotificationType.going_cold,
                            Notification.reference_id == t.id,
                            Notification.scheduled_at >= now - timedelta(days=3),
                        )
                        .first()
                    )
                    if not recent_cold_notif:
                        notif = Notification(
                            id=str(uuid.uuid4()),
                            user_id=user_id,
                            type=NotificationType.going_cold,
                            reference_type="thread",
                            reference_id=t.id,
                            title=f"Going Cold: {t.title}",
                            body=f"No interaction for {days_since} days (threshold: {t.going_cold_threshold_days} days).",
                            deep_link_url=f"/threads/{t.id}",
                            scheduled_at=now,
                            sent_at=now,
                            is_read=False,
                        )
                        db.add(notif)
                        generated.append(notif)

        if generated:
            db.commit()

        return generated


notification_service = NotificationService()

