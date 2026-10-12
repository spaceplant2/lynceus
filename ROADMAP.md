# Lynceus — Project Roadmap & Versioning Plan

Lynceus is a modular, containerized Power Infrastructure Dashboard designed to provide a unified, protocol-agnostic view of PDUs, UPSs, and server PMCs.

This document outlines the versioning strategy, milestone targets, and feature roadmap leading to a v1.0.0 General Availability (GA) release.

---

## 📌 Versioning Strategy

Lynceus follows [Semantic Versioning 2.0.0](https://semver.org/) (`MAJOR.MINOR.PATCH`):

- **`0.x.y` Releases:** Initial development phase. API schema, driver abstractions, and configuration structures may evolve.
- **Minor Version (`0.X.0`):** Introduces major functional milestones (e.g., new driver integrations, control engine, alerting).
- **Patch Version (`0.x.Y`):** Bug fixes, security updates, and performance optimizations within a minor milestone.
- **`1.0.0` Release:** Production-ready baseline with stable APIs, full test coverage, authentication, and security hardening.

---

## 🗺️ Release Milestones

| Version | Milestone Name | Key Capabilities & Objectives | Status |
| :--- | :--- | :--- | :--- |
| **v0.1.0** | **Baseline Stack & Mock Engine** | FastAPI backend, React grid dashboard, Pydantic telemetry models, OpenAPI schema, and initial YAML configuration parsing. | **Completed** |
| **v0.2.0** | **Core SNMP Driver & RFC 1628** | Async PySNMP driver engine, standard UPS RFC 1628 MIB queries, 2-second timeout enforcement, and graceful `OFFLINE`/`N/A` degradation. | **Completed** |
| **v0.3.0** | **Frontend Integration & Real-Time Dashboard** | Next.js App Router UI integration, Server-Sent Events (SSE) live telemetry stream, and multi-device live rendering. | **Completed** |
| **v0.4.0** | **Multi-Vendor Profiles & Threshold Engine** | YAML profile decoupling (APC, Eaton MIBs) and automated warning/critical threshold rule evaluation. | **In Progress** |
| **v0.5.0** | **Persistence & Real-Time Alerts** | Lightweight SQLite time-series storage backend for rolling historical trends and webhook notification dispatching. | Planned |
| **v0.6.0** | **Control & Command Engine** | Outlet power switching (ON / OFF / REBOOT) via API and UI, backed by role-based access control (RBAC) and audit logging. | Planned |
| **v0.9.0** | **Release Candidate (RC)** | UI polishing, production Docker Compose environment (Nginx reverse proxy, TLS certificates, non-root user execution), and integration test suite. | Planned |
| **v1.0.0** | **General Availability (GA)** | Production-ready release, stable OpenAPI specification, end-to-end documentation, and helm/compose deployment patterns. | Planned |

---

## 🛠️ Phase-by-Phase Acceptance Criteria

### v0.1.0 — Baseline Stack & Mock Engine (Completed)
- [x] FastAPI server exposing `/api/devices` with OpenAPI specification (`/docs`).
- [x] Pydantic models for normalized `PowerStatus` enums and device telemetry responses.
- [x] Config loader parsing configuration files with environment variable substitution.
- [x] React frontend auto-refreshing grid displaying mock device telemetry.
- [x] Containerized development stack via Docker Compose.

### v0.2.0 — Core SNMP Driver & RFC 1628 (Completed)
- [x] Implement `SnmpDriver` using asynchronous polling loops.
- [x] Query standard RFC 1628 UPS OIDs (Voltage, Current, Load, Battery Charge, Battery Status).
- [x] Implement non-blocking async execution with a strict timeout per polling loop.
- [x] Normalize raw SNMP integers/gauge values into standard Pydantic models.

### v0.3.0 — Frontend Integration & Real-Time Dashboard (Completed)
- [x] Connect Next.js frontend dashboard to backend endpoints (`/api/stream`, `/api/targets`, `/api/profiles`).
- [x] Implement SSE (Server-Sent Events) telemetry data streaming via `sse-starlette`.
- [x] Build responsive visual UI components for live UPS and PDU metrics.
- [x] Resolve container dependency chains (`httpx`, `sse-starlette`, `pyyaml`).

### v0.4.0 — Multi-Vendor Profiles & Threshold Engine (Next)
- [ ] Externalize OID maps and scaling rules into vendor-specific YAML definitions (`apc_powernet.yaml`, `eaton_xups.yaml`).
- [ ] Bind device targets to specific YAML profiles in configuration.
- [ ] Implement warning and critical threshold evaluation rules inside the backend poller.
- [ ] Dynamically update frontend status badges based on threshold rule violations.

---

## Technical Debt & Future Enhancements
- [ ] **pysnmp Migration:** Ensure robust import paths for upstream `pysnmp>=7.x`.
- [ ] **Database Persistence:** Add lightweight SQLite history logging for long-term telemetry trends and graphing.
- [ ] **SSE Reconnection Resilience:** Add exponential backoff reconnection logic inside the frontend `EventSource` client.

---

## Milestone Tracker

- [x] **v0.1.0 — Prototype & Baseline UI** (Completed)
- [x] **v0.2.0 — Live SNMP Integration & Data Parity** (Completed)
- [x] **v0.3.0 — Real-Time SSE Stream & Frontend UI** (Completed)
- [ ] **v0.4.0 — Multi-Vendor Profiles & Thresholds** (In Progress)
- [ ] **v0.5.0 — Persistence & Alerts** (Planned)
