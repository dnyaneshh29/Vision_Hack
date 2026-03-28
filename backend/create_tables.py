"""
Direct table creation script — bypasses Alembic ENUM issues.
Run once: python create_tables.py
"""
import asyncio
import asyncpg
from app.core.config import settings
from urllib.parse import urlparse, unquote

async def main():
    # Parse connection params from DATABASE_URL
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    parsed = urlparse(url)
    conn = await asyncpg.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=parsed.username,
        password=unquote(parsed.password),
        database=parsed.path.lstrip("/"),
    )

    print("Connected. Creating schema...")

    await conn.execute("""
        DO $$ BEGIN
            CREATE TYPE sessionstatus AS ENUM ('active','paused','completed','abandoned');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
            CREATE TYPE eventtype AS ENUM (
                'start','pause','resume','complete','tab_open',
                'note_added','task_done','drift_detected','intent_set'
            );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

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
            description TEXT,
            intent TEXT,
            outcome TEXT,
            status sessionstatus NOT NULL DEFAULT 'active',
            color VARCHAR(7),
            tags TEXT[],
            momentum_score INTEGER DEFAULT 0,
            focus_time_secs INTEGER DEFAULT 0,
            drift_count INTEGER DEFAULT 0,
            started_at TIMESTAMPTZ,
            paused_at TIMESTAMPTZ,
            resumed_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS notes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES sessions(id),
            user_id UUID NOT NULL REFERENCES users(id),
            content TEXT NOT NULL,
            pinned BOOLEAN DEFAULT false,
            position INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS checklist_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES sessions(id),
            text VARCHAR(500) NOT NULL,
            done BOOLEAN DEFAULT false,
            priority SMALLINT DEFAULT 0,
            position INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS links (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES sessions(id),
            url VARCHAR(2000) NOT NULL,
            title VARCHAR(500),
            favicon VARCHAR(500),
            visited_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS tab_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES sessions(id),
            user_id UUID NOT NULL REFERENCES users(id),
            url VARCHAR(2000) NOT NULL,
            title VARCHAR(500),
            domain VARCHAR(255),
            duration_secs INTEGER DEFAULT 0,
            is_distraction BOOLEAN DEFAULT false,
            logged_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id UUID NOT NULL REFERENCES sessions(id),
            user_id UUID NOT NULL REFERENCES users(id),
            type eventtype NOT NULL,
            payload JSONB DEFAULT '{}',
            timestamp TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS momentum_scores (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id),
            session_id UUID NOT NULL REFERENCES sessions(id),
            score INTEGER NOT NULL,
            focus_pct NUMERIC(5,2),
            tasks_done INTEGER,
            drift_events INTEGER,
            calculated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Alembic version stamp
        CREATE TABLE IF NOT EXISTS alembic_version (
            version_num VARCHAR(32) NOT NULL PRIMARY KEY
        );
        INSERT INTO alembic_version (version_num)
        VALUES ('0001')
        ON CONFLICT DO NOTHING;

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id_status ON sessions(user_id, status);
        CREATE INDEX IF NOT EXISTS idx_tab_logs_session_domain ON tab_logs(session_id, domain);
        CREATE INDEX IF NOT EXISTS idx_events_session_timestamp ON events(session_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_momentum_user_date ON momentum_scores(user_id, calculated_at);
    """)

    print("All tables created successfully!")
    await conn.close()

asyncio.run(main())
