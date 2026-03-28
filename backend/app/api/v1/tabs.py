import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone, timedelta
from typing import Optional
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.tab_log import TabLog
from app.models.session import Session
from app.schemas.tab import TabLogCreate, TabLogOut
from app.services.event_service import record_event
from app.models.event import EventType, Event
from app.api.v1.utils import success_response

router = APIRouter(prefix="/tabs", tags=["tabs"])

DISTRACTION_DOMAINS = {
    "twitter.com", "x.com", "reddit.com", "youtube.com", "facebook.com",
    "instagram.com", "tiktok.com", "netflix.com", "twitch.tv", "discord.com",
    "whatsapp.com", "telegram.org", "linkedin.com", "news.ycombinator.com",
    "pinterest.com", "snapchat.com", "tumblr.com", "buzzfeed.com",
}

INTERNAL_DOMAINS = {"localhost", "127.0.0.1", "0.0.0.0", "", "newtab"}


def is_internal(domain: str) -> bool:
    d = (domain or "").lower().replace("www.", "")
    return d in INTERNAL_DOMAINS or d.startswith("localhost:")


def is_distraction(domain: str) -> bool:
    d = (domain or "").lower().replace("www.", "")
    return d in DISTRACTION_DOMAINS


def calculate_focus_pct(tabs_data: list[dict]) -> float:
    external = [t for t in tabs_data if not is_internal(t.get("domain", ""))]
    if not external:
        return 0.0
    total_secs = sum(t.get("duration_secs", 0) for t in external)
    distraction_secs = sum(
        t.get("duration_secs", 0) for t in external
        if t.get("is_distraction") or is_distraction(t.get("domain", ""))
    )
    base_pct = ((total_secs - distraction_secs) / total_secs * 100) if total_secs > 0 else 100.0
    session_hours = max(total_secs / 3600, 0.1)
    switches_per_hour = len(external) / session_hours
    switch_penalty = min(20.0, max(0.0, (switches_per_hour - 10) / 2.5))
    return round(max(0.0, min(100.0, base_pct - switch_penalty)), 1)


@router.post("/log", status_code=201)
async def log_tab(
    body: TabLogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        session_uuid = uuid.UUID(str(body.session_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail="Invalid session_id format")

    result = await db.execute(
        select(Session).where(
            and_(Session.id == session_uuid, Session.user_id == current_user.id, Session.deleted_at == None)
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    is_distraction_flag = is_distraction((body.domain or "").lower().replace("www.", ""))

    # Dedup: if the same URL was logged in the last 30 seconds, update its duration instead of inserting
    thirty_secs_ago = datetime.now(timezone.utc) - timedelta(seconds=30)
    recent_result = await db.execute(
        select(TabLog)
        .where(and_(
            TabLog.session_id == session_uuid,
            TabLog.url == body.url,
            TabLog.logged_at >= thirty_secs_ago,
        ))
        .order_by(TabLog.logged_at.desc())
        .limit(1)
    )
    existing_tab = recent_result.scalar_one_or_none()
    if existing_tab:
        # Update duration if the new value is larger (heartbeat with more time)
        if body.duration_secs > existing_tab.duration_secs:
            existing_tab.duration_secs = body.duration_secs
            await db.commit()
        return success_response(TabLogOut.model_validate(existing_tab))

    tab = TabLog(
        session_id=session_uuid,
        user_id=current_user.id,
        url=body.url,
        title=body.title,
        domain=body.domain,
        duration_secs=body.duration_secs,
        is_distraction=is_distraction_flag,
    )
    db.add(tab)

    # Avoid duplicate tab_open events for same domain+title back-to-back
    last_event_result = await db.execute(
        select(Event)
        .where(and_(Event.session_id == session_uuid, Event.type == EventType.tab_open))
        .order_by(Event.timestamp.desc())
        .limit(1)
    )
    last_event = last_event_result.scalar_one_or_none()

    should_record = True
    if last_event:
        prev = last_event.payload or {}
        if prev.get("url") == body.url and prev.get("domain") == body.domain:
            should_record = False

    if should_record:
        await record_event(db, session_uuid, current_user.id, EventType.tab_open, {
            "url": body.url,
            "title": body.title,
            "domain": body.domain,
            "duration_secs": body.duration_secs,
        })

    await db.commit()
    await db.refresh(tab)
    return success_response(TabLogOut.model_validate(tab))


# ── IMPORTANT: /history/all MUST be registered before /{session_id} ──────────
# FastAPI matches routes in order — if /{session_id} comes first, "history"
# gets matched as a session_id UUID and returns a 422 validation error.
@router.get("/history/all")
async def get_tab_history(
    days: int = Query(90, ge=1, le=365),
    domain: Optional[str] = Query(None),
    distraction_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    query = (
        select(TabLog)
        .join(Session, TabLog.session_id == Session.id)
        .where(
            and_(
                TabLog.user_id == current_user.id,
                TabLog.logged_at >= since,
                Session.deleted_at == None,
            )
        )
    )
    if domain:
        query = query.where(TabLog.domain == domain)
    if distraction_only:
        query = query.where(TabLog.is_distraction == True)

    query = query.order_by(TabLog.logged_at.desc())
    result = await db.execute(query)
    tabs = result.scalars().all()

    grouped: dict = {}
    for tab in tabs:
        day = tab.logged_at.date().isoformat()
        if day not in grouped:
            grouped[day] = {
                "date": day,
                "tabs": [],
                "domain_stats": {},
                "total_secs": 0,
                "distraction_secs": 0,
                "focus_secs": 0,
                "tab_count": 0,
                "unique_domains": set(),
            }
        entry = grouped[day]
        entry["tabs"].append(TabLogOut.model_validate(tab).model_dump())
        entry["tab_count"] += 1
        entry["unique_domains"].add(tab.domain or "")

        if not is_internal(tab.domain or ""):
            entry["total_secs"] += tab.duration_secs
            if tab.is_distraction or is_distraction(tab.domain or ""):
                entry["distraction_secs"] += tab.duration_secs
            else:
                entry["focus_secs"] += tab.duration_secs

        d = tab.domain or "unknown"
        if d not in entry["domain_stats"]:
            entry["domain_stats"][d] = {
                "domain": d,
                "visits": 0,
                "total_secs": 0,
                "is_distraction": tab.is_distraction or is_distraction(d),
                "is_internal": is_internal(d),
            }
        entry["domain_stats"][d]["visits"] += 1
        entry["domain_stats"][d]["total_secs"] += tab.duration_secs

    result_list = []
    for day_data in sorted(grouped.values(), key=lambda x: x["date"], reverse=True):
        day_data["unique_domain_count"] = len(day_data["unique_domains"])
        del day_data["unique_domains"]
        day_data["domain_stats"] = sorted(
            day_data["domain_stats"].values(),
            key=lambda x: x["total_secs"],
            reverse=True,
        )
        day_data["focus_pct"] = calculate_focus_pct(day_data["tabs"])
        result_list.append(day_data)

    total_tabs = sum(d["tab_count"] for d in result_list)
    total_secs = sum(d["total_secs"] for d in result_list)
    distraction_secs = sum(d["distraction_secs"] for d in result_list)
    all_tabs_flat = [tab for day_data in result_list for tab in day_data["tabs"]]
    overall_focus_pct = calculate_focus_pct(all_tabs_flat)

    all_domains: dict = {}
    for day_data in result_list:
        for ds in day_data["domain_stats"]:
            d = ds["domain"]
            if d not in all_domains:
                all_domains[d] = {"domain": d, "visits": 0, "total_secs": 0, "is_distraction": ds["is_distraction"]}
            all_domains[d]["visits"] += ds["visits"]
            all_domains[d]["total_secs"] += ds["total_secs"]

    top_domains = sorted(all_domains.values(), key=lambda x: x["total_secs"], reverse=True)[:15]

    return success_response({
        "days": result_list,
        "summary": {
            "total_tabs": total_tabs,
            "total_secs": total_secs,
            "distraction_secs": distraction_secs,
            "focus_secs": total_secs - distraction_secs,
            "focus_pct": overall_focus_pct,
            "days_tracked": len(result_list),
        },
        "top_domains": [d for d in top_domains if not is_internal(d["domain"])],
    })


@router.get("/{session_id}")
async def get_tabs_for_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid session_id format")

    result = await db.execute(
        select(Session).where(and_(Session.id == session_uuid, Session.user_id == current_user.id))
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    tabs_result = await db.execute(
        select(TabLog)
        .where(TabLog.session_id == session_uuid)
        .order_by(TabLog.logged_at.desc())
    )
    return success_response([TabLogOut.model_validate(t) for t in tabs_result.scalars().all()])
