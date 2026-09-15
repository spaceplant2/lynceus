from app.config import DeviceConfig
from app.drivers.base import BaseDriver
from app.drivers.mock import MockDriver
from app.drivers.snmp import SnmpDriver

def get_driver(config: DeviceConfig) -> BaseDriver:
    """Returns the appropriate driver instance based on device configuration."""
    protocol = config.protocol.lower()
    if protocol == "mock":
        return MockDriver(config)
    elif protocol == "snmp":
        return SnmpDriver(config)
    else:
        raise ValueError(f"Unsupported protocol: {config.protocol}")

