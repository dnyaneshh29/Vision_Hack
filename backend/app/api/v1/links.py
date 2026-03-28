import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.link import Link
from app.models.session import Session
from app.schemas.link import LinkCreate, LinkOut
from app.api.v1.utils import success_response

router = APIRouter(tags=["links"])


async def verify_session_access(session_id: str, user: User, db: AsyncSession) -> Session:
    result = await db.execute(
        select(Session).where(and_(Session.id == uuid.UUID(session_id), Session.user_id == user.id, Session.deleted_at == None))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/sessions/{session_id}/links")
async def list_links(session_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await verify_session_access(session_id, current_user, db)
    result = await db.execute(select(Link).where(Link.session_id == uuid.UUID(session_id)).order_by(Link.created_at.desc()))
    return success_response([LinkOut.model_validate(l) for l in result.scalars().all()])


@router.post("/sessions/{session_id}/links", status_code=201)
async def create_link(session_id: str, body: LinkCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    session = await verify_session_access(session_id, current_user, db)
    link = Link(session_id=session.id, url=body.url, title=body.title, favicon=body.favicon)
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return success_response(LinkOut.model_validate(link))


@router.delete("/links/{link_id}", status_code=204)
async def delete_link(link_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Link).join(Session).where(and_(Link.id == link_id, Session.user_id == current_user.id))
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    await db.delete(link)
    await db.commit()
