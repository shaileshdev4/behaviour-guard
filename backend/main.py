import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv

# Load `.env` before any import that reads DATABASE_URL (db.database).
load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from api.session import router as session_router
from api.events import router as events_router
from api.auth import router as auth_router
from api.face import router as face_router
from api.voice import router as voice_router
from core.session_manager import get_session

app = FastAPI(title="BehaviorGuard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(face_router, prefix="/api")
app.include_router(voice_router, prefix="/api")


@app.on_event("startup")
def _startup_db():
    from db.database import init_db, db_available, check_connection

    init_db()
    if db_available():
        ok = check_connection()
        print(f"[db] DATABASE_URL configured, connection_ok={ok}")
    else:
        if os.getenv("DATABASE_URL", "").strip():
            print(
                "[db] DATABASE_URL is set but the engine failed (often missing "
                "`psycopg2-binary`: pip install psycopg2-binary). Auth/profile DB disabled."
            )
        else:
            print("[db] DATABASE_URL not set — profiles are in-memory only")

    auth_paths = sorted(
        getattr(r, "path", "")
        for r in app.routes
        if getattr(r, "path", "").startswith("/api/auth")
    )
    if auth_paths:
        print(f"[routes] auth: {auth_paths}")
    else:
        print(
            "[routes] WARNING: no /api/auth/* routes — "
            "restart uvicorn after pulling auth (use: uvicorn main:app --reload)"
        )


@app.get("/health")
def health():
    from db.database import db_available, check_connection

    db_ok = bool(db_available() and check_connection())
    return {"status": "ok", "service": "BehaviorGuard", "database": db_ok}


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    try:
        while True:
            session = get_session(session_id)
            if not session:
                await websocket.send_json({"error": "session not found"})
                break

            await websocket.send_json({
                "session_id":  session_id,
                "score":       round(session.current_score, 1),
                "state":       session.state.value,
                "phase":       session.phase.value,
                "window_count": session.window_count,
            })
            await asyncio.sleep(3)   # push update every 3 seconds

    except WebSocketDisconnect:
        pass