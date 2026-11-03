# Lynceus REST API Reference

Lynceus exposes a comprehensive, high-performance REST API running alongside the web dashboard. All endpoints communicate over JSON (unless requesting raw YAML downloads) and can be used to query live telemetry, automate switched outlet actions, manage encrypted credentials, hot-reload configuration files, and conduct ad-hoc SNMP network diagnostics.

---

## Table of Contents

1. [Overview & Conventions](#overview--conventions)
2. [Telemetry & Power Metrics](#1-telemetry--power-metrics)
   - [GET /api/telemetry](#get-apitelemetry)
   - [GET /api/telemetry/:id](#get-apitelemetryid)
3. [Alerts & Alarms](#2-alerts--alarms)
   - [GET /api/alerts](#get-apialerts)
   - [POST /api/alerts/:id/ack](#post-apialertsidack)
   - [POST /api/alerts/:id/dismiss](#post-apialertsiddismiss)
   - [POST /api/alerts/clear](#post-apialertsclear)
4. [Remote Switched Outlet Control](#3-remote-switched-outlet-control)
   - [POST /api/outlets/control](#post-apioutletscontrol)
5. [Modular YAML Configuration](#4-modular-yaml-configuration)
   - [GET /api/config](#get-apiconfig)
   - [POST /api/config](#post-apiconfig)
   - [GET /api/config/download/:key](#get-apiconfigdownloadkey)
6. [Security Vault & Encrypted Credentials (AES-256-GCM)](#5-security-vault--encrypted-credentials-aes-256-gcm)
   - [GET /api/vault/status](#get-apivaultstatus)
   - [GET /api/vault/credentials](#get-apivaultcredentials)
   - [POST /api/vault/credentials](#post-apivaultcredentials)
   - [DELETE /api/vault/credentials/:id](#delete-apivaultcredentialsid)
   - [POST /api/vault/rotate-key](#post-apivaultrotate-key)
7. [Dashboard Users & Authentication](#6-dashboard-users--authentication)
   - [GET /api/auth/users](#get-apiauthusers)
   - [POST /api/auth/users](#post-apiauthusers)
   - [DELETE /api/auth/users/:id](#delete-apiauthusersid)
   - [POST /api/auth/login](#post-apiauthlogin)
8. [Diagnostics & Lab Simulator](#7-diagnostics--lab-simulator)
   - [POST /api/snmp/test](#post-apisnmptest)
   - [POST /api/lab/event](#post-apilabevent)
   - [GET /api/docker/info](#get-apidockerinfo)
9. [Status Codes & Error Handling](#8-status-codes--error-handling)

---

## Overview & Conventions

- **Default Port**: Port `3000` (e.g. `http://<server-ip>:3000`).
- **Content-Type**: Requests sending a body should include `Content-Type: application/json`.
- **Response Format**: All `/api/*` endpoints respond with JSON (`application/json; charset=utf-8`), except for file downloads which return `text/yaml`.
- **Error Guarantee**: Any unhandled or invalid `/api/*` route returns a structured JSON 404 object (`{ "error": "API route not found: ..." }`) and never returns an HTML document.

---

## 1. Telemetry & Power Metrics

### `GET /api/telemetry`
Returns live telemetry and rolling in-memory time-series data for all registered UPS and PDU devices.

- **Request**: No parameters or query arguments required.
- **Response `200 OK`**:
```json
{
  "telemetry": [
    {
      "id": "ups-datacenter-01",
      "name": "APC Smart-UPS RT 3000 (Rack 1A)",
      "type": "ups",
      "host": "192.168.10.15",
      "port": 161,
      "pollIntervalSec": 3,
      "isOnline": true,
      "isSimulated": false,
      "lastPolled": 1740000000000,
      "state": "normal",
      "stateDescription": "Online - Utility Power Normal",
      "inputVoltage": 120.4,
      "inputFrequency": 60.0,
      "outputVoltage": 120.0,
      "outputLoadPct": 42.5,
      "outputPowerWatts": 1275,
      "outputCurrentAmps": 10.6,
      "batteryPct": 100,
      "runtimeRemainingMin": 48,
      "batteryTempCelsius": 25,
      "batteryVoltage": 54.2,
      "ratedAmps": 25,
      "capacityWatts": 3000,
      "outlets": [
        {
          "index": 1,
          "name": "Core Switch 1",
          "equipment": "Arista 7050TX",
          "isCriticalLocked": true,
          "rebootDelaySec": 15,
          "state": "on",
          "currentAmps": 1.8,
          "powerWatts": 216
        }
      ],
      "history": [
        {
          "timestamp": 1739999900000,
          "inputVoltage": 120.2,
          "outputLoadPct": 42.1,
          "batteryPct": 100,
          "runtimeMin": 48,
          "outputPowerWatts": 1263,
          "currentAmps": 10.5,
          "tempCelsius": 25
        }
      ]
    }
  ],
  "timestamp": 1740000000123
}
```

- **Example curl**:
```bash
curl -s http://localhost:3000/api/telemetry
```

---

### `GET /api/telemetry/:id`
Retrieves live telemetry and time-series history for a single target device by its unique ID.

- **URL Parameters**:
  - `id`: Unique device identifier (e.g. `ups-datacenter-01`)
- **Response `200 OK`**:
```json
{
  "telemetry": {
    "id": "ups-datacenter-01",
    "name": "APC Smart-UPS RT 3000 (Rack 1A)",
    "inputVoltage": 120.4,
    "outputLoadPct": 42.5
  },
  "timestamp": 1740000000123
}
```
- **Response `404 Not Found`**:
```json
{ "error": "Device not found" }
```

---

## 2. Alerts & Alarms

### `GET /api/alerts`
Retrieves all active unacknowledged and acknowledged system alarms and threshold alerts (e.g., utility power loss, overload, low battery runtime, high temperature).

- **Response `200 OK`**:
```json
{
  "alerts": [
    {
      "id": "alert-1740000000-01",
      "deviceId": "ups-datacenter-01",
      "deviceName": "APC Smart-UPS RT 3000 (Rack 1A)",
      "severity": "critical",
      "title": "UPS Operating on Battery Power",
      "message": "AC input utility line voltage lost (0 VAC). Inverter supplying load.",
      "timestamp": 1740000000000,
      "acknowledged": false
    }
  ]
}
```

---

### `POST /api/alerts/:id/ack`
Marks an alert as acknowledged. This stops audible beeping while keeping the incident visible in the log until cleared.

- **URL Parameters**:
  - `id`: Alert ID (e.g., `alert-1740000000-01`)
- **Response `200 OK`**:
```json
{ "success": true }
```

---

### `POST /api/alerts/:id/dismiss`
Dismisses and permanently removes an individual alert from the active buffer.

- **URL Parameters**:
  - `id`: Alert ID
- **Response `200 OK`**:
```json
{ "success": true }
```

---

### `POST /api/alerts/clear`
Clears all active alarms and alerts across all monitored devices simultaneously.

- **Response `200 OK`**:
```json
{ "success": true }
```

---

## 3. Remote Switched Outlet Control

### `POST /api/outlets/control`
Executes an immediate remote SNMP SET command against a switched PDU or UPS outlet bank.

- **Request Body**:
```json
{
  "deviceId": "pdu-rack-alpha",
  "outletIndex": 2,
  "action": "reboot",
  "delaySec": 10
}
```

- **Parameters**:
  - `deviceId` *(string, required)*: Unique identifier of the device in `devices.yaml`.
  - `outletIndex` *(number, required)*: Physical or logical outlet index (1-indexed).
  - `action` *(string, required)*: One of `"on"`, `"off"`, or `"reboot"`.
  - `delaySec` *(number, optional)*: Delay in seconds before restoring power when performing a `"reboot"` (default: `10`).

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Outlet #2 power cycle command sent successfully (reboot in 10s)."
}
```

- **Response `400 Bad Request`**:
```json
{
  "success": false,
  "error": "SNMP SET failed: Device unreachable or invalid community"
}
```

- **Example curl**:
```bash
curl -X POST http://localhost:3000/api/outlets/control \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"pdu-rack-alpha","outletIndex":2,"action":"reboot","delaySec":10}'
```

---

## 4. Modular YAML Configuration

Lynceus stores configuration across three modular files in `./config/`:
1. `settings` (`settings.yaml`): Poll cadences, thresholds, lab simulation.
2. `profiles` (`profiles.yaml`): Reusable MIB OID mappings.
3. `devices` (`devices.yaml`): Target network devices and outlet configurations.

### `GET /api/config`
Retrieves both the raw YAML strings and parsed object representations for all three files.

- **Response `200 OK`**:
```json
{
  "files": [
    {
      "key": "settings",
      "filename": "settings.yaml",
      "title": "General Settings",
      "path": "/app/config/settings.yaml",
      "rawYaml": "settings:\n  pollIntervalDefaultSec: 3\n..."
    },
    {
      "key": "profiles",
      "filename": "profiles.yaml",
      "title": "MIB Profiles",
      "path": "/app/config/profiles.yaml",
      "rawYaml": "profiles:\n  apc-powernet-ups:\n..."
    },
    {
      "key": "devices",
      "filename": "devices.yaml",
      "title": "Devices & Outlets",
      "path": "/app/config/devices.yaml",
      "rawYaml": "devices:\n  - id: ups-datacenter-01\n..."
    }
  ],
  "config": { /* Complete parsed JSON config */ },
  "configDir": "/app/config"
}
```

---

### `POST /api/config`
Validates, writes to disk, and hot-reloads a configuration file immediately without restarting the container or server.

- **Request Body**:
```json
{
  "fileKey": "settings",
  "yamlContent": "settings:\n  pollIntervalDefaultSec: 5\n..."
}
```

- **Parameters**:
  - `fileKey` *(string, required)*: One of `"settings"`, `"profiles"`, or `"devices"`.
  - `yamlContent` *(string, required)*: Valid YAML string.

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "settings.yaml successfully validated, saved to disk, and SNMP poller reloaded.",
  "config": { /* Newly parsed configuration */ }
}
```

- **Response `400 Bad Request`**:
```json
{
  "error": "YAMLException: bad indentation of a mapping entry at line 14"
}
```

---

### `GET /api/config/download/:key`
Downloads the specified configuration file directly as a `.yaml` attachment.

- **URL Parameters**:
  - `key`: `"settings"`, `"profiles"`, or `"devices"`
- **Response `200 OK`**: Raw YAML file with `Content-Type: text/yaml` and `Content-Disposition: attachment`.

---

## 5. Security Vault & Encrypted Credentials (AES-256-GCM)

All SNMP community strings, SNMP v3 USM credentials, and login passphrases can be encrypted with AES-256-GCM per-record encryption and stored in an embedded SQLite database (`./config/vault.db`).

### `GET /api/vault/status`
Returns metadata about the active encryption vault and master key status.

- **Response `200 OK`**:
```json
{
  "masterKeyConfigured": true,
  "masterKeySource": "env",
  "activeKeyVersion": 1,
  "keyFingerprint": "a4f8...b12c",
  "credentialsCount": 4,
  "usersCount": 1,
  "lastRotatedAt": "2026-10-23T04:45:00.000Z",
  "cipherAlgorithm": "aes-256-gcm",
  "sqlitePath": "/app/config/vault.db"
}
```

---

### `GET /api/vault/credentials`
Lists all encrypted SNMP credential records. Sensitive community names and private keys are never returned over the wire.

- **Response `200 OK`**:
```json
{
  "credentials": [
    {
      "id": "cred-v3-admin",
      "label": "Core Rack SNMP v3 Admin",
      "snmpVersion": "3",
      "hasCommunity": false,
      "v3Username": "snmpadmin",
      "v3SecurityLevel": "authPriv",
      "v3AuthProtocol": "sha",
      "hasV3AuthKey": true,
      "v3PrivProtocol": "aes",
      "hasV3PrivKey": true,
      "v3Context": "",
      "keyVersion": 1,
      "createdAt": "2026-10-20T12:00:00.000Z",
      "updatedAt": "2026-10-20T12:00:00.000Z"
    },
    {
      "id": "cred-private-v2",
      "label": "Private v2c Community",
      "snmpVersion": "2c",
      "hasCommunity": true,
      "keyVersion": 1,
      "createdAt": "2026-10-20T12:00:00.000Z",
      "updatedAt": "2026-10-20T12:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/vault/credentials`
Creates or updates an encrypted credential record in SQLite. The plain text secret is encrypted using AES-256-GCM with a unique 96-bit IV before saving.

- **Request Body (SNMP v2c Example)**:
```json
{
  "id": "cred-private-v2",
  "label": "Private v2c Community",
  "snmpVersion": "2c",
  "community": "SecretCommunity123"
}
```

- **Request Body (SNMP v3 USM Example)**:
```json
{
  "id": "cred-v3-admin",
  "label": "Core Rack SNMP v3 Admin",
  "snmpVersion": "3",
  "v3Username": "snmpadmin",
  "v3SecurityLevel": "authPriv",
  "v3AuthProtocol": "sha",
  "v3AuthKey": "myAuthSecretKey",
  "v3PrivProtocol": "aes",
  "v3PrivKey": "myPrivEncryptionKey",
  "v3Context": ""
}
```

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Credential \"cred-v3-admin\" encrypted with AES-256-GCM and stored in SQLite vault."
}
```

---

### `DELETE /api/vault/credentials/:id`
Deletes an encrypted credential record from SQLite.

- **URL Parameters**:
  - `id`: Credential record ID
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Credential deleted successfully."
}
```

---

### `POST /api/vault/rotate-key`
Performs an atomic master key rotation inside a single SQLite transaction:
1. Validates the old master key against active ciphertext records.
2. Decrypts all SNMP communities, v3 secrets, and user passwords.
3. Re-encrypts all records under the new master key with fresh 12-byte IVs.
4. Increments the key version in metadata and promotes the new key in memory with zero downtime.

- **Request Body**:
```json
{
  "oldKey": "current-master-passphrase",
  "newKey": "new-256bit-master-passphrase"
}
```

- **Response `200 OK`**:
```json
{
  "success": true,
  "recordsRotated": 5,
  "snmpRecordsRotated": 4,
  "userRecordsRotated": 1,
  "newVersion": 2,
  "message": "Key rotation completed successfully."
}
```

---

## 6. Dashboard Users & Authentication

Dashboard operator accounts are stored in `vault.db`. Passwords are protected with salted PBKDF2-SHA512 hashes and AES-256-GCM per-record encryption.

### `GET /api/auth/users`
Lists authorized dashboard users and roles.

- **Response `200 OK`**:
```json
{
  "users": [
    {
      "id": "usr-admin",
      "username": "admin",
      "role": "admin",
      "hasEncryptedPassword": true,
      "keyVersion": 1,
      "createdAt": "2026-10-20T12:00:00.000Z",
      "updatedAt": "2026-10-20T12:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/auth/users`
Creates or updates a user credential.

- **Request Body**:
```json
{
  "username": "noc_operator",
  "password": "SecurePassword123!",
  "role": "operator"
}
```

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Login credentials for user \"noc_operator\" encrypted with AES-256-GCM and saved to SQLite vault.",
  "id": "usr-noc_operator"
}
```

---

### `DELETE /api/auth/users/:id`
Removes a dashboard user account.

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "User credential deleted successfully."
}
```

---

### `POST /api/auth/login`
Validates user credentials against stored PBKDF2 hashes and verifies vault decryption.

- **Request Body**:
```json
{
  "username": "admin",
  "password": "mySecurePassword"
}
```

- **Response `200 OK`**:
```json
{
  "success": true,
  "user": {
    "id": "usr-admin",
    "username": "admin",
    "role": "admin"
  }
}
```

- **Response `401 Unauthorized`**:
```json
{
  "success": false,
  "error": "Invalid username or password"
}
```

---

## 7. Diagnostics & Lab Simulator

### `POST /api/snmp/test`
*(Also accessible at `POST /api/tools/snmp-test`)*

Sends an immediate, ad-hoc SNMP GET request to test live network reachability and inspect returned ASN.1 OID types without saving devices to configuration first.

- **Request Body (v2c Query)**:
```json
{
  "host": "192.168.1.50",
  "port": 161,
  "community": "public",
  "version": "2c",
  "oid": "1.3.6.1.2.1.1.1.0"
}
```

- **Request Body (v3 authPriv Query)**:
```json
{
  "host": "192.168.1.50",
  "port": 161,
  "version": "3",
  "oid": "1.3.6.1.4.1.318.1.1.1.2.1.1.0",
  "v3": {
    "username": "snmpadmin",
    "securityLevel": "authPriv",
    "authProtocol": "sha",
    "authKey": "myAuthKey123",
    "privProtocol": "aes",
    "privKey": "myPrivKey123"
  }
}
```

- **Response `200 OK`**:
```json
{
  "success": true,
  "oid": "1.3.6.1.2.1.1.1.0",
  "value": "APC Web/SNMP Management Card (AP9630)",
  "type": "OctetString",
  "responseTimeMs": 14
}
```

---

### `POST /api/lab/event`
Injects simulated operational conditions into devices running under lab simulation mode (`isSimulated: true`). Useful for automated testing of audible alarms, notification webhooks, and overload warnings.

- **Request Body**:
```json
{
  "deviceId": "ups-datacenter-01",
  "event": "toggle_mains"
}
```

- **Supported Events**:
  - `toggle_mains`: Drops input AC voltage to 0 VAC and switches UPS to battery inverter mode.
  - `toggle_overload`: Surges load percentage to 98% to test breaker overload warnings.
  - `toggle_temp`: Increases internal battery temperature to 44°C to trigger thermal alerts.

- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Simulated event toggle_mains applied to ups-datacenter-01"
}
```

---

### `GET /api/docker/info`
Returns embedded Docker deployment files (`Dockerfile`, `docker-compose.yml`, and environment templates) for deployment convenience.

- **Response `200 OK`**:
```json
{
  "dockerfile": "FROM node:22-alpine AS builder ...",
  "dockerCompose": "version: '3.8' ...",
  "envExample": "PORT=3000 ..."
}
```

---

## 8. Status Codes & Error Handling

| HTTP Status | Meaning | Typical Scenario |
| :--- | :--- | :--- |
| **`200 OK`** | Success | Request processed and valid payload returned. |
| **`400 Bad Request`** | Client Error | Missing required fields, invalid YAML syntax, or malformed parameters. |
| **`401 Unauthorized`** | Authentication Failed | Invalid username or password on `/api/auth/login`. |
| **`404 Not Found`** | Resource Missing | Non-existent device ID, credential ID, or unregistered `/api/*` path. |
| **`500 Internal Server Error`** | System Error | Unexpected SQLite or filesystem error. |

All error responses are guaranteed to return a JSON body with an `error` key:
```json
{
  "error": "Descriptive explanation of the failure"
}
```
