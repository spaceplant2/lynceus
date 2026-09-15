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

[Unreleased]: https://github.com/your-org/lynceus/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-org/lynceus/releases/tag/v0.1.0