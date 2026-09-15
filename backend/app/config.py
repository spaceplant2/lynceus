import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import yaml
from pydantic import BaseModel, Field


class DeviceConfig(BaseModel):
    id: str
    name: str
    device_type: str = Field(..., alias="type")  # Maps 'type' in YAML to 'device_type'
    protocol: str
    host: Optional[str] = None
    community: Optional[str] = "public"
    port: Optional[int] = 161
    extra_params: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        populate_by_name = True


def interpolate_env_vars(raw_yaml: str) -> str:
    """Replaces ${VAR_NAME} syntax in YAML with environment variable values."""
    pattern = re.compile(r"\$\{([^}]+)\}")

    def replace_match(match):
        env_var = match.group(1)
        return os.environ.get(env_var, "")

    return pattern.sub(replace_match, raw_yaml)


def load_devices_config(config_path: str = "devices.yaml") -> List[DeviceConfig]:
    """
    Loads device definitions from devices.yaml located in the backend root directory.
    Supports environment variable substitution.
    """
    # Resolve file path relative to backend root directory (/app/devices.yaml inside container)
    base_dir = Path(__file__).resolve().parent.parent
    path = base_dir / config_path if not Path(config_path).is_absolute() else Path(config_path)

    if not path.exists():
        print(f"Warning: Configuration file not found at {path}")
        return []

    with open(path, "r", encoding="utf-8") as f:
        raw_content = f.read()

    interpolated_content = interpolate_env_vars(raw_content)
    parsed_yaml = yaml.safe_load(interpolated_content) or {}

    devices_raw = parsed_yaml.get("devices", [])
    return [DeviceConfig(**device) for device in devices_raw]