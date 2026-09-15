# Lynceus — Project Roadmap & Versioning Plan

Lynceus is a modular, containerized Power Infrastructure Dashboard designed to provide a unified, protocol-agnostic view of PDUs, UPSs, and server PMCs.

This document outlines the versioning strategy, milestone targets, and feature roadmap leading to a v1.0.0 General Availability (GA) release.

---

## 📌 Versioning Strategy

Lynceus follows [Semantic Versioning 2.0.0](https://semver.org/) (`MAJOR.MINOR.PATCH`):

* **`0.x.y` Releases:** Initial development phase. API schema, driver abstractions, and configuration structures may evolve.
* **Minor Version (`0.X.0`):** Introduces major functional milestones (e.g., new driver integrations, control engine, alerting).
* **Patch Version (`0.x.Y`):** Bug fixes, security updates, and performance optimizations within a minor milestone.
* **`1.0.0` Release:** Production-ready baseline with stable APIs, full test coverage, authentication, and security hardening.

---

## 🗺️ Release Milestones

| Version | Milestone Name | Key Capabilities & Objectives | Status |
| :--- | :--- | :--- | :--- |
| **v0.1.0** | **Baseline Stack & Mock Engine** | FastAPI backend, React grid dashboard, Pydantic telemetry models, OpenAPI schema, and `devices.yaml` configuration with env variable interpolation. | **Completed** |
| **v0.2.0** | **Core SNMP Driver & RFC 1628** | Async PySNMP 7.x driver engine, standard UPS RFC 1628 MIB queries, 2-second timeout enforcement, and graceful `OFFLINE`/`N/A` degradation. | *In Progress* |
| **v0.3.0** | **Multi-Vendor PDU Support** | Vendor-specific MIB extensions (APC/Schneider, Eaton, TrippLite), outlet status parsing, and dynamic status badges in React UI. | Planned |
| **v0.4.0** | **Redfish & Out-of-Band Drivers** | RESTful Redfish protocol driver for server power management controllers (Dell iDRAC, HPE iLO), expanding past network power gear. | Planned |
| **v0.5.0** | **Control & Command Engine** | Outlet power switching (ON / OFF / REBOOT) via API and UI, backed by role-based access control (RBAC) and audit logging. | Planned |
| **v0.6.0** | **Metrics & Alerting Core** | Time-series telemetry store (Prometheus/TimescaleDB), configurable threshold triggers (overload, on-battery, low battery), and webhook notifications. | Planned |
| **v0.9.0** | **Release Candidate (RC)** | UI polishing, production Docker Compose environment (Nginx reverse proxy, TLS certificates, non-root user execution), and integration test suite. | Planned |
| **v1.0.0** | **General Availability (GA)** | Production-ready release, stable OpenAPI specification, end-to-end documentation, and helm/compose deployment patterns. | Planned |

---

## 🛠️ Phase-by-Phase Acceptance Criteria

### v0.1.0 — Baseline Stack & Mock Engine (Current Baseline)
- [x] FastAPI server exposing `/api/devices` with OpenAPI specification (`/docs`).
- [x] Pydantic models for normalized `PowerStatus` enums and device telemetry responses.
- [x] Config loader parsing `devices.yaml` with `${ENV_VAR}` substitution.
- [x] React frontend auto-refreshing grid displaying mock device telemetry.
- [x] Containerized development stack via Docker Compose.

### v0.2.0 — Core SNMP Driver & RFC 1628
- [ ] Implement `SnmpDriver` using `pysnmp.hlapi.v3arch.asyncio`.
- [ ] Query standard RFC 1628 UPS OIDs (Voltage, Current, Load, Battery Charge, Battery Status).
- [ ] Implement non-blocking async execution with a strict 2-second timeout per polling loop.
- [ ] Normalize raw SNMP integers/gauge values into standard Pydantic models.

### v0.3.0 — Multi-Vendor PDU Support
- [ ] Extend SNMP driver with driver profiles for APC, Eaton, and TrippLite MIBs.
- [ ] Parse per-outlet states and current draw where hardware supports it.
- [ ] Render per-outlet status badges and toggle states on `PowerCard` components.

---

## 📄 Related Documents

* **`README.md`**: Quickstart guide and local developer setup.
* **`CHANGELOG.md`**: Historical record of changes made in each version release.