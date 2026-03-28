from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime


class TabLogCreate(BaseModel):
    session_id: uuid.UUID
    url: str
    title: Optional[str] = None
    domain: Optional[str] = None
    duration_secs: int = 0


class TabLogOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    session_id: uuid.UUID
    user_id: uuid.UUID
    url: str
    title: Optional[str]
    domain: Optional[str]
    duration_secs: int
    is_distraction: bool
    logged_at: datetime
