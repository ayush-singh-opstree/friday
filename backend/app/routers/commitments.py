"""
routers/commitments.py — FastAPI router for Commitment endpoints.

Endpoint map (from docs/08_system_architecture.md Phase 0 priorities):
  GET    /commitments                     list commitments (mine/theirs/overdue/due today)
  POST   /commitments                     create commitment
  GET    /commitments/{commitment_id}     get commitment detail
  PATCH  /commitments/{commitment_id}     update commitment
  DELETE /commitments/{commitment_id}     delete commitment
  POST   /commitments/{commitment_id}/complete mark commitment as completed
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.config import DEMO_USER_ID
from app.db import get_db
from app.models import CommitmentOwnerType, CommitmentStatus
from app.schemas import (
    CommitmentCompleteRequest,
    CommitmentCreate,
    CommitmentResponse,
    CommitmentUpdate,
)
from app.services.commitment_service import commitment_service

router = APIRouter(prefix="/commitments", tags=["commitments"])


def get_current_user_id() -> str:
    return DEMO_USER_ID


@router.get("", response_model=dict, summary="List commitments")
def list_commitments(
    thread_id: Optional[str] = Query(None, description="Filter by thread ID"),
    owner_type: Optional[CommitmentOwnerType] = Query(None, description="Filter: 'me' | 'person'"),
    status: Optional[CommitmentStatus] = Query(None, description="Filter: 'open' | 'completed'"),
    overdue_only: bool = Query(False, description="Filter only overdue open commitments"),
    due_today_only: bool = Query(False, description="Filter only commitments due today"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    commitments, total = commitment_service.list_commitments(
        db,
        user_id=user_id,
        thread_id=thread_id,
        owner_type=owner_type,
        status=status,
        overdue_only=overdue_only,
        due_today_only=due_today_only,
        limit=limit,
        offset=offset,
    )
    return {
        "data": [CommitmentResponse.model_validate(c) for c in commitments],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post(
    "",
    response_model=CommitmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create commitment",
)
def create_commitment(
    data: CommitmentCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    commitment = commitment_service.create_commitment(db, data, user_id)
    return CommitmentResponse.model_validate(commitment)


@router.get("/{commitment_id}", response_model=CommitmentResponse, summary="Get commitment")
def get_commitment(
    commitment_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    commitment = commitment_service.get_commitment(db, commitment_id, user_id)
    return CommitmentResponse.model_validate(commitment)


@router.patch("/{commitment_id}", response_model=CommitmentResponse, summary="Update commitment")
def update_commitment(
    commitment_id: str,
    data: CommitmentUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    commitment = commitment_service.update_commitment(db, commitment_id, data, user_id)
    return CommitmentResponse.model_validate(commitment)


@router.delete(
    "/{commitment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete commitment",
)
def delete_commitment(
    commitment_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    commitment_service.delete_commitment(db, commitment_id, user_id)
    return None


@router.post(
    "/{commitment_id}/complete",
    response_model=CommitmentResponse,
    summary="Complete commitment",
)
def complete_commitment(
    commitment_id: str,
    data: CommitmentCompleteRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    commitment = commitment_service.complete_commitment(db, commitment_id, data, user_id)
    return CommitmentResponse.model_validate(commitment)

