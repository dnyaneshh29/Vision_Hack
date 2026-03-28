"""
Focus DNA Service — read-only analysis of user behavior patterns.
No existing tables or APIs modified.
"""
from __future__ import annotations
import uuid
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.models.session import Session, SessionStatus
from app.models.tab_log import TabLog
from app.models.event import Event, EventType
from app.models.momentum_score import MomentumScore


INTERNAL_DOMAINS = {"localhost", "127.0.0.1", "0.0.0.0", "", "newtab"}


def _is_internal(domain: str) -> bool:
    d = (domain or "").lower()
    return d in INTERNAL_DOMAINS or d.startswith("localhost:")


def _hour_label(hour: int) -> str:
    def fmt(h: int) -> str:
        if h == 0: return "12 AM"
        if h < 12: return f"{h} AM"
        if h == 12: return "12 PM"
        return f"{h - 12} PM"
    return fmt(hour)


async def compute_focus_dna(db: AsyncSession, user_id: uuid.UUID) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=30)

    # ── 1. Peak focus hours ───────────────────────────────────────────────────
    sessions_r = await db.execute(
        select(Session).where(
            and_(
                Session.user_id == user_id,
                Session.status == SessionStatus.completed,
                Session.started_at >= since,
                Session.deleted_at == None,
            )
        )
    )
    completed_sessions = sessions_r.scalars().all()

    hour_focus: dict[int, int] = defaultdict(int)   # hour → total focus secs
    hour_drift: dict[int, int] = defaultdict(int)   # hour → drift count

    for s in completed_sessions:
        if s.started_at:
            h = s.started_at.hour
            hour_focus[h] += s.focus_time_secs
            hour_drift[h] += s.drift_count

    peak_focus_hours = "Not enough data"
    if hour_focus:
        # Score each hour: high focus, low drift
        def hour_score(h: int) -> float:
            focus = hour_focus.get(h, 0)
            drift = hour_drift.get(h, 0)
            return focus - (drift * 300)  # penalise each drift by 5 min

        best_hour = max(hour_focus.keys(), key=hour_score)
        end_hour = (best_hour + 3) % 24
        peak_focus_hours = f"{_hour_label(best_hour)} – {_hour_label(end_hour)}"

    # ── 2. Most distracting domains ───────────────────────────────────────────
    distraction_r = await db.execute(
        select(TabLog.domain, func.count(TabLog.id).label("visits"), func.sum(TabLog.duration_secs).label("total_secs"))
        .join(Session, TabLog.session_id == Session.id)
        .where(
            and_(
                Session.user_id == user_id,
                TabLog.is_distraction == True,
                TabLog.logged_at >= since,
            )
        )
        .group_by(TabLog.domain)
        .order_by(func.sum(TabLog.duration_secs).desc())
        .limit(5)
    )
    distraction_rows = distraction_r.all()
    top_distractions = [
        row.domain for row in distraction_rows
        if row.domain and not _is_internal(row.domain)
    ]

    # ── 3. Best session length ────────────────────────────────────────────────
    best_session_length = 0
    if completed_sessions:
        # Sessions with momentum score >= 70 are "good" sessions
        good_sessions = [s for s in completed_sessions if s.momentum_score >= 70 and s.focus_time_secs > 0]
        if good_sessions:
            avg_secs = sum(s.focus_time_secs for s in good_sessions) / len(good_sessions)
            best_session_length = round(avg_secs / 60)
        else:
            avg_secs = sum(s.focus_time_secs for s in completed_sessions) / len(completed_sessions)
            best_session_length = round(avg_secs / 60)

    # ── 4. Focus trend ────────────────────────────────────────────────────────
    scores_r = await db.execute(
        select(MomentumScore.score, MomentumScore.calculated_at)
        .where(and_(MomentumScore.user_id == user_id, MomentumScore.calculated_at >= since))
        .order_by(MomentumScore.calculated_at)
    )
    scores = scores_r.all()

    focus_trend = "stable"
    if len(scores) >= 4:
        first_half = [s.score for s in scores[:len(scores) // 2]]
        second_half = [s.score for s in scores[len(scores) // 2:]]
        avg_first = sum(first_half) / len(first_half)
        avg_second = sum(second_half) / len(second_half)
        if avg_second > avg_first + 5:
            focus_trend = "improving"
        elif avg_second < avg_first - 5:
            focus_trend = "declining"

    return {
        "peak_focus_hours": peak_focus_hours,
        "top_distractions": top_distractions[:3],
        "best_session_length": best_session_length,
        "focus_trend": focus_trend,
        "sessions_analyzed": len(completed_sessions),
        "data_range_days": 30,
    }
