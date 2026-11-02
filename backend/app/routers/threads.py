"""
routers/threads.py — FastAPI router for Thread (Agenda) endpoints.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.config import DEMO_USER_ID
from app.db import get_db
from app.models import ThreadStatus, TimelineEventType
from app.schemas import (
    ThreadCreate,
    ThreadResponse,
    ThreadSnoozeRequest,
    ThreadUpdate,
    TimelineEventResponse,
)
from app.services.thread_service import thread_service

router = APIRouter(prefix="/threads", tags=["threads"])


def get_current_user_id() -> str:
    return DEMO_USER_ID


@router.get("", response_model=dict, summary="List threads")
def list_threads(
    status: Optional[ThreadStatus] = Query(None, description="Filter by status (active | archived)"),
    is_pinned: Optional[bool] = Query(None, description="Filter pinned threads only"),
    sort_by: str = Query("attention_score", description="Sort field: attention_score | last_interaction_at | created_at | agenda"),
    sort_dir: str = Query("desc", description="Sort direction: asc | desc"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    threads, total = thread_service.list_threads(
        db,
        user_id=user_id,
        status=status,
        is_pinned=is_pinned,
        sort_by=sort_by,
        sort_dir=sort_dir,
        limit=limit,
        offset=offset,
    )
    return {
        "data": [ThreadResponse.model_validate(t) for t in threads],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{thread_id}/timeline", response_model=list[TimelineEventResponse], summary="Get thread timeline")
def get_thread_timeline(
    thread_id: str,
    event_type: Optional[TimelineEventType] = Query(None, description="Filter by event type"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    events = thread_service.get_timeline(
        db,
        thread_id=thread_id,
        user_id=user_id,
        event_type=event_type,
        limit=limit,
        offset=offset,
    )
    return [TimelineEventResponse.model_validate(e) for e in events]


@router.post("", response_model=ThreadResponse, status_code=status.HTTP_201_CREATED, summary="Create thread with agenda and contacts")
def create_thread(
    data: ThreadCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a new thread with its meeting/project agenda and optionally link selected people.
    """
    thread = thread_service.create_thread(db, data, user_id)
    return ThreadResponse.model_validate(thread)


@router.get("/{thread_id}", response_model=ThreadResponse, summary="Get thread")
def get_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    thread = thread_service.get_thread(db, thread_id, user_id)
    return ThreadResponse.model_validate(thread)


@router.patch("/{thread_id}", response_model=ThreadResponse, summary="Update thread")
def update_thread(
    thread_id: str,
    data: ThreadUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    thread = thread_service.update_thread(db, thread_id, data, user_id)
    return ThreadResponse.model_validate(thread)


@router.delete("/{thread_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete thread")
def delete_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    thread_service.delete_thread(db, thread_id, user_id)
    return None


@router.post("/{thread_id}/archive", response_model=ThreadResponse, summary="Archive thread")
def archive_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    thread = thread_service.archive_thread(db, thread_id, user_id)
    return ThreadResponse.model_validate(thread)


@router.post("/{thread_id}/restore", response_model=ThreadResponse, summary="Restore archived thread")
def restore_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    thread = thread_service.restore_thread(db, thread_id, user_id)
    return ThreadResponse.model_validate(thread)


@router.post("/{thread_id}/snooze", response_model=ThreadResponse, summary="Snooze thread")
def snooze_thread(
    thread_id: str,
    data: ThreadSnoozeRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    thread = thread_service.snooze_thread(db, thread_id, user_id, data.snooze_until)
    return ThreadResponse.model_validate(thread)
