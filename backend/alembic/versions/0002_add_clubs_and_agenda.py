"""add_clubs_and_agenda_updates

Revision ID: 0002_add_clubs_and_agenda
Revises: 0001_initial_schema
Create Date: 2026-11-02 15:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '0002_add_clubs_and_agenda'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing capturesource enum reuse
    capture_source_enum = postgresql.ENUM(
        'manual', 'live_capture', 'brain_dump', 'extension',
        name='capturesource',
        create_type=False
    )

    # 1. Create clubs table
    op.create_table(
        'clubs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('thread_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('started_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('source', capture_source_enum, nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['thread_id'], ['threads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Add club_id and deadline to captures table (which holds subthreads)
    op.add_column('captures', sa.Column('club_id', sa.String(length=36), nullable=True))
    op.add_column('captures', sa.Column('deadline', sa.DateTime(), nullable=True))
    op.create_foreign_key('fk_captures_club_id', 'captures', 'clubs', ['club_id'], ['id'], ondelete='SET NULL')

    # 3. Add club_id to commitments
    op.add_column('commitments', sa.Column('club_id', sa.String(length=36), nullable=True))
    op.create_foreign_key('fk_commitments_club_id', 'commitments', 'clubs', ['club_id'], ['id'], ondelete='SET NULL')

    # 4. Update capturetype enum values in PostgreSQL
    op.execute("ALTER TYPE capturetype ADD VALUE IF NOT EXISTS 'follow_up'")
    op.execute("ALTER TYPE capturetype ADD VALUE IF NOT EXISTS 'commitment'")


def downgrade() -> None:
    op.drop_constraint('fk_commitments_club_id', 'commitments', type_='foreignkey')
    op.drop_column('commitments', 'club_id')
    op.drop_constraint('fk_captures_club_id', 'captures', type_='foreignkey')
    op.drop_column('captures', 'deadline')
    op.drop_column('captures', 'club_id')
    op.drop_table('clubs')
