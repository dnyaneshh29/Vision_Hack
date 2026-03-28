from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from app.db.base import engine

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
