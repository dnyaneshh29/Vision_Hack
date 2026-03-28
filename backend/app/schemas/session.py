from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from app.models.session import SessionStatus


class SessionCreate(BaseModel):
    title: str
    intent: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    tags: Optional[list[str]] = None


class SessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    outcome: Optional[str] = None
    tags: Optional[list[str]] = None
    color: Optional[str] = None


class SessionComplete(BaseModel):
    outcome: str
    focus_time_secs: Optional[int] = None


class SessionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str]
    intent: Optional[str]
    outcome: Optional[str]
    status: SessionStatus
    color: Optional[str]
    tags: Optional[list[str]]
    momentum_score: int
    focus_time_secs: int
    drift_count: int
    started_at: Optional[datetime]
    paused_at: Optional[datetime]
    resumed_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
