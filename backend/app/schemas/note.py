from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime


class NoteCreate(BaseModel):
    content: str
    pinned: bool = False


class NoteUpdate(BaseModel):
    content: Optional[str] = None
    pinned: Optional[bool] = None
    position: Optional[int] = None


class NoteOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    session_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    pinned: bool
    position: int
    created_at: datetime
    updated_at: datetime
