# Resolving the GHCR "Unauthorized" Error & Public Container Access

A targeted troubleshooting and implementation plan designed to pinpoint and eliminate the `Unauthorized` error when publishing or pulling the Lynceus container from GitHub Container Registry (`ghcr.io`).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Diagnosing the `Unauthorized` Error**:
> An `Unauthorized` error in GitHub Container Registry happens in one of two distinct stages:
> 1. **During the GitHub Action Push (`403 Forbidden` / `401 Unauthorized`)**: GitHub Actions is blocked from publishing the container to `ghcr.io`.
> 2. **During `docker pull` on your machine (`unauthorized: authentication required`)**: The user attempts to pull the container, but the image either doesn't exist on GHCR yet or the package's standalone visibility setting is still private.

---

### 1. Root Cause Analysis

| Scenario | Where It Happens | Root Cause | Permanent Fix |
| :--- | :--- | :--- | :--- |
| **A. Workflow Push Failure** | GitHub Actions ➔ `docker/build-push-action` | `GITHUB_TOKEN` lacks permission to create/write packages in the organization or user account. | 1. Set **Workflow permissions** to "Read and write".<br>2. Support a **Personal Access Token (`CR_PAT`)** in the workflow to bypass token scope restrictions. |
| **B. Non-Existent Image Tag** | Terminal ➔ `docker pull ghcr.io/...` | If the GitHub Actions push failed or hasn't finished, the image doesn't exist yet. GHCR returns `Unauthorized` (not 404) to avoid leaking package existence. | Verify the GitHub Action completed with a green checkmark before pulling. |
| **C. Package Visibility Setting** | Terminal ➔ `docker pull ghcr.io/...` | Repository visibility is public, but the **Package** itself defaults to private. | Change package visibility to **Public** under GitHub ➔ Packages ➔ Package Settings. |
| **D. Mixed Case in Docker Command** | Terminal ➔ `docker pull ghcr.io/...` | GHCR requires strictly lowercase URLs. If the GitHub account is `SpacePlant2`, pulling `SpacePlant2/lynceus` throws `Unauthorized`. | Pull using strictly lowercase: `ghcr.io/spaceplant2/lynceus:latest`. |

---

### 2. Immediate Diagnostic Checklist

Please verify which step is throwing the error:

#### Check 1: Did the GitHub Action succeed?
1. Open **`https://github.com/spaceplant2/lynceus/actions`**.
2. Look at the latest run of **Build and Publish Container Image**:
   - **If the workflow has a RED X**: The error is happening during **PUSH**. Proceed to **Solution 1 (PAT Setup)** below.
   - **If the workflow has a GREEN checkmark**: The error is happening during **PULL**. Proceed to **Solution 2 (Package Visibility)** below.

---

### 3. Resolution Steps

#### Solution 1: Fix Workflow Push (The Bulletproof PAT Method)

If the GitHub Actions workflow fails on `Log in to GitHub Container Registry` or `Build and push multi-arch Docker image` with `401 Unauthorized` or `denied`:

1. **Create a GitHub Personal Access Token (PAT)**:
   - Go to GitHub ➔ Top right avatar ➔ **Settings** (Account Settings, not repo settings).
   - Scroll to the bottom of the left sidebar ➔ **Developer settings**.
   - Click **Personal access tokens** ➔ **Tokens (classic)**.
   - Click **Generate new token** ➔ **Generate new token (classic)**.
   - Note: `Lynceus GHCR Token`.
   - Expiration: `90 days` or `No expiration`.
   - Check the following scopes:
     - `write:packages` (Upload packages to GitHub Package Registry)
     - `read:packages` (Download packages from GitHub Package Registry)
     - `repo` (Full control of private repositories)
   - Click **Generate token** and copy the token (starts with `ghp_...`).

2. **Add the Token to Your Repository Secrets**:
   - Go to your repository: `https://github.com/spaceplant2/lynceus`.
   - Click **Settings** (repo settings) ➔ In left sidebar expand **Secrets and variables** ➔ click **Actions**.
   - Click **New repository secret**.
   - Name: **`CR_PAT`**
   - Secret: Paste the token you just copied.
   - Click **Add secret**.

3. **Update Workflow to Use `CR_PAT`**:
   We will update `.github/workflows/docker-publish.yml` to use:
   ```yaml
   password: ${{ secrets.CR_PAT || secrets.GITHUB_TOKEN }}
   ```
   This automatically uses your token if provided, bypassing all default `GITHUB_TOKEN` organization restrictions.

---

#### Solution 2: Fix Docker Pull ("Unauthorized" in Terminal)

If the GitHub Actions build succeeded, but running `docker pull` fails:

1. **Confirm the Package Exists**:
   - Visit: `https://github.com/spaceplant2/lynceus/pkgs/container/lynceus`
   - (Or go to your repo ➔ click **Packages** on the right side).
   - If no package is listed, the push hasn't completed yet.

2. **Set Package to Public**:
   - On the package page, click **Package settings** (right sidebar or top right).
   - Scroll all the way down to **Danger Zone**.
   - Under **Change package visibility**, click **Change visibility**.
   - Select **Public** and type the package name to confirm.
   - Click **I understand the consequences, make this package public**.

3. **Pull with Strictly Lowercase Letters**:
   Docker Registry requires 100% lowercase names:
   ```bash
   docker pull ghcr.io/spaceplant2/lynceus:latest
   ```

---

### 4. Technical Architecture & Secret Integration

```
┌────────────────────────────────────────────────────────┐
│             Developer / Organization Admin             │
│   Creates Classic PAT with `write:packages` scope      │
└───────────────────────────┬────────────────────────────┘
                            │ Stored as Repo Secret: CR_PAT
                            ▼
┌────────────────────────────────────────────────────────┐
│            GitHub Actions (.github/workflows)          │
│   password: ${{ secrets.CR_PAT || secrets.GITHUB_TOKEN }}│
└───────────────────────────┬────────────────────────────┘
                            │ Authenticates cleanly to ghcr.io
                            ▼
┌────────────────────────────────────────────────────────┐
│               GitHub Container Registry                │
│             ghcr.io/spaceplant2/lynceus                │
├────────────────────────────────────────────────────────┤
│ Package Settings ➔ Visibility: PUBLIC                  │
└───────────────────────────┬────────────────────────────┘
                            │ Anonymous unauthenticated pull
                            ▼
┌────────────────────────────────────────────────────────┐
│                     End Users                          │
│   docker run -p 3000:3000 ghcr.io/spaceplant2/lynceus   │
└────────────────────────────────────────────────────────┘
```

---

### Next Steps Upon Approval

1. Update `.github/workflows/docker-publish.yml` to support `${{ secrets.CR_PAT || secrets.GITHUB_TOKEN }}`.
2. Commit the change to `main`.
3. You will add the `CR_PAT` secret in your repository settings (or verify package visibility depending on where the error triggered).
