import os
import yaml
import logging
from typing import List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("uvicorn.error")

CONFIG_PATH = os.getenv("DEVICES_CONFIG_PATH", "devices.yaml")

class DeviceConfig(BaseModel):
    id: str
    name: str
    device_type: str = "ups"
    driver: str = "snmp"
    profile: str = "rfc1628_default"
    host: str = "localhost"
    port: int = 161
    community: str = "public"

    @property
    def protocol(self) -> str:
        """Alias for driver to maintain backwards compatibility."""
        return self.driver


class AppConfig(BaseModel):
    """Container model for system-wide configuration."""
    devices: List[DeviceConfig] = Field(default_factory=list)


def load_devices_config(config_path: str = CONFIG_PATH) -> List[DeviceConfig]:
    """
    Reads devices.yaml and returns a list of validated DeviceConfig instances.
    """
    if not os.path.exists(config_path):
        logger.warning(f"Device configuration file not found at '{config_path}'. Returning empty list.")
        return []

    try:
        with open(config_path, "r") as f:
            raw_devices = yaml.safe_load(f) or []

        devices = [DeviceConfig(**device) for device in raw_devices]
        logger.info(f"Loaded {len(devices)} device configuration(s) from '{config_path}'")
        return devices

    except Exception as e:
        logger.error(f"Error reading configuration from '{config_path}': {e}")
        raise RuntimeError(f"Failed to parse '{config_path}': {e}")
  
# Keep alias for backwards compatibility if needed
load_device_configs = load_devices_config
