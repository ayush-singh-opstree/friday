"""
routers/captures.py — FastAPI router for Capture endpoints.

Endpoint map (from docs/08_system_architecture.md Phase 0 priorities):
  GET    /captures                     list captures (inbox, by thread, or by type)
  POST   /captures                     create capture (note, action, decision, question)
  GET    /captures/{capture_id}        get capture detail
  PATCH  /captures/{capture_id}        update capture (content, type, etc.)
  DELETE /captures/{capture_id}        delete capture
  POST   /captures/{capture_id}/assign assign an inbox capture to a thread
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.config import DEMO_USER_ID
from app.db import get_db
from app.models import CaptureStatus, CaptureType
from app.schemas import (
    CaptureAssignRequest,
    CaptureCreate,
    CaptureResponse,
    CaptureUpdate,
)
from app.services.capture_service import capture_service

router = APIRouter(prefix="/captures", tags=["captures"])


def get_current_user_id() -> str:
    return DEMO_USER_ID


@router.get("", response_model=dict, summary="List captures")
def list_captures(
    thread_id: Optional[str] = Query(None, description="Filter captures by thread ID"),
    status: Optional[CaptureStatus] = Query(None, description="Filter by status (inbox | filed)"),
    type: Optional[CaptureType] = Query(None, description="Filter by type (note | action | decision | question)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    List captures with optional filters:
    - Omit thread_id and pass `status=inbox` to get the user's Inbox items.
    - Pass `thread_id` to get all captures filed in a thread.
    """
    captures, total = capture_service.list_captures(
        db,
        user_id=user_id,
        thread_id=thread_id,
        status=status,
        type=type,
        limit=limit,
        offset=offset,
    )
    return {
        "data": [CaptureResponse.model_validate(c) for c in captures],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post(
    "",
    response_model=CaptureResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create capture",
)
def create_capture(
    data: CaptureCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a quick capture:
    - If `thread_id` is null/omitted, status is 'inbox'.
    - If `thread_id` is provided, status is 'filed' and timeline event is logged.
    """
    capture = capture_service.create_capture(db, data, user_id)
    return CaptureResponse.model_validate(capture)


@router.get("/{capture_id}", response_model=CaptureResponse, summary="Get capture")
def get_capture(
    capture_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    capture = capture_service.get_capture(db, capture_id, user_id)
    return CaptureResponse.model_validate(capture)


@router.patch("/{capture_id}", response_model=CaptureResponse, summary="Update capture")
def update_capture(
    capture_id: str,
    data: CaptureUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Update a capture. Content changes mark is_edited=True and update edited_at.
    """
    capture = capture_service.update_capture(db, capture_id, data, user_id)
    return CaptureResponse.model_validate(capture)


@router.delete(
    "/{capture_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete capture",
)
def delete_capture(
    capture_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    capture_service.delete_capture(db, capture_id, user_id)
    return None


@router.post(
    "/{capture_id}/assign",
    response_model=CaptureResponse,
    summary="Assign capture to thread",
)
def assign_capture(
    capture_id: str,
    data: CaptureAssignRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Assign an unfiled inbox capture to a thread.
    Updates status to 'filed' and logs a timeline event.
    """
    capture = capture_service.assign_to_thread(db, capture_id, data.thread_id, user_id)
    return CaptureResponse.model_validate(capture)

