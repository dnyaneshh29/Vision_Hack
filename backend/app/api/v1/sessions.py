import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.session import Session, SessionStatus
from app.schemas.session import SessionCreate, SessionUpdate, SessionComplete, SessionOut
from app.services.event_service import record_event
from app.services.momentum_service import compute_and_store_momentum
from app.models.event import EventType
from app.api.v1.utils import success_response

router = APIRouter(prefix="/sessions", tags=["sessions"])


class HeartbeatBody(BaseModel):
    focus_time_secs: int


async def get_session_or_404(session_id: str, user: User, db: AsyncSession) -> Session:
    result = await db.execute(
        select(Session).where(
            and_(Session.id == uuid.UUID(session_id), Session.user_id == user.id, Session.deleted_at == None)
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("")
async def list_sessions(
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Session).where(
        and_(Session.user_id == current_user.id, Session.deleted_at == None)
    )
    if status:
        query = query.where(Session.status == status)
    query = query.order_by(Session.updated_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    sessions = result.scalars().all()
    return success_response([SessionOut.model_validate(s) for s in sessions])


@router.post("", status_code=201)
async def create_session(
    body: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # STRICT FOCUS: Pause any currently active sessions first
    active_result = await db.execute(
        select(Session).where(and_(Session.user_id == current_user.id, Session.status == SessionStatus.active, Session.deleted_at == None))
    )
    for active_sess in active_result.scalars().all():
        active_sess.status = SessionStatus.paused
        active_sess.paused_at = datetime.now(timezone.utc)
        await record_event(db, active_sess.id, current_user.id, EventType.pause, {"reason": "auto_pause_new_session"})

    session = Session(
        user_id=current_user.id,
        title=body.title,
        intent=body.intent,
        description=body.description,
        color=body.color,
        tags=body.tags,
        status=SessionStatus.active,
        started_at=datetime.now(timezone.utc),
        focus_time_secs=0,
    )
    db.add(session)
    await db.flush()
    await record_event(db, session.id, current_user.id, EventType.start, {"title": body.title})
    if body.intent:
        await record_event(db, session.id, current_user.id, EventType.intent_set, {"intent": body.intent})
    await db.commit()
    await db.refresh(session)
    return success_response(SessionOut.model_validate(session))


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await get_session_or_404(session_id, current_user, db)
    return success_response(SessionOut.model_validate(session))


@router.patch("/{session_id}")
async def update_session(
    session_id: str,
    body: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await get_session_or_404(session_id, current_user, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(session, field, value)
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    return success_response(SessionOut.model_validate(session))


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await get_session_or_404(session_id, current_user, db)
    session.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.post("/{session_id}/heartbeat")
async def session_heartbeat(
    session_id: str,
    body: HeartbeatBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Called every 30s by the frontend to persist the live focus time.
    Stores the cumulative focus_time_secs so it survives page refresh.
    """
    session = await get_session_or_404(session_id, current_user, db)
    if session.status != SessionStatus.active:
        return success_response({"focus_time_secs": session.focus_time_secs})
    # Only update if the new value is larger (prevents clock drift issues)
    if body.focus_time_secs > session.focus_time_secs:
        session.focus_time_secs = body.focus_time_secs
        session.updated_at = datetime.now(timezone.utc)
        await db.commit()
    return success_response({"focus_time_secs": session.focus_time_secs})


@router.post("/{session_id}/pause")
async def pause_session(
    session_id: str,
    body: Optional[HeartbeatBody] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await get_session_or_404(session_id, current_user, db)
    if session.status != SessionStatus.active:
        raise HTTPException(status_code=400, detail="Session is not active")

    # Persist final focus time before pausing
    if body and body.focus_time_secs > session.focus_time_secs:
        session.focus_time_secs = body.focus_time_secs

    session.status = SessionStatus.paused
    session.paused_at = datetime.now(timezone.utc)
    await record_event(db, session.id, current_user.id, EventType.pause, {
        "focus_time_secs": session.focus_time_secs
    })
    await db.commit()
    await db.refresh(session)
    return success_response(SessionOut.model_validate(session))


@router.post("/{session_id}/resume")
async def resume_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await get_session_or_404(session_id, current_user, db)
    if session.status != SessionStatus.paused:
        raise HTTPException(status_code=400, detail="Session is not paused")
    
    # STRICT FOCUS: Pause any other currently active sessions first
    active_result = await db.execute(
        select(Session).where(and_(Session.user_id == current_user.id, Session.status == SessionStatus.active, Session.deleted_at == None))
    )
    for active_sess in active_result.scalars().all():
        if active_sess.id != session.id:
            active_sess.status = SessionStatus.paused
            active_sess.paused_at = datetime.now(timezone.utc)
            await record_event(db, active_sess.id, current_user.id, EventType.pause, {"reason": "auto_pause_resume_other"})

    session.status = SessionStatus.active
    session.resumed_at = datetime.now(timezone.utc)
    await record_event(db, session.id, current_user.id, EventType.resume, {})
    await db.commit()
    await db.refresh(session)
    return success_response(SessionOut.model_validate(session))


@router.post("/{session_id}/complete")
async def complete_session(
    session_id: str,
    body: SessionComplete,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await get_session_or_404(session_id, current_user, db)
    if session.status == SessionStatus.completed:
        raise HTTPException(status_code=400, detail="Session already completed")

    # Persist final focus time from body if provided
    if body.focus_time_secs and body.focus_time_secs > session.focus_time_secs:
        session.focus_time_secs = body.focus_time_secs

    # If focus_time_secs is still 0, calculate from started_at
    if session.focus_time_secs == 0 and session.started_at:
        elapsed = int((datetime.now(timezone.utc) - session.started_at).total_seconds())
        session.focus_time_secs = max(0, elapsed)

    session.status = SessionStatus.completed
    session.outcome = body.outcome
    session.completed_at = datetime.now(timezone.utc)
    await record_event(db, session.id, current_user.id, EventType.complete, {
        "outcome": body.outcome,
        "focus_time_secs": session.focus_time_secs,
    })

    ms = await compute_and_store_momentum(
        db=db,
        session_id=session.id,
        user_id=current_user.id,
        focus_time_secs=session.focus_time_secs,
        drift_count=session.drift_count,
        outcome_filled=bool(body.outcome),
    )
    session.momentum_score = ms.score
    await db.commit()
    await db.refresh(session)
    return success_response(SessionOut.model_validate(session))
