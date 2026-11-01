"""
services/attention_service.py — Attention Engine for Threadwise.

Strict implementation of docs/06_data_model.md Attention Engine:
- compute_attention_score(thread, now, open_commitments, is_snoozed) -> float (0-100)
- generate_attention_reason(thread, score, open_commitments, days_since_interaction) -> str
- get_today_view(db, user_id) -> TodayViewResponse
- recompute_thread_attention(db, thread_id, user_id) -> float
"""
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models import (
    Commitment,
    CommitmentStatus,
    SnoozeRecord,
    SnoozeTargetType,
    Thread,
    ThreadStatus,
)
from app.repositories.commitment_repository import commitment_repository
from app.repositories.thread_repository import thread_repository
from app.schemas import (
    AttentionThreadItem,
    CommitmentResponse,
    DueTodayItem,
    ThreadResponse,
    TodayViewResponse,
)


class AttentionService:

    def is_thread_snoozed(self, db: Session, thread_id: str, now: datetime) -> bool:
        record = (
            db.query(SnoozeRecord)
            .filter(
                SnoozeRecord.target_type == SnoozeTargetType.thread,
                SnoozeRecord.target_id == thread_id,
                SnoozeRecord.snooze_until > now,
            )
            .first()
        )
        return record is not None

    def compute_score(
        self,
        thread: Thread,
        open_commitments: list[Commitment],
        is_snoozed: bool,
        now: Optional[datetime] = None,
    ) -> float:
        """
        Implementation of the score formula from docs/06_data_model.md:
        score = recencyScore(0-50) + commitmentScore(0-35) + goingColdScore(0-15) + pinBonus(15)
        """
        if is_snoozed or thread.status != ThreadStatus.active:
            return 0.0

        if now is None:
            now = datetime.utcnow()

        # Pinned bonus
        pin_bonus = 15.0 if thread.is_pinned else 0.0

        # Base score from recency (0-50 points)
        interaction_time = thread.last_interaction_at or thread.created_at
        delta_days = max(0.0, (now - interaction_time).total_seconds() / 86400.0)
        threshold = max(1, thread.going_cold_threshold_days)
        recency_score = min(50.0, (delta_days / threshold) * 50.0)

        # Commitment pressure (0-35 points)
        commitment_score = 0.0
        for c in open_commitments:
            if c.due_date is None:
                commitment_score += 5.0
            else:
                days_until_due = (c.due_date - now).total_seconds() / 86400.0
                if days_until_due < 0:
                    commitment_score += 20.0  # overdue
                elif days_until_due <= 2:
                    commitment_score += 15.0  # imminent
                elif days_until_due <= 7:
                    commitment_score += 10.0  # upcoming
                else:
                    commitment_score += 5.0   # open not urgent
        commitment_score = min(35.0, commitment_score)

        # Going-cold indicator (0-15 points)
        going_cold_score = 0.0
        if delta_days >= threshold:
            going_cold_score = 15.0
        elif delta_days >= (threshold * 0.75):
            going_cold_score = 8.0

        total_score = recency_score + commitment_score + going_cold_score + pin_bonus
        return min(100.0, round(total_score, 1))

    def generate_reason(
        self,
        thread: Thread,
        open_commitments: list[Commitment],
        days_since_interaction: int,
        now: Optional[datetime] = None,
    ) -> str:
        """
        Implementation of generateAttentionReason from docs/06_data_model.md
        """
        if now is None:
            now = datetime.utcnow()

        reasons = []
        if days_since_interaction >= thread.going_cold_threshold_days:
            reasons.append(f"No contact in {days_since_interaction} days")

        overdue_count = sum(
            1 for c in open_commitments if c.due_date and c.due_date < now
        )
        if overdue_count > 0:
            reasons.append(f"{overdue_count} overdue commitment(s)")

        imminent_count = sum(
            1
            for c in open_commitments
            if c.due_date
            and 0 <= ((c.due_date - now).total_seconds() / 86400.0) <= 2
        )
        if imminent_count > 0:
            reasons.append(f"{imminent_count} commitment(s) due within 48h")

        if not reasons:
            if open_commitments:
                reasons.append(f"{len(open_commitments)} open commitment(s)")
            else:
                reasons.append("Recent activity")

        return " · ".join(reasons)

    def recompute_thread(self, db: Session, thread_id: str, user_id: str) -> float:
        thread = thread_repository.get_by_id(db, thread_id, user_id)
        if not thread:
            return 0.0

        now = datetime.utcnow()
        is_snoozed = self.is_thread_snoozed(db, thread.id, now)
        open_commitments = commitment_repository.get_open_for_thread(db, thread.id)

        new_score = self.compute_score(thread, open_commitments, is_snoozed, now)
        thread_repository.update_attention_score(db, thread, new_score)
        return new_score

    def get_today_view(self, db: Session, user_id: str) -> TodayViewResponse:
        """
        Builds the Today View:
        1. Iterates active threads, recomputes attention scores & persists them.
        2. Selects Top 5 Attention Threads.
        3. Identifies Going-Cold threads.
        4. Queries commitments due today.
        """
        now = datetime.utcnow()
        active_threads = thread_repository.get_active_for_attention(db, user_id)

        evaluated_items: list[tuple[Thread, float, str, int, bool, int, int]] = []

        for t in active_threads:
            is_snoozed = self.is_thread_snoozed(db, t.id, now)
            open_commits = commitment_repository.get_open_for_thread(db, t.id)

            score = self.compute_score(t, open_commits, is_snoozed, now)
            # Update score in DB
            if abs(t.attention_score - score) > 0.01:
                thread_repository.update_attention_score(db, t, score)

            interaction_time = t.last_interaction_at or t.created_at
            days_since = int(max(0, (now - interaction_time).total_seconds() // 86400))
            is_cold = days_since >= t.going_cold_threshold_days
            reason = self.generate_reason(t, open_commits, days_since, now)

            overdue_count = sum(
                1 for c in open_commits if c.due_date and c.due_date < now
            )

            evaluated_items.append(
                (
                    t,
                    score,
                    reason,
                    days_since,
                    is_cold,
                    len(open_commits),
                    overdue_count,
                )
            )

        # Sort by attention score descending
        evaluated_items.sort(key=lambda item: item[1], reverse=True)

        # Top 5 threads
        top_threads = [
            AttentionThreadItem(
                thread=ThreadResponse.model_validate(item[0]),
                attention_score=item[1],
                attention_reason=item[2],
                days_since_interaction=item[3],
                is_going_cold=item[4],
                open_commitments_count=item[5],
                overdue_commitments_count=item[6],
            )
            for item in evaluated_items[:5]
            if item[1] > 0 or item[0].is_pinned  # score > 0 or pinned
        ]

        # Going-cold strip
        going_cold_items = [
            AttentionThreadItem(
                thread=ThreadResponse.model_validate(item[0]),
                attention_score=item[1],
                attention_reason=item[2],
                days_since_interaction=item[3],
                is_going_cold=item[4],
                open_commitments_count=item[5],
                overdue_commitments_count=item[6],
            )
            for item in evaluated_items
            if item[4]  # is_cold == True
        ]

        # Due today commitments
        start_of_day = datetime(now.year, now.month, now.day, 0, 0, 0)
        end_of_day = start_of_day + timedelta(days=1)
        due_commits = (
            db.query(Commitment, Thread.title)
            .join(Thread, Commitment.thread_id == Thread.id)
            .filter(
                Commitment.user_id == user_id,
                Commitment.status == CommitmentStatus.open,
                Commitment.due_date >= start_of_day,
                Commitment.due_date < end_of_day,
            )
            .order_by(Commitment.due_date.asc())
            .all()
        )

        due_today = [
            DueTodayItem(
                commitment=CommitmentResponse.model_validate(c),
                thread_title=title,
            )
            for c, title in due_commits
        ]

        return TodayViewResponse(
            top_threads=top_threads,
            due_today=due_today,
            going_cold=going_cold_items,
            generated_at=now,
        )


attention_service = AttentionService()

