# **Lynceus Technical & Architecture Specifications**

## ---

**1\. Normalized Power Schema & State Mapping**

To ensure uniform dashboard rendering across SNMP, NUT, REST, and Ping drivers, all telemetry outputs are mapped into a standardized JSON response format using unified state enums.

### **Power System Status Enum Mapping**

| Unified Enum | NUT States | Standard UPS-MIB (.1.3.6.1.2.1.33) | APC / CyberPower SNMP | UI Visual Treatment   |
| :---- | :---- | :---- | :---- | :---- |
| **NORMAL** | OL | 3 (normal) | 2 (normal) | Green Badge / Solid Border |
| **ON\_BATTERY** | OB | 5 (onBattery) | 3 (onBattery) | Amber Badge / Flashing Warning |
| **LOW\_BATTERY** | OB LB | 4 (lowBattery) | 4 (lowBattery) | Red Badge / Pulse Alarm |
| **BYPASS** | BYPASS | 6 (bypass) | 5 (bypass) | Yellow Badge |
| **OVERLOAD** | OVER | 7 (overload) | 6 (overload) | Red Badge / High Load Banner |
| **OFFLINE** | OFF / Unreachable | 1 (unknown) / Timeout | 1 (unknown) / Timeout | Grayed Out / Striated Pattern |

### **Standardized JSON Telemetry Response Format**

{  
  "device\_id": "rack1-ups-01",  
  "name": "Server Rack 1 Main UPS",  
  "device\_type": "ups",  
  "protocol": "snmp",  
  "status": "NORMAL",  
  "is\_reachable": true,  
  "last\_polled": "2026-09-14T14:20:00Z",  
  "metrics": {  
    "input\_voltage": 120.4,  
    "output\_voltage": 120.0,  
    "output\_load\_percent": 42.5,  
    "battery\_charge\_percent": 100.0,  
    "battery\_runtime\_seconds": 2880,  
    "current\_draw\_amps": 5.2,  
    "power\_watts": 624  
  },  
  "outlets": \[  
    { "id": 1, "name": "Core Switch", "state": "ON" },  
    { "id": 2, "name": "Storage Array", "state": "ON" }  
  \]  
}

## **2\. Driver Error Handling & Graceful Degradation**

To prevent single-device timeouts from blocking application polling or stalling the user interface, drivers enforce non-blocking execution limits:

> * **Strict Driver Timeouts:** All outbound connections (SNMP, NUT, REST, ICMP) enforce a strict **2.0 second connection/read timeout**.  
> * **Graceful Field Fallbacks:** Unreported or unsupported fields default to null rather than throwing exceptions. The React UI renders missing attributes as N/A without crashing card modules.  
> * **Circuit Breaker Pattern:** If a device fails 3 consecutive polls, polling frequency backs off to reduce network congestion until re-established.

## **3\. Security & Secrets Interpolation**

Sensitive credentials (SNMP community strings, NUT passwords, API tokens) must never be stored in plain text inside version-controlled configuration files.

### **Example devices.yaml Schema with Environment Substitution**

devices:  
  \- id: "pdu-main-01"  
    name: "Main Distribution PDU"  
    device\_type: "pdu"  
    protocol: "snmp"  
    host: "192.168.1.100"  
    community: "${SNMP\_COMMUNITY\_READ}"  
    preset: "apc\_switched\_pdu"

  \- id: "ups-storage-01"  
    name: "Storage Rack UPS"  
    device\_type: "ups"  
    protocol: "nut"  
    host: "192.168.1.101"  
    port: 3493  
    ups\_name: "cyberpower\_core"  
    username: "${NUT\_USER}"  
    password: "${NUT\_PASSWORD}"

  \- id: "pdu-rest-02"  
    name: "Smart PDU Rack 2"  
    device\_type: "pdu"  
    protocol: "rest"  
    endpoint: "http://192.168.1.102/api/v1/power"  
    auth\_token: "${PDU\_REST\_TOKEN}"

  \- id: "ping-ats-01"  
    name: "Automatic Transfer Switch"  
    device\_type: "ats"  
    protocol: "ping"  
    host: "192.168.1.103"

## **4\. Local Development & Mocking Strategy**

To enable rapid UI and backend development without requiring attached physical power hardware at all times:

> * **Mock Protocol Driver:** A dedicated mock driver option in devices.yaml returns simulated telemetry and fluctuating loads for local testing.  
> * **Local Simulator Containers:** Standalone Docker Compose profiles available for launching lightweight simulated NUT (upsd) and PySNMP test agents on local network ports.
