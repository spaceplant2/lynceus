
from enum import Enum
from typing import Optional, List, Union, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

# Unified Device Types
class DeviceType(str, Enum):
    PDU = "pdu"
    UPS = "ups"
    ATS = "ats"
    SERVER = "server"

# Unified Protocols
class ProtocolType(str, Enum):
    SNMP = "snmp"
    NUT = "nut"
    REST = "rest"
    PING = "ping"
    MOCK = "mock"

# Unified Status Enums
class PowerStatus(str, Enum):
    NORMAL = "normal"
    ON_BATTERY = "on_battery"
    LOW_BATTERY = "low_battery"
    BYPASS = "bypass"
    OVERLOAD = "overload"
    OFFLINE = "offline"

# Outlet Model
class OutletStatus(BaseModel):
    id: Union[int, str]
    name: Optional[str] = None
    state: str = "UNKNOWN"  # e.g., "ON", "OFF"

# Telemetry Metrics Model
class TelemetryMetrics(BaseModel):
    input_voltage: Optional[float] = None
    output_voltage: Optional[float] = None
    output_load_percent: Optional[float] = None
    battery_charge_percent: Optional[float] = None
    battery_runtime_seconds: Optional[int] = None
    current_draw_amps: Optional[float] = None
    power_watts: Optional[float] = None

# Unified Dashboard Device Response
class DeviceTelemetryResponse(BaseModel):
    device_id: str
    name: str
    device_type: DeviceType
    protocol: ProtocolType
    status: PowerStatus = PowerStatus.OFFLINE
    is_reachable: bool = False
    last_polled: Optional[datetime] = None
    metrics: TelemetryMetrics = Field(default_factory=TelemetryMetrics)
    outlets: List[OutletStatus] = Field(default_factory=list)
