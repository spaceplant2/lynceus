import os
import yaml
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("uvicorn.error")

# Dynamically locate the directory where profile YAMLs are stored
PROFILES_DIR = os.path.dirname(os.path.abspath(__file__))


class TransformRule(BaseModel):
    """Rule for scaling and type-casting raw SNMP values."""
    scale: float = 1.0
    type: str = "float"  # "float" or "int"


class StatusMappingRule(BaseModel):
    """Rule for mapping vendor status codes to standard PowerStatus enum values."""
    target_oid: str
    default: str = "normal"
    map: Dict[int, str] = Field(default_factory=dict)


class ProfileSchema(BaseModel):
    """Pydantic model validating the structure of a device YAML profile."""
    id: str
    name: str
    description: Optional[str] = ""
    vendor: Optional[str] = ""
    oids: Dict[str, str]
    transforms: Dict[str, TransformRule] = Field(default_factory=dict)
    status_mapping: Optional[StatusMappingRule] = None


class ProfileLoader:
    """
    Singleton-style cache manager that reads and validates device profile YAML files.
    """
    _cache: Dict[str, ProfileSchema] = {}

    @classmethod
    def get_profile(cls, profile_id: str = "rfc1628_default") -> ProfileSchema:
        """
        Retrieves a profile by ID from cache or disk. Falls back to rfc1628_default if missing.
        """
        if profile_id in cls._cache:
            return cls._cache[profile_id]

        file_path = os.path.join(PROFILES_DIR, f"{profile_id}.yaml")

        # Fallback if specific profile YAML file does not exist
        if not os.path.exists(file_path):
            logger.warning(
                f"Profile '{profile_id}' not found at {file_path}. Falling back to 'rfc1628_default'."
            )
            file_path = os.path.join(PROFILES_DIR, "rfc1628_default.yaml")

        try:
            with open(file_path, "r") as f:
                raw_data = yaml.safe_load(f)

            profile_meta = raw_data.get("profile", {})
            status_meta = raw_data.get("status_mapping", {})

            profile = ProfileSchema(
                id=profile_meta.get("id", profile_id),
                name=profile_meta.get("name", profile_id),
                description=profile_meta.get("description", ""),
                vendor=profile_meta.get("vendor", ""),
                oids=raw_data.get("oids", {}),
                transforms=raw_data.get("transforms", {}),
                status_mapping=StatusMappingRule(**status_meta) if status_meta else None,
            )

            cls._cache[profile_id] = profile
            logger.info(f"Successfully loaded and cached profile '{profile.id}' ({profile.name})")
            return profile

        except Exception as e:
            logger.error(f"Failed to parse profile '{profile_id}': {e}")
            raise RuntimeError(f"Invalid YAML profile '{profile_id}': {e}")

    @classmethod
    def clear_cache(cls) -> None:
        """Clears the in-memory cache (useful for live reload or testing)."""
        cls._cache.clear()