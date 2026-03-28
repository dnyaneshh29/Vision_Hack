import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.event import Event
from app.models.session import Session
from app.schemas.event import EventOut, DriftEventCreate
from app.services.event_service import record_event
from app.models.event import EventType
from app.models.session import SessionStatus
from app.api.v1.utils import success_response

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/{session_id}")
async def get_events(session_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session).where(and_(Session.id == uuid.UUID(session_id), Session.user_id == current_user.id))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    events_result = await db.execute(
        select(Event).where(Event.session_id == uuid.UUID(session_id)).order_by(Event.timestamp)
    )
    return success_response([EventOut.model_validate(e) for e in events_result.scalars().all()])


@router.post("/drift")
async def record_drift(body: DriftEventCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session).where(and_(Session.id == body.session_id, Session.user_id == current_user.id, Session.deleted_at == None))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != SessionStatus.active:
        raise HTTPException(status_code=400, detail="Session is not active")

    session.drift_count += 1
    event = await record_event(db, body.session_id, current_user.id, EventType.drift_detected, {
        "minutes_away": body.minutes_away
    })
    await db.commit()
    return success_response(EventOut.model_validate(event))
