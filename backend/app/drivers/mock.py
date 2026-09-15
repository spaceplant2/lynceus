import random
from app.config import DeviceConfig
from app.drivers.base import BaseDriver
from app.models import DeviceTelemetryResponse, TelemetryMetrics, PowerStatus


class MockDriver(BaseDriver):
    """
    Mock Driver that generates realistic simulated telemetry
    for testing dashboard grids and UI components.
    """

    def __init__(self, config: DeviceConfig):
        super().__init__(config)

    async def poll(self) -> DeviceTelemetryResponse:
        is_ups = self.config.device_type == "ups"
        battery_charge = 100 if is_ups else None

        voltage = round(random.uniform(118.0, 122.0), 1)
        current = round(random.uniform(4.0, 8.0), 1)
        watts = round(voltage * current, 1)
        
        return DeviceTelemetryResponse(
            device_id=self.config.id,
            name=self.config.name,
            device_type=self.config.device_type,
            protocol="mock",
            status=PowerStatus.NORMAL if hasattr(PowerStatus, "NORMAL") else "normal",
            metrics=TelemetryMetrics(
                input_voltage=voltage,
                output_voltage=voltage,
                current_draw_amps=current,
                output_load_percent=random.randint(25, 45),
                battery_charge_percent=100 if is_ups else None,
                battery_runtime_seconds=3600 if is_ups else None,
                power_watts=watts,
            ),
        )
