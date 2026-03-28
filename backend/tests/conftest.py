"""
Test configuration — creates fresh DB connections per test to avoid
asyncpg/Python 3.13 event loop issues.
"""
import pytest
import pytest_asyncio
import uuid
import asyncpg
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from urllib.parse import urlparse, unquote
from app.core.config import settings
from app.core.dependencies import get_db
from app.main import app

TEST_DB_NAME = "flowstate_test"
TEST_DB_URL = settings.DATABASE_URL.replace(f"/{settings.DB_NAME}", f"/{TEST_DB_NAME}")


def _conn_params() -> dict:
    parsed = urlparse(TEST_DB_URL.replace("postgresql+asyncpg://", "postgresql://"))
    return {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "user": parsed.username,
        "password": unquote(parsed.password or ""),
        "database": parsed.path.lstrip("/"),
    }


CREATE_SCHEMA_SQL = """
    DO $$ BEGIN CREATE TYPE sessionstatus AS ENUM ('active','paused','completed','abandoned');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN CREATE TYPE eventtype AS ENUM (
        'start','pause','resume','complete','tab_open',
        'note_added','task_done','drift_detected','intent_set');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        timezone VARCHAR(50) DEFAULT 'UTC',
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT, intent TEXT, outcome TEXT,
        status sessionstatus NOT NULL DEFAULT 'active',
        color VARCHAR(7), tags TEXT[],
        momentum_score INTEGER DEFAULT 0,
        focus_time_secs INTEGER DEFAULT 0,
        drift_count INTEGER DEFAULT 0,
        started_at TIMESTAMPTZ, paused_at TIMESTAMPTZ,
        resumed_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id),
        user_id UUID NOT NULL REFERENCES users(id),
        content TEXT NOT NULL, pinned BOOLEAN DEFAULT false,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS checklist_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id),
        text VARCHAR(500) NOT NULL, done BOOLEAN DEFAULT false,
        priority SMALLINT DEFAULT 0, position INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id),
        url VARCHAR(2000) NOT NULL, title VARCHAR(500), favicon VARCHAR(500),
        visited_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS tab_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id),
        user_id UUID NOT NULL REFERENCES users(id),
        url VARCHAR(2000) NOT NULL, title VARCHAR(500), domain VARCHAR(255),
        duration_secs INTEGER DEFAULT 0, is_distraction BOOLEAN DEFAULT false,
        logged_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES sessions(id),
        user_id UUID NOT NULL REFERENCES users(id),
        type eventtype NOT NULL, payload JSONB DEFAULT '{}',
        timestamp TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS momentum_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        session_id UUID NOT NULL REFERENCES sessions(id),
        score INTEGER NOT NULL, focus_pct NUMERIC(5,2),
        tasks_done INTEGER, drift_events INTEGER,
        calculated_at TIMESTAMPTZ DEFAULT NOW()
    );
"""


@pytest_asyncio.fixture
async def client():
    """Each test gets its own engine + client to avoid connection pool issues."""
    engine = create_async_engine(TEST_DB_URL, echo=False, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Ensure schema exists
    conn = await asyncpg.connect(**_conn_params())
    await conn.execute(CREATE_SCHEMA_SQL)
    await conn.close()

    async def _get_db():
        async with session_factory() as session:
            try:
                yield session
            finally:
                await session.close()

    app.dependency_overrides[get_db] = _get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    await engine.dispose()


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient):
    uid = str(uuid.uuid4())[:8]
    email = f"t_{uid}@test.com"
    r = await client.post("/api/v1/auth/register", json={
        "email": email, "username": f"u_{uid}", "password": "password123",
    })
    assert r.status_code == 201, f"Register failed: {r.text}"
    token = r.json()["data"]["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
