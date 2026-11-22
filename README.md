# 🍱 RescueLoop

> **Zero Surplus Wasted. Deliver Safe, Dignified Food.**

![Tests](https://img.shields.io/badge/tests-28%2F28%20passing-brightgreen)
![Python](https://img.shields.io/badge/python-3.11%2B-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688)
![License](https://img.shields.io/badge/license-MIT-blue)

RescueLoop is a full-stack food-rescue coordination platform that connects **donors** (restaurants, event venues, households) with **NGOs** and **volunteers** to redistribute surplus food before it goes to waste. Every donation is tracked from submission to delivery through a structured, database-backed workflow with AI-assisted matching and dispatch.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Role Workspaces](#role-workspaces)
- [18-Screen API Matrix](#18-screen-api-matrix)
- [Database Schema](#database-schema)
- [Allocation Engine](#allocation-engine)
- [Multi-Agent Orchestrator](#multi-agent-orchestrator)
- [Quick Start](#quick-start)
- [Demo Credentials](#demo-credentials)
- [Running Tests](#running-tests)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Features Not Yet Implemented](#features-not-yet-implemented)
- [Contributing](#contributing)

---

## Overview

RescueLoop eliminates the gap between food surplus and food insecurity. When a restaurant has 200 leftover meals, RescueLoop:

1. **Extracts** structured donation details from natural language using an AI intake agent
2. **Matches** the donation to nearby NGOs based on location, temperature requirements, and free capacity using the deterministic allocation engine
3. **Dispatches** an available volunteer via the dispatch agent
4. **Tracks** the pickup-to-delivery chain in real time with explicit mission state transitions
5. **Logs** every action to a tamper-evident audit trail

Four distinct role workspaces (Donor, NGO, Volunteer, Operations) are served from a single FastAPI backend with JWT-based role-based access control. All 18 screens retrieve their data from the same PostgreSQL/SQLite database — no mock data in production paths.

---

## Live Demo

### 1-Click Demo Login

The login screen provides one-click demo login buttons for every role. Click the button for the role you want to explore — no manual credential entry required.

| Role | Demo Button |
|------|-------------|
| Donor | "Demo: Donor Login" |
| NGO | "Demo: NGO Login" |
| Volunteer | "Demo: Volunteer Login" |
| Operations Admin | "Demo: Ops Login" |

### Manual Login

Use any of the [seed credentials below](#demo-credentials) at `http://localhost:3000`.

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14 | React framework with App Router |
| TypeScript | 5+ | Type-safe frontend |
| React | 18 | UI component model |
| lucide-react | latest | Icon library |
| DM Sans | Google Fonts | Typography |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.111 | Async HTTP framework |
| SQLAlchemy | 2.0 Async | ORM and DB sessions |
| Pydantic | v2 | Schema validation |
| PyJWT + bcrypt | latest | Authentication |

### Database

| Technology | Purpose |
|---|---|
| SQLite | Development (zero config) |
| PostgreSQL | Production |
| Prisma Schema | Schema reference (`backend/prisma/schema.prisma`) |
| Alembic-compatible | Migrations via SQLAlchemy metadata |

### Testing

| Technology | Purpose |
|---|---|
| Pytest | Test runner |
| pytest-asyncio | Async test support |
| httpx | ASGI test client |

---

## System Architecture

```mermaid
flowchart TD
    UI["Next.js 14 Frontend\n(18 Screens / TypeScript)"]
    API["lib/api.ts\nTyped API Client"]
    FE["FastAPI Backend\n:8000"]
    AUTH["JWT Auth\n+ RBAC Guards"]
    R1["donor.py router"]
    R2["ngo.py router"]
    R3["volunteer.py router"]
    R4["ops.py router"]
    R5["ai.py router"]
    AE["Allocation Engine\n(Haversine + Capacity)"]
    AO["Agent Orchestrator\n(Intake → Match → Dispatch → Recovery)"]
    DB[("SQLite / PostgreSQL\n13 Tables")]
    AUDIT["Audit Service\nAudit Trail Events"]

    UI --> API
    API --> FE
    FE --> AUTH
    AUTH --> R1
    AUTH --> R2
    AUTH --> R3
    AUTH --> R4
    AUTH --> R5
    R1 --> DB
    R2 --> DB
    R3 --> DB
    R4 --> DB
    R5 --> AO
    R5 --> AE
    AE --> DB
    AO --> DB
    DB --> AUDIT
```

---

## Role Workspaces

### 🧑‍🍳 Donor Workspace
Donors submit surplus food for redistribution.

| Screen | Description |
|---|---|
| Dashboard | Live stats: meals rescued, active donations, impact score, timeline of recent activity |
| Create Donation | Form with AI-assisted natural-language intake; food type, quantity, temperature, pickup window |
| Donation Details | Full lifecycle view: status badge, NGO allocations breakdown, volunteer assignment, audit trail |
| Donation History | Paginated, searchable table of all past donations with status filters |

### 🏥 NGO Workspace
NGOs receive and accept food allocation offers.

| Screen | Description |
|---|---|
| Dashboard | Current capacity utilisation, pending offers count, meals received this month |
| Incoming Offers | List of pending allocation offers with donor name, food type, quantity, expiry |
| Offer Details | Detailed offer view with accept / partial accept / decline actions |
| Requirements & Capacity | Edit food preferences, storage temperature, daily capacity, blackout dates |

### 🚴 Volunteer Workspace
Volunteers confirm pickup and delivery of missions.

| Screen | Description |
|---|---|
| Dashboard | Assigned missions, completed runs, success rate, map of active pickup locations |
| Task Details | Step-by-step mission: OTP verification, pickup scan, en-route update, delivery confirmation |

### 🖥️ Operations Workspace
Ops admins have full visibility and control.

| Screen | Description |
|---|---|
| Dashboard | System-wide KPIs: total donations, meals rescued, active missions, exception count |
| Mission Control | Real-time table of all active missions with status, volunteer, NGO, age |
| Mission Details | Full mission audit with state timeline, manual override controls |
| Exceptions & Approvals | Flagged items needing manual intervention (failed OTPs, capacity disputes, timeout escalations) |
| Network Management | CRUD for NGOs and volunteers; capacity edits; activation/deactivation |
| Activity & Audit Trail | Immutable log of every system event, filterable by user, type, date range |

---

## 18-Screen API Matrix

| # | Screen | Role | Primary Endpoint | Method |
|---|---|---|---|---|
| 1 | Login | All | `/auth/login` | POST |
| 2 | Organization Onboarding | NGO/Volunteer | `/auth/register` | POST |
| 3 | Donor Dashboard | Donor | `/donor/dashboard` | GET |
| 4 | Create Donation | Donor | `/donor/donations` | POST |
| 5 | Donation Details | Donor | `/donor/donations/{id}` | GET |
| 6 | Donation History | Donor | `/donor/donations` | GET |
| 7 | NGO Dashboard | NGO | `/ngo/dashboard` | GET |
| 8 | Incoming Offers | NGO | `/ngo/offers` | GET |
| 9 | Offer Details | NGO | `/ngo/offers/{id}` | GET / PATCH |
| 10 | Requirements & Capacity | NGO | `/ngo/requirements` | GET / PUT |
| 11 | Volunteer Dashboard | Volunteer | `/volunteer/dashboard` | GET |
| 12 | Volunteer Task Details | Volunteer | `/volunteer/missions/{id}` | GET / PATCH |
| 13 | Operations Dashboard | Ops | `/ops/dashboard` | GET |
| 14 | Mission Control | Ops | `/ops/missions` | GET |
| 15 | Mission Details | Ops | `/ops/missions/{id}` | GET / PATCH |
| 16 | Exceptions & Approvals | Ops | `/ops/exceptions` | GET / PATCH |
| 17 | Network Management | Ops | `/ops/network` | GET / POST / PATCH |
| 18 | Activity & Audit Trail | Ops | `/ops/audit` | GET |

> Full interactive API docs available at **`http://localhost:8000/docs`** (Swagger UI) and **`http://localhost:8000/redoc`** (ReDoc).

---

## Database Schema

13 relational tables with UUID primary keys, timestamps, indexed foreign keys and status constraints.

| Entity | Description |
|---|---|
| `User` | Base auth entity: email, hashed password, role (`donor`/`ngo`/`volunteer`/`ops`) |
| `DonorProfile` | Restaurant/venue details, address, lat/lon, contact |
| `NGOProfile` | Organisation name, capacity, food preferences, location, blackout schedule |
| `VolunteerProfile` | Vehicle type, available hours, service radius, rating |
| `Donation` | Food type, quantity (meals), temperature, status, pickup window, donor FK |
| `DonationAllocation` | Junction: donation ↔ NGO, allocated quantity, acceptance status |
| `Mission` | End-to-end delivery job: volunteer FK, donation FK, state machine status |
| `MissionEvent` | Ordered state-change log per mission (pickup scan, OTP verify, delivery) |
| `Assignment` | Volunteer assignment record with OTP, retries, timestamps |
| `AgentRun` | Logged execution of each AI agent (type, input, output, duration) |
| `Exception` | Flagged anomalies needing ops review (type, description, resolution) |
| `Notification` | In-app notifications per user with read status |
| `AuditEvent` | Immutable event log: actor, action, resource, before/after JSON snapshot |

### Donation State Machine

```
SUBMITTED → ALLOCATED → DISPATCHING → PICKUP_UNDERWAY → IN_TRANSIT → HANDOVER_PENDING → COMPLETED
                                   ↘ REJECTED (volunteer decline → Recovery Agent → retry)
                                                                         ↘ FAILED (max retries exceeded)
```

---

## Allocation Engine

The deterministic allocation engine (`backend/app/services/allocation_engine.py`) distributes donation meals across eligible NGOs without AI:

1. **Geo-filter**: NGOs within 15 km radius (Haversine formula) are candidates
2. **Temperature match**: Refrigerated / frozen / ambient tags must align
3. **Capacity rank**: Sort candidates by `current_free_capacity DESC`
4. **Greedy fill**: Assign meals top-down until donation quantity is exhausted
5. **Partial allocation**: Each NGO gets `min(needed, free_capacity)` — never over-allocated
6. **Capacity restore**: If NGO declines, `current_free_capacity` is restored atomically

**Example:**
```
Donation: 150 meals

NGO A (free cap: 80)  → allocated 80 meals
NGO B (free cap: 50)  → allocated 50 meals
NGO C (free cap: 20)  → allocated 20 meals
─────────────────────────────────────────
Total allocated: 150 / 150 ✓
```

---

## Multi-Agent Orchestrator

Located in `backend/app/agents/` and `backend/app/services/`.

| Agent | File | Responsibility |
|---|---|---|
| **Intake Agent** | `intake_agent.py` | Parse natural-language donation descriptions into structured fields (food type, quantity, temperature, expiry) |
| **Matching Agent** | `orchestrator.py` | Recommend NGOs using allocation engine output |
| **Dispatch Agent** | `orchestrator.py` | Identify available volunteers by proximity and capacity |
| **Recovery Agent** | `orchestrator.py` | Handle rejections: reassign to next candidate, escalate after `MAX_RETRIES=3` |
| **Orchestrator** | `orchestrator.py` | Sequence agents, persist `AgentRun` records, enforce timeout budgets |

> When `GEMINI_API_KEY` is not set, all agents fall back to deterministic Python logic — the application remains fully functional without an AI API key.

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Git

### 1. Clone

```bash
git clone https://github.com/MadheshLoganathan123/RescueLoop.git
cd RescueLoop
```

### 2. Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Copy environment template and configure
cp backend/.env.example backend/.env
# Edit backend/.env — the defaults work for SQLite development

# Start the backend (from project root)
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will:
- Create `rescueloop.db` automatically on first run
- Seed 6 demo users, 2 NGOs, 2 volunteers, 3 sample donations
- Print `Application startup complete` when ready

API docs: **http://localhost:8000/docs**

### 3. Frontend Setup

```bash
# In a new terminal, from project root
npm install
npm run dev
```

Frontend: **http://localhost:3000**

### 4. Production Build Check

```bash
npm run build
npm start
```

---

## Demo Credentials

All seed accounts share the password **`password123`**.

| Role | Email | Password | Notes |
|---|---|---|---|
| Donor | `alex@abcrestaurant.com` | `password123` | ABC Restaurant — 3 sample donations |
| NGO | `sarah@hopefoundation.org` | `password123` | Hope Kitchen — capacity 200 |
| NGO | `care@annagarcenter.org` | `password123` | Anna Nagar Center — capacity 150 |
| Volunteer | `jordan@rescuecouriers.org` | `password123` | Active volunteer |
| Volunteer | `priya@rescuecouriers.org` | `password123` | Active volunteer |
| Ops Admin | `ops@rescueloop.org` | `password123` | Full system access |

### Sample Donations

| ID | Status | Description |
|---|---|---|
| RL-00124 | In Transit | Biryani — 60 meals |
| RL-00128 | Courier Assigned | Sandwiches — 40 meals |
| RL-00119 | Delivered | Veg curry — 50 meals |

---

## Running Tests

```bash
# From project root, with backend virtualenv activated
python -m pytest backend/tests -v
```

### Test Results — 28/28 Passing ✅

| Test File | Tests | Coverage |
|---|---|---|
| `test_auth.py` | 5 | Registration, login, demo-login, JWT validation, role guard |
| `test_donations.py` | 4 | Create donation, list, get by ID, status update |
| `test_allocation.py` | 4 | Geo-filter, temperature match, greedy fill, capacity restore on decline |
| `test_volunteer_flow.py` | 4 | Assignment creation, OTP verify, pickup confirm, delivery confirm |
| `test_ops_audit.py` | 5 | Dashboard KPIs, mission override, exception creation, audit events, RBAC |
| `test_full_system_audit.py` | 6 | DB integrity, RBAC cross-role, E2E lifecycle, OTP rejection, capacity restore, CORS |

```
========================= 28 passed in X.XXs =========================
```

---

## Environment Variables

Create `backend/.env` from the template:

```env
# ─── Database ───────────────────────────────────────
# SQLite (default — zero config for development)
DATABASE_URL=sqlite+aiosqlite:///./rescueloop.db

# PostgreSQL (production)
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/rescueloop

# ─── Authentication ──────────────────────────────────
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# ─── AI (optional) ───────────────────────────────────
# Without this key, agents use deterministic fallback logic
GEMINI_API_KEY=

# ─── CORS ────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
```

> **Security**: Never commit a real `SECRET_KEY` or `GEMINI_API_KEY` to source control. The `.env` file is excluded by `.gitignore`.

---

## Project Structure

```
RescueLoop/
├── README.md                        ← You are here
├── package.json                     ← Frontend deps (Next.js 14)
├── next.config.ts
├── tsconfig.json
│
├── app/                             ← Next.js App Router
│   ├── layout.tsx                   ← Root layout + fonts
│   ├── page.tsx                     ← Entry → RescueLoopApp
│   └── globals.css
│
├── components/
│   └── RescueLoopApp.tsx            ← All 18 screens (~3000 lines)
│
├── lib/
│   └── api.ts                       ← Typed API client (all endpoints)
│
└── backend/
    ├── README.md                    ← Detailed backend docs
    ├── requirements.txt
    ├── .env.example
    ├── prisma/
    │   └── schema.prisma            ← Full Prisma schema (PostgreSQL)
    └── app/
        ├── main.py                  ← FastAPI app + lifespan + CORS
        ├── config.py                ← Pydantic settings
        ├── database.py              ← Async session factory
        ├── models/
        │   ├── entities.py          ← 13 SQLAlchemy models
        │   └── schemas.py           ← Pydantic v2 schemas
        ├── auth/
        │   ├── router.py            ← /auth/* endpoints
        │   ├── security.py          ← JWT + bcrypt
        │   └── dependencies.py      ← RBAC role guards
        ├── routers/
        │   ├── donor.py             ← /donor/* endpoints
        │   ├── ngo.py               ← /ngo/* endpoints
        │   ├── volunteer.py         ← /volunteer/* endpoints
        │   ├── ops.py               ← /ops/* endpoints
        │   └── ai.py                ← /ai/* endpoints
        ├── services/
        │   ├── allocation_engine.py ← Haversine + capacity allocator
        │   ├── audit_service.py     ← Audit event writer
        │   └── seed_data.py         ← Dev seed (6 users, 3 donations)
        ├── agents/
        │   ├── intake_agent.py      ← NLP → structured donation
        │   └── orchestrator.py      ← Multi-agent coordinator
        └── tests/
            ├── test_auth.py
            ├── test_donations.py
            ├── test_allocation.py
            ├── test_volunteer_flow.py
            ├── test_ops_audit.py
            └── test_full_system_audit.py
```

---

## Features Not Yet Implemented

These features require external service credentials or hardware that are not available in this repository. All other features are fully implemented.

| Feature | Blocker | Workaround |
|---|---|---|
| Live SMS / WhatsApp OTP delivery | Needs Twilio or Gupshup API key | OTP is logged server-side; visible in `/ops/audit` during development |
| Physical GPS vehicle tracking | Needs IoT / Google Fleet Engine / Traccar | Mission status is updated manually via volunteer task screen |
| Live Gemini AI inference | Needs `GEMINI_API_KEY` in `.env` | Agents use deterministic Python fallback logic — full functionality preserved |
| PDF receipt generation | Needs ReportLab or WeasyPrint | Donation details screen shows all data; PDF download is a planned enhancement |
| Outbound email notifications | Needs SendGrid / Mailgun SMTP config | In-app notifications table is fully implemented |
| Cloud PostgreSQL | Needs `DATABASE_URL` for live Postgres | SQLite works out of the box for development; switch by changing `DATABASE_URL` |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Run tests before committing: `python -m pytest backend/tests -v`
4. Commit using conventional commits: `feat:`, `fix:`, `docs:`, `test:`
5. Push and open a pull request against `main`

Please do not commit:
- `node_modules/` or `.next/` directories
- `rescueloop.db` or any `*.db` files
- Real API keys or secrets

---

## License

MIT © 2026 RescueLoop Contributors

---

<div align="center">
  <strong>Built to rescue food. Built to scale.</strong><br/>
  <em>Every meal delivered is a step toward zero waste.</em>
</div>
