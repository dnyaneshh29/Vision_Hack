"""initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Define enum types as plain SA objects (no create_constraint, no checkfirst issues)
session_status = sa.Enum(
    'active', 'paused', 'completed', 'abandoned',
    name='sessionstatus', create_type=False
)
event_type = sa.Enum(
    'start', 'pause', 'resume', 'complete', 'tab_open',
    'note_added', 'task_done', 'drift_detected', 'intent_set',
    name='eventtype', create_type=False
)


def upgrade() -> None:
    # Create ENUM types first using raw SQL (idempotent)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE sessionstatus AS ENUM ('active','paused','completed','abandoned');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE eventtype AS ENUM ('start','pause','resume','complete','tab_open',
                'note_added','task_done','drift_detected','intent_set');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("username", sa.String(100), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("avatar_url", sa.String(500)),
        sa.Column("timezone", sa.String(50), server_default="UTC"),
        sa.Column("preferences", postgresql.JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("intent", sa.Text),
        sa.Column("outcome", sa.Text),
        sa.Column("status", session_status, nullable=False, server_default="active"),
        sa.Column("color", sa.String(7)),
        sa.Column("tags", postgresql.ARRAY(sa.String)),
        sa.Column("momentum_score", sa.Integer, server_default="0"),
        sa.Column("focus_time_secs", sa.Integer, server_default="0"),
        sa.Column("drift_count", sa.Integer, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("paused_at", sa.DateTime(timezone=True)),
        sa.Column("resumed_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("session_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("pinned", sa.Boolean, server_default="false"),
        sa.Column("position", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "checklist_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("session_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("text", sa.String(500), nullable=False),
        sa.Column("done", sa.Boolean, server_default="false"),
        sa.Column("priority", sa.SmallInteger, server_default="0"),
        sa.Column("position", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("session_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("url", sa.String(2000), nullable=False),
        sa.Column("title", sa.String(500)),
        sa.Column("favicon", sa.String(500)),
        sa.Column("visited_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "tab_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("session_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=False),
        sa.Column("url", sa.String(2000), nullable=False),
        sa.Column("title", sa.String(500)),
        sa.Column("domain", sa.String(255)),
        sa.Column("duration_secs", sa.Integer, server_default="0"),
        sa.Column("is_distraction", sa.Boolean, server_default="false"),
        sa.Column("logged_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("session_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", event_type, nullable=False),
        sa.Column("payload", postgresql.JSONB, server_default="{}"),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "momentum_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column("focus_pct", sa.Numeric(5, 2)),
        sa.Column("tasks_done", sa.Integer),
        sa.Column("drift_events", sa.Integer),
        sa.Column("calculated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_index("idx_sessions_user_id_status", "sessions", ["user_id", "status"])
    op.create_index("idx_tab_logs_session_domain", "tab_logs", ["session_id", "domain"])
    op.create_index("idx_events_session_timestamp", "events", ["session_id", "timestamp"])
    op.create_index("idx_momentum_user_date", "momentum_scores", ["user_id", "calculated_at"])


def downgrade() -> None:
    op.drop_index("idx_momentum_user_date")
    op.drop_index("idx_events_session_timestamp")
    op.drop_index("idx_tab_logs_session_domain")
    op.drop_index("idx_sessions_user_id_status")
    op.drop_table("momentum_scores")
    op.drop_table("events")
    op.drop_table("tab_logs")
    op.drop_table("links")
    op.drop_table("checklist_items")
    op.drop_table("notes")
    op.drop_table("sessions")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS eventtype")
    op.execute("DROP TYPE IF EXISTS sessionstatus")
