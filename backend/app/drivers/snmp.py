import asyncio
import logging
from typing import Dict, Any
from pysnmp.hlapi.v3arch.asyncio import (
    get_cmd,
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity,
)

from app.config import DeviceConfig
from app.models import DeviceTelemetryResponse, TelemetryMetrics, PowerStatus
from app.drivers.base import BaseDriver

logger = logging.getLogger("uvicorn.error")


class SnmpDriver(BaseDriver):
    """
    SNMP Protocol Driver implementing RFC 1628 UPS MIB querying with PySNMP 7.x.
    """

    OID_OUTPUT_VOLTAGE = ".1.3.6.1.2.1.33.1.4.4.1.2.1"
    OID_OUTPUT_CURRENT = ".1.3.6.1.2.1.33.1.4.4.1.3.1"
    OID_OUTPUT_LOAD = ".1.3.6.1.2.1.33.1.4.4.1.5.1"
    OID_BATTERY_CHARGE = ".1.3.6.1.2.1.33.1.2.4.0"
    OID_BATTERY_STATUS = ".1.3.6.1.2.1.33.1.2.1.0"

    def __init__(self, config: DeviceConfig, timeout: float = 2.0):
        super().__init__(config)
        self.timeout = timeout
        self.host = self.config.host or "127.0.0.1"
        self.port = self.config.port or 161

    async def _fetch_snmp_data(self) -> Dict[str, Any]:
        snmp_engine = SnmpEngine()
        community = CommunityData(self.config.community or "public", mpModel=1)
        
        # PySNMP 7.x async factory pattern with timeout and retries
        transport = await UdpTransportTarget.create(
            (self.host, self.port),
            timeout=1.0,
            retries=0
        )
        context = ContextData()

        var_binds = [
            ObjectType(ObjectIdentity(self.OID_OUTPUT_VOLTAGE)),
            ObjectType(ObjectIdentity(self.OID_OUTPUT_CURRENT)),
            ObjectType(ObjectIdentity(self.OID_OUTPUT_LOAD)),
            ObjectType(ObjectIdentity(self.OID_BATTERY_CHARGE)),
            ObjectType(ObjectIdentity(self.OID_BATTERY_STATUS)),
        ]

        error_indication, error_status, error_index, var_bind_table = await get_cmd(
            snmp_engine, community, transport, context, *var_binds
        )

        if error_indication:
            raise ConnectionError(f"SNMP Indication Error: {error_indication}")
        if error_status:
            raise ConnectionError(f"SNMP Status Error: {error_status.prettyPrint()}")

        results = {}
        for var_bind in var_bind_table:
            oid_str = str(var_bind[0])
            val = var_bind[1]
            try:
                results[oid_str] = int(val)
            except (ValueError, TypeError):
                results[oid_str] = None

        return results

    async def poll(self) -> DeviceTelemetryResponse:
        try:
            raw_data = await asyncio.wait_for(self._fetch_snmp_data(), timeout=self.timeout)

            voltage = raw_data.get(self.OID_OUTPUT_VOLTAGE)
            raw_current = raw_data.get(self.OID_OUTPUT_CURRENT)
            current = round(raw_current / 10.0, 1) if raw_current is not None else None
            load = raw_data.get(self.OID_OUTPUT_LOAD)
            battery = raw_data.get(self.OID_BATTERY_CHARGE)
            batt_status_code = raw_data.get(self.OID_BATTERY_STATUS)

            watts = round(voltage * current, 1) if (voltage and current) else None
            
            # Map RFC 1628 battery status code to PowerStatus enum
            status = "normal"
            if batt_status_code == 3:
                status = "low_battery"
            elif batt_status_code == 4:
                status = "on_battery"

            return DeviceTelemetryResponse(
                device_id=self.config.id,
                name=self.config.name,
                device_type=self.config.device_type,
                protocol="snmp",
                status=status,
                metrics=TelemetryMetrics(
                    input_voltage=voltage,
                    output_voltage=voltage,
                    current_draw_amps=current,
                    output_load_percent=load,
                    battery_charge_percent=battery,
                    battery_runtime_seconds=None,
                    power_watts=watts,
                ),
            )

        except Exception as err:
            logger.warning(f"SNMP poll failed for {self.config.id} ({self.host}): {err}")
            return DeviceTelemetryResponse(
                device_id=self.config.id,
                name=self.config.name,
                device_type=self.config.device_type,
                protocol="snmp",
                status="offline",
                metrics=TelemetryMetrics(
                    input_voltage=None,
                    output_voltage=None,
                    current_draw_amps=None,
                    output_load_percent=None,
                    battery_charge_percent=None,
                    battery_runtime_seconds=None,
                    power_watts=None,
                ),
            )