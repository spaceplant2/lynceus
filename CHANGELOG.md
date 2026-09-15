# Changelog

All notable changes to the **Lynceus** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Async PySNMP 7.x driver engine implementation (`v0.2.0`).
- Standard RFC 1628 UPS MIB querying and data normalization.
- 2-second timeout enforcement and graceful degradation for offline SNMP hardware.

---

## [0.2.0] - 2026-09-15

### Added
- **SNMP Protocol Driver (`SnmpDriver`):** Added RFC 1628 MIB support using PySNMP 7.x (`v3arch` async implementation).
- **Asynchronous Transport Factory:** Configured `UdpTransportTarget.create()` for async UDP transport initialization.
- **Unified Telemetry Schema:** Expanded `TelemetryMetrics` model to standardize fields across mock and live drivers (`input_voltage`, `output_voltage`, `current_draw_amps`, `output_load_percent`, `battery_charge_percent`, `power_watts`).
- **Graceful Fault Tolerance:** Implemented `null` metric fallbacks and `offline` status handling for unroutable or timed-out devices.

### Fixed
- **PySNMP Keyword Conflicts:** Fixed positional parameter errors during `UdpTransportTarget` transport creation.
- **Pydantic Validation Errors:** Resolved schema mismatches between backend field names and frontend metric expectations (`device_id` vs `id`).
- **UnboundLocalError in SNMP Exception Handler:** Fixed uninitialized variable references during SNMP polling failures by explicitly passing `None` metrics.
- **Enum Coercion:** Aligned `PowerStatus` mappings with Pydantic validation requirements across all drivers.

---

## [0.1.0] - 2026-09-15

### Added
- **Backend Architecture:** FastAPI service serving normalized power infrastructure endpoints with OpenAPI 3.0 specification (`/docs`, `/redoc`, `/openapi.json`).
- **Data Models:** Pydantic schemas for `DeviceConfig`, `DeviceTelemetryResponse`, `TelemetryMetrics`, and `PowerStatus` enums.
- **Config Loader:** YAML parser (`config.py`) supporting dynamic `${ENV_VAR}` environment variable interpolation and absolute file path resolution.
- **Mock Driver:** Protocol-agnostic mock driver (`drivers/mock.py`) generating simulated voltage, current, load, and outlet states for offline development.
- **React Frontend:** Dashboard interface featuring responsive `PowerCard` grid layout and `StatusBadge` indicators.
- **Auto-Refresh:** Client-side 5-second polling loop fetching live updates from `/api/devices`.
- **Project Governance:** Added `ROADMAP.md` defining Semantic Versioning criteria and release milestones toward v1.0.0.

### Fixed
- Resolved PySNMP v7.x import compatibility issues by updating namespace imports to `pysnmp.hlapi.v3arch.asyncio`.
- Fixed missing `Optional` type hint import in `backend/app/config.py`.
- Corrected Docker build configuration in `backend/Dockerfile` to copy `devices.yaml` into the root application path (`/app/devices.yaml`).

[Unreleased]: https://github.com/spaceplant2/lynceus/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/spaceplant2/lynceus/releases/tag/v0.1.0