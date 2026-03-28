import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.checklist_item import ChecklistItem
from app.models.session import Session
from app.schemas.checklist import ChecklistItemCreate, ChecklistItemUpdate, ChecklistItemOut
from app.services.event_service import record_event
from app.models.event import EventType
from app.api.v1.utils import success_response

router = APIRouter(tags=["checklist"])


async def verify_session_access(session_id: str, user: User, db: AsyncSession) -> Session:
    result = await db.execute(
        select(Session).where(and_(Session.id == uuid.UUID(session_id), Session.user_id == user.id, Session.deleted_at == None))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/sessions/{session_id}/checklist")
async def list_checklist(session_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await verify_session_access(session_id, current_user, db)
    result = await db.execute(
        select(ChecklistItem).where(ChecklistItem.session_id == uuid.UUID(session_id)).order_by(ChecklistItem.position)
    )
    return success_response([ChecklistItemOut.model_validate(i) for i in result.scalars().all()])


@router.post("/sessions/{session_id}/checklist", status_code=201)
async def create_checklist_item(session_id: str, body: ChecklistItemCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    session = await verify_session_access(session_id, current_user, db)
    item = ChecklistItem(session_id=session.id, text=body.text, priority=body.priority)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return success_response(ChecklistItemOut.model_validate(item))


@router.patch("/checklist/{item_id}")
async def update_checklist_item(item_id: str, body: ChecklistItemUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChecklistItem).join(Session).where(and_(ChecklistItem.id == item_id, Session.user_id == current_user.id))
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    was_done = item.done
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    item.updated_at = datetime.now(timezone.utc)

    if not was_done and item.done:
        await record_event(db, item.session_id, current_user.id, EventType.task_done, {"task": item.text})

    await db.commit()
    await db.refresh(item)
    return success_response(ChecklistItemOut.model_validate(item))


@router.delete("/checklist/{item_id}", status_code=204)
async def delete_checklist_item(item_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChecklistItem).join(Session).where(and_(ChecklistItem.id == item_id, Session.user_id == current_user.id))
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    await db.delete(item)
    await db.commit()
