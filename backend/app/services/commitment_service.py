"""
services/commitment_service.py — Business logic for Commitment operations.
Commitments are strictly linked to a person (whom I committed to with deadline) and thread.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import (
    Commitment,
    CommitmentOwnerType,
    CommitmentStatus,
    TimelineEvent,
    TimelineEventType,
)
from app.repositories.club_repository import club_repository
from app.repositories.commitment_repository import commitment_repository
from app.repositories.people_repository import people_repository
from app.repositories.thread_repository import thread_repository
from app.schemas import (
    CommitmentCompleteRequest,
    CommitmentCreate,
    CommitmentUpdate,
)


class CommitmentService:

    def _get_or_404(
        self, db: Session, commitment_id: str, user_id: str
    ) -> Commitment:
        commitment = commitment_repository.get_by_id(db, commitment_id, user_id)
        if not commitment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Commitment '{commitment_id}' not found.",
            )
        return commitment

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

    def list_commitments(
        self,
        db: Session,
        user_id: str,
        thread_id: Optional[str] = None,
        person_id: Optional[str] = None,
        club_id: Optional[str] = None,
        status: Optional[CommitmentStatus] = None,
        overdue_only: bool = False,
        due_today_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Commitment], int]:
        commitments = commitment_repository.get_all(
            db,
            user_id=user_id,
            thread_id=thread_id,
            person_id=person_id,
            club_id=club_id,
            status=status,
            overdue_only=overdue_only,
            due_today_only=due_today_only,
            limit=limit,
            offset=offset,
        )
        total = commitment_repository.count(
            db,
            user_id=user_id,
            thread_id=thread_id,
            person_id=person_id,
            club_id=club_id,
            status=status,
            overdue_only=overdue_only,
            due_today_only=due_today_only,
        )
        return commitments, total

    def get_commitment(
        self, db: Session, commitment_id: str, user_id: str
    ) -> Commitment:
        return self._get_or_404(db, commitment_id, user_id)

    def create_commitment(
        self, db: Session, data: CommitmentCreate, user_id: str
    ) -> Commitment:
        # Validate thread
        thread = thread_repository.get_by_id(db, data.thread_id, user_id)
        if not thread:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Thread '{data.thread_id}' not found.",
            )

        # Validate the linked person. A commitment owned by "me" has no person.
        person = None
        if data.person_id:
            person = people_repository.get_by_id(db, data.person_id, user_id)
            if not person:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Person '{data.person_id}' not found.",
                )

        # Validate club if provided
        if data.club_id:
            club = club_repository.get_by_id(db, data.club_id, user_id)
            if not club:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Club '{data.club_id}' not found.",
                )

        deadline = data.deadline
        if deadline and deadline.tzinfo is not None:
            deadline = deadline.astimezone(timezone.utc).replace(tzinfo=None)

        owner_type = data.owner_type or (
            CommitmentOwnerType.person if data.person_id else CommitmentOwnerType.me
        )

        commitment = Commitment(
            id=str(uuid.uuid4()),
            user_id=user_id,
            thread_id=data.thread_id,
            person_id=data.person_id,
            club_id=data.club_id,
            subthread_id=data.subthread_id,
            description=data.description.strip(),
            owner_type=owner_type,
            status=CommitmentStatus.open,
            deadline=deadline,
            completed_at=None,
            completion_note=None,
        )
        commitment = commitment_repository.create(db, commitment)

        thread_repository.touch_last_interaction(db, thread)
        self._emit_timeline_event(
            db,
            thread_id=thread.id,
            user_id=user_id,
            event_type=TimelineEventType.commitment_created,
            reference_id=commitment.id,
            metadata={
                "description": commitment.description,
                "owner_type": commitment.owner_type.value,
                "person_id": person.id if person else None,
                "person_name": person.full_name if person else None,
                "deadline": commitment.deadline.isoformat() if commitment.deadline else None,
            },
        )
        return commitment

    def update_commitment(
        self, db: Session, commitment_id: str, data: CommitmentUpdate, user_id: str
    ) -> Commitment:
        commitment = self._get_or_404(db, commitment_id, user_id)
        updates = data.model_dump(exclude_unset=True)
        if not updates:
            return commitment

        if "description" in updates and updates["description"]:
            updates["description"] = updates["description"].strip()

        if "person_id" in updates and updates["person_id"]:
            person = people_repository.get_by_id(db, updates["person_id"], user_id)
            if not person:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Person '{updates['person_id']}' not found.",
                )

        if "deadline" in updates and updates["deadline"]:
            if updates["deadline"].tzinfo is not None:
                updates["deadline"] = updates["deadline"].astimezone(timezone.utc).replace(tzinfo=None)

        return commitment_repository.update(db, commitment, updates)

    def complete_commitment(
        self,
        db: Session,
        commitment_id: str,
        data: CommitmentCompleteRequest,
        user_id: str,
    ) -> Commitment:
        commitment = self._get_or_404(db, commitment_id, user_id)
        if commitment.status == CommitmentStatus.completed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Commitment is already completed.",
            )

        now = datetime.utcnow()
        updates = {
            "status": CommitmentStatus.completed,
            "completed_at": now,
            "completion_note": data.completion_note.strip() if data.completion_note else None,
        }
        commitment = commitment_repository.update(db, commitment, updates)

        thread = thread_repository.get_by_id(db, commitment.thread_id, user_id)
        if thread:
            thread_repository.touch_last_interaction(db, thread)
            self._emit_timeline_event(
                db,
                thread_id=thread.id,
                user_id=user_id,
                event_type=TimelineEventType.commitment_completed,
                reference_id=commitment.id,
                metadata={
                    "description": commitment.description,
                    "completed_at": now.isoformat(),
                    "completion_note": commitment.completion_note,
                },
            )

        return commitment

    def delete_commitment(
        self, db: Session, commitment_id: str, user_id: str
    ) -> None:
        commitment = self._get_or_404(db, commitment_id, user_id)
        commitment_repository.delete(db, commitment)


commitment_service = CommitmentService()
