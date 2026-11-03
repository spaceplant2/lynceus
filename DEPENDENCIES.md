# Lynceus — Underlying Technologies, Dependencies & Version Matrix

This document provides a comprehensive inventory of all technologies, runtime platforms, libraries, standards, and CI/CD tools used throughout **Lynceus**. It serves as an authoritative baseline for tracking updates, auditing vulnerabilities, and planning version upgrades.

---

## 1. System Platform & Runtime

| Technology | Category | Current Version | Purpose | Upgrade / Update Policy |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js** | Core Runtime | `22.x` (LTS — Active: `v22.23.3`) | Server runtime, executing `server.ts` and background SNMP polling loops. | Follow Node.js Active LTS releases (even versions). |
| **Alpine Linux** | Container OS | `node:22-alpine` (Alpine 3.21) | Minimal, hardened container base image for production builds. | Rebuild monthly or trigger via automated workflow to consume base image security patches. |
| **npm** | Package Manager | `10.9.x` | Dependency resolution and lockfile management (`package-lock.json`). | Bundled with Node.js LTS release. |
| **Docker Engine & CLI** | Containerization | `24.x` / `25.x` / `26.x` | Container runtime engine supporting multi-arch images (`linux/amd64`, `linux/arm64`). | Compatible with standard OCI / Docker Engine. |
| **Docker Compose** | Orchestration | `v2.x` (Compose Spec) | Local and production multi-container orchestration. | Uses Compose v2 specification. |

---

## 2. Production Runtime Dependencies (`package.json`)

| Package / Module | Current Version | Category | Role in Lynceus |
| :--- | :--- | :--- | :--- |
| **`express`** | `^4.21.2` | HTTP Framework | REST API engine, serving configuration endpoints, telemetry streams, and SPA static assets. |
| **`net-snmp`** | `^3.29.2` | Protocol Engine | Low-level UDP SNMP v1, v2c, and v3 client for active polling and remote outlet control. |
| **`js-yaml`** | `^5.5.0` | Serialization | High-performance YAML parser and dumper for modular config files (`settings.yaml`, `profiles.yaml`, `devices.yaml`). |
| **`react`** | `^19.0.1` | Frontend Library | Core UI component state management, hooks, and virtual DOM. |
| **`react-dom`** | `^19.0.1` | Frontend Renderer | Web DOM rendering and portal management for React 19. |
| **`tsx`** | `^4.21.0` | TypeScript Runner | Fast TypeScript execution for server-side code without explicit compilation step. |
| **`vite`** | `^8.3.0` | Build & Bundler | Frontend module bundler and development HMR middleware server. |
| **`lucide-react`** | `^0.546.0` | Iconography | Lightweight, consistent SVG icon system across dashboard panes. |
| **`motion`** | `^12.23.24` | Animation | Micro-animations for live power meters, outage alerts, and tab transitions. |
| **`dotenv`** | `^17.2.3` | Configuration | Environment variable loader from `.env` files. |
| **`@tailwindcss/vite`** | `^4.3.3` | CSS Processing | Vite plugin integrating Tailwind CSS 4 engine. |
| **`@vitejs/plugin-react`** | `^6.1.1` | Build Plugin | Fast React JSX transformation with Rolldown / Babel integration. |
| **`@google/genai`** | `^2.4.0` | AI Studio SDK | Base SDK for platform integration. |

---

## 3. Native Node.js Built-In Standard Libraries

Lynceus relies on zero-dependency native Node 22 modules for mission-critical storage and encryption:

| Module | Native Capability | Used In Lynceus For |
| :--- | :--- | :--- |
| **`node:sqlite`** | Synchronous SQLite Engine (`DatabaseSync`) | Secure persistence of `vault.db` (encrypted SNMP communities, USM v3 keys, and user credentials) without third-party native compilation. |
| **`node:crypto`** | OpenSSL Cryptographic Primitives | AES-256-GCM cipher/decipher with random 96-bit IVs, PBKDF2 key derivation, SHA-256 hashing, and timing-safe comparisons. |
| **`node:fs` & `node:path`** | File System Operations | Atomic configuration reading, validation, writing, and backup management. |
| **`node:dgram`** | UDP Socket Transport | Raw UDP socket layer utilized by `net-snmp` for standard SNMP port `161` communications. |

---

## 4. Development & Build Tools (`devDependencies`)

| Package | Current Version | Role |
| :--- | :--- | :--- |
| **`typescript`** | `^7.0.2` | Static type checking (`tsc --noEmit`) and strict type validation across frontend and backend. |
| **`tailwindcss`** | `^4.3.3` | Modern utility-first CSS engine with dark/light mode and custom theme variables. |
| **`esbuild`** | `^0.28.0` | High-speed JavaScript/TypeScript bundler powering Vite internals. |
| **`autoprefixer`** | `^10.4.21` | PostCSS vendor prefixing. |
| **`@types/node`** | `^22.14.0` | Type definitions for Node.js 22 LTS runtime. |
| **`@types/react`** | `^19.3.0` | Type definitions for React 19. |
| **`@types/react-dom`** | `^19.3.0` | Type definitions for React DOM 19. |
| **`@types/express`** | `^4.17.21` | Type definitions for Express 4. |
| **`@types/net-snmp`** | `^3.23.0` | Type definitions for `net-snmp` module. |
| **`@types/js-yaml`** | `^4.0.9` | Type definitions for YAML parser. |

---

## 5. Protocols & Hardware Standards Supported

| Standard / Protocol | Specification | Details & Algorithms |
| :--- | :--- | :--- |
| **SNMP v1** | RFC 1157 | Legacy community string authentication for vintage power equipment. |
| **SNMP v2c** | RFC 1901 – 1908, RFC 3416 | Standard community-based queries with 64-bit counter support. |
| **SNMP v3 USM** | RFC 3414 | User-based Security Model (`noAuthNoPriv`, `authNoPriv`, `authPriv`). |
| **SNMP v3 Auth Algorithms** | RFC 3414, RFC 7860 | MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512. |
| **SNMP v3 Priv Encryption** | RFC 3414, RFC 3826 | DES, AES-128, AES-192, AES-256. |
| **Standard UPS MIB** | RFC 1628 | Universal battery status, input/output voltage, frequency, and bypass monitoring. |
| **PowerNet-MIB** | APC / Schneider Electric | Granular phase metering, battery temperature, runtime remaining, and switched outlet control. |
| **XUPS-MIB** | Eaton / Powerware | Eaton UPS line telemetry and contact closure status. |
| **Vault Encryption Standard** | NIST SP 800-38D | Per-record **AES-256-GCM** with random 96-bit initialization vectors (IV) and 128-bit authentication tags. |

---

## 6. GitHub Actions CI/CD Dependencies (`.github/workflows/docker-publish.yml`)

| Action / Workflow Component | Current Version | Role |
| :--- | :--- | :--- |
| **`actions/checkout`** | `v4` | Repository checkout with full commit history. |
| **`docker/setup-qemu-action`** | `v3` | Multi-architecture QEMU emulation for `linux/amd64` and `linux/arm64`. |
| **`docker/setup-buildx-action`** | `v3` | Docker Buildx setup with BuildKit features and cache mounting. |
| **`docker/login-action`** | `v3` | Authentication with GitHub Container Registry (`ghcr.io`). |
| **`docker/metadata-action`** | `v5` | Automated extraction of OCI tags and release labels. |
| **`docker/build-push-action`** | `v6` | Multi-platform image compilation and direct push to GHCR. |

---

## 7. Version Checking & Upgrade Commands

### Check for Outdated NPM Dependencies
```bash
npm outdated
```

### Upgrade Dependencies Within Semantic Version Ranges
```bash
npm update
```

### Validate Type System & Compilation After Upgrading
```bash
# 1. Check TypeScript types
npm run lint

# 2. Test production frontend build
npm run build

# 3. Test dev server boot
npm run dev
```

### Update Base Docker Image
Rebuild the container image with `--pull` to grab the latest Alpine and Node 22 security updates:
```bash
docker compose build --pull
```
