"""
AI Insights API — new endpoints only, no existing endpoints modified.
Routes: /api/v1/ai/*
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.session import Session, SessionStatus
from app.api.v1.utils import success_response
from app.services.ai_context import (
    build_session_context,
    generate_rule_based_summary,
    generate_next_actions,
)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/sessions/{session_id}/summary")
async def get_session_summary(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns an AI-generated context summary for a session.
    Reads existing data only — no writes.
    """
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid session_id")

    result = await db.execute(
        select(Session).where(
            and_(Session.id == sid, Session.user_id == current_user.id, Session.deleted_at == None)
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    context = await build_session_context(db, sid)
    summary = generate_rule_based_summary(
        title=session.title,
        intent=session.intent,
        focus_time_secs=session.focus_time_secs,
        context=context,
    )

    return success_response({
        "session_id": session_id,
        "summary": summary,
        "context": context,
        "generated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    })


@router.get("/sessions/{session_id}/next-actions")
async def get_next_actions(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns suggested next actions based on current session state.
    Pure read + rule-based logic.
    """
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid session_id")

    result = await db.execute(
        select(Session).where(
            and_(Session.id == sid, Session.user_id == current_user.id, Session.deleted_at == None)
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    context = await build_session_context(db, sid)
    actions = generate_next_actions(context, session.momentum_score)

    return success_response({
        "session_id": session_id,
        "actions": actions,
        "momentum_score": session.momentum_score,
    })


@router.get("/focus-health")
async def get_focus_health(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a focus health score and insights based on recent sessions.
    Reads momentum_scores and sessions — no writes.
    """
    from sqlalchemy import func
    from datetime import datetime, timezone, timedelta
    from app.models.momentum_score import MomentumScore
    from app.models.tab_log import TabLog

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    # Recent momentum scores
    scores_r = await db.execute(
        select(MomentumScore).where(
            and_(MomentumScore.user_id == current_user.id, MomentumScore.calculated_at >= week_ago)
        ).order_by(MomentumScore.calculated_at.desc()).limit(10)
    )
    scores = scores_r.scalars().all()

    # Recent distraction tabs
    distraction_r = await db.execute(
        select(func.count()).select_from(TabLog).join(Session, TabLog.session_id == Session.id).where(
            and_(
                Session.user_id == current_user.id,
                TabLog.is_distraction == True,
                TabLog.logged_at >= week_ago,
            )
        )
    )
    distraction_count = distraction_r.scalar() or 0

    avg_score = sum(s.score for s in scores) / max(len(scores), 1)
    trend = "improving" if len(scores) >= 2 and scores[0].score > scores[-1].score else "stable"
    if len(scores) >= 2 and scores[0].score < scores[-1].score:
        trend = "declining"

    insights = []
    if avg_score >= 75:
        insights.append("You're in a strong focus streak — keep it up.")
    elif avg_score >= 50:
        insights.append("Moderate focus. Try reducing tab switching.")
    else:
        insights.append("Focus needs attention. Consider shorter, more intentional sessions.")

    if distraction_count > 20:
        insights.append(f"High distraction browsing this week ({distraction_count} tabs).")

    if trend == "improving":
        insights.append("Your momentum is trending upward this week.")
    elif trend == "declining":
        insights.append("Momentum has been declining — review your session habits.")

    return success_response({
        "avg_momentum_7d": round(avg_score, 1),
        "trend": trend,
        "sessions_analyzed": len(scores),
        "distraction_tabs_7d": distraction_count,
        "insights": insights,
        "health_score": min(100, int(avg_score - (distraction_count * 0.5))),
    })
