"""
repositories/search_repository.py — Multi-entity search across Threadwise models.

Per docs/06_data_model.md Search Index Design:
Indexed Entities and fields:
- Thread: title, description
- Person: full_name, organisation, role, email
- Capture: content
- Commitment: description, completion_note
"""
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Capture, Commitment, Person, Thread
from app.schemas import SearchResultItem


class SearchRepository:

    def search_all(
        self,
        db: Session,
        user_id: str,
        query_text: str,
        entity_filter: Optional[str] = None,
        limit: int = 50,
    ) -> list[SearchResultItem]:
        pattern = f"%{query_text}%"
        results: list[SearchResultItem] = []

        # 1. Threads
        if entity_filter in (None, "", "thread"):
            threads = (
                db.query(Thread)
                .filter(
                    Thread.user_id == user_id,
                    or_(
                        Thread.title.ilike(pattern),
                        Thread.description.ilike(pattern),
                    ),
                )
                .limit(limit)
                .all()
            )
            for t in threads:
                results.append(
                    SearchResultItem(
                        entity_type="thread",
                        entity_id=t.id,
                        title=t.title,
                        snippet=t.description or "No description",
                        score=1.0 if query_text.lower() in t.title.lower() else 0.8,
                    )
                )

        # 2. People
        if entity_filter in (None, "", "person"):
            people = (
                db.query(Person)
                .filter(
                    Person.user_id == user_id,
                    or_(
                        Person.full_name.ilike(pattern),
                        Person.organisation.ilike(pattern),
                        Person.role.ilike(pattern),
                        Person.email.ilike(pattern),
                    ),
                )
                .limit(limit)
                .all()
            )
            for p in people:
                details = [d for d in [p.role, p.organisation, p.email] if d]
                snippet = " · ".join(details) if details else (p.notes or "")
                results.append(
                    SearchResultItem(
                        entity_type="person",
                        entity_id=p.id,
                        title=p.full_name,
                        snippet=snippet,
                        score=1.0 if query_text.lower() in p.full_name.lower() else 0.7,
                    )
                )

        # 3. Captures
        if entity_filter in (None, "", "capture"):
            captures = (
                db.query(Capture)
                .filter(
                    Capture.user_id == user_id,
                    Capture.content.ilike(pattern),
                )
                .limit(limit)
                .all()
            )
            for c in captures:
                snippet = c.content[:140] + ("..." if len(c.content) > 140 else "")
                results.append(
                    SearchResultItem(
                        entity_type="capture",
                        entity_id=c.id,
                        title=f"{c.type.value.capitalize()}: {snippet[:40]}",
                        snippet=c.content,
                        score=0.9,
                    )
                )

        # 4. Commitments
        if entity_filter in (None, "", "commitment"):
            commitments = (
                db.query(Commitment)
                .filter(
                    Commitment.user_id == user_id,
                    or_(
                        Commitment.description.ilike(pattern),
                        Commitment.completion_note.ilike(pattern),
                    ),
                )
                .limit(limit)
                .all()
            )
            for cm in commitments:
                results.append(
                    SearchResultItem(
                        entity_type="commitment",
                        entity_id=cm.id,
                        title=cm.description,
                        snippet=f"Status: {cm.status.value}" + (f" | Note: {cm.completion_note}" if cm.completion_note else ""),
                        score=0.85,
                    )
                )

        # Sort results by score desc
        results.sort(key=lambda r: r.score, reverse=True)
        return results[:limit]


search_repository = SearchRepository()

