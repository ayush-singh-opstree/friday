"""
routers/threads.py — FastAPI router for all Thread endpoints.

Endpoint map (from docs/08_system_architecture.md Phase 0 priorities):

  GET    /threads                     list threads (with filters)
  POST   /threads                     create thread
  GET    /threads/{thread_id}         get thread detail
  PATCH  /threads/{thread_id}         partial update
  DELETE /threads/{thread_id}         hard delete
  POST   /threads/{thread_id}/archive archive thread
  POST   /threads/{thread_id}/restore restore archived thread
  POST   /threads/{thread_id}/snooze  snooze thread until datetime

Phase 0: user_id is always pulled from the DEMO_USER_ID constant.
         No auth middleware needed for hackathon MVP.
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


# ── Dependency: current user ID ───────────────────────────────────────────────

def get_current_user_id() -> str:
    """
    Phase 0 stub — returns the hardcoded demo user ID.
    Replace with real JWT extraction in Phase 1+ auth.
    """
    return DEMO_USER_ID


# ─────────────────────────────────────────────────────────────────────────────
#  List
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=dict, summary="List threads")
def list_threads(
    status: Optional[ThreadStatus] = Query(None, description="Filter by status (active | archived)"),
    is_pinned: Optional[bool] = Query(None, description="Filter pinned threads only"),
    sort_by: str = Query("attention_score", description="Sort field: attention_score | last_interaction_at | created_at | title"),
    sort_dir: str = Query("desc", description="Sort direction: asc | desc"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    List threads for the current user.

    - Default: active threads sorted by attention score descending.
    - Use `status=archived` to retrieve the archive.
    - Supports pagination via `limit` + `offset`.
    """
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
    """
    Get audit-trail timeline events for a thread (captures, commitments, people changes).
    Chronologically ordered (newest first).
    """
    events = thread_service.get_timeline(
        db,
        thread_id=thread_id,
        user_id=user_id,
        event_type=event_type,
        limit=limit,
        offset=offset,
    )
    return [TimelineEventResponse.model_validate(e) for e in events]


# ─────────────────────────────────────────────────────────────────────────────
#  Create
# ─────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=ThreadResponse, status_code=status.HTTP_201_CREATED, summary="Create thread")
def create_thread(
    data: ThreadCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a new thread.

    - `title` is required (max 100 chars).
    - `going_cold_threshold_days` defaults to 14 (overrides user global setting for this thread).
    """
    thread = thread_service.create_thread(db, data, user_id)
    return ThreadResponse.model_validate(thread)


# ─────────────────────────────────────────────────────────────────────────────
#  Get one
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{thread_id}", response_model=ThreadResponse, summary="Get thread")
def get_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Fetch a single thread by ID."""
    thread = thread_service.get_thread(db, thread_id, user_id)
    return ThreadResponse.model_validate(thread)


# ─────────────────────────────────────────────────────────────────────────────
#  Update
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/{thread_id}", response_model=ThreadResponse, summary="Update thread")
def update_thread(
    thread_id: str,
    data: ThreadUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Partially update a thread.

    Only the fields you include in the request body are changed.
    Omitted fields retain their current values.
    """
    thread = thread_service.update_thread(db, thread_id, data, user_id)
    return ThreadResponse.model_validate(thread)


# ─────────────────────────────────────────────────────────────────────────────
#  Delete
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/{thread_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete thread")
def delete_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Permanently delete a thread and all its associated data
    (captures, commitments, timeline events, summaries).

    **This action is irreversible.** Consider archiving instead.
    """
    thread_service.delete_thread(db, thread_id, user_id)
    return None


# ─────────────────────────────────────────────────────────────────────────────
#  Archive
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{thread_id}/archive", response_model=ThreadResponse, summary="Archive thread")
def archive_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Archive a thread.

    - Sets `status` to `archived` and records `archivedAt`.
    - Attention score is zeroed; thread no longer surfaces on Today view.
    - Returns 409 if already archived.
    """
    thread = thread_service.archive_thread(db, thread_id, user_id)
    return ThreadResponse.model_validate(thread)


# ─────────────────────────────────────────────────────────────────────────────
#  Restore
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{thread_id}/restore", response_model=ThreadResponse, summary="Restore archived thread")
def restore_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Restore an archived thread back to active.

    - Clears `archivedAt` and resets `lastInteractionAt` to now.
    - Attention score will be recomputed on next GET /attention/today.
    - Returns 409 if thread is already active.
    """
    thread = thread_service.restore_thread(db, thread_id, user_id)
    return ThreadResponse.model_validate(thread)


# ─────────────────────────────────────────────────────────────────────────────
#  Snooze
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{thread_id}/snooze", response_model=ThreadResponse, summary="Snooze thread")
def snooze_thread(
    thread_id: str,
    data: ThreadSnoozeRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Snooze a thread until a specific future datetime.

    - While snoozed, `attentionScore` is forced to 0 and the thread is hidden from Today view.
    - Replaces any existing active snooze for the same thread.
    - Returns 422 if `snooze_until` is in the past.
    """
    thread = thread_service.snooze_thread(db, thread_id, user_id, data.snooze_until)
    return ThreadResponse.model_validate(thread)

