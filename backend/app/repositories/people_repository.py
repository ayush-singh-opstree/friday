"""
repositories/people_repository.py — Raw database operations for Person and ThreadPerson.

Layer responsibility:
  - Only this layer touches the DB session directly.
  - No business logic — just CRUD + queries.
  - Covers both the Person table and the ThreadPerson join table.
"""
from typing import Optional

from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session

from app.models import Person, ThreadPerson


class PeopleRepository:
    """All DB operations for the Person model."""

    # ── Read ──────────────────────────────────────────────────────────────────

    def get_by_id(self, db: Session, person_id: str, user_id: str) -> Optional[Person]:
        return (
            db.query(Person)
            .filter(Person.id == person_id, Person.user_id == user_id)
            .first()
        )

    def get_all(
        self,
        db: Session,
        user_id: str,
        search: Optional[str] = None,
        sort_by: str = "full_name",
        sort_dir: str = "asc",
        limit: int = 50,
        offset: int = 0,
    ) -> list[Person]:
        """
        Return people for a user.
        Optional `search` does a case-insensitive ILIKE across
        full_name, organisation, role, and email.
        """
        q = db.query(Person).filter(Person.user_id == user_id)

        if search:
            pattern = f"%{search}%"
            q = q.filter(
                or_(
                    Person.full_name.ilike(pattern),
                    Person.organisation.ilike(pattern),
                    Person.role.ilike(pattern),
                    Person.email.ilike(pattern),
                )
            )

        sort_column_map = {
            "full_name": Person.full_name,
            "created_at": Person.created_at,
            "updated_at": Person.updated_at,
            "organisation": Person.organisation,
        }
        col = sort_column_map.get(sort_by, Person.full_name)
        order = asc(col) if sort_dir == "asc" else desc(col)

        return q.order_by(order).offset(offset).limit(limit).all()

    def count(self, db: Session, user_id: str, search: Optional[str] = None) -> int:
        q = db.query(func.count(Person.id)).filter(Person.user_id == user_id)
        if search:
            pattern = f"%{search}%"
            q = q.filter(
                or_(
                    Person.full_name.ilike(pattern),
                    Person.organisation.ilike(pattern),
                    Person.role.ilike(pattern),
                    Person.email.ilike(pattern),
                )
            )
        return q.scalar() or 0

    def find_duplicates(
        self, db: Session, user_id: str, full_name: str, email: Optional[str] = None
    ) -> list[Person]:
        """
        Fuzzy duplicate detection:
        - Exact name match (case-insensitive), OR
        - Exact email match (if email provided and not null in DB)
        Returns a list of potential duplicates (excluding an exact ID match).
        """
        conditions = [Person.full_name.ilike(full_name)]
        if email:
            conditions.append(Person.email.ilike(email))

        return (
            db.query(Person)
            .filter(Person.user_id == user_id, or_(*conditions))
            .all()
        )

    # ── Create ────────────────────────────────────────────────────────────────

    def create(self, db: Session, person: Person) -> Person:
        db.add(person)
        db.commit()
        db.refresh(person)
        return person

    # ── Update ────────────────────────────────────────────────────────────────

    def update(self, db: Session, person: Person, updates: dict) -> Person:
        from datetime import datetime
        for field, value in updates.items():
            setattr(person, field, value)
        person.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(person)
        return person

    # ── Delete ────────────────────────────────────────────────────────────────

    def delete(self, db: Session, person: Person) -> None:
        db.delete(person)
        db.commit()


class ThreadPersonRepository:
    """All DB operations for the ThreadPerson join table."""

    def get_link(
        self, db: Session, thread_id: str, person_id: str
    ) -> Optional[ThreadPerson]:
        return (
            db.query(ThreadPerson)
            .filter(
                ThreadPerson.thread_id == thread_id,
                ThreadPerson.person_id == person_id,
            )
            .first()
        )

    def get_people_for_thread(self, db: Session, thread_id: str) -> list[ThreadPerson]:
        """Return all ThreadPerson rows (with Person eager-loaded) for a thread."""
        return (
            db.query(ThreadPerson)
            .filter(ThreadPerson.thread_id == thread_id)
            .all()
        )

    def get_threads_for_person(self, db: Session, person_id: str) -> list[ThreadPerson]:
        """Return all ThreadPerson rows for a person (to show associated threads)."""
        return (
            db.query(ThreadPerson)
            .filter(ThreadPerson.person_id == person_id)
            .all()
        )

    def add_person_to_thread(
        self, db: Session, thread_id: str, person_id: str
    ) -> ThreadPerson:
        from datetime import datetime
        link = ThreadPerson(
            thread_id=thread_id,
            person_id=person_id,
            added_at=datetime.utcnow(),
        )
        db.add(link)
        db.commit()
        db.refresh(link)
        return link

    def remove_person_from_thread(
        self, db: Session, thread_id: str, person_id: str
    ) -> None:
        link = self.get_link(db, thread_id, person_id)
        if link:
            db.delete(link)
            db.commit()

    def reassign_all(
        self, db: Session, from_person_id: str, to_person_id: str
    ) -> int:
        """
        Merge helper: move all ThreadPerson rows from source → target person.
        Skips rows that would create a duplicate (target already in that thread).
        Returns the count of rows moved.
        """
        rows = (
            db.query(ThreadPerson)
            .filter(ThreadPerson.person_id == from_person_id)
            .all()
        )
        moved = 0
        for row in rows:
            existing = self.get_link(db, row.thread_id, to_person_id)
            if existing:
                # Target already in this thread — just remove the duplicate
                db.delete(row)
            else:
                row.person_id = to_person_id
                moved += 1
        db.commit()
        return moved


# ── Module-level singletons ────────────────────────────────────────────────────
people_repository = PeopleRepository()
thread_person_repository = ThreadPersonRepository()

