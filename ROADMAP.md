
# Lynceus Roadmap

```
               ┌─────────────────────────────────────────────────────────────┐
               │              Phase 1: Foundation & Telemetry                │
               │  • Unified Inventory File (devices.yaml)                    │
               │  • Core Protocol Drivers (SNMP, NUT, REST API, Ping/TCP)    │
               │  • Standardized Normalization Engine                        │
               │  • Power Dashboard UI (PDU & UPS Visual Cards)              │
               └──────────────────────────────┬──────────────────────────────┘
                                              │
                                              ▼
               ┌─────────────────────────────────────────────────────────────┐
               │             Phase 2: Control Loop & Configuration           │
               │  • Outlet Control & Settings Modals (Safe Confirmation)     │
               │  • Global App Settings (config.yaml / .env)                 │
               │  • Nginx Proxy-Based Auth (Authelia / Basic Auth)           │
               │  • Read-Only UI Display Toggle                              │
               └──────────────────────────────┬──────────────────────────────┘
                                              │
                                              ▼
               ┌─────────────────────────────────────────────────────────────┐
               │             Phase 3: Quality of Life & Operations           │
               │  • Background Polling Engine                                │
               │  • Apprise / Mailrise Webhook & SMTP Alerts                 │
               │  • Kiosk Mode & Auto-Refresh Controls                       │
               │  • Rack Aggregated Power Metrics & Data Export (CSV/JSON)   │
               └─────────────────────────────────────────────────────────────┘

```

# Detailed Phase Breakdown
## Phase 1: Foundation & Unified Telemetry
- Static Inventory File (devices.yaml)
  - Defines target equipment (PDUs, UPSs, ATSs, Servers) along with their protocol, network parameters, and rack locations.
- Modular Driver Architecture (app/drivers/)
  - SNMP Driver: Handles OID gets/walks using vendor presets (APC, Eaton, CyberPower, Tripp Lite).
  - NUT Driver: Connects over TCP (3493) to query upsd / PyNUT telemetry.
  - REST Driver: Queries modern smart PDU HTTP endpoints (httpx).
  - Ping / TCP Check Driver: Rapid ICMP/socket reachability polling to flag offline devices instantly.
- Data Normalization Engine
  - Maps raw outputs from all 4 protocols into a standard JSON payload (status, input_voltage, output_load_percent, battery_charge_percent, outlet_states).
- Power Dashboard Cards (React)
  - Grid view featuring visual gauges, battery progress bars, load meters, and outlet status badges.

## Phase 2: Control, Safety & Security
- Outlet & Parameter Control Modals
  - Send SET commands over SNMP/REST or control flags over NUT to toggle/reboot individual PDU outlets or clear alarm states.
  - Includes explicit double-confirmation prompts to prevent accidental power drops.
- Global App Configuration (config.yaml)
  - Configures global polling intervals, timeout thresholds, and application defaults via an external mounted file.
- Low-Overhead Proxy Authentication
  - Configures Nginx reverse-proxy snippets for seamless integration with Authelia, OAuth2-Proxy, or Nginx Basic Auth without custom user database code.
- Read-Only UI Mode Switch
  - Disables control actions globally for status displays or wall-mounted dashboards.

## Phase 3: Operations, Alerts & Quality of Life
- Async Background Polling (APScheduler / asyncio)
  - Polls all inventory items in the background on set intervals to track uptime and threshold states.
- Notification Engine (Apprise / Mailrise Integration)
  - Fires HTTP POST payloads to Apprise or routes standard email triggers through Mailrise when a threshold breach occurs (UPS_ONBATT, PDU_OVERLOAD, DEVICE_OFFLINE).
- Kiosk / TV Display Mode
  - Full-screen auto-rotating view with customizable refresh rates designed for NOC/rack monitors.
- Aggregated Rack Power & Audit Exports
  - Calculates total wattage/amperage drawn per rack across multiple PDUs.
  - Provides one-click CSV/JSON snapshot downloads for capacity auditing.

