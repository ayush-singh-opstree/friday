"""
services/search_service.py — Search service across Threadwise.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.search_repository import search_repository
from app.schemas import SearchResponse


class SearchService:

    def search(
        self,
        db: Session,
        user_id: str,
        query_text: str,
        entity_filter: Optional[str] = None,
        limit: int = 50,
    ) -> SearchResponse:
        query_text = query_text.strip()
        if not query_text:
            return SearchResponse(query="", results=[], total=0)

        results = search_repository.search_all(
            db,
            user_id=user_id,
            query_text=query_text,
            entity_filter=entity_filter,
            limit=limit,
        )
        return SearchResponse(
            query=query_text,
            results=results,
            total=len(results),
        )


search_service = SearchService()

