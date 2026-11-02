"""
models.py — SQLAlchemy ORM models for Threadwise.

Hierarchy:
  Thread (agenda)
    └── Club / Meeting Session (n clubs per thread, represents a live or recorded capture session with start & end)
          └── SubThread / Item (notes, follow_up, question, commitment with timestamp, club_id, person_id, deadline)

Entities:
  User, Thread, Person, ThreadPerson, Club, SubThread, Commitment,
  TimelineEvent, Summary, SnoozeRecord, Notification
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
#  Python Enum definitions
# ─────────────────────────────────────────────────────────────────────────────

class ThreadStatus(str, enum.Enum):
    active = "active"
    archived = "archived"


class SubThreadType(str, enum.Enum):
    """
    Predefined item types inside a club session or thread.
    'action' has been removed; commitments, follow-ups, notes, questions, decisions are supported.
    """
    note = "note"
    follow_up = "follow_up"
    question = "question"
    commitment = "commitment"
    decision = "decision"


class CaptureSource(str, enum.Enum):
    manual = "manual"
    live_capture = "live_capture"
    brain_dump = "brain_dump"
    extension = "extension"


class CaptureStatus(str, enum.Enum):
    inbox = "inbox"
    filed = "filed"


class CommitmentStatus(str, enum.Enum):
    open = "open"
    completed = "completed"


class TimelineEventType(str, enum.Enum):
    club_started = "club_started"
    club_ended = "club_ended"
    subthread_added = "subthread_added"
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


def _uuid() -> str:
    return str(uuid.uuid4())


# ─────────────────────────────────────────────────────────────────────────────
#  Models
# ─────────────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    email = Column(String(255), nullable=False, unique=True)
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(Text, nullable=True)
    going_cold_threshold_days = Column(Integer, nullable=False, default=14)
    digest_time = Column(String(5), nullable=False, default="08:00")
    digest_enabled = Column(Boolean, nullable=False, default=True)
    email_digest_enabled = Column(Boolean, nullable=False, default=False)
    notification_preferences = Column(JSON, nullable=False, default=lambda: {
        "dailyDigest": True,
        "commitmentDue": True,
        "goingCold": True,
        "preMeetingBrief": True,
        "reengagementDigest": True,
    })
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    last_active_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    threads = relationship("Thread", back_populates="user", cascade="all, delete-orphan")
    people = relationship("Person", back_populates="user", cascade="all, delete-orphan")
    clubs = relationship("Club", back_populates="user", cascade="all, delete-orphan")
    subthreads = relationship("SubThread", back_populates="user", cascade="all, delete-orphan")
    commitments = relationship("Commitment", back_populates="user", cascade="all, delete-orphan")
    snooze_records = relationship("SnoozeRecord", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Thread(Base):
    """
    A relationship thread / ongoing project.
    'agenda' represents the thread focus/name (synonymous with title).
    """
    __tablename__ = "threads"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    agenda = Column("title", String(100), nullable=False)  # mapped to existing title DB column
    description = Column(String(500), nullable=True)
    status = Column(SAEnum(ThreadStatus), nullable=False, default=ThreadStatus.active)
    is_pinned = Column(Boolean, nullable=False, default=False)
    going_cold_threshold_days = Column(Integer, nullable=False, default=14)
    attention_score = Column(Float, nullable=False, default=0.0)
    last_interaction_at = Column(DateTime, nullable=False, server_default=func.now())
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    archived_at = Column(DateTime, nullable=True)

    # Backward-compatibility property for title
    @property
    def title(self) -> str:
        return self.agenda

    @title.setter
    def title(self, value: str):
        self.agenda = value

    user = relationship("User", back_populates="threads")
    thread_people = relationship("ThreadPerson", back_populates="thread", cascade="all, delete-orphan")
    clubs = relationship("Club", back_populates="thread", cascade="all, delete-orphan")
    subthreads = relationship("SubThread", back_populates="thread")
    commitments = relationship("Commitment", back_populates="thread", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="thread", cascade="all, delete-orphan")
    summaries = relationship("Summary", back_populates="thread", cascade="all, delete-orphan")


class Person(Base):
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

    user = relationship("User", back_populates="people")
    thread_people = relationship("ThreadPerson", back_populates="person", cascade="all, delete-orphan")
    commitments = relationship("Commitment", back_populates="person")


class ThreadPerson(Base):
    __tablename__ = "thread_people"

    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="CASCADE"), primary_key=True)
    person_id = Column(String(36), ForeignKey("people.id", ondelete="CASCADE"), primary_key=True)
    added_at = Column(DateTime, nullable=False, server_default=func.now())

    thread = relationship("Thread", back_populates="thread_people")
    person = relationship("Person", back_populates="thread_people")


class Club(Base):
    """
    A capture session / meeting club under a Thread.
    Records when the user starts capturing, who attended, and when capturing ended.
    Groups all subthreads (notes, follow-ups, questions, commitments) generated during this session.
    """
    __tablename__ = "clubs"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=True)           # e.g., "Sprint Sync #4", "Meeting 7:00 PM"
    started_at = Column(DateTime, nullable=False, server_default=func.now())
    ended_at = Column(DateTime, nullable=True)          # null = currently capturing / in progress
    source = Column(SAEnum(CaptureSource), nullable=False, default=CaptureSource.extension)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="clubs")
    thread = relationship("Thread", back_populates="clubs")
    subthreads = relationship("SubThread", back_populates="club", cascade="all, delete-orphan")
    commitments = relationship("Commitment", back_populates="club")


class SubThread(Base):
    """
    An individual captured item (note, follow_up, question, commitment, decision)
    within a Club session or Thread.
    Replaces legacy Capture model while keeping compatibility with table 'captures'.
    """
    __tablename__ = "captures"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="SET NULL"), nullable=True)
    club_id = Column(String(36), ForeignKey("clubs.id", ondelete="SET NULL"), nullable=True)
    person_id = Column(String(36), ForeignKey("people.id", ondelete="SET NULL"), nullable=True)
    type = Column(SAEnum(SubThreadType), nullable=False, default=SubThreadType.note)
    content = Column(String(2000), nullable=False)
    source = Column(SAEnum(CaptureSource), nullable=False, default=CaptureSource.manual)
    status = Column(SAEnum(CaptureStatus), nullable=False, default=CaptureStatus.inbox)
    captured_at = Column(DateTime, nullable=False, server_default=func.now())
    deadline = Column(DateTime, nullable=True)          # optional deadline for follow_ups/commitments
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    is_edited = Column(Boolean, nullable=False, default=False)
    edited_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="subthreads")
    thread = relationship("Thread", back_populates="subthreads")
    club = relationship("Club", back_populates="subthreads")
    person = relationship("Person")


# Alias for backward compatibility if any legacy code imports Capture
Capture = SubThread


class Commitment(Base):
    """
    A tracked commitment made to/with a specific Person under a Thread with a deadline.
    """
    __tablename__ = "commitments"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False)
    person_id = Column("owner_person_id", String(36), ForeignKey("people.id", ondelete="SET NULL"), nullable=True)
    club_id = Column(String(36), ForeignKey("clubs.id", ondelete="SET NULL"), nullable=True)
    subthread_id = Column("capture_id", String(36), ForeignKey("captures.id", ondelete="SET NULL"), nullable=True)
    description = Column(String(500), nullable=False)
    status = Column(SAEnum(CommitmentStatus), nullable=False, default=CommitmentStatus.open)
    deadline = Column("due_date", DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    completion_note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # Compatibility aliases
    @property
    def due_date(self):
        return self.deadline

    @due_date.setter
    def due_date(self, val):
        self.deadline = val

    @property
    def owner_person_id(self):
        return self.person_id

    @owner_person_id.setter
    def owner_person_id(self, val):
        self.person_id = val

    user = relationship("User", back_populates="commitments")
    thread = relationship("Thread", back_populates="commitments")
    person = relationship("Person", back_populates="commitments")
    club = relationship("Club", back_populates="commitments")


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(String(36), primary_key=True, default=_uuid)
    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(SAEnum(TimelineEventType), nullable=False)
    reference_id = Column(String(36), nullable=True)
    event_metadata = Column("metadata", JSON, nullable=False, default=dict)
    occurred_at = Column(DateTime, nullable=False, server_default=func.now())

    thread = relationship("Thread", back_populates="timeline_events")


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(String(36), primary_key=True, default=_uuid)
    thread_id = Column(String(36), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(SAEnum(SummaryType), nullable=False)
    content = Column(JSON, nullable=False, default=dict)
    source_captures = Column(JSON, nullable=False, default=list)
    generated_at = Column(DateTime, nullable=False, server_default=func.now())
    is_stale = Column(Boolean, nullable=False, default=False)

    thread = relationship("Thread", back_populates="summaries")


class SnoozeRecord(Base):
    __tablename__ = "snooze_records"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(SAEnum(SnoozeTargetType), nullable=False)
    target_id = Column(String(36), nullable=False)
    snooze_until = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    user = relationship("User", back_populates="snooze_records")


class Notification(Base):
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

    user = relationship("User", back_populates="notifications")
