import asyncio
from pysnmp.hlapi.v3arch.asyncio import (
    get_cmd, set_cmd, walk_cmd,
    SnmpEngine, CommunityData, UdpTransportTarget,
    ContextData, ObjectType, ObjectIdentity,
    OctetString, Integer
)

async def snmp_get(ip: str, port: int, community: str, oid: str) -> str:
    """Executes an async SNMP GET request."""
    snmp_engine = SnmpEngine()
    error_indication, error_status, error_index, var_binds = await get_cmd(
        snmp_engine,
        CommunityData(community, mpModel=1),  # SNMPv2c
        await UdpTransportTarget.create((ip, port), timeout=2, retries=1),
        ContextData(),
        ObjectType(ObjectIdentity(oid))
    )

    if error_indication:
        raise Exception(f"SNMP Engine Error: {error_indication}")
    elif error_status:
        raise Exception(f"SNMP Device Error: {error_status.prettyPrint()} at {error_index}")
    
    for var_bind in var_binds:
        return str(var_bind[1])
    
    raise Exception("No data returned")


async def snmp_set(ip: str, port: int, community: str, oid: str, value: str, value_type: str) -> str:
    """Executes an async SNMP SET request."""
    snmp_engine = SnmpEngine()
    
    # Cast input value based on request parameter
    if value_type == "int":
        snmp_val = Integer(int(value))
    else:
        snmp_val = OctetString(str(value))

    error_indication, error_status, error_index, var_binds = await set_cmd(
        snmp_engine,
        CommunityData(community, mpModel=1),
        await UdpTransportTarget.create((ip, port), timeout=2, retries=1),
        ContextData(),
        ObjectType(ObjectIdentity(oid), snmp_val)
    )

    if error_indication:
        raise Exception(f"SNMP Engine Error: {error_indication}")
    elif error_status:
        raise Exception(f"SNMP Device Error: {error_status.prettyPrint()} at {error_index}")
    
    for var_bind in var_binds:
        return str(var_bind[1])
        
    raise Exception("Set failed, no response payload")


async def snmp_walk(ip: str, port: int, community: str, oid: str) -> list:
    """Executes an async SNMP WALK request."""
    snmp_engine = SnmpEngine()
    results = []

    async for error_indication, error_status, error_index, var_binds in walk_cmd(
        snmp_engine,
        CommunityData(community, mpModel=1),
        await UdpTransportTarget.create((ip, port), timeout=2, retries=1),
        ContextData(),
        ObjectType(ObjectIdentity(oid)),
        lexicographicMode=False
    ):
        if error_indication:
            raise Exception(f"SNMP Engine Error: {error_indication}")
        elif error_status:
            raise Exception(f"SNMP Device Error: {error_status.prettyPrint()} at {error_index}")
        else:
            for var_bind in var_binds:
                results.append({
                    "oid": str(var_bind[0]),
                    "value": str(var_bind[1])
                })
                
    return results
