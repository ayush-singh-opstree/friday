"""
routers/captures.py — FastAPI router for SubThreads / Captures.

Supports capturing notes, follow_ups, questions, commitments, decisions
under a Club (meeting session) or directly under a Thread (agenda).
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.config import DEMO_USER_ID
from app.db import get_db
from app.models import CaptureStatus, SubThreadType
from app.schemas import (
    CaptureAssignRequest,
    SubThreadCreate,
    SubThreadResponse,
    SubThreadUpdate,
)
from app.services.capture_service import capture_service

router = APIRouter(prefix="/captures", tags=["captures / subthreads"])


def get_current_user_id() -> str:
    return DEMO_USER_ID


@router.get("", response_model=dict, summary="List subthreads / captures")
def list_captures(
    thread_id: Optional[str] = Query(None, description="Filter captures by thread ID"),
    club_id: Optional[str] = Query(None, description="Filter captures by club/meeting session ID"),
    status: Optional[CaptureStatus] = Query(None, description="Filter by status (inbox | filed)"),
    type: Optional[SubThreadType] = Query(None, description="Filter by predefined type (note | follow_up | question | commitment | decision)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    List subthreads / captures:
    - Pass `club_id` to get all subthreads grouped under a specific meeting session.
    - Pass `thread_id` to get all subthreads for a thread.
    - Omit both with `status=inbox` for unfiled captures.
    """
    captures, total = capture_service.list_captures(
        db,
        user_id=user_id,
        thread_id=thread_id,
        club_id=club_id,
        status=status,
        type=type,
        limit=limit,
        offset=offset,
    )
    return {
        "data": [SubThreadResponse.model_validate(c) for c in captures],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post(
    "",
    response_model=SubThreadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create subthread / capture item",
)
def create_capture(
    data: SubThreadCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a subthread item (note, follow_up, question, commitment, decision):
    - When created during a meeting capture, pass `club_id`.
    - If `type=commitment` and `person_id` + `thread_id` are provided, it automatically registers in the Commitments tracker.
    """
    capture = capture_service.create_capture(db, data, user_id)
    return SubThreadResponse.model_validate(capture)


@router.get("/{capture_id}", response_model=SubThreadResponse, summary="Get subthread detail")
def get_capture(
    capture_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    capture = capture_service.get_capture(db, capture_id, user_id)
    return SubThreadResponse.model_validate(capture)


@router.patch("/{capture_id}", response_model=SubThreadResponse, summary="Update subthread")
def update_capture(
    capture_id: str,
    data: SubThreadUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    capture = capture_service.update_capture(db, capture_id, data, user_id)
    return SubThreadResponse.model_validate(capture)


@router.delete(
    "/{capture_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete subthread",
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
    response_model=SubThreadResponse,
    summary="Assign capture to thread/club",
)
def assign_capture(
    capture_id: str,
    data: CaptureAssignRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    capture = capture_service.assign_to_thread(db, capture_id, data.thread_id, user_id, club_id=data.club_id)
    return SubThreadResponse.model_validate(capture)
