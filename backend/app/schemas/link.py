from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime


class LinkCreate(BaseModel):
    url: str
    title: Optional[str] = None
    favicon: Optional[str] = None


class LinkOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    session_id: uuid.UUID
    url: str
    title: Optional[str]
    favicon: Optional[str]
    visited_at: Optional[datetime]
    created_at: datetime
