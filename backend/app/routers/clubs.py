"""
routers/clubs.py — FastAPI router for Club capture sessions (meetings).

Endpoints:
  POST /clubs/start            start a capture session/club for a thread (agenda)
  POST /clubs/{club_id}/end    end the capture session
  GET  /clubs/{club_id}        get club session detail with grouped subthreads
  GET  /threads/{thread_id}/clubs  list all clubs (sessions) for a thread
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.config import DEMO_USER_ID
from app.db import get_db
from app.schemas import (
    ClubDetailResponse,
    ClubEndRequest,
    ClubResponse,
    ClubStartRequest,
    SubThreadResponse,
)
from app.services.club_service import club_service

router = APIRouter(prefix="/clubs", tags=["clubs"])
thread_clubs_router = APIRouter(tags=["clubs"])


def get_current_user_id() -> str:
    return DEMO_USER_ID


@router.post(
    "/start",
    response_model=ClubResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a meeting capture session (Club)",
)
def start_club(
    data: ClubStartRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Called when user clicks extension and starts capturing for a thread (agenda).
    Starts timer, records `started_at`, and returns the active `club_id`.
    Subsequent captures (notes, follow-ups, questions, commitments) link to this `club_id`.
    """
    club = club_service.start_club(db, user_id, data)
    return ClubResponse.model_validate(club)


@router.post(
    "/{club_id}/end",
    response_model=ClubResponse,
    summary="End a meeting capture session (Club)",
)
def end_club(
    club_id: str,
    data: Optional[ClubEndRequest] = None,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Called when user finishes the meeting and clicks 'End Capturing'.
    Sets `ended_at`, touches thread interaction, and closes the session.
    """
    ended_at = data.ended_at if data else None
    club = club_service.end_club(db, club_id, user_id, ended_at=ended_at)
    return ClubResponse.model_validate(club)


@router.get(
    "/{club_id}",
    response_model=ClubDetailResponse,
    summary="Get club session details with subthreads",
)
def get_club_detail(
    club_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Returns the club session and all its child subthreads (notes, follow_ups, questions, commitments).
    """
    club = club_service.get_club(db, club_id, user_id)
    subthreads = [SubThreadResponse.model_validate(st) for st in (club.subthreads or [])]
    detail = ClubDetailResponse.model_validate(club)
    detail.subthreads = subthreads
    return detail


@thread_clubs_router.get(
    "/threads/{thread_id}/clubs",
    response_model=list[ClubResponse],
    summary="List all clubs for a thread",
)
def list_clubs_for_thread(
    thread_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    List past and active meeting clubs for a given thread (agenda).
    """
    clubs = club_service.list_clubs_by_thread(db, thread_id, user_id, limit=limit, offset=offset)
    return [ClubResponse.model_validate(c) for c in clubs]

