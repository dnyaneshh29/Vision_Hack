import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
import traceback
import logging

from app.core.config import settings
from app.api.v1 import auth, sessions, notes, checklist, links, tabs, events, dashboard
from app.api.v1 import extension_state
from app.api.v1 import ai_insights

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FlowState OS+ API", version="1.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def error_response(code: str, message: str, status_code: int, details=None):
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {"code": code, "message": message, "details": details},
            "meta": {"timestamp": datetime.now(timezone.utc).isoformat(), "request_id": str(uuid.uuid4())},
        },
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error: {traceback.format_exc()}")
    return error_response("DATABASE_ERROR", "A database error occurred", 500)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {traceback.format_exc()}")
    return error_response("INTERNAL_ERROR", "An internal server error occurred", 500)


prefix = "/api/v1"
app.include_router(auth.router, prefix=prefix)
app.include_router(sessions.router, prefix=prefix)
app.include_router(notes.router, prefix=prefix)
app.include_router(checklist.router, prefix=prefix)
app.include_router(links.router, prefix=prefix)
app.include_router(tabs.router, prefix=prefix)
app.include_router(events.router, prefix=prefix)
app.include_router(dashboard.router, prefix=prefix)
app.include_router(extension_state.router, prefix=prefix)
app.include_router(ai_insights.router, prefix=prefix)


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}
