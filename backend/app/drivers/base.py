from abc import ABC, abstractmethod
from app.models import DeviceTelemetryResponse
from app.config import DeviceConfig

class BaseDriver(ABC):
    """Abstract Base Class that all protocol drivers must implement."""
    
    def __init__(self, config: DeviceConfig):
        self.config = config

    @abstractmethod
    async def poll(self) -> DeviceTelemetryResponse:
        """Poll the target device and return a normalized DeviceTelemetryResponse."""
        pass