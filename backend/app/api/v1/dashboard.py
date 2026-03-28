from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime, timezone, timedelta
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.event import Event
from app.models.session import Session, SessionStatus
from app.models.momentum_score import MomentumScore
from app.models.tab_log import TabLog
from app.models.checklist_item import ChecklistItem
from app.api.v1.utils import success_response

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/timeline")
async def get_timeline(
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(Event).where(
            and_(Event.user_id == current_user.id, Event.timestamp >= since)
        ).order_by(Event.timestamp)
    )
    events = result.scalars().all()
    grouped: dict = {}
    for e in events:
        day = e.timestamp.date().isoformat()
        if day not in grouped:
            grouped[day] = []
        grouped[day].append({
            "id": str(e.id),
            "type": e.type,
            "session_id": str(e.session_id),
            "payload": e.payload,
            "timestamp": e.timestamp.isoformat(),
        })
    return success_response(grouped)


@router.get("/momentum")
async def get_momentum(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=30)
    result = await db.execute(
        select(MomentumScore).where(
            and_(MomentumScore.user_id == current_user.id, MomentumScore.calculated_at >= since)
        ).order_by(MomentumScore.calculated_at)
    )
    scores = result.scalars().all()
    return success_response([{
        "date": s.calculated_at.date().isoformat(),
        "score": s.score,
        "focus_pct": float(s.focus_pct or 0),
        "tasks_done": s.tasks_done,
        "drift_events": s.drift_events,
        "session_id": str(s.session_id),
    } for s in scores])


@router.get("/cognitive")
async def get_cognitive(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=7)
    result = await db.execute(
        select(TabLog).join(Session).where(
            and_(Session.user_id == current_user.id, TabLog.logged_at >= since)
        )
    )
    tabs = result.scalars().all()
    daily: dict = {}
    for t in tabs:
        day = t.logged_at.date().isoformat()
        if day not in daily:
            daily[day] = {"deep": 0, "shallow": 0, "distraction": 0}
        if t.is_distraction:
            daily[day]["distraction"] += t.duration_secs
        elif t.duration_secs > 300:
            daily[day]["deep"] += t.duration_secs
        else:
            daily[day]["shallow"] += t.duration_secs
    return success_response(daily)


@router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    total_sessions = await db.execute(
        select(func.count()).select_from(Session).where(and_(Session.user_id == current_user.id, Session.deleted_at == None))
    )
    sessions_this_week = await db.execute(
        select(func.count()).select_from(Session).where(
            and_(Session.user_id == current_user.id, Session.created_at >= week_ago, Session.deleted_at == None)
        )
    )
    focus_result = await db.execute(
        select(func.sum(Session.focus_time_secs)).select_from(Session).where(
            and_(Session.user_id == current_user.id, Session.deleted_at == None)
        )
    )
    # For active sessions where focus_time_secs hasn't been persisted yet,
    # calculate elapsed time from started_at as a fallback
    active_sessions_result = await db.execute(
        select(Session).where(
            and_(
                Session.user_id == current_user.id,
                Session.status == SessionStatus.active,
                Session.deleted_at == None,
                Session.started_at != None,
            )
        )
    )
    active_sessions = active_sessions_result.scalars().all()
    now = datetime.now(timezone.utc)
    active_focus_secs = sum(
        max(0, int((now - s.started_at).total_seconds()) - s.focus_time_secs)
        for s in active_sessions
        if s.started_at is not None
    )
    total_focus_secs = (focus_result.scalar() or 0) + active_focus_secs
    avg_momentum = await db.execute(
        select(func.avg(MomentumScore.score)).select_from(MomentumScore).where(MomentumScore.user_id == current_user.id)
    )
    tasks_done = await db.execute(
        select(func.count()).select_from(ChecklistItem).join(Session).where(
            and_(Session.user_id == current_user.id, ChecklistItem.done == True)
        )
    )

    return success_response({
        "total_sessions": total_sessions.scalar() or 0,
        "sessions_this_week": sessions_this_week.scalar() or 0,
        "total_focus_hours": round(total_focus_secs / 3600, 1),
        "avg_momentum": round(float(avg_momentum.scalar() or 0), 1),
        "tasks_completed": tasks_done.scalar() or 0,
    })
