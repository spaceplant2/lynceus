from fastapi import FastAPI, HTTPException
from typing import List, Optional
from pydantic import BaseModel

# Standard PySNMP High-Level API Imports
from pysnmp.hlapi.v3arch.asyncio import (
    get_cmd, set_cmd, next_cmd,
    SnmpEngine, CommunityData, UdpTransportTarget,
    ContextData, ObjectType, ObjectIdentity
)
from pysnmp.proto.rfc1902 import Integer32, OctetString

# Phase 1 Lynceus Imports
from app.config import load_devices_config
from app.models import DeviceTelemetryResponse, ProtocolType
from app.drivers.mock import MockDriver

app = FastAPI(title="Lynceus Power Hub API")


# ============================================================================
# 1. SNMP Utility Endpoints (Diagnostics & Manual OID Testing)
# ============================================================================

class SnmpRequest(BaseModel):
    host: str
    community: str = "public"
    oid: str
    port: int = 161

class SnmpSetRequest(BaseModel):
    host: str
    community: str = "private"
    oid: str
    value: str
    type: str = "string"  # "string" or "integer"
    port: int = 161


@app.post("/api/snmp/get")
async def snmp_get(req: SnmpRequest):
    """Retrieves a single OID value from an SNMP-enabled target."""
    iterator = getCmd(
        SnmpEngine(),
        CommunityData(req.community, mpModel=1),
        UdpTransportTarget((req.host, req.port), timeout=2.0, retries=1),
        ContextData(),
        ObjectType(ObjectIdentity(req.oid))
    )

    errorIndication, errorStatus, errorIndex, varBinds = next(iterator)

    if errorIndication:
        raise HTTPException(status_code=500, detail=str(errorIndication))
    elif errorStatus:
        raise HTTPException(
            status_code=400,
            detail=f"{errorStatus.prettyPrint()} at {errorIndex and varBinds[int(errorIndex) - 1][0] or '?'}"
        )

    results = []
    for varBind in varBinds:
        results.append({
            "oid": str(varBind[0]),
            "value": str(varBind[1])
        })

    return {"status": "success", "data": results}


@app.post("/api/snmp/set")
async def snmp_set(req: SnmpSetRequest):
    """Modifies a parameter on an SNMP-enabled target."""
    if req.type.lower() == "integer":
        try:
            val_object = Integer32(int(req.value))
        except ValueError:
            raise HTTPException(status_code=400, detail="Value must be a valid integer.")
    else:
        val_object = OctetString(req.value)

    iterator = setCmd(
        SnmpEngine(),
        CommunityData(req.community, mpModel=1),
        UdpTransportTarget((req.host, req.port), timeout=2.0, retries=1),
        ContextData(),
        ObjectType(ObjectIdentity(req.oid), val_object)
    )

    errorIndication, errorStatus, errorIndex, varBinds = next(iterator)

    if errorIndication:
        raise HTTPException(status_code=500, detail=str(errorIndication))
    elif errorStatus:
        raise HTTPException(
            status_code=400,
            detail=f"{errorStatus.prettyPrint()} at {errorIndex and varBinds[int(errorIndex) - 1][0] or '?'}"
        )

    results = []
    for varBind in varBinds:
        results.append({
            "oid": str(varBind[0]),
            "value": str(varBind[1])
        })

    return {"status": "success", "data": results}


@app.post("/api/snmp/walk")
async def snmp_walk(req: SnmpRequest):
    """Traverses an SNMP subtree starting at the provided base OID."""
    results = []
    
    for (errorIndication, errorStatus, errorIndex, varBinds) in nextCmd(
        SnmpEngine(),
        CommunityData(req.community, mpModel=1),
        UdpTransportTarget((req.host, req.port), timeout=2.0, retries=1),
        ContextData(),
        ObjectType(ObjectIdentity(req.oid)),
        lexicographicMode=False
    ):
        if errorIndication:
            raise HTTPException(status_code=500, detail=str(errorIndication))
        elif errorStatus:
            raise HTTPException(
                status_code=400,
                detail=f"{errorStatus.prettyPrint()} at {errorIndex and varBinds[int(errorIndex) - 1][0] or '?'}"
            )
        else:
            for varBind in varBinds:
                results.append({
                    "oid": str(varBind[0]),
                    "value": str(varBind[1])
                })

    return {"status": "success", "count": len(results), "data": results}


# ============================================================================
# 2. Phase 1 Power Infrastructure Dashboard Routes
# ============================================================================

@app.get("/api/devices", response_model=List[DeviceTelemetryResponse])
async def get_all_devices():
    """Polls all configured devices from devices.yaml using their assigned drivers."""
    devices_config = load_devices_config("devices.yaml")
    results = []

    for dev in devices_config:
        if dev.protocol == ProtocolType.MOCK:
            driver = MockDriver(dev)
            telemetry = await driver.poll()
            results.append(telemetry)
        # Future protocol drivers (SNMP, NUT, REST, Ping) will route here

    return results