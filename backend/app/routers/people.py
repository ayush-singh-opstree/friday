"""
routers/people.py — FastAPI router for all People endpoints.

Endpoint map (from docs/08_system_architecture.md Phase 0 priorities):

  GET    /people                              list people (with search/sort)
  POST   /people                              create person
  GET    /people/{person_id}                  get person detail
  PATCH  /people/{person_id}                  partial update
  DELETE /people/{person_id}                  hard delete
  POST   /people/merge                        merge two people (source → target)
  GET    /people/{person_id}/threads          list threads associated with person

Thread ↔ Person link endpoints (nested under /threads for semantic clarity):
  GET    /threads/{thread_id}/people          list people on a thread
  POST   /threads/{thread_id}/people          add person to thread
  DELETE /threads/{thread_id}/people/{pid}    remove person from thread

Phase 0: user_id always = DEMO_USER_ID (no auth).
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.config import DEMO_USER_ID
from app.db import get_db
from app.schemas import (
    PersonCreate,
    PersonMergeRequest,
    PersonResponse,
    PersonUpdate,
    ThreadAddPersonRequest,
    ThreadPersonResponse,
)
from app.services.people_service import people_service

# ── Two routers: /people and /threads (for link endpoints) ────────────────────
router = APIRouter(tags=["people"])
threads_people_router = APIRouter(tags=["people"])


def get_current_user_id() -> str:
    return DEMO_USER_ID


# ─────────────────────────────────────────────────────────────────────────────
#  /people — CRUD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/people", response_model=dict, summary="List people")
def list_people(
    search: Optional[str] = Query(None, description="Search by name, org, role, or email"),
    sort_by: str = Query("full_name", description="Sort field: full_name | created_at | organisation"),
    sort_dir: str = Query("asc", description="asc | desc"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    List all people in the user's contact directory.

    - Supports free-text search across name, organisation, role, and email.
    - Sorted alphabetically by name by default.
    """
    people, total = people_service.list_people(
        db,
        user_id=user_id,
        search=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
        limit=limit,
        offset=offset,
    )
    return {
        "data": [PersonResponse.model_validate(p) for p in people],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post(
    "/people",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create person",
)
def create_person(
    data: PersonCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a new person in the directory.

    If potential duplicates are detected (same name or email already exists),
    they are returned in the `duplicates` field as a warning — creation still
    proceeds. The caller can choose to merge instead.
    """
    person, duplicates = people_service.create_person(db, data, user_id)
    return {
        "data": PersonResponse.model_validate(person),
        "duplicates": [PersonResponse.model_validate(d) for d in duplicates],
    }


@router.get("/people/{person_id}", response_model=PersonResponse, summary="Get person")
def get_person(
    person_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Fetch a single person by ID."""
    person = people_service.get_person(db, person_id, user_id)
    return PersonResponse.model_validate(person)


@router.patch(
    "/people/{person_id}",
    response_model=PersonResponse,
    summary="Update person",
)
def update_person(
    person_id: str,
    data: PersonUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Partially update a person's details.

    Only fields included in the request body are changed.
    """
    person = people_service.update_person(db, person_id, data, user_id)
    return PersonResponse.model_validate(person)


@router.delete(
    "/people/{person_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete person",
)
def delete_person(
    person_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Permanently delete a person.

    Associated ThreadPerson rows are removed (cascade).
    Captures and commitments that referenced this person will have their
    `person_id` / `owner_person_id` set to NULL.
    """
    people_service.delete_person(db, person_id, user_id)
    return None


@router.get(
    "/people/{person_id}/threads",
    response_model=list[dict],
    summary="List threads for a person",
)
def get_threads_for_person(
    person_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Return all threads this person is associated with.
    Useful for the Person Profile screen in the app.
    """
    links = people_service.get_threads_for_person(db, person_id, user_id)
    return [
        {
            "thread_id": link.thread_id,
            "person_id": link.person_id,
            "added_at": link.added_at,
        }
        for link in links
    ]


# ─────────────────────────────────────────────────────────────────────────────
#  /people/merge  (must be defined BEFORE /{person_id} to avoid route conflict)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/people/merge",
    response_model=PersonResponse,
    summary="Merge two people",
)
def merge_people(
    data: PersonMergeRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Merge `source_id` person INTO `target_id` person.

    - All thread associations, captures, and commitments from the source
      are re-assigned to the target.
    - Source person is permanently deleted.
    - Returns the surviving (target) person record.
    - Returns 422 if source_id == target_id.
    """
    person = people_service.merge_people(db, data.source_id, data.target_id, user_id)
    return PersonResponse.model_validate(person)


# ─────────────────────────────────────────────────────────────────────────────
#  /threads/{thread_id}/people — ThreadPerson link management
# ─────────────────────────────────────────────────────────────────────────────

@threads_people_router.get(
    "/threads/{thread_id}/people",
    response_model=list[ThreadPersonResponse],
    summary="List people on a thread",
)
def get_people_on_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Return all people linked to a thread."""
    links = people_service.get_people_for_thread(db, thread_id, user_id)
    return [ThreadPersonResponse.model_validate(link) for link in links]


@threads_people_router.post(
    "/threads/{thread_id}/people",
    response_model=ThreadPersonResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add person to thread",
)
def add_person_to_thread(
    thread_id: str,
    data: ThreadAddPersonRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Link a person to a thread.

    - Emits a `person_added` timeline event.
    - Returns 409 if already linked.
    """
    link = people_service.add_person_to_thread(db, thread_id, data.person_id, user_id)
    return ThreadPersonResponse.model_validate(link)


@threads_people_router.delete(
    "/threads/{thread_id}/people/{person_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove person from thread",
)
def remove_person_from_thread(
    thread_id: str,
    person_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Unlink a person from a thread.

    - Emits a `person_removed` timeline event.
    - Returns 404 if the link does not exist.
    """
    people_service.remove_person_from_thread(db, thread_id, person_id, user_id)
    return None

