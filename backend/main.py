import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from api.session import router as session_router
from api.events import router as events_router
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


@app.get("/health")
def health():
    return {"status": "ok", "service": "BehaviorGuard"}


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