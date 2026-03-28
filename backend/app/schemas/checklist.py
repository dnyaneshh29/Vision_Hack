from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime


class ChecklistItemCreate(BaseModel):
    text: str
    priority: int = 0


class ChecklistItemUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None
    position: Optional[int] = None
    priority: Optional[int] = None


class ChecklistItemOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    session_id: uuid.UUID
    text: str
    done: bool
    priority: int
    position: int
    created_at: datetime
    updated_at: datetime
