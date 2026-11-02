"""
schemas.py — Pydantic v2 request/response schemas for all Threadwise entities.

Naming convention:
  <Entity>Create  — fields accepted on POST (creation)
  <Entity>Update  — fields accepted on PATCH (partial update, all optional)
  <Entity>Response — fields returned to the client

Enum types are re-exported from models.py so routers only import schemas.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# Re-export enums so callers only need to import from schemas
from app.models import (
    CaptureSource,
    CaptureStatus,
    CaptureType,
    CommitmentOwnerType,
    CommitmentStatus,
    NotificationType,
    SnoozeTargetType,
    SummaryType,
    ThreadStatus,
    TimelineEventType,
)

__all__ = [
    # Enums
    "ThreadStatus", "CaptureType", "CaptureSource", "CaptureStatus",
    "CommitmentOwnerType", "CommitmentStatus", "TimelineEventType",
    "SummaryType", "SnoozeTargetType", "NotificationType",
    # User
    "UserResponse",
    # Thread
    "ThreadCreate", "ThreadUpdate", "ThreadResponse",
    # Person
    "PersonCreate", "PersonUpdate", "PersonResponse",
    # ThreadPerson
    "ThreadPersonResponse",
    # Capture
    "CaptureCreate", "CaptureUpdate", "CaptureResponse",
    "CaptureAssignRequest",
    # Commitment
    "CommitmentCreate", "CommitmentUpdate", "CommitmentResponse",
    "CommitmentCompleteRequest",
    # TimelineEvent
    "TimelineEventResponse",
    # Summary
    "SummaryContentSchema", "SummaryResponse",
    # SnoozeRecord
    "SnoozeCreate", "SnoozeResponse",
    # Notification
    "NotificationResponse", "NotificationPreferencesSchema", "NotificationPreferencesUpdate",
    "NotificationCreate",
    # Attention
    "AttentionThreadItem", "TodayViewResponse",
    # Search
    "SearchResultItem", "SearchResponse",
    # AI
    "AISummariseRequest", "AISummariseResponse",
    "AIBriefResponse", "AIClassifyRequest", "AIClassifyResponse",
]


# ─────────────────────────────────────────────────────────────────────────────
#  Shared base config
# ─────────────────────────────────────────────────────────────────────────────

class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
#  User
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
#  Thread
# ─────────────────────────────────────────────────────────────────────────────

class ThreadCreate(_Base):
    title: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_pinned: bool = False
    going_cold_threshold_days: int = Field(14, ge=1, le=365)


class ThreadUpdate(_Base):
    title: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_pinned: Optional[bool] = None
    going_cold_threshold_days: Optional[int] = Field(None, ge=1, le=365)
    status: Optional[ThreadStatus] = None


class ThreadResponse(_Base):
    id: str
    user_id: str
    title: str
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


# ─────────────────────────────────────────────────────────────────────────────
#  Person
# ─────────────────────────────────────────────────────────────────────────────

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
    source_id: str     # person to merge FROM (will be deleted)
    target_id: str     # person to merge INTO (will be kept)


# ─────────────────────────────────────────────────────────────────────────────
#  Capture
# ─────────────────────────────────────────────────────────────────────────────

class CaptureCreate(_Base):
    thread_id: Optional[str] = None   # null = goes to Inbox
    person_id: Optional[str] = None
    type: CaptureType = CaptureType.note
    content: str = Field(..., max_length=2000)
    source: CaptureSource = CaptureSource.manual
    captured_at: Optional[datetime] = None   # defaults to now server-side


class CaptureUpdate(_Base):
    thread_id: Optional[str] = None
    person_id: Optional[str] = None
    type: Optional[CaptureType] = None
    content: Optional[str] = Field(None, max_length=2000)
    status: Optional[CaptureStatus] = None


class CaptureAssignRequest(_Base):
    thread_id: str


class CaptureResponse(_Base):
    id: str
    user_id: str
    thread_id: Optional[str] = None
    person_id: Optional[str] = None
    type: CaptureType
    content: str
    source: CaptureSource
    status: CaptureStatus
    captured_at: datetime
    created_at: datetime
    updated_at: datetime
    is_edited: bool
    edited_at: Optional[datetime] = None


# ─────────────────────────────────────────────────────────────────────────────
#  Commitment
# ─────────────────────────────────────────────────────────────────────────────

class CommitmentCreate(_Base):
    thread_id: str
    capture_id: Optional[str] = None
    description: str = Field(..., max_length=500)
    owner_type: CommitmentOwnerType = CommitmentOwnerType.me
    owner_person_id: Optional[str] = None
    due_date: Optional[datetime] = None


class CommitmentUpdate(_Base):
    description: Optional[str] = Field(None, max_length=500)
    owner_type: Optional[CommitmentOwnerType] = None
    owner_person_id: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[CommitmentStatus] = None


class CommitmentCompleteRequest(_Base):
    completion_note: Optional[str] = None


class CommitmentResponse(_Base):
    id: str
    user_id: str
    thread_id: str
    capture_id: Optional[str] = None
    description: str
    owner_type: CommitmentOwnerType
    owner_person_id: Optional[str] = None
    status: CommitmentStatus
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completion_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
#  Timeline Event
# ─────────────────────────────────────────────────────────────────────────────

class TimelineEventResponse(_Base):
    id: str
    thread_id: str
    user_id: str
    type: TimelineEventType
    reference_id: Optional[str] = None
    event_metadata: dict[str, Any] = Field(alias="event_metadata")
    occurred_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
#  Summary
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
#  Snooze
# ─────────────────────────────────────────────────────────────────────────────

class SnoozeCreate(_Base):
    snooze_until: datetime


class SnoozeResponse(_Base):
    id: str
    user_id: str
    target_type: SnoozeTargetType
    target_id: str
    snooze_until: datetime
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
#  Notification
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
#  Attention Engine — Today View
# ─────────────────────────────────────────────────────────────────────────────

class AttentionThreadItem(_Base):
    """A thread surfaced on the Today view with its computed attention data."""
    thread: ThreadResponse
    attention_score: float
    attention_reason: str
    days_since_interaction: int
    is_going_cold: bool
    open_commitments_count: int
    overdue_commitments_count: int


class DueTodayItem(_Base):
    commitment: CommitmentResponse
    thread_title: str


class TodayViewResponse(_Base):
    top_threads: list[AttentionThreadItem]     # up to 5, highest score first
    due_today: list[DueTodayItem]              # commitments due today
    going_cold: list[AttentionThreadItem]      # threads at/past threshold
    generated_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
#  Search
# ─────────────────────────────────────────────────────────────────────────────

class SearchResultItem(_Base):
    entity_type: str        # "thread" | "person" | "capture" | "commitment"
    entity_id: str
    title: str
    snippet: str
    score: float


class SearchResponse(_Base):
    query: str
    results: list[SearchResultItem]
    total: int


# ─────────────────────────────────────────────────────────────────────────────
#  AI endpoints
# ─────────────────────────────────────────────────────────────────────────────

class AISummariseRequest(_Base):
    force_refresh: bool = False


class AISummariseResponse(_Base):
    summary: SummaryResponse
    was_cached: bool


class AIBriefResponse(_Base):
    brief: SummaryResponse


class AIClassifyRequest(_Base):
    content: str = Field(..., max_length=2000)


class AIClassifyResponse(_Base):
    suggested_type: CaptureType
    suggested_thread_id: Optional[str] = None
    confidence: float
    reasoning: str

