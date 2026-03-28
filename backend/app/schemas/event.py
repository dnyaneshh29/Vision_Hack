from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
from app.models.event import EventType


class EventOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    session_id: uuid.UUID
    user_id: uuid.UUID
    type: EventType
    payload: dict
    timestamp: datetime


class DriftEventCreate(BaseModel):
    session_id: uuid.UUID
    minutes_away: int
