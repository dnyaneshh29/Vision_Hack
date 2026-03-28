"""
Analytics API — new endpoints only under /api/v1/analytics/
No existing endpoints modified.
"""
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.api.v1.utils import success_response
from app.services.focus_dna import compute_focus_dna
from app.services.distraction_cost import calculate_distraction_cost

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/focus-dna")
async def get_focus_dna(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns personalized Focus DNA based on 30 days of session history.
    Read-only — no writes.
    """
    result = await compute_focus_dna(db, current_user.id)
    return success_response(result)


@router.get("/distraction-cost")
async def get_distraction_cost(
    target_date: date = Query(default=None, description="Date in YYYY-MM-DD format, defaults to today"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns distraction cost for a given date (default: today).
    Read-only — no writes.
    """
    if target_date is None:
        target_date = datetime.now(timezone.utc).date()

    result = await calculate_distraction_cost(db, current_user.id, target_date)
    return success_response(result)
