"""
models.py — SQLAlchemy ORM models for all Threadwise Phase 0 entities.

Entity list (from docs/06_data_model.md):
  User, Thread, Person, ThreadPerson, Capture, Commitment,
  TimelineEvent, Summary, SnoozeRecord, Notification

Design choices:
  - UUID primary keys (stored as TEXT for broad PostgreSQL + SQLite compat)
  - Python Enum types map to VARCHAR columns
  - JSON metadata stored via SQLAlchemy's JSON column type
  - server_default=func.now() ensures DB-side timestamp defaults
  - All nullable fields match the TypeScript interface optionals exactly
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.db import Base


# ─────────────────────────────────────────────────────────────────────────────
#  Python Enum definitions  (kept here so schemas.py can re-use them)
# ─────────────────────────────────────────────────────────────────────────────

class ThreadStatus(str, enum.Enum):
    active = "active"
    archived = "archived"


class CaptureType(str, enum.Enum):
    note = "note"
    action = "action"
    decision = "decision"
    question = "question"


class CaptureSource(str, enum.Enum):
    manual = "manual"
    live_capture = "live_capture"
    brain_dump = "brain_dump"
    extension = "extension"


class CaptureStatus(str, enum.Enum):
    inbox = "inbox"
    filed = "filed"


class CommitmentOwnerType(str, enum.Enum):
    me = "me"
    person = "person"


class CommitmentStatus(str, enum.Enum):
    open = "open"
    completed = "completed"


class TimelineEventType(str, enum.Enum):
    capture_added = "capture_added"
    commitment_created = "commitment_created"
    commitment_completed = "commitment_completed"
    person_added = "person_added"
    person_removed = "person_removed"
    thread_created = "thread_created"
    summary_generated = "summary_generated"
    brief_opened = "brief_opened"


class SummaryType(str, enum.Enum):
    where_we_left_off = "where_we_left_off"
    pre_meeting_brief = "pre_meeting_brief"


class SnoozeTargetType(str, enum.Enum):
    thread = "thread"
    commitment = "commitment"


class NotificationType(str, enum.Enum):
    daily_digest = "daily_digest"
    commitment_due = "commitment_due"
    going_cold = "going_cold"
    pre_meeting_brief = "pre_meeting_brief"
    reengagement_digest = "reengagement_digest"


# ─────────────────────────────────────────────────────────────────────────────
#  Helper
# ─────────────────────────────────────────────────────────────────────────────

def _uuid() -> str:
    return str(uuid.uuid4())


# ─────────────────────────────────────────────────────────────────────────────
#  Models
# ─────────────────────────────────────────────────────────────────────────────

class User(Base):
    """
    Single demo user for Phase 0 (Meera Krishnamurthy).
    Seeded by seed.py; no auth required for hackathon MVP.
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    email = Column(String(255), nullable=False, unique=True)
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(Text, nullable=True)
    going_cold_threshold_days = Column(Integer, nullable=False, default=14)
    digest_time = Column(String(5), nullable=False, default="08:00")
    digest_enabled = Column(Boolean, nullable=False, default=True)
    email_digest_enabled = Column(Boolean, nullable=False, default=False)
    # JSON: { dailyDigest, commitmentDue, goingCold, preMeetingBrief, reengagementDigest }
    notification_preferences = Column(JSON, nullable=False, default=lambda: {
        "dailyDigest": True,
        "commitmentDue": True,
        "goingCold": True,
        "preMeetingBrief": True,
        "reengagementDigest": True,
    })
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    last_active_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    threads = relationship("Thread", back_populates="user", cascade="all, delete-orphan")
    people = relationship("Person", back_populates="user", cascade="all, delete-orphan")
    captures = relationship("Capture", back_populates="user", cascade="all, delete-orphan")
    commitments = relationship("Commitment", back_populates="user", cascade="all, delete-orphan")
    snooze_records = relationship("SnoozeRecord", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Thread(Base):
    """
    A relationship thread — the top-level unit of Threadwise.
    Tracks an ongoing professional relationship or project.
    """
    __tablename__ = "threads"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    status = Column(SAEnum(ThreadStatus), nullable=False, default=ThreadStatus.active)
    is_pinned = Column(Boolean, nullable=False, default=False)
    going_cold_threshold_days = Column(Integer, nullable=False, default=14)
    attention_score = Column(Float, nullable=False, default=0.0)
    last_interaction_at = Column(DateTime, nullable=False, server_default=func.now())
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    archived_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="threads")
    thread_people = relationship("ThreadPerson", back_populates="thread", cascade="all, delete-orphan")
    captures = relationship("Capture", back_populates="thread")
    commitments = relationship("Commitment", back_populates="thread", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="thread", cascade="all, delete-orphan")
    summaries = relationship("Summary", back_populates="thread", cascade="all, delete-orphan")


class Person(Base):
    """
    A contact / person associated with one or more threads.
    """
    __tablename__ = "people"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    full_name = Column(String(255), nullable=False)
    organisation = Column(String(255), nullable=True)
    role = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    linked_in_url = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="people")
    thread_people = relationship("ThreadPerson", back_populates="person", cascade="all, delete-orphan")


class ThreadPerson(Base):
    """
    Many-to-many join table between Thread and Person.
    """
    __tablename__ = "thread_people"

    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="CASCADE"), primary_key=True)
    person_id = Column(String(36), ForeignKey("people.id", ondelete="CASCADE"), primary_key=True)
    added_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    thread = relationship("Thread", back_populates="thread_people")
    person = relationship("Person", back_populates="thread_people")


class Capture(Base):
    """
    A single captured note, action item, decision, or question.
    threadId = null means it lives in the Inbox until filed.
    """
    __tablename__ = "captures"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="SET NULL"), nullable=True)
    person_id = Column(String(36), ForeignKey("people.id", ondelete="SET NULL"), nullable=True)
    type = Column(SAEnum(CaptureType), nullable=False, default=CaptureType.note)
    content = Column(String(2000), nullable=False)
    source = Column(SAEnum(CaptureSource), nullable=False, default=CaptureSource.manual)
    status = Column(SAEnum(CaptureStatus), nullable=False, default=CaptureStatus.inbox)
    captured_at = Column(DateTime, nullable=False, server_default=func.now())
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    is_edited = Column(Boolean, nullable=False, default=False)
    edited_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="captures")
    thread = relationship("Thread", back_populates="captures")


class Commitment(Base):
    """
    A tracked commitment — either owned by 'me' or by another person.
    """
    __tablename__ = "commitments"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False)
    capture_id = Column(String(36), ForeignKey("captures.id", ondelete="SET NULL"), nullable=True)
    description = Column(String(500), nullable=False)
    owner_type = Column(SAEnum(CommitmentOwnerType), nullable=False, default=CommitmentOwnerType.me)
    owner_person_id = Column(String(36), ForeignKey("people.id", ondelete="SET NULL"), nullable=True)
    status = Column(SAEnum(CommitmentStatus), nullable=False, default=CommitmentStatus.open)
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    completion_note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="commitments")
    thread = relationship("Thread", back_populates="commitments")


class TimelineEvent(Base):
    """
    Immutable audit-trail event for a thread's timeline view.
    Created programmatically; never updated.
    """
    __tablename__ = "timeline_events"

    id = Column(String(36), primary_key=True, default=_uuid)
    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(SAEnum(TimelineEventType), nullable=False)
    reference_id = Column(String(36), nullable=True)   # ID of the related entity
    event_metadata = Column("metadata", JSON, nullable=False, default=dict)  # 'metadata' is reserved in SA declarative
    occurred_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    thread = relationship("Thread", back_populates="timeline_events")


class Summary(Base):
    """
    AI-generated (or stub) summary for a thread.
    type = 'where_we_left_off' or 'pre_meeting_brief'.
    """
    __tablename__ = "summaries"

    id = Column(String(36), primary_key=True, default=_uuid)
    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(SAEnum(SummaryType), nullable=False)
    # JSON matching SummaryContent interface from docs/06_data_model.md
    content = Column(JSON, nullable=False, default=dict)
    # Array of capture UUIDs used to generate this summary
    source_captures = Column(JSON, nullable=False, default=list)
    generated_at = Column(DateTime, nullable=False, server_default=func.now())
    is_stale = Column(Boolean, nullable=False, default=False)

    # Relationships
    thread = relationship("Thread", back_populates="summaries")


class SnoozeRecord(Base):
    """
    Snooze a thread or commitment until a specific future datetime.
    While snoozed, the attention score is forced to 0.
    """
    __tablename__ = "snooze_records"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(SAEnum(SnoozeTargetType), nullable=False)
    target_id = Column(String(36), nullable=False)
    snooze_until = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="snooze_records")


class Notification(Base):
    """
    Push / in-app notification record.
    Scheduled by the digest service; marked sent/read on delivery.
    """
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(SAEnum(NotificationType), nullable=False)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(String(36), nullable=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    deep_link_url = Column(String(500), nullable=False, default="")
    scheduled_at = Column(DateTime, nullable=False, server_default=func.now())
    sent_at = Column(DateTime, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)

    # Relationships
    user = relationship("User", back_populates="notifications")

