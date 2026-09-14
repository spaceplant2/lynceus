
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models import (
    SNMPGetRequest, SNMPSetRequest, SNMPWalkRequest,
    SNMPResultResponse, SNMPWalkResultResponse
)
from app.snmp_service import snmp_get, snmp_set, snmp_walk

app = FastAPI(
    title="Lynceus SNMP Management API",
    version="0.1.0",
    description="Asynchronous backend for SNMP GET, SET, and WALK actions."
)

# CORS configuration for frontend web app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust origin rules in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "online", "system": "Lynceus Engine"}

@app.post("/api/v1/snmp/get", response_model=SNMPResultResponse)
async def handle_snmp_get(req: SNMPGetRequest):
    try:
        val = await snmp_get(req.ip, req.port, req.community, req.oid)
        return SNMPResultResponse(ip=req.ip, oid=req.oid, value=val)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/snmp/set", response_model=SNMPResultResponse)
async def handle_snmp_set(req: SNMPSetRequest):
    try:
        val = await snmp_set(req.ip, req.port, req.community, req.oid, req.value, req.value_type)
        return SNMPResultResponse(ip=req.ip, oid=req.oid, value=val)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/snmp/walk", response_model=SNMPWalkResultResponse)
async def handle_snmp_walk(req: SNMPWalkRequest):
    try:
        res = await snmp_walk(req.ip, req.port, req.community, req.oid)
        return SNMPWalkResultResponse(ip=req.ip, base_oid=req.oid, results=res)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
