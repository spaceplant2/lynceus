# backend/app/main.py
import asyncio
import json
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from app.config import settings, profile_manager, load_targets
from app.poller import SNMPPoller

# 1. MUST BE FIRST: Instantiate FastAPI app before any decorators (@app.get) reference it
app = FastAPI(title=settings.app_name, debug=settings.debug)

# CORS configuration for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the SNMP poller service
poller = SNMPPoller(targets_path=settings.targets_file, profile_manager=profile_manager)

@app.on_event("startup")
async def startup_event():
    # Start background polling loop
    asyncio.create_task(poller.start_polling(interval=settings.poll_interval_seconds))

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": settings.app_name}

@app.get("/api/profiles")
async def get_profiles():
    return profile_manager.get_profiles()

@app.get("/api/targets")
async def get_targets():
    return load_targets()

@app.get("/api/stream")
async def telemetry_stream(request: EventSourceResponse):
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            telemetry_data = poller.get_latest_telemetry()
            yield {
                "event": "message",
                "data": json.dumps(telemetry_data)
            }
            await asyncio.sleep(settings.poll_interval_seconds)

    return EventSourceResponse(event_generator())