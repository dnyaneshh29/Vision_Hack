from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime
import uuid


class Meta(BaseModel):
    timestamp: datetime
    request_id: str


class SuccessResponse(BaseModel):
    data: Any
    meta: Meta


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
    meta: Meta
