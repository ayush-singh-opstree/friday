"""
routers/notifications.py — FastAPI router for Notification endpoints.

Endpoints (per docs/08_system_architecture.md):
  GET    /notifications                 list notifications & unread count
  POST   /notifications                 create manual / trigger notification
  PATCH  /notifications/{id}/read       mark specific notification as read
  POST   /notifications/read-all        mark all notifications as read
  DELETE /notifications/{id}            delete a notification
  GET    /notifications/preferences     get user notification preferences & digest time
  PATCH  /notifications/preferences     update user notification preferences
  POST   /notifications/check-triggers  generate automatic notifications (commitments due, going cold)
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.config import DEMO_USER_ID
from app.db import get_db
from app.models import NotificationType
from app.schemas import (
    NotificationCreate,
    NotificationPreferencesUpdate,
    NotificationResponse,
)
from app.services.notification_service import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


def get_current_user_id() -> str:
    return DEMO_USER_ID


@router.get("", response_model=dict, summary="List notifications")
def list_notifications(
    is_read: Optional[bool] = Query(None, description="Filter by read/unread status"),
    type: Optional[NotificationType] = Query(None, description="Filter by notification type"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    List user notifications.
    Returns:
    - `data`: List of notifications
    - `unread_count`: Total unread notifications (useful for top bell badge)
    - `total`: Total matching query
    """
    notifs, total, unread_count = notification_service.list_notifications(
        db,
        user_id=user_id,
        is_read=is_read,
        type=type,
        limit=limit,
        offset=offset,
    )
    return {
        "data": [NotificationResponse.model_validate(n) for n in notifs],
        "total": total,
        "unread_count": unread_count,
        "limit": limit,
        "offset": offset,
    }


@router.post(
    "",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create notification",
)
def create_notification(
    data: NotificationCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    notif = notification_service.create_notification(db, user_id, data)
    return NotificationResponse.model_validate(notif)


@router.patch("/{notification_id}/read", response_model=NotificationResponse, summary="Mark notification as read")
def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    notif = notification_service.mark_as_read(db, notification_id, user_id)
    return NotificationResponse.model_validate(notif)


@router.post("/read-all", summary="Mark all notifications as read")
def mark_all_as_read(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    count = notification_service.mark_all_as_read(db, user_id)
    return {"status": "ok", "marked_read_count": count}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete notification")
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    notification_service.delete_notification(db, notification_id, user_id)
    return None


@router.get("/preferences", response_model=dict, summary="Get notification preferences")
def get_preferences(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Retrieve user preferences:
    - daily_digest, commitment_due, going_cold, pre_meeting_brief, reengagement_digest
    - digest_time, digest_enabled, email_digest_enabled
    """
    return notification_service.get_preferences(db, user_id)


@router.patch("/preferences", response_model=dict, summary="Update notification preferences")
def update_preferences(
    data: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Update independent notification toggles and digest schedule.
    """
    return notification_service.update_preferences(db, user_id, data)


@router.post("/check-triggers", summary="Evaluate & generate active notifications")
def check_triggers(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Evaluate background alert triggers:
    - Commitments due within 24h
    - Threads crossing going-cold threshold
    Generates new in-app notification records.
    """
    new_notifs = notification_service.generate_system_notifications(db, user_id)
    return {
        "status": "ok",
        "generated_count": len(new_notifs),
        "notifications": [NotificationResponse.model_validate(n) for n in new_notifs],
    }

