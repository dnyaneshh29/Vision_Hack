import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.checklist_item import ChecklistItem
from app.models.tab_log import TabLog
from app.models.momentum_score import MomentumScore


def calculate_momentum(
    focus_time_secs: int,
    tasks_done: int,
    total_tasks: int,
    drift_count: int,
    outcome_filled: bool,
    unique_domains: int,
) -> int:
    base_score = 50

    focus_minutes = focus_time_secs / 60
    focus_bonus = min(30, (focus_minutes / 60) * 30)

    task_ratio = tasks_done / max(total_tasks, 1)
    task_bonus = task_ratio * 20

    drift_penalty = min(20, drift_count * 5)

    intent_bonus = 10 if outcome_filled else 0

    tab_bonus = max(0, 10 - unique_domains)

    final = base_score + focus_bonus + task_bonus - drift_penalty + intent_bonus + tab_bonus
    return max(0, min(100, int(final)))


async def compute_and_store_momentum(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    focus_time_secs: int,
    drift_count: int,
    outcome_filled: bool,
) -> MomentumScore:
    # Count tasks
    total_result = await db.execute(
        select(func.count()).where(ChecklistItem.session_id == session_id)
    )
    total_tasks = total_result.scalar() or 0

    done_result = await db.execute(
        select(func.count()).where(
            ChecklistItem.session_id == session_id,
            ChecklistItem.done == True,
        )
    )
    tasks_done = done_result.scalar() or 0

    # Count unique domains
    domain_result = await db.execute(
        select(func.count(func.distinct(TabLog.domain))).where(TabLog.session_id == session_id)
    )
    unique_domains = domain_result.scalar() or 0

    score = calculate_momentum(
        focus_time_secs=focus_time_secs,
        tasks_done=tasks_done,
        total_tasks=total_tasks,
        drift_count=drift_count,
        outcome_filled=outcome_filled,
        unique_domains=unique_domains,
    )

    focus_pct = max(0.0, min(100.0, 100.0 - (drift_count * 5)))

    ms = MomentumScore(
        user_id=user_id,
        session_id=session_id,
        score=score,
        focus_pct=round(focus_pct, 2),
        tasks_done=tasks_done,
        drift_events=drift_count,
    )
    db.add(ms)
    await db.flush()
    return ms
