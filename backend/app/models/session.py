import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import enum


def utcnow():
    return datetime.now(timezone.utc)


class SessionStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    completed = "completed"
    abandoned = "abandoned"


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    intent: Mapped[str | None] = mapped_column(Text)
    outcome: Mapped[str | None] = mapped_column(Text)
    status: Mapped[SessionStatus] = mapped_column(
        SAEnum(SessionStatus, name="sessionstatus", create_type=False),
        default=SessionStatus.active,
        server_default="active",
    )
    color: Mapped[str | None] = mapped_column(String(7))
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    momentum_score: Mapped[int] = mapped_column(Integer, default=0)
    focus_time_secs: Mapped[int] = mapped_column(Integer, default=0)
    drift_count: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    paused_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user: Mapped["User"] = relationship("User", back_populates="sessions")
    notes: Mapped[list["Note"]] = relationship("Note", back_populates="session", lazy="select")
    checklist_items: Mapped[list["ChecklistItem"]] = relationship("ChecklistItem", back_populates="session", lazy="select")
    links: Mapped[list["Link"]] = relationship("Link", back_populates="session", lazy="select")
    tab_logs: Mapped[list["TabLog"]] = relationship("TabLog", back_populates="session", lazy="select")
    events: Mapped[list["Event"]] = relationship("Event", back_populates="session", lazy="select")
