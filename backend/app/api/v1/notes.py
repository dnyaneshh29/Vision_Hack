import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.note import Note
from app.models.session import Session
from app.schemas.note import NoteCreate, NoteUpdate, NoteOut
from app.services.event_service import record_event
from app.models.event import EventType
from app.api.v1.utils import success_response

router = APIRouter(tags=["notes"])


async def verify_session_access(session_id: str, user: User, db: AsyncSession) -> Session:
    result = await db.execute(
        select(Session).where(and_(Session.id == uuid.UUID(session_id), Session.user_id == user.id, Session.deleted_at == None))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/sessions/{session_id}/notes")
async def list_notes(session_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await verify_session_access(session_id, current_user, db)
    result = await db.execute(
        select(Note).where(Note.session_id == uuid.UUID(session_id)).order_by(Note.pinned.desc(), Note.position)
    )
    return success_response([NoteOut.model_validate(n) for n in result.scalars().all()])


@router.post("/sessions/{session_id}/notes", status_code=201)
async def create_note(session_id: str, body: NoteCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    session = await verify_session_access(session_id, current_user, db)
    note = Note(session_id=session.id, user_id=current_user.id, content=body.content, pinned=body.pinned)
    db.add(note)
    await db.flush()
    await record_event(db, session.id, current_user.id, EventType.note_added, {"note_id": str(note.id), "preview": body.content[:80]})
    await db.commit()
    await db.refresh(note)
    return success_response(NoteOut.model_validate(note))


@router.patch("/notes/{note_id}")
async def update_note(note_id: str, body: NoteUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(and_(Note.id == note_id, Note.user_id == current_user.id)))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(note, field, value)
    note.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(note)
    return success_response(NoteOut.model_validate(note))


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Note).where(and_(Note.id == note_id, Note.user_id == current_user.id)))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
    await db.commit()
