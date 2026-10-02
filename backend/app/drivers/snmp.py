import logging
from typing import Dict, Any, Optional

# Stable PySNMP async imports
from pysnmp.hlapi.asyncio import (
    getCmd,
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity,
)

from app.drivers.base import BaseDriver
from app.models import TelemetryMetrics
from app.profiles.loader import ProfileLoader, ProfileSchema

logger = logging.getLogger("uvicorn.error")


class SnmpDriver(BaseDriver):
    """
    SNMP driver execution engine. Dynamically loads profile schema definitions
    and transforms raw OID values into standard TelemetryMetrics model values.
    """

    def __init__(self, config: Any):
        # Support both dict and Pydantic DeviceConfig models
        if hasattr(config, "model_dump"):
            config_dict = config.model_dump()
        elif hasattr(config, "dict"):
            config_dict = config.dict()
        elif isinstance(config, dict):
            config_dict = config
        else:
            config_dict = vars(config)

        super().__init__(config_dict)
        self.device_id: str = config_dict.get("id", "unknown-device")
        self.host: str = config_dict.get("host", "localhost")
        self.port: int = config_dict.get("port", 161)
        self.community: str = config_dict.get("community", "public")
        
        # Load device profile (defaults to 'rfc1628_default' if not specified)
        profile_id: str = config_dict.get("profile", "rfc1628_default")
        self.profile: ProfileSchema = ProfileLoader.get_profile(profile_id)
        logger.info(f"Initialized SnmpDriver for {self.host} using profile '{self.profile.id}'")

    def _apply_transform(self, metric_key: str, raw_value: Any) -> Any:
        """Applies scaling factor and type conversion defined in profile transforms."""
        if raw_value is None:
            return None

        rule = self.profile.transforms.get(metric_key)
        if not rule:
            return raw_value

        try:
            val = float(raw_value) * rule.scale
            return int(val) if rule.type == "int" else round(val, 1)
        except (ValueError, TypeError) as e:
            logger.warning(f"Transform failed for metric '{metric_key}' with value {raw_value}: {e}")
            return raw_value

    def _map_power_status(self, raw_status: Any) -> str:
        """Maps raw vendor status codes to standard status strings."""
        if self.profile.status_mapping is None or raw_status is None:
            return "normal"

        try:
            status_code = int(raw_status)
            mapping = self.profile.status_mapping.map
            return mapping.get(status_code, self.profile.status_mapping.default)
        except (ValueError, TypeError):
            return self.profile.status_mapping.default

    async def _fetch_snmp_data(self) -> Dict[str, Any]:
        """Queries the configured SNMP device OIDs in a single request."""
        var_binds_to_fetch = []
        metric_keys = []

        # Build ObjectType queries for each OID in the profile schema
        for key, oid in self.profile.oids.model_dump(exclude_none=True).items():
            metric_keys.append(key)
            var_binds_to_fetch.append(ObjectType(ObjectIdentity(oid)))

        if not var_binds_to_fetch:
            return {}

        error_indication, error_status, error_index, var_binds = await getCmd(
            SnmpEngine(),
            CommunityData(self.community, mpModel=1),  # SNMP v2c
            UdpTransportTarget((self.host, self.port), timeout=2.0, retries=1),
            ContextData(),
            *var_binds_to_fetch
        )

        if error_indication or error_status:
            err_msg = error_indication or error_status.prettyPrint()
            raise RuntimeError(f"SNMP fetch error from {self.host}: {err_msg}")

        results = {}
        for key, var_bind in zip(metric_keys, var_binds):
            _, val = var_bind
            # Clean non-value types (NoSuchInstance/NoSuchObject) to None
            results[key] = str(val) if val is not None and not str(val).startswith("No Such") else None

        return results

    async def poll(self) -> TelemetryMetrics:
        """Polls SNMP device OIDs mapped in profile and returns TelemetryMetrics."""
        try:
            raw_metrics = await self._fetch_snmp_data()
            
            # Process metrics through profile transformations
            power_status_raw = raw_metrics.get("power_status_raw")
            mapped_status = self._map_power_status(power_status_raw)

            out_volt = self._apply_transform("output_voltage", raw_metrics.get("output_voltage"))
            curr_amps = self._apply_transform("current_draw_amps", raw_metrics.get("current_draw_amps"))
            raw_watts = self._apply_transform("power_watts", raw_metrics.get("power_watts"))

            # Calculate power if watts OID wasn't explicitly returned
            if raw_watts is None and out_volt is not None and curr_amps is not None:
                power_watts = round(out_volt * curr_amps, 1)
            else:
                power_watts = raw_watts

            return TelemetryMetrics(
                device_id=self.device_id,
                status=mapped_status,
                input_voltage=self._apply_transform("input_voltage", raw_metrics.get("input_voltage")),
                output_voltage=out_volt,
                output_load_percent=self._apply_transform("output_load_percent", raw_metrics.get("output_load_percent")),
                battery_charge_percent=self._apply_transform("battery_charge_percent", raw_metrics.get("battery_charge_percent")),
                battery_runtime_seconds=self._apply_transform("battery_runtime_seconds", raw_metrics.get("battery_runtime_seconds")),
                current_draw_amps=curr_amps,
                power_watts=power_watts,
            )
        except Exception as e:
            logger.error(f"Failed to poll SNMP device {self.device_id} ({self.host}): {e}")
            return TelemetryMetrics(
                device_id=self.device_id,
                status="offline"
            )
            