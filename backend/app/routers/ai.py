"""
routers/ai.py — FastAPI router for AI Intelligence endpoints.

Endpoint map (from docs/08_system_architecture.md Phase 0 priorities):
  POST /ai/summarise/{thread_id}  summarise thread context
  POST /ai/brief/{thread_id}      generate pre-meeting brief
  POST /ai/classify               classify capture content & predict thread
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import DEMO_USER_ID
from app.db import get_db
from app.schemas import (
    AIBriefResponse,
    AIClassifyRequest,
    AIClassifyResponse,
    AISummariseRequest,
    AISummariseResponse,
)
from app.services.ai_service import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])


def get_current_user_id() -> str:
    return DEMO_USER_ID


@router.post(
    "/summarise/{thread_id}",
    response_model=AISummariseResponse,
    summary="Summarise thread ('Where We Left Off')",
)
def summarise_thread(
    thread_id: str,
    data: AISummariseRequest = AISummariseRequest(),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Generate or retrieve a cached 'Where We Left Off' summary for a thread.
    Use force_refresh=true to re-generate with new captures.
    """
    return ai_service.summarise_thread(
        db,
        thread_id=thread_id,
        user_id=user_id,
        force_refresh=data.force_refresh,
    )


@router.post(
    "/brief/{thread_id}",
    response_model=AIBriefResponse,
    summary="Generate pre-meeting brief",
)
def generate_brief(
    thread_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Generate an executive 30-second pre-meeting brief with talking points.
    """
    return ai_service.generate_brief(db, thread_id, user_id)


@router.post(
    "/classify",
    response_model=AIClassifyResponse,
    summary="Classify capture content",
)
def classify_capture(
    data: AIClassifyRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Classify unstructured text into a capture type (note, action, decision, question)
    and detect suggested thread association.
    """
    return ai_service.classify_capture(db, user_id, data.content)

