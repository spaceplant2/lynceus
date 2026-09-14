# 👁️ Lynceus

> **Lynceus** — *Named after the Argonaut with sight so keen he could see through walls.*

Lynceus is a lightweight, modern SNMP management web interface built with a **FastAPI** backend and a **React + Tailwind CSS** frontend, fully containerized with **Docker** and orchestrated using **Docker Compose**.

---

## 📸 Features

- **SNMP GET:** Retrieve specific single-value OIDs (system info, uptime, hostname).
- **SNMP SET:** Modify device parameters with specified data types (`Integer` or `String`).
- **SNMP WALK:** Traverse complete OID subtrees to fetch structured tabular data.
- **Dockerized Architecture:** Nginx-backed frontend proxying requests to a fast Python/PySNMP backend.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.11, FastAPI, PySNMP, Uvicorn
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons
- **Deployment:** Docker, Docker Compose, Nginx (Alpine)

---

## 🚀 Quickstart

### Prerequisites

- **Linux / macOS:** [Docker Engine](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/)
- **Windows:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) with the WSL 2 backend enabled- [Git](https://git-scm.com/)

### Running the Application

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/spaceplant2/lynceus.git](https://github.com/spaceplant2/lynceus.git)
   cd lynceus