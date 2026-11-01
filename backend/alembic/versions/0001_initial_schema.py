"""initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-11-01 19:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('going_cold_threshold_days', sa.Integer(), nullable=False, server_default='14'),
        sa.Column('digest_time', sa.String(length=5), nullable=False, server_default='08:00'),
        sa.Column('digest_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('email_digest_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('notification_preferences', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_active_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

    # 2. Threads
    op.create_table(
        'threads',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('status', sa.Enum('active', 'archived', name='threadstatus'), nullable=False),
        sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('going_cold_threshold_days', sa.Integer(), nullable=False, server_default='14'),
        sa.Column('attention_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('last_interaction_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. People
    op.create_table(
        'people',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('organisation', sa.String(length=255), nullable=True),
        sa.Column('role', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('linked_in_url', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. ThreadPerson (join table)
    op.create_table(
        'thread_people',
        sa.Column('thread_id', sa.String(length=36), nullable=False),
        sa.Column('person_id', sa.String(length=36), nullable=False),
        sa.Column('added_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['person_id'], ['people.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['thread_id'], ['threads.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('thread_id', 'person_id')
    )

    # 5. Captures
    op.create_table(
        'captures',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('thread_id', sa.String(length=36), nullable=True),
        sa.Column('person_id', sa.String(length=36), nullable=True),
        sa.Column('type', sa.Enum('note', 'action', 'decision', 'question', name='capturetype'), nullable=False),
        sa.Column('content', sa.String(length=2000), nullable=False),
        sa.Column('source', sa.Enum('manual', 'live_capture', 'brain_dump', 'extension', name='capturesource'), nullable=False),
        sa.Column('status', sa.Enum('inbox', 'filed', name='capturestatus'), nullable=False),
        sa.Column('captured_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_edited', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('edited_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['person_id'], ['people.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['thread_id'], ['threads.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. Commitments
    op.create_table(
        'commitments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('thread_id', sa.String(length=36), nullable=False),
        sa.Column('capture_id', sa.String(length=36), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=False),
        sa.Column('owner_type', sa.Enum('me', 'person', name='commitmentownertype'), nullable=False),
        sa.Column('owner_person_id', sa.String(length=36), nullable=True),
        sa.Column('status', sa.Enum('open', 'completed', name='commitmentstatus'), nullable=False),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('completion_note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['capture_id'], ['captures.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['owner_person_id'], ['people.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['thread_id'], ['threads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 7. Timeline Events
    op.create_table(
        'timeline_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('thread_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('type', sa.Enum(
            'capture_added',
            'commitment_created',
            'commitment_completed',
            'person_added',
            'person_removed',
            'thread_created',
            'summary_generated',
            'brief_opened',
            name='timelineeventtype'
        ), nullable=False),
        sa.Column('reference_id', sa.String(length=36), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=False),
        sa.Column('occurred_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['thread_id'], ['threads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 8. Summaries
    op.create_table(
        'summaries',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('thread_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('type', sa.Enum('where_we_left_off', 'pre_meeting_brief', name='summarytype'), nullable=False),
        sa.Column('content', sa.JSON(), nullable=False),
        sa.Column('source_captures', sa.JSON(), nullable=False),
        sa.Column('generated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_stale', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['thread_id'], ['threads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 9. Snooze Records
    op.create_table(
        'snooze_records',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('target_type', sa.Enum('thread', 'commitment', name='snoozetargettype'), nullable=False),
        sa.Column('target_id', sa.String(length=36), nullable=False),
        sa.Column('snooze_until', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 10. Notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('type', sa.Enum(
            'daily_digest',
            'commitment_due',
            'going_cold',
            'pre_meeting_brief',
            'reengagement_digest',
            name='notificationtype'
        ), nullable=False),
        sa.Column('reference_type', sa.String(length=50), nullable=True),
        sa.Column('reference_id', sa.String(length=36), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('deep_link_url', sa.String(length=500), nullable=False, server_default=''),
        sa.Column('scheduled_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_table('snooze_records')
    op.drop_table('summaries')
    op.drop_table('timeline_events')
    op.drop_table('commitments')
    op.drop_table('captures')
    op.drop_table('thread_people')
    op.drop_table('people')
    op.drop_table('threads')
    op.drop_table('users')

