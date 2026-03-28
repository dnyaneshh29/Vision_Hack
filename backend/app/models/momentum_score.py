import uuid
from datetime import datetime, timezone
from sqlalchemy import Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc)


class MomentumScore(Base):
    __tablename__ = "momentum_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    focus_pct: Mapped[float | None] = mapped_column(Numeric(5, 2))
    tasks_done: Mapped[int | None] = mapped_column(Integer)
    drift_events: Mapped[int | None] = mapped_column(Integer)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
