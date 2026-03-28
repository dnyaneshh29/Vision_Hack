import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
import enum


def utcnow():
    return datetime.now(timezone.utc)


class EventType(str, enum.Enum):
    start = "start"
    pause = "pause"
    resume = "resume"
    complete = "complete"
    tab_open = "tab_open"
    note_added = "note_added"
    task_done = "task_done"
    drift_detected = "drift_detected"
    intent_set = "intent_set"


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type: Mapped[EventType] = mapped_column(
        SAEnum(EventType, name="eventtype", create_type=False),
        nullable=False,
    )
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    session: Mapped["Session"] = relationship("Session", back_populates="events")
