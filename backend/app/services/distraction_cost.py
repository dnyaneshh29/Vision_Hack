"""
Distraction Cost Service — read-only calculation of time lost to distractions.
No existing tables or APIs modified.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.models.session import Session
from app.models.tab_log import TabLog
from app.models.event import Event, EventType


async def calculate_distraction_cost(
    db: AsyncSession,
    user_id: uuid.UUID,
    target_date: date,
) -> dict:
    # Date range: full day in UTC
    day_start = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=timezone.utc)
    day_end = datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59, tzinfo=timezone.utc)

    # ── 1. Distraction tab time ───────────────────────────────────────────────
    distraction_r = await db.execute(
        select(
            TabLog.domain,
            func.sum(TabLog.duration_secs).label("total_secs"),
            func.count(TabLog.id).label("visits"),
        )
        .join(Session, TabLog.session_id == Session.id)
        .where(
            and_(
                Session.user_id == user_id,
                TabLog.is_distraction == True,
                TabLog.logged_at >= day_start,
                TabLog.logged_at <= day_end,
            )
        )
        .group_by(TabLog.domain)
        .order_by(func.sum(TabLog.duration_secs).desc())
    )
    distraction_rows = distraction_r.all()

    distraction_secs = sum(r.total_secs or 0 for r in distraction_rows)
    top_source = distraction_rows[0].domain if distraction_rows else None

    # ── 2. Drift/idle time (each drift event = ~8 min idle) ──────────────────
    drift_r = await db.execute(
        select(func.count(Event.id))
        .join(Session, Event.session_id == Session.id)
        .where(
            and_(
                Session.user_id == user_id,
                Event.type == EventType.drift_detected,
                Event.timestamp >= day_start,
                Event.timestamp <= day_end,
            )
        )
    )
    drift_count = drift_r.scalar() or 0
    drift_secs = drift_count * 480  # 8 min per drift event

    # ── 3. Sessions affected ──────────────────────────────────────────────────
    affected_r = await db.execute(
        select(func.count(func.distinct(TabLog.session_id)))
        .join(Session, TabLog.session_id == Session.id)
        .where(
            and_(
                Session.user_id == user_id,
                TabLog.is_distraction == True,
                TabLog.logged_at >= day_start,
                TabLog.logged_at <= day_end,
            )
        )
    )
    sessions_affected = affected_r.scalar() or 0

    # ── 4. Domain breakdown ───────────────────────────────────────────────────
    domain_breakdown = [
        {
            "domain": r.domain,
            "minutes": round((r.total_secs or 0) / 60, 1),
            "visits": r.visits,
        }
        for r in distraction_rows[:5]
        if r.domain
    ]

    total_lost_secs = distraction_secs + drift_secs
    total_lost_minutes = round(total_lost_secs / 60, 1)

    severity = "low"
    if total_lost_minutes > 30:
        severity = "high"
    elif total_lost_minutes > 15:
        severity = "medium"

    return {
        "date": target_date.isoformat(),
        "total_distraction_minutes": total_lost_minutes,
        "distraction_tab_minutes": round(distraction_secs / 60, 1),
        "idle_drift_minutes": round(drift_secs / 60, 1),
        "top_source": top_source,
        "sessions_affected": sessions_affected,
        "domain_breakdown": domain_breakdown,
        "drift_events": drift_count,
        "severity": severity,
    }
