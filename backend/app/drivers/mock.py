import random
from datetime import datetime, timezone
from app.drivers.base import BaseDriver
from app.models import (
    DeviceTelemetryResponse,
    TelemetryMetrics,
    OutletStatus,
    PowerStatus,
    DeviceType,
    ProtocolType,
)

class MockDriver(BaseDriver):
    async def poll(self) -> DeviceTelemetryResponse:
        # Simulate small random fluctuations for realism
        input_v = round(random.uniform(118.5, 121.5), 1)
        output_v = 120.0
        
        if self.config.device_type == DeviceType.UPS:
            load = round(random.uniform(35.0, 45.0), 1)
            amps = round((load / 100.0) * 8.0, 1)
            watts = int(amps * output_v)
            
            return DeviceTelemetryResponse(
                device_id=self.config.id,
                name=self.config.name,
                device_type=DeviceType.UPS,
                protocol=ProtocolType.MOCK,
                status=PowerStatus.NORMAL,
                is_reachable=True,
                last_polled=datetime.now(timezone.utc),
                metrics=TelemetryMetrics(
                    input_voltage=input_v,
                    output_voltage=output_v,
                    output_load_percent=load,
                    battery_charge_percent=100.0,
                    battery_runtime_seconds=3600,
                    current_draw_amps=amps,
                    power_watts=watts,
                ),
                outlets=[
                    OutletStatus(id=1, name="Core Router", state="ON"),
                    OutletStatus(id=2, name="NAS Unit", state="ON"),
                ],
            )
            
        else:  # PDU or other equipment
            amps = round(random.uniform(4.0, 12.0), 1)
            watts = int(amps * output_v)
            
            return DeviceTelemetryResponse(
                device_id=self.config.id,
                name=self.config.name,
                device_type=DeviceType.PDU,
                protocol=ProtocolType.MOCK,
                status=PowerStatus.NORMAL,
                is_reachable=True,
                last_polled=datetime.now(timezone.utc),
                metrics=TelemetryMetrics(
                    input_voltage=input_v,
                    output_voltage=output_v,
                    current_draw_amps=amps,
                    power_watts=watts,
                ),
                outlets=[
                    OutletStatus(id=1, name="Server Node 1", state="ON"),
                    OutletStatus(id=2, name="Server Node 2", state="ON"),
                    OutletStatus(id=3, name="Unused Bank 1", state="OFF"),
                    OutletStatus(id=4, name="Unused Bank 2", state="OFF"),
                ],
            )