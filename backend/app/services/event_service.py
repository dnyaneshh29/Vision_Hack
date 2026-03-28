import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.event import Event, EventType


async def record_event(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    event_type: EventType,
    payload: dict | None = None,
) -> Event:
    event = Event(
        session_id=session_id,
        user_id=user_id,
        type=event_type,
        payload=payload or {},
    )
    db.add(event)
    await db.flush()
    return event
