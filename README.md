# 🍱 RescueLoop

> **Zero Surplus Wasted. Every Meal Counts.**

![Tests](https://img.shields.io/badge/tests-36%2F36%20passing-brightgreen)
![Python](https://img.shields.io/badge/python-3.11%2B-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6)
![License](https://img.shields.io/badge/license-MIT-blue)

RescueLoop is a production-grade, multi-role food rescue and redistribution platform that bridges the gap between surplus food and food insecurity. Built for scalability and real-world operational use, RescueLoop coordinates the full lifecycle of a food rescue — from the moment a donor submits surplus food through AI-assisted intake, to precision NGO matching, volunteer dispatch, real-time GPS telemetry, OTP-verified handover, and PDF receipt generation — all backed by an immutable audit trail.

---

## 📋 Table of Contents

- [Mission](#mission)
- [Platform Overview](#platform-overview)
- [User Roles](#user-roles)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [Allocation Engine](#allocation-engine)
- [AI Agent Orchestration](#ai-agent-orchestration)
- [API Reference](#api-reference)
- [Screen Inventory](#screen-inventory)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running Tests](#running-tests)
- [Docker Deployment](#docker-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Mission

Food waste is a systemic failure. Restaurants, caterers, and event venues discard millions of meals every year while communities nearby face food insecurity. RescueLoop exists to close that gap — not through awareness campaigns, but through operational infrastructure.

The platform provides every stakeholder with purpose-built tools:
- **Donors** get a frictionless way to register surplus food and track its journey to beneficiaries.
- **NGOs** receive matched, temperature-compatible food offers and manage intake capacity.
- **Volunteers** get structured, step-by-step mission guidance with GPS telemetry and OTP-secured handovers.
- **Operations teams** get full situational awareness, real-time control, and an immutable audit trail.

---

## Platform Overview

When a food establishment has surplus meals, RescueLoop orchestrates the entire rescue operation:

1. **AI Intake** — The donor describes surplus food in natural language. The Intake Agent extracts structured fields (food type, quantity, temperature class, allergens, pickup window, preparation time).
2. **Precision Matching** — The deterministic Allocation Engine applies geo-filtering (Haversine, 15 km radius), temperature compatibility checks, and greedy capacity allocation to distribute meals across eligible NGOs.
3. **Volunteer Dispatch** — The Dispatch Agent identifies available volunteers by proximity and vehicle type, creates a Mission with an OTP-secured assignment.
4. **Real-Time Tracking** — Volunteers stream GPS coordinates during transit. Ops teams monitor live position on the Mission Control board.
5. **OTP Handover** — Delivery completion is verified by a one-time password presented to the recipient, preventing fraudulent completion claims.
6. **Receipt & Records** — Donors receive a PDF donation receipt. All events are logged to an immutable AuditEvent trail.
7. **Exception Handling** — Failed OTPs, capacity disputes, volunteer no-shows, and timeout escalations are flagged automatically and routed to Operations for resolution.

---

## User Roles

### 🧑‍🍳 Donor

Restaurants, catering businesses, food establishments, corporate cafeterias, and event venues with surplus food available for redistribution.

**Capabilities:**
- Register organization with address, geolocation, and contact details
- Submit food donations with AI-assisted natural-language intake
- Specify food category, quantity (meals), storage temperature class, allergens, preparation time, and pickup availability window
- Track each donation through its full lifecycle (Submitted → Allocated → In Transit → Completed)
- View complete donation history with status filters and search
- Download PDF receipts for completed donations (for CSR and tax documentation)
- Receive in-app notifications at each lifecycle stage

---

### 🏥 NGO / Recipient Organization

Community kitchens, food banks, shelters, and social welfare organizations that collect food and distribute it to beneficiaries.

**Capabilities:**
- Manage organization profile, food preferences, storage capacity, and dietary restrictions
- Set daily intake capacity and blackout dates (operational closures)
- Receive incoming food allocation offers matched by proximity, temperature, and available capacity
- Review offer details (donor, food description, quantity, expiry, pickup location) before accepting
- Accept, partially accept, or decline offers — capacity is adjusted atomically in all cases
- Track accepted donations through delivery progress
- View full history of received donations
- Receive in-app notifications for new offers and delivery updates

---

### 🚴 Volunteer / Courier

Individuals with vehicles who transport food from donor locations to NGO collection points.

**Capabilities:**
- Manage availability schedule and service radius
- View assigned missions with donor and NGO contact details, pickup address, and delivery address
- Follow step-by-step mission workflow: Accept → Navigate to Pickup → Scan Pickup → En-Route → Deliver → OTP Verification
- Stream GPS coordinates during transit for live tracking by Operations
- Upload photo evidence at pickup and delivery points
- Complete OTP-secured handover with recipient organization
- View completed mission history and performance statistics

---

### 🖥️ Operations Administrator

The command and control role with full visibility and intervention capability across the entire food rescue network.

**Capabilities:**
- Monitor system-wide KPIs: total donations, meals rescued, active missions, exception count, success rate
- View Mission Control board with real-time status of all active deliveries
- Access full Mission Details including state timeline, volunteer GPS trail, and audit events
- Resolve flagged exceptions: failed OTPs, capacity disputes, volunteer reassignment requests, timeout escalations
- Manage the NGO and Volunteer network: view, verify, deactivate, and update organization records
- Reassign volunteers on active missions
- Abort missions with recorded justification
- Access the full Activity & Audit Trail: immutable log of every system event, filterable by user, action type, and date range
- Receive in-app notifications for all critical system events

---

## Key Features

| Feature | Description |
|---|---|
| **AI-Assisted Intake** | Natural-language donation submission parsed by the Intake Agent (Gemini or deterministic fallback) |
| **Deterministic Allocation Engine** | Haversine geo-filter + temperature matching + greedy capacity fill — no AI dependency required |
| **Multi-Agent Orchestration** | Intake → Match → Dispatch → Recovery pipeline with logged `AgentRun` records |
| **JWT Role-Based Access Control** | Four roles (`donor`, `ngo`, `volunteer`, `ops`) with per-route guards |
| **Real-Time GPS Telemetry** | Volunteers stream coordinates via `watchPosition`; Ops monitors live location |
| **OTP-Secured Handover** | Cryptographically generated OTP presented at delivery; verification required to close mission |
| **PDF Donation Receipts** | ReportLab-generated PDF receipts for completed donations, downloadable by donors |
| **In-App Notification System** | Per-user notification feed with read status, real-time polling (15 s interval), mark-all-read |
| **SMS OTP Dispatch** | Twilio integration for SMS delivery of volunteer OTPs; console fallback for development |
| **Photo Evidence Upload** | Volunteers upload pickup/delivery photos (JPEG/PNG/WebP, 10 MB max) |
| **Immutable Audit Trail** | Every state change, actor, action, and resource snapshot persisted to `AuditEvent` table |
| **Exception Management** | Automatic flagging and Operations resolution workflow for all mission anomalies |
| **Network Management** | Operations CRUD for NGO and Volunteer records with verification controls |
| **Alembic Migrations** | Schema version-controlled with async Alembic; production PostgreSQL migration applied |
| **Rate Limiting** | `slowapi` enforced on all public endpoints |
| **Docker Compose** | One-command production deployment with PostgreSQL, backend, and frontend containers |
| **CI/CD Pipeline** | GitHub Actions: pytest (36 tests), TypeScript compile check, Next.js production build |
| **36 Automated Tests** | Full system test suite covering auth, allocations, volunteer flow, ops controls, and E2E lifecycle |

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.2.5 | React framework with App Router |
| React | 18.3.1 | UI component model |
| TypeScript | 5.5.4 | Type-safe frontend development |
| CSS (globals.css) | — | Application stylesheet |
| Lucide React | latest | Icon library |
| DM Sans | Google Fonts | Typography |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.111 | Async HTTP framework |
| SQLAlchemy | 2.0 Async | ORM and async database sessions |
| Pydantic | v2 | Schema validation and settings management |
| PyJWT | latest | JWT token creation and verification |
| bcrypt | latest | Password hashing |
| HTTPX | latest | Async HTTP client for AI API calls |
| slowapi | latest | Rate limiting |
| ReportLab | latest | PDF receipt generation |
| Twilio | latest | SMS OTP dispatch |
| Alembic | latest | Database schema migrations |
| python-multipart | latest | File upload support |

### Database

| Technology | Purpose |
|---|---|
| SQLite + aiosqlite | Development — zero configuration, auto-created on first run |
| PostgreSQL + asyncpg | Production — full async support, Supabase compatible |
| Alembic | Schema versioning and migration management |

### AI & Integration

| Service | Purpose |
|---|---|
| AgentRouter / OpenRouter | Multi-agent orchestration API gateway |
| Gemini API (optional) | AI-powered intake parsing and dispatch recommendations |
| Recraft v4.1 (OpenRouter) | AI image generation utility (`scripts/generate_image.py`) |

### Testing & Quality

| Technology | Purpose |
|---|---|
| Pytest | Test runner |
| pytest-asyncio | Async test support |
| httpx | ASGI test client |
| TypeScript compiler | Static type checking (`tsc --noEmit`) |
| Next.js build | Production build validation |

### Deployment

| Technology | Purpose |
|---|---|
| Docker | Container images for backend and frontend |
| Docker Compose | Multi-service orchestration |
| GitHub Actions | CI/CD pipeline |

---

## System Architecture

```mermaid
flowchart TD
    FE["Next.js 14 Frontend\n18 Screens / TypeScript"]
    API["lib/api.ts\nTyped API Client"]
    BE["FastAPI Backend\n:8000"]
    AUTH["JWT Auth\n+ RBAC Guards"]
    R1["donor.py router"]
    R2["ngo.py router"]
    R3["volunteer.py router"]
    R4["ops.py router"]
    R5["ai.py router"]
    R6["notifications.py"]
    R7["uploads.py"]
    AE["Allocation Engine\nHaversine + Capacity"]
    AO["Agent Orchestrator\nIntake → Match → Dispatch → Recovery"]
    SMS["SMS Service\nTwilio / Console"]
    PDF["Receipt Service\nReportLab PDF"]
    NOTIF["Notification Service\nIn-App Feed"]
    DB[("PostgreSQL / SQLite\n13 Tables")]
    AUDIT["Audit Service\nImmutable Event Log"]

    FE --> API
    API --> BE
    BE --> AUTH
    AUTH --> R1
    AUTH --> R2
    AUTH --> R3
    AUTH --> R4
    AUTH --> R5
    AUTH --> R6
    AUTH --> R7
    R1 --> PDF
    R1 --> DB
    R2 --> DB
    R3 --> SMS
    R3 --> DB
    R4 --> DB
    R5 --> AO
    R5 --> AE
    R6 --> NOTIF
    NOTIF --> DB
    AE --> DB
    AO --> DB
    DB --> AUDIT
```

---

## Database Schema

13 relational tables with UUID primary keys, indexed foreign keys, and status enumerations. The schema is managed by SQLAlchemy async models and versioned with Alembic.

| Entity | Description |
|---|---|
| `User` | Base authentication entity: email, hashed password, role (`donor` / `ngo` / `volunteer` / `ops`) |
| `DonorProfile` | Organization name, address, latitude/longitude, contact details |
| `NGOProfile` | Organization name, food intake capacity, dietary preferences, location, blackout schedule |
| `VolunteerProfile` | Vehicle type, available hours, service radius, rating, current availability |
| `Donation` | Food type, quantity (meals), temperature class, status, pickup window, allergens, donor FK |
| `DonationAllocation` | Junction: donation ↔ NGO, allocated quantity, acceptance status, response timestamp |
| `Mission` | End-to-end delivery job: volunteer FK, donation FK, state machine status, GPS trail |
| `MissionEvent` | Ordered state-change log per mission (pickup scan, OTP verify, delivery confirmation) |
| `Assignment` | Volunteer assignment record: OTP, retry count, timestamps, handover confirmation |
| `AgentRun` | Logged execution of each AI agent: type, input payload, output, duration, status |
| `ExceptionRecord` | Flagged anomalies: type, description, triggering mission FK, resolution notes, ops actor |
| `Notification` | Per-user in-app notification: message, type, read status, related resource reference |
| `AuditEvent` | Immutable event log: actor user FK, action, resource type, resource ID, before/after JSON snapshot |

### Donation State Machine

```
SUBMITTED → ALLOCATED → DISPATCHING → PICKUP_UNDERWAY → IN_TRANSIT → HANDOVER_PENDING → COMPLETED
                                   ↘ REJECTED (volunteer decline → Recovery Agent → retry)
                                                                         ↘ FAILED (max retries exceeded)
```

### Allocation Status

```
PROPOSED → AWAITING_RESPONSE → ACCEPTED → IN_TRANSIT → DELIVERED
                             ↘ DECLINED (capacity restored atomically)
```

---

## Allocation Engine

The deterministic allocation engine (`backend/app/services/allocation_engine.py`) distributes donation meals across eligible NGOs without requiring an AI API key:

1. **Geo-filter** — NGOs within 15 km radius (Haversine formula) are candidates
2. **Temperature match** — Refrigerated / frozen / ambient tags must align between donation and NGO storage capability
3. **Capacity rank** — Sort candidates by `current_free_capacity DESC`
4. **Greedy fill** — Assign meals top-down until donation quantity is exhausted
5. **Partial allocation** — Each NGO receives `min(needed, free_capacity)` — over-allocation is never possible
6. **Atomic capacity restore** — If an NGO declines, `current_free_capacity` is restored within the same database transaction

**Example allocation:**

```
Donation: 150 meals

NGO A (free capacity: 80)  → allocated 80 meals
NGO B (free capacity: 50)  → allocated 50 meals
NGO C (free capacity: 20)  → allocated 20 meals
─────────────────────────────────────────────────
Total allocated: 150 / 150 ✓
```

---

## AI Agent Orchestration

Located in `backend/app/agents/` and `backend/app/services/`. All agents degrade gracefully to deterministic Python fallback logic when no API key is configured — the application remains fully functional.

| Agent | File | Responsibility |
|---|---|---|
| **Intake Agent** | `intake_agent.py` | Parse natural-language donation descriptions into structured fields (food type, quantity, temperature class, allergens, expiry) |
| **Matching Agent** | `orchestrator.py` | Recommend NGOs using allocation engine output with confidence scoring |
| **Dispatch Agent** | `orchestrator.py` | Identify available volunteers by proximity, vehicle type, and current workload |
| **Recovery Agent** | `orchestrator.py` | Handle rejections: reassign to next candidate, escalate to Ops after `MAX_RETRIES=3` |
| **Orchestrator** | `orchestrator.py` | Sequence agents, persist `AgentRun` records, enforce timeout budgets, coordinate state transitions |

---

## API Reference

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new user account (donor, ngo, volunteer) |
| `POST` | `/auth/login` | Authenticate and receive a JWT access token |
| `GET` | `/auth/me` | Get the authenticated user's profile |

### Donor (`/api/v1/donor`) — requires `donor` role

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/donor/dashboard` | Dashboard KPIs: meals rescued, active donations, impact score |
| `POST` | `/donor/donations` | Submit a new food donation |
| `GET` | `/donor/donations` | List all donations with status filters and pagination |
| `GET` | `/donor/donations/{id}` | Retrieve full donation details with allocations and audit trail |
| `GET` | `/donor/donations/{id}/receipt` | Download PDF receipt for a completed donation |

### NGO (`/api/v1/ngo`) — requires `ngo` role

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/ngo/dashboard` | Dashboard: capacity utilization, pending offers, meals received |
| `GET` | `/ngo/offers` | List incoming allocation offers (pending offers sorted first) |
| `GET` | `/ngo/offers/{id}` | Retrieve full offer details |
| `PATCH` | `/ngo/offers/{id}` | Accept, partially accept, or decline an allocation offer |
| `GET` | `/ngo/requirements` | Retrieve capacity and food preference settings |
| `PUT` | `/ngo/requirements` | Update capacity, dietary preferences, and blackout dates |

### Volunteer (`/api/v1/volunteer`) — requires `volunteer` role

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/volunteer/dashboard-stats` | Dashboard: assigned missions, completed runs, success rate |
| `GET` | `/volunteer/missions` | List assigned missions |
| `GET` | `/volunteer/missions/{id}` | Retrieve full mission details with step-by-step workflow |
| `PATCH` | `/volunteer/missions/{id}/steps` | Update mission step (pickup scan, en-route, OTP verify, delivery) |
| `POST` | `/volunteer/location` | Stream GPS coordinates during active transit |

### Operations (`/api/v1/ops`) — requires `ops` role

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/ops/dashboard` | System-wide KPIs and health metrics |
| `GET` | `/ops/missions` | All active missions with real-time status |
| `GET` | `/ops/missions/{id}` | Full mission detail with volunteer trail and audit events |
| `PATCH` | `/ops/missions/{id}` | Override mission state, reassign volunteer, or abort |
| `GET` | `/ops/exceptions` | Flagged exceptions awaiting resolution |
| `PATCH` | `/ops/exceptions/{id}` | Resolve an exception with notes |
| `GET` | `/ops/audit` | Full audit event log with filters |
| `GET` | `/ops/network` | NGO, Volunteer, and Donor directory |
| `PATCH` | `/ops/network/ngos/{id}` | Update NGO network record (verify, deactivate, capacity edit) |
| `PATCH` | `/ops/network/volunteers/{id}` | Update Volunteer network record |

### AI (`/api/v1/ai`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ai/intake` | Parse natural-language donation text into structured fields |
| `POST` | `/ai/allocate` | Run the allocation engine for a submitted donation |

### Notifications (`/api/v1/notifications`) — authenticated

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/notifications` | Retrieve all notifications for the authenticated user |
| `PATCH` | `/notifications/{id}/read` | Mark a notification as read |
| `POST` | `/notifications/read-all` | Mark all notifications as read |

### Uploads (`/api/v1/uploads`) — requires `volunteer` role

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/uploads` | Upload photo evidence (JPEG/PNG/WebP, 10 MB max) |

> Interactive API documentation is available at **`http://localhost:8000/docs`** (Swagger UI) and **`http://localhost:8000/redoc`** (ReDoc) when the backend is running.

---

## Screen Inventory

| # | Screen | Role | Primary Endpoints |
|---|---|---|---|
| 1 | Login & Registration | All | `POST /auth/login`, `POST /auth/register` |
| 2 | Donor Dashboard | Donor | `GET /donor/dashboard` |
| 3 | Create Donation | Donor | `POST /ai/intake`, `POST /donor/donations` |
| 4 | Donation Details | Donor | `GET /donor/donations/{id}`, `GET /donor/donations/{id}/receipt` |
| 5 | Donation History | Donor | `GET /donor/donations` |
| 6 | NGO Dashboard | NGO | `GET /ngo/dashboard` |
| 7 | Incoming Offers | NGO | `GET /ngo/offers` |
| 8 | Offer Details | NGO | `GET /ngo/offers/{id}`, `PATCH /ngo/offers/{id}` |
| 9 | Requirements & Capacity | NGO | `GET /ngo/requirements`, `PUT /ngo/requirements` |
| 10 | Volunteer Dashboard | Volunteer | `GET /volunteer/dashboard-stats` |
| 11 | Volunteer Task Details | Volunteer | `GET /volunteer/missions/{id}`, `PATCH /volunteer/missions/{id}/steps`, `POST /volunteer/location`, `POST /uploads` |
| 12 | Operations Dashboard | Ops | `GET /ops/dashboard` |
| 13 | Mission Control | Ops | `GET /ops/missions` |
| 14 | Mission Details | Ops | `GET /ops/missions/{id}`, `PATCH /ops/missions/{id}` |
| 15 | Exceptions & Approvals | Ops | `GET /ops/exceptions`, `PATCH /ops/exceptions/{id}` |
| 16 | Network Management | Ops | `GET /ops/network`, `PATCH /ops/network/ngos/{id}`, `PATCH /ops/network/volunteers/{id}` |
| 17 | Activity & Audit Trail | Ops | `GET /ops/audit` |
| 18 | Notification Centre | All | `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all` |

---

## Quick Start

### Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
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
# macOS / Linux
source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Copy the environment template
cp backend/.env.example backend/.env
# Edit backend/.env — the SQLite defaults work immediately for development

# Start the backend server (from the project root)
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will:
- Create `rescueloop.db` automatically on first run (SQLite development mode)
- Seed sample users, NGOs, volunteers, and donations
- Print `Application startup complete` when ready

**API documentation:** http://localhost:8000/docs

### 3. Frontend Setup

```bash
# In a new terminal, from the project root
npm install

# Copy the frontend environment template
cp .env.example .env.local

# Start the development server
npm run dev
```

**Application:** http://localhost:3000

### 4. Production Build

```bash
npm run build
npm start
```

---

## Configuration

### Backend Environment Variables (`backend/.env`)

Create this file from the template:

```env
# ─── Database ───────────────────────────────────────────────────────────────
# SQLite — zero configuration, auto-created on first run (development)
DATABASE_URL=sqlite+aiosqlite:///./rescueloop.db

# PostgreSQL — production
# DATABASE_URL=postgresql+asyncpg://user:password@host:5432/rescueloop

# ─── Authentication ──────────────────────────────────────────────────────────
JWT_SECRET=change-this-to-a-secure-random-string-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# ─── CORS ────────────────────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000

# ─── AI (optional) ───────────────────────────────────────────────────────────
# Without a key, all agents use deterministic Python fallback logic
GEMINI_API_KEY=
OPENROUTER_API_KEY=

# ─── SMS (optional) ──────────────────────────────────────────────────────────
# Without credentials, OTPs are logged to the server console
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# ─── File Uploads ────────────────────────────────────────────────────────────
UPLOAD_DIR=backend/uploads
```

### Frontend Environment Variables (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> **Security:** Never commit `backend/.env` or `.env.local` to source control. These files are excluded by `.gitignore`. Commit only the `.env.example` templates.

---

## Database Setup

### Development (SQLite — automatic)

No configuration needed. The database file is created automatically when the backend starts for the first time.

### Production (PostgreSQL)

#### Option 1 — Supabase (recommended)

1. Create a project at [supabase.com](https://supabase.com)
2. Copy the connection string from **Settings → Database → Connection string (URI)**
3. Set `DATABASE_URL=postgresql+asyncpg://...` in `backend/.env`

#### Option 2 — Self-hosted PostgreSQL

```bash
# Install PostgreSQL and create a database
createdb rescueloop

# Update backend/.env
DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/rescueloop
```

#### Applying Migrations

```bash
# From the project root with the virtual environment active
cd backend
python -m alembic upgrade head
```

Alembic manages the schema version. The initial migration (`e2620a1350e9_initial_schema`) creates all 13 tables with indexes and constraints. Run `alembic upgrade head` whenever new migrations are added.

---

## Running Tests

```bash
# From the project root with the virtual environment active
python -m pytest backend/tests -v
```

The test suite uses an isolated in-memory SQLite database — it never touches your development or production database.

### Test Results — 36/36 Passing ✅

| Test File | Tests | Coverage |
|---|---|---|
| `test_auth.py` | 5 | Registration, login, JWT validation, role guard, token expiry |
| `test_donations.py` | 4 | Create donation, list, get by ID, status update |
| `test_allocation.py` | 4 | Geo-filter, temperature match, greedy fill, capacity restore on decline |
| `test_volunteer_flow.py` | 4 | Assignment creation, OTP verify, pickup confirm, delivery confirm |
| `test_ops_audit.py` | 5 | Dashboard KPIs, mission override, exception creation, audit events, RBAC |
| `test_intake_agent.py` | 4 | NLP parsing, structured extraction, temperature class detection, fallback |
| `test_recovery.py` | 4 | Rejection handling, retry logic, escalation after max retries |
| `test_full_system_audit.py` | 6 | DB integrity, RBAC cross-role, E2E lifecycle, OTP rejection, capacity restore, CORS |

```
========================= 36 passed in X.XXs =========================
```

---

## Docker Deployment

One-command production deployment using Docker Compose:

```bash
# Build and start all services (PostgreSQL + Backend + Frontend)
docker compose up --build -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

**Services started:**

| Service | Port | Description |
|---|---|---|
| `postgres` | 5432 | PostgreSQL 15 database |
| `backend` | 8000 | FastAPI application |
| `frontend` | 3000 | Next.js production server |

Configure production credentials in `backend/.env` before deploying. The backend healthcheck waits for PostgreSQL to accept connections before starting.

---

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request to `main`:

| Step | Tool | Check |
|---|---|---|
| Backend tests | `pytest` | All 36 tests must pass |
| Type check | `tsc --noEmit` | TypeScript must compile with zero errors |
| Frontend build | `next build` | Production build must succeed |

---

## Project Structure

```
RescueLoop/
├── README.md                          ← You are here
├── package.json                       ← Frontend dependencies (Next.js 14)
├── next.config.mjs                    ← Next.js configuration
├── tsconfig.json                      ← TypeScript configuration
├── vitest.config.ts                   ← Vitest configuration
├── docker-compose.yml                 ← Multi-service production deployment
├── Dockerfile.backend                 ← Backend container image
├── Dockerfile.frontend                ← Frontend container image
├── .env.example                       ← Frontend environment template
├── .gitignore
│
├── .github/
│   └── workflows/
│       └── ci.yml                     ← GitHub Actions CI/CD pipeline
│
├── app/                               ← Next.js App Router
│   ├── layout.tsx                     ← Root layout with DM Sans font and metadata
│   ├── page.tsx                       ← Entry point → renders RescueLoopApp
│   └── globals.css                    ← Complete application stylesheet
│
├── components/
│   ├── RescueLoopApp.tsx              ← Unified 18-screen frontend component (~3,500 lines)
│   └── LiveOpsMap.tsx                 ← Real-time mission map component
│
├── lib/
│   ├── api.ts                         ← Typed API client (all endpoints)
│   ├── mapNodes.ts                    ← Map node utilities
│   └── mapNodes.test.ts               ← Map node unit tests
│
├── scripts/
│   └── generate_image.py              ← OpenRouter Recraft image generation utility
│
├── public/
│   └── .gitkeep
│
└── backend/
    ├── README.md                      ← Backend-specific documentation
    ├── requirements.txt               ← Python dependencies
    ├── .env.example                   ← Backend environment template
    ├── alembic.ini                    ← Alembic migration configuration
    │
    ├── alembic/
    │   ├── env.py                     ← Async Alembic environment (auto-imports all models)
    │   ├── script.py.mako
    │   └── versions/
    │       └── e2620a1350e9_initial_schema.py  ← Initial migration (13 tables)
    │
    ├── prisma/
    │   └── schema.prisma              ← Prisma schema reference (PostgreSQL)
    │
    └── app/
        ├── main.py                    ← FastAPI app: lifespan, CORS, router registration
        ├── config.py                  ← Pydantic settings with .env loading
        ├── database.py                ← Async SQLAlchemy engine and session factory
        ├── limiter.py                 ← slowapi rate limiter instance
        │
        ├── agents/
        │   ├── intake_agent.py        ← NLP → structured donation parsing
        │   └── orchestrator.py        ← Multi-agent coordinator
        │
        ├── auth/
        │   ├── router.py              ← /auth/* endpoints
        │   ├── security.py            ← JWT creation/decoding, bcrypt hashing
        │   └── dependencies.py        ← Token extraction and RBAC role guards
        │
        ├── models/
        │   ├── entities.py            ← 13 SQLAlchemy async models
        │   └── schemas.py             ← Pydantic v2 request/response schemas
        │
        ├── routers/
        │   ├── donor.py               ← /donor/* endpoints
        │   ├── ngo.py                 ← /ngo/* endpoints
        │   ├── volunteer.py           ← /volunteer/* endpoints
        │   ├── ops.py                 ← /ops/* endpoints
        │   ├── ai.py                  ← /ai/* endpoints
        │   ├── notifications.py       ← /notifications/* endpoints
        │   └── uploads.py             ← /uploads endpoint
        │
        ├── services/
        │   ├── allocation_engine.py   ← Haversine + capacity allocator
        │   ├── audit_service.py       ← Immutable audit event writer
        │   ├── notification_service.py← In-app notification helpers
        │   ├── receipt_service.py     ← ReportLab PDF receipt generator
        │   ├── sms_service.py         ← Twilio SMS OTP dispatch
        │   ├── email_service.py       ← Email notification service
        │   └── seed_data.py           ← Development seed data loader
        │
        └── tests/
            ├── conftest.py            ← Isolated SQLite test database setup
            ├── test_auth.py
            ├── test_donations.py
            ├── test_allocation.py
            ├── test_volunteer_flow.py
            ├── test_ops_audit.py
            ├── test_intake_agent.py
            ├── test_recovery.py
            └── test_full_system_audit.py
```

---

## Contributing

Contributions are welcome. Please follow the process below:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Activate the virtual environment and run the full test suite before making changes:
   ```bash
   python -m pytest backend/tests -v
   npx tsc --noEmit
   ```
4. Make your changes, adding tests for new functionality
5. Run the test suite again and ensure all tests pass
6. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`
7. Push to your fork and open a pull request against `main`

**Please do not commit:**
- `node_modules/` or `.next/` directories
- `rescueloop.db` or any `*.db` files
- Real API keys, secrets, or `.env` files
- Build artifacts or compiled outputs

---

## License

MIT © 2026 RescueLoop Contributors

---

<div align="center">
  <strong>Built to rescue food. Built to scale.</strong><br/>
  <em>Every meal delivered is a step toward zero waste.</em>
</div>
