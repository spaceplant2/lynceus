from pydantic import BaseModel, Field
from typing import Optional, Any, List

class SNMPGetRequest(BaseModel):
    ip: str = Field(..., example="192.168.1.1", description="Target IP address")
    port: int = Field(161, description="SNMP UDP port")
    community: str = Field("public", description="SNMP v2c Community String")
    oid: str = Field(..., example="1.3.6.1.2.1.1.1.0", description="Target OID")

class SNMPSetRequest(BaseModel):
    ip: str = Field(..., example="192.168.1.1")
    port: int = Field(161)
    community: str = Field("private", description="Requires write-enabled community string")
    oid: str = Field(..., example="1.3.6.1.2.1.1.4.0")
    value: Any = Field(..., description="Value to set on the device")
    value_type: str = Field("str", example="str", description="Type: 'str' or 'int'")

class SNMPWalkRequest(BaseModel):
    ip: str = Field(..., example="192.168.1.1")
    port: int = Field(161)
    community: str = Field("public")
    oid: str = Field("1.3.6.1.2.1", description="Base OID to walk")

class SNMPResultResponse(BaseModel):
    ip: str
    oid: str
    value: str
    status: str = "success"

class SNMPWalkResultResponse(BaseModel):
    ip: str
    base_oid: str
    results: List[dict]
    status: str = "success"