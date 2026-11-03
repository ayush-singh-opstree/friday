"""
schemas.py — Pydantic v2 schemas for Threadwise with Clubs, SubThreads, and Agenda.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models import (
    CaptureSource,
    CaptureStatus,
    CommitmentOwnerType,
    CommitmentStatus,
    NotificationType,
    SnoozeTargetType,
    SubThreadType,
    SummaryType,
    ThreadStatus,
    TimelineEventType,
)

# Alias for legacy compatibility
CaptureType = SubThreadType

__all__ = [
    "ThreadStatus", "SubThreadType", "CaptureType", "CaptureSource", "CaptureStatus",
    "CommitmentStatus", "TimelineEventType", "SummaryType", "SnoozeTargetType",
    "NotificationType", "CommitmentOwnerType",
    # User
    "UserResponse",
    # Thread
    "ThreadCreate", "ThreadUpdate", "ThreadResponse", "ThreadSnoozeRequest",
    # Person
    "PersonCreate", "PersonUpdate", "PersonResponse", "ThreadPersonResponse",
    "ThreadAddPersonRequest", "PersonMergeRequest",
    # Club
    "ClubStartRequest", "ClubEndRequest", "ClubResponse", "ClubDetailResponse",
    # SubThread (Capture)
    "SubThreadCreate", "SubThreadUpdate", "SubThreadResponse",
    "CaptureCreate", "CaptureUpdate", "CaptureResponse", "CaptureAssignRequest",
    # Commitment
    "CommitmentCreate", "CommitmentUpdate", "CommitmentResponse", "CommitmentCompleteRequest",
    # Timeline
    "TimelineEventResponse",
    # Summary
    "SummaryContentSchema", "SummaryResponse",
    # Snooze
    "SnoozeCreate", "SnoozeResponse",
    # Notification
    "NotificationResponse", "NotificationPreferencesSchema", "NotificationPreferencesUpdate",
    "NotificationCreate",
    # Attention
    "AttentionThreadItem", "TodayViewResponse", "DueTodayItem",
    # Search
    "SearchResultItem", "SearchResponse",
    # AI
    "AISummariseRequest", "AISummariseResponse", "AIBriefResponse",
    "AIClassifyRequest", "AIClassifyResponse",
]


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ── User ──────────────────────────────────────────────────────────────────────

class NotificationPreferencesSchema(_Base):
    daily_digest: bool = True
    commitment_due: bool = True
    going_cold: bool = True
    pre_meeting_brief: bool = True
    reengagement_digest: bool = True


class UserResponse(_Base):
    id: str
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    going_cold_threshold_days: int
    digest_time: str
    digest_enabled: bool
    email_digest_enabled: bool
    notification_preferences: dict[str, Any]
    created_at: datetime
    last_active_at: datetime


# ── Thread (Agenda) ───────────────────────────────────────────────────────────

class ThreadCreate(_Base):
    agenda: str = Field(..., max_length=100, description="The agenda/focus of this thread (replaces title)")
    description: Optional[str] = Field(None, max_length=500)
    is_pinned: bool = False
    going_cold_threshold_days: int = Field(14, ge=1, le=365)
    person_ids: Optional[list[str]] = Field(default_factory=list, description="Initial contacts to link to this thread")

    # Compatibility alias
    @property
    def title(self) -> str:
        return self.agenda


class ThreadUpdate(_Base):
    agenda: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_pinned: Optional[bool] = None
    going_cold_threshold_days: Optional[int] = Field(None, ge=1, le=365)
    status: Optional[ThreadStatus] = None


class ThreadResponse(_Base):
    id: str
    user_id: str
    agenda: str = Field(alias="agenda")
    title: str = Field(alias="agenda")
    description: Optional[str] = None
    status: ThreadStatus
    is_pinned: bool
    going_cold_threshold_days: int
    attention_score: float
    last_interaction_at: datetime
    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime] = None


class ThreadSnoozeRequest(_Base):
    snooze_until: datetime


# ── Person ────────────────────────────────────────────────────────────────────

class PersonCreate(_Base):
    full_name: str = Field(..., max_length=255)
    organisation: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    linked_in_url: Optional[str] = None
    notes: Optional[str] = None


class PersonUpdate(_Base):
    full_name: Optional[str] = Field(None, max_length=255)
    organisation: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    linked_in_url: Optional[str] = None
    notes: Optional[str] = None


class PersonResponse(_Base):
    id: str
    user_id: str
    full_name: str
    organisation: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linked_in_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ThreadPersonResponse(_Base):
    thread_id: str
    person_id: str
    added_at: datetime
    person: Optional[PersonResponse] = None


class ThreadAddPersonRequest(_Base):
    person_id: str = Field(..., description="ID of the person to link to this thread")


class PersonMergeRequest(_Base):
    source_id: str
    target_id: str


# ── Club / Meeting Session ────────────────────────────────────────────────────

class ClubStartRequest(_Base):
    thread_id: str
    name: Optional[str] = Field(None, description="Optional meeting name e.g. 'Discovery Call' or 'Sprint Sync'")
    source: CaptureSource = CaptureSource.extension


class ClubEndRequest(_Base):
    ended_at: Optional[datetime] = None


class ClubResponse(_Base):
    id: str
    user_id: str
    thread_id: str
    name: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    source: CaptureSource
    created_at: datetime
    updated_at: datetime


# ── SubThread / Capture ───────────────────────────────────────────────────────

class SubThreadCreate(_Base):
    thread_id: Optional[str] = None
    club_id: Optional[str] = Field(None, description="Club/meeting session ID if captured during a meeting")
    person_id: Optional[str] = Field(None, description="Specific person associated with this note or commitment")
    type: SubThreadType = Field(SubThreadType.note, description="Predefined type: note, follow_up, question, commitment, decision")
    content: str = Field(..., max_length=2000)
    deadline: Optional[datetime] = Field(None, description="Deadline if this item is a commitment or follow-up")
    captured_at: Optional[datetime] = None
    source: CaptureSource = CaptureSource.manual


class SubThreadUpdate(_Base):
    club_id: Optional[str] = None
    person_id: Optional[str] = None
    type: Optional[SubThreadType] = None
    content: Optional[str] = Field(None, max_length=2000)
    deadline: Optional[datetime] = None
    status: Optional[CaptureStatus] = None


class SubThreadResponse(_Base):
    id: str
    user_id: str
    thread_id: Optional[str] = None
    club_id: Optional[str] = None
    person_id: Optional[str] = None
    type: SubThreadType
    content: str
    source: CaptureSource
    status: CaptureStatus
    captured_at: datetime
    deadline: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    is_edited: bool
    edited_at: Optional[datetime] = None


# Backward-compatible aliases
CaptureCreate = SubThreadCreate
CaptureUpdate = SubThreadUpdate
CaptureResponse = SubThreadResponse


class CaptureAssignRequest(_Base):
    thread_id: str
    club_id: Optional[str] = None


class ClubDetailResponse(ClubResponse):
    subthreads: list[SubThreadResponse] = Field(default_factory=list)


# ── Commitment ────────────────────────────────────────────────────────────────

class CommitmentCreate(_Base):
    thread_id: str = Field(..., description="Under which thread I committed this commitment")
    person_id: Optional[str] = Field(
        None, description="Whom I committed something to (required only when owner_type is 'person')"
    )
    club_id: Optional[str] = Field(None, description="Optional club/meeting during which commitment was made")
    subthread_id: Optional[str] = Field(None, description="Linked subthread/capture ID")
    description: str = Field(..., max_length=500)
    owner_type: Optional[CommitmentOwnerType] = Field(
        None, description="Who owns the commitment: 'me' (the user) or a 'person'. Defaults to 'me'."
    )
    deadline: Optional[datetime] = Field(None, description="Proper deadline for this commitment")

    # Compatibility alias for due_date
    @property
    def due_date(self) -> Optional[datetime]:
        return self.deadline


class CommitmentUpdate(_Base):
    description: Optional[str] = Field(None, max_length=500)
    person_id: Optional[str] = None
    owner_type: Optional[CommitmentOwnerType] = None
    deadline: Optional[datetime] = None
    status: Optional[CommitmentStatus] = None


class CommitmentCompleteRequest(_Base):
    completion_note: Optional[str] = None


class CommitmentResponse(_Base):
    id: str
    user_id: str
    thread_id: str
    person_id: Optional[str] = None
    club_id: Optional[str] = None
    subthread_id: Optional[str] = None
    description: str
    owner_type: CommitmentOwnerType
    status: CommitmentStatus
    deadline: Optional[datetime] = Field(None, alias="deadline")
    due_date: Optional[datetime] = Field(None, alias="deadline")
    completed_at: Optional[datetime] = None
    completion_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ── Timeline ──────────────────────────────────────────────────────────────────

class TimelineEventResponse(_Base):
    id: str
    thread_id: str
    user_id: str
    type: TimelineEventType
    reference_id: Optional[str] = None
    event_metadata: dict[str, Any] = Field(alias="event_metadata")
    occurred_at: datetime


# ── Summary ───────────────────────────────────────────────────────────────────

class SummaryContentSchema(_Base):
    last_contact_date: Optional[datetime] = None
    last_contact_summary: str = ""
    key_topics: list[str] = Field(default_factory=list)
    open_commitments: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    talking_points: Optional[list[str]] = None


class SummaryResponse(_Base):
    id: str
    thread_id: str
    user_id: str
    type: SummaryType
    content: dict[str, Any]
    source_captures: list[str]
    generated_at: datetime
    is_stale: bool


# ── Snooze ────────────────────────────────────────────────────────────────────

class SnoozeCreate(_Base):
    snooze_until: datetime


class SnoozeResponse(_Base):
    id: str
    user_id: str
    target_type: SnoozeTargetType
    target_id: str
    snooze_until: datetime
    created_at: datetime


# ── Notification ──────────────────────────────────────────────────────────────

class NotificationCreate(_Base):
    type: NotificationType
    title: str = Field(..., max_length=255)
    body: str
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    deep_link_url: str = ""
    scheduled_at: Optional[datetime] = None


class NotificationPreferencesUpdate(_Base):
    daily_digest: Optional[bool] = None
    commitment_due: Optional[bool] = None
    going_cold: Optional[bool] = None
    pre_meeting_brief: Optional[bool] = None
    reengagement_digest: Optional[bool] = None
    digest_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    digest_enabled: Optional[bool] = None
    email_digest_enabled: Optional[bool] = None


class NotificationResponse(_Base):
    id: str
    user_id: str
    type: NotificationType
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    title: str
    body: str
    deep_link_url: str
    scheduled_at: datetime
    sent_at: Optional[datetime] = None
    is_read: bool


# ── Attention Engine ──────────────────────────────────────────────────────────

class AttentionThreadItem(_Base):
    thread: ThreadResponse
    attention_score: float
    attention_reason: str
    days_since_interaction: int
    is_going_cold: bool
    open_commitments_count: int
    overdue_commitments_count: int


class DueTodayItem(_Base):
    commitment: CommitmentResponse
    thread_agenda: str = Field(alias="thread_title")
    thread_title: str = Field(alias="thread_title")


class TodayViewResponse(_Base):
    top_threads: list[AttentionThreadItem]
    due_today: list[DueTodayItem]
    going_cold: list[AttentionThreadItem]
    generated_at: datetime


# ── Search ────────────────────────────────────────────────────────────────────

class SearchResultItem(_Base):
    entity_type: str
    entity_id: str
    title: str
    snippet: str
    score: float


class SearchResponse(_Base):
    query: str
    results: list[SearchResultItem]
    total: int


# ── AI ────────────────────────────────────────────────────────────────────────

class AISummariseRequest(_Base):
    force_refresh: bool = False


class AISummariseResponse(_Base):
    summary: SummaryResponse
    was_cached: bool


class AIBriefResponse(_Base):
    brief: SummaryResponse


class AIClassifyRequest(_Base):
    content: Optional[str] = Field(None, max_length=10000)
    lines: Optional[list[str]] = None


class AIClassifyResponse(_Base):
    line: Optional[str] = None
    suggested_type: SubThreadType
    suggested_thread_id: Optional[str] = None
    confidence: float
    reasoning: str
    source: str = "ai"
