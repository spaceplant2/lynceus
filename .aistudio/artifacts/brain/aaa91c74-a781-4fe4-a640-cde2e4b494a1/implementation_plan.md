# Container Build: Resilient Dependency Installation & Lockfile Synchronization

A resilient Docker build strategy that resolves the `npm ci` lockfile mismatch error on GitHub Actions, guaranteeing successful container image builds across `linux/amd64` and `linux/arm64`.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Decision**: We will implement a resilient build strategy in `Dockerfile`. During the build, Docker will attempt `npm ci` first for maximum speed and deterministic dependency caching, but gracefully fall back to `npm install` if minor lockfile discrepancies exist between `package.json` and `package-lock.json` in the git checkout.

- **Confirmed Decision 1**: Use resilient fallback (`npm ci || npm install`) in both the builder and runner stages of `Dockerfile`.
- **Confirmed Decision 2**: Ensure a freshly generated `package-lock.json` (Lockfile Version 3, Node 24 compatible) is saved in the repository for clean installs whenever possible.

---

### 1. Overview & Core Concept

- **The Problem**: 
  `npm ci` (Clean Install) is designed for automated environments and strictly requires that `package.json` and `package-lock.json` match with 100% precision. If a developer edits `package.json` (for example, adding or bumping a package) without running `npm install` locally to update `package-lock.json`, or if git checkouts across different operating systems experience line-ending or minor metadata differences, `npm ci` immediately halts the build with:
  ```text
  error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.
  ```
- **The Solution**:
  1. **Dual-Tier Resilient Docker Build**: Update `Dockerfile` to run `npm ci || npm install` in the builder stage and `npm ci --omit=dev || npm install --omit=dev` in the runner stage. If the lockfile matches, it performs a fast clean install; if any sync delta is detected, it automatically falls back to `npm install` without failing the container build.
  2. **Synchronized Baseline Lockfile**: Generate a clean, unified `package-lock.json` in the workspace matching all dependencies for Node 24 so that even standard `npm ci` runs cleanly.

---

### 2. User Experience & Developer Workflow

- **Seamless Automated GitHub Actions**:
  When commits are pushed to `main`, the GitHub Actions workflow (`docker-publish.yml`) will build multi-architecture images (`linux/amd64`, `linux/arm64`) to `ghcr.io/spaceplant2/lynceus:latest` without stalling on lockfile validation.
- **Clear Diagnostic Logging**:
  If a lockfile divergence ever occurs in a future commit, the Docker build logs will clearly note the fallback execution rather than abruptly aborting the pipeline.
- **In-Dashboard Deployment Consistency**:
  The embedded Docker files displayed in the *Docker & Tools* tab of the Lynceus web interface will reflect this resilient approach, giving homelab and datacenter administrators the exact same rock-solid Dockerfile.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Resilient Fallback vs. Strict Lockfile Enforcement**
  - *Chosen Approach*: `npm ci || npm install` in `Dockerfile`.
  - *Why*: Eliminates fragile build pipeline failures while maintaining fast layer caching when the lockfile is in sync.
  - *Alternative Considered*: Strict `npm ci` with build failure. Rejected because homelab users and remote deployments frequently encounter lockfile sync issues when pulling updates or modifying minor configs.

- **Decision 2: Runner Stage Production Pruning**
  - *Chosen Approach*: `npm ci --omit=dev || npm install --omit=dev` combined with `npm cache clean --force`.
  - *Why*: Keeps the production container lean (~180MB) and free of development dependencies like Vite, TypeScript, and compilers.

---

### 4. Technical Architecture & Build Pipeline Flow

```
┌────────────────────────────────────────────────────────┐
│                   GitHub Actions CI/CD                 │
│              (.github/workflows/docker-publish.yml)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Multi-Arch Docker BuildKit               │
│                  (linux/amd64, linux/arm64)            │
├────────────────────────────────────────────────────────┤
│ Stage 1: Builder (node:24-alpine)                      │
│   ├── COPY package*.json ./                            │
│   ├── RUN npm ci || npm install                        │
│   │     ├── [Try 1] npm ci (Fast clean install)        │
│   │     └── [Fallback] npm install (Auto-resync)       │
│   ├── COPY . .                                         │
│   └── RUN npm run build                                │
├────────────────────────────────────────────────────────┤
│ Stage 2: Production Runner (node:24-alpine)             │
│   ├── COPY package*.json ./                            │
│   ├── RUN npm ci --omit=dev || npm install --omit=dev  │
│   ├── COPY --from=builder /app/dist ./dist             │
│   ├── COPY --from=builder /app/server.ts ./server.ts   │
│   ├── COPY --from=builder /app/server ./server         │
│   ├── COPY --from=builder /app/src/types ./src/types   │
│   └── COPY --from=builder /app/config ./config         │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               GitHub Container Registry                │
│             ghcr.io/spaceplant2/lynceus:latest         │
└────────────────────────────────────────────────────────┘
```

---

### Next Steps Upon Approval

1. Update `Dockerfile` to use the resilient fallback commands (`npm ci || npm install`) in both stages.
2. Synchronize `package-lock.json` with `npm install` in the workspace to ensure pristine alignment.
3. Update `server.ts` to reflect the updated Dockerfile template in `/api/docker/info`.
4. Commit the synchronized files to `main` so pushing to GitHub immediately resolves the build failure.
