"""
services/people_service.py — Business logic for Person and ThreadPerson operations.

Layer responsibility:
  - Validates inputs, enforces business rules.
  - Calls people_repository / thread_person_repository for all DB access.
  - Never touches db.query() directly.

Business rules (from docs/03_feature_specs.md and docs/06_data_model.md):
  - Duplicate detection: warn (not block) when creating a person with the same
    name or email as an existing contact.
  - Merge: all ThreadPerson rows from source are migrated to target; captures
    and commitments referencing source person_id are updated to target; source
    person row is deleted.
  - Person deletion: hard-delete; ThreadPerson rows cascade automatically.
  - Adding a person to a thread emits a 'person_added' timeline event.
  - Removing a person emits a 'person_removed' timeline event.
"""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import (
    Capture,
    Commitment,
    Person,
    ThreadPerson,
    TimelineEvent,
    TimelineEventType,
)
from app.repositories.people_repository import people_repository, thread_person_repository
from app.repositories.thread_repository import thread_repository
from app.schemas import PersonCreate, PersonUpdate


class PeopleService:

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _get_person_or_404(self, db: Session, person_id: str, user_id: str) -> Person:
        person = people_repository.get_by_id(db, person_id, user_id)
        if not person:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Person '{person_id}' not found.",
            )
        return person

    def _emit_timeline_event(
        self,
        db: Session,
        thread_id: str,
        user_id: str,
        event_type: TimelineEventType,
        reference_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> None:
        try:
            event = TimelineEvent(
                id=str(uuid.uuid4()),
                thread_id=thread_id,
                user_id=user_id,
                type=event_type,
                reference_id=reference_id,
                event_metadata=metadata or {},
                occurred_at=datetime.utcnow(),
            )
            db.add(event)
            db.commit()
        except Exception:
            db.rollback()

    # ── List ──────────────────────────────────────────────────────────────────

    def list_people(
        self,
        db: Session,
        user_id: str,
        search: Optional[str] = None,
        sort_by: str = "full_name",
        sort_dir: str = "asc",
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Person], int]:
        people = people_repository.get_all(
            db, user_id=user_id, search=search,
            sort_by=sort_by, sort_dir=sort_dir,
            limit=limit, offset=offset,
        )
        total = people_repository.count(db, user_id=user_id, search=search)
        return people, total

    # ── Get one ───────────────────────────────────────────────────────────────

    def get_person(self, db: Session, person_id: str, user_id: str) -> Person:
        return self._get_person_or_404(db, person_id, user_id)

    def get_threads_for_person(
        self, db: Session, person_id: str, user_id: str
    ) -> list[ThreadPerson]:
        """Return all threads this person is associated with."""
        self._get_person_or_404(db, person_id, user_id)  # ownership check
        return thread_person_repository.get_threads_for_person(db, person_id)

    # ── Create ────────────────────────────────────────────────────────────────

    def create_person(
        self, db: Session, data: PersonCreate, user_id: str
    ) -> tuple[Person, list[Person]]:
        """
        Create a new person.

        Returns (person, potential_duplicates) so the router can include
        a 'duplicates' warning in the response without blocking creation.
        Duplicate check: same name (case-insensitive) or same email.
        """
        # Duplicate detection (non-blocking per spec)
        duplicates = people_repository.find_duplicates(
            db, user_id=user_id,
            full_name=data.full_name,
            email=data.email,
        )

        person = Person(
            id=str(uuid.uuid4()),
            user_id=user_id,
            full_name=data.full_name.strip(),
            organisation=data.organisation.strip() if data.organisation else None,
            role=data.role.strip() if data.role else None,
            email=data.email.strip().lower() if data.email else None,
            phone=data.phone.strip() if data.phone else None,
            linked_in_url=data.linked_in_url.strip() if data.linked_in_url else None,
            notes=data.notes,
        )
        person = people_repository.create(db, person)
        return person, duplicates

    # ── Update ────────────────────────────────────────────────────────────────

    def update_person(
        self, db: Session, person_id: str, data: PersonUpdate, user_id: str
    ) -> Person:
        person = self._get_person_or_404(db, person_id, user_id)
        updates = data.model_dump(exclude_unset=True)
        if not updates:
            return person

        # Normalise text fields
        if "full_name" in updates and updates["full_name"]:
            updates["full_name"] = updates["full_name"].strip()
        if "email" in updates and updates["email"]:
            updates["email"] = updates["email"].strip().lower()

        return people_repository.update(db, person, updates)

    # ── Delete ────────────────────────────────────────────────────────────────

    def delete_person(self, db: Session, person_id: str, user_id: str) -> None:
        person = self._get_person_or_404(db, person_id, user_id)
        people_repository.delete(db, person)

    # ── Thread ↔ Person links ─────────────────────────────────────────────────

    def add_person_to_thread(
        self, db: Session, thread_id: str, person_id: str, user_id: str
    ) -> ThreadPerson:
        """
        Link a person to a thread.
        - Validates both thread and person belong to the user.
        - Returns 409 if already linked.
        - Emits 'person_added' timeline event.
        - Touches thread.last_interaction_at.
        """
        thread = thread_repository.get_by_id(db, thread_id, user_id)
        if not thread:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Thread '{thread_id}' not found.",
            )
        person = self._get_person_or_404(db, person_id, user_id)

        existing = thread_person_repository.get_link(db, thread_id, person_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Person '{person.full_name}' is already linked to this thread.",
            )

        link = thread_person_repository.add_person_to_thread(db, thread_id, person_id)

        # Touch thread activity
        thread_repository.touch_last_interaction(db, thread)

        # Emit timeline event
        self._emit_timeline_event(
            db,
            thread_id=thread_id,
            user_id=user_id,
            event_type=TimelineEventType.person_added,
            reference_id=person_id,
            metadata={"person_name": person.full_name},
        )
        return link

    def remove_person_from_thread(
        self, db: Session, thread_id: str, person_id: str, user_id: str
    ) -> None:
        """
        Unlink a person from a thread.
        - Validates ownership.
        - Emits 'person_removed' timeline event.
        """
        thread = thread_repository.get_by_id(db, thread_id, user_id)
        if not thread:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Thread '{thread_id}' not found.",
            )
        person = self._get_person_or_404(db, person_id, user_id)

        link = thread_person_repository.get_link(db, thread_id, person_id)
        if not link:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This person is not linked to the thread.",
            )

        thread_person_repository.remove_person_from_thread(db, thread_id, person_id)

        self._emit_timeline_event(
            db,
            thread_id=thread_id,
            user_id=user_id,
            event_type=TimelineEventType.person_removed,
            reference_id=person_id,
            metadata={"person_name": person.full_name},
        )

    def get_people_for_thread(
        self, db: Session, thread_id: str, user_id: str
    ) -> list[ThreadPerson]:
        thread = thread_repository.get_by_id(db, thread_id, user_id)
        if not thread:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Thread '{thread_id}' not found.",
            )
        return thread_person_repository.get_people_for_thread(db, thread_id)

    # ── Merge ─────────────────────────────────────────────────────────────────

    def merge_people(
        self, db: Session, source_id: str, target_id: str, user_id: str
    ) -> Person:
        """
        Merge source person INTO target person.

        Steps (from docs/03_feature_specs.md):
        1. Validate both exist and belong to the user.
        2. Move all ThreadPerson rows from source → target (skip duplicates).
        3. Re-point all Capture.person_id rows from source → target.
        4. Re-point all Commitment.owner_person_id rows from source → target.
        5. Hard-delete source person.
        6. Return the surviving target person.

        Source and target must be different people.
        """
        if source_id == target_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="source_id and target_id must be different.",
            )

        source = self._get_person_or_404(db, source_id, user_id)
        target = self._get_person_or_404(db, target_id, user_id)

        # 1. Move ThreadPerson rows
        thread_person_repository.reassign_all(db, source_id, target_id)

        # 2. Re-point Capture.person_id
        db.query(Capture).filter(
            Capture.person_id == source_id,
            Capture.user_id == user_id,
        ).update({"person_id": target_id}, synchronize_session=False)

        # 3. Re-point Commitment.owner_person_id
        db.query(Commitment).filter(
            Commitment.owner_person_id == source_id,
            Commitment.user_id == user_id,
        ).update({"owner_person_id": target_id}, synchronize_session=False)

        db.commit()

        # 4. Delete source
        db.delete(source)
        db.commit()
        db.refresh(target)
        return target


# ── Module-level singleton ─────────────────────────────────────────────────────
people_service = PeopleService()

