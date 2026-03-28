"""
Extension state endpoint — the Chrome extension POSTs its live state here
every 10 seconds. The dashboard reads it to show live tab tracking data.
This avoids all chrome.runtime/chrome.storage cross-origin issues.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.api.v1.utils import success_response

router = APIRouter(prefix="/extension", tags=["extension"])

# In-memory store per user (resets on server restart, that's fine)
_state_store: dict[str, dict] = {}


class ExtensionStateBody(BaseModel):
    session_id: Optional[str] = None
    open_tab_count: int = 0
    tabs_logged: int = 0
    active_tab_domain: Optional[str] = None
    active_tab_title: Optional[str] = None
    active_tab_url: Optional[str] = None
    domain_stats: dict = {}
    last_activity: Optional[int] = None  # unix ms timestamp
    is_active: bool = True


@router.post("/state")
async def push_extension_state(
    body: ExtensionStateBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Called by the Chrome extension every 10s to push live state."""
    _state_store[str(current_user.id)] = {
        **body.model_dump(),
        "connected": True,
        "updated_at": __import__("time").time() * 1000,
    }
    return success_response({"ok": True})


@router.get("/state")
async def get_extension_state(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Called by the dashboard to get live extension state."""
    state = _state_store.get(str(current_user.id))
    if not state:
        return success_response({"connected": False})

    # If last update was more than 60s ago, consider disconnected
    import time
    age_secs = (time.time() * 1000 - state.get("updated_at", 0)) / 1000
    if age_secs > 60:
        return success_response({"connected": False})

    return success_response(state)
