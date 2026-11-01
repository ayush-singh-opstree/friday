"""
routers/attention.py — FastAPI router for Attention Engine & Today View.

Endpoint map (from docs/08_system_architecture.md Phase 0 priorities):
  GET  /attention/today                 get Today view (top 5, due today, going cold)
  POST /attention/recompute/{thread_id} force recompute single thread attention score
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import DEMO_USER_ID
from app.db import get_db
from app.schemas import TodayViewResponse
from app.services.attention_service import attention_service

router = APIRouter(prefix="/attention", tags=["attention"])


def get_current_user_id() -> str:
    return DEMO_USER_ID


@router.get("/today", response_model=TodayViewResponse, summary="Get Today view")
def get_today_view(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Computes and returns the Today View:
    - Top 5 threads requiring attention (ranked by score)
    - Commitments due today
    - Going-cold threads strip
    """
    return attention_service.get_today_view(db, user_id)


@router.post("/recompute/{thread_id}", summary="Recompute thread attention score")
def recompute_thread_attention(
    thread_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Force recomputation of attention score for a specific thread.
    """
    score = attention_service.recompute_thread(db, thread_id, user_id)
    return {"thread_id": thread_id, "attention_score": score}

