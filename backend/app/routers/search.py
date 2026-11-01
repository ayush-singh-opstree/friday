"""
routers/search.py — FastAPI router for Search endpoint.

Endpoint map:
  GET /search  query across threads, people, captures, commitments
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config import DEMO_USER_ID
from app.db import get_db
from app.schemas import SearchResponse
from app.services.search_service import search_service

router = APIRouter(prefix="/search", tags=["search"])


def get_current_user_id() -> str:
    return DEMO_USER_ID


@router.get("", response_model=SearchResponse, summary="Search across entities")
def search(
    q: str = Query(..., min_length=1, description="Search query keyword"),
    entity: Optional[str] = Query(None, description="Optional filter: 'thread' | 'person' | 'capture' | 'commitment'"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Search indexed entities (Threads, People, Captures, Commitments) by keyword.
    """
    return search_service.search(
        db,
        user_id=user_id,
        query_text=q,
        entity_filter=entity,
        limit=limit,
    )

