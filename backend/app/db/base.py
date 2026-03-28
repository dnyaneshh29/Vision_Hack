from sqlalchemy.ext.asyncio import create_async_engine, AsyncAttrs
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=settings.ENVIRONMENT == "development")


class Base(AsyncAttrs, DeclarativeBase):
    pass
