"""
AI Context Summarizer — additive service, reads existing data, writes to ai_summaries table only.
No existing tables or APIs are modified.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.note import Note
from app.models.checklist_item import ChecklistItem
from app.models.tab_log import TabLog
from app.models.event import Event, EventType


def _fmt_secs(s: int) -> str:
    if s < 60:
        return f"{s}s"
    if s < 3600:
        return f"{s // 60}m"
    return f"{s // 3600}h {(s % 3600) // 60}m"


async def build_session_context(
    db: AsyncSession,
    session_id: uuid.UUID,
) -> dict:
    """
    Reads existing session data (notes, tasks, tabs, events) and builds
    a structured context dict. Pure read — no writes.
    """
    notes_r = await db.execute(
        select(Note).where(Note.session_id == session_id).order_by(Note.created_at)
    )
    notes = notes_r.scalars().all()

    tasks_r = await db.execute(
        select(ChecklistItem).where(ChecklistItem.session_id == session_id)
    )
    tasks = tasks_r.scalars().all()

    tabs_r = await db.execute(
        select(TabLog).where(TabLog.session_id == session_id).order_by(TabLog.logged_at.desc()).limit(20)
    )
    tabs = tabs_r.scalars().all()

    events_r = await db.execute(
        select(Event).where(Event.session_id == session_id).order_by(Event.timestamp)
    )
    events = events_r.scalars().all()

    done_tasks = [t for t in tasks if t.done]
    pending_tasks = [t for t in tasks if not t.done]
    distraction_tabs = [t for t in tabs if t.is_distraction]
    focus_tabs = [t for t in tabs if not t.is_distraction]
    drift_events = [e for e in events if e.type == EventType.drift_detected]

    top_domains: dict[str, int] = {}
    for tab in tabs:
        d = tab.domain or "unknown"
        # Skip internal domains — they're not meaningful in a summary
        if d in ("localhost", "127.0.0.1", "0.0.0.0", "", "newtab", "unknown") or d.startswith("localhost:"):
            continue
        top_domains[d] = top_domains.get(d, 0) + tab.duration_secs
    top_domains_sorted = sorted(top_domains.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "notes": [n.content for n in notes],
        "done_tasks": [t.text for t in done_tasks],
        "pending_tasks": [t.text for t in pending_tasks],
        "top_domains": top_domains_sorted,
        "distraction_count": len(distraction_tabs),
        "focus_tab_count": len(focus_tabs),
        "drift_count": len(drift_events),
        "total_tabs": len(tabs),
    }


def generate_rule_based_summary(
    title: str,
    intent: str | None,
    focus_time_secs: int,
    context: dict,
) -> str:
    """
    Generates a human-readable session summary using rule-based logic.
    No external API needed — works offline, zero latency.
    """
    lines = []

    lines.append(f"**{title}**")
    if intent:
        lines.append(f"Intent: {intent}")

    lines.append(f"Focus time: {_fmt_secs(focus_time_secs)}")

    if context["done_tasks"]:
        lines.append(f"Completed: {', '.join(context['done_tasks'][:3])}")
    if context["pending_tasks"]:
        lines.append(f"Still pending: {', '.join(context['pending_tasks'][:3])}")

    if context["notes"]:
        lines.append(f"Key note: {context['notes'][-1][:120]}")

    if context["top_domains"]:
        top = context["top_domains"][0]
        lines.append(f"Most time on: {top[0]} ({_fmt_secs(top[1])})")

    if context["drift_count"] > 0:
        lines.append(f"⚠ {context['drift_count']} focus drift(s) detected")

    if context["distraction_count"] > 0:
        lines.append(f"Distraction sites visited: {context['distraction_count']} tabs")

    return " · ".join(lines)


def generate_next_actions(context: dict, momentum_score: int) -> list[dict]:
    """
    Rule-based Next Best Action engine.
    Returns a list of suggested actions based on session state.
    Pure logic — no DB writes, no external calls.
    """
    actions = []

    if context["pending_tasks"]:
        actions.append({
            "type": "task",
            "priority": "high",
            "label": f"Finish: {context['pending_tasks'][0]}",
            "reason": "Highest priority pending task from your checklist",
        })

    if context["drift_count"] >= 2:
        actions.append({
            "type": "focus",
            "priority": "high",
            "label": "Enable Focus Mode — close distraction tabs",
            "reason": f"You drifted {context['drift_count']} times this session",
        })

    if context["distraction_count"] > 3:
        actions.append({
            "type": "warning",
            "priority": "medium",
            "label": "Reduce distraction browsing",
            "reason": f"{context['distraction_count']} distraction tabs visited",
        })

    if momentum_score < 50 and context["total_tabs"] > 10:
        actions.append({
            "type": "focus",
            "priority": "medium",
            "label": "Too many tabs open — consider closing some",
            "reason": "High tab count correlates with shallow work",
        })

    if not context["notes"] and focus_time_secs_from_context(context) > 1800:
        actions.append({
            "type": "note",
            "priority": "low",
            "label": "Add a note capturing your current progress",
            "reason": "No notes added yet in this session",
        })

    if not actions:
        actions.append({
            "type": "continue",
            "priority": "low",
            "label": "Keep going — you're on track",
            "reason": f"Momentum score: {momentum_score}",
        })

    return actions[:3]


def focus_time_secs_from_context(context: dict) -> int:
    return sum(v for _, v in context.get("top_domains", []))
