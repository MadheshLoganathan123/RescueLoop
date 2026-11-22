# RESCUELOOP
## Complete Development Handover & Remaining Implementation Blueprint

**Project:** RescueLoop  
**Document Type:** Technical Development Handover  
**Purpose:** Continuation of development by a new developer  
**Baseline Audit Date:** November 22, 2026  
**Repository Branch:** `main`  
**GitHub:** [RescueLoop Repository](https://github.com/MadheshLoganathan123/RescueLoop.git)

---

# 1. Project Overview

RescueLoop is a multi-role food rescue and redistribution platform designed to reduce food wastage by connecting food donors with NGOs and community organizations through a coordinated volunteer delivery network.

The platform consists of four primary user roles:

### 1.1 Donor
Restaurants, catering businesses, food establishments, and other organizations that have surplus food available for redistribution.

Responsibilities:
- Register and manage their organization.
- Submit surplus food donations.
- Specify food category, quantity, storage conditions, allergens, preparation time, and pickup availability.
- Track donation progress.
- View donation history.
- Access completed donation records and receipts.

### 1.2 NGO / Recipient Organization
Organizations that collect surplus food and distribute it to beneficiaries.

Responsibilities:
- Manage organization details and food requirements.
- Specify food capacity and dietary preferences.
- Receive donation allocation offers.
- Accept or reject offers.
- Track incoming food deliveries.
- View received donation history.

### 1.3 Volunteer / Courier
Individuals responsible for transporting food from donors to recipient organizations.

Responsibilities:
- Manage availability.
- View assigned missions.
- Access pickup and delivery information.
- Update mission progress.
- Complete food inspection and handover steps.
- Verify recipient handovers using OTP.
- View completed missions.

### 1.4 Operations Administrator
The administrative role responsible for overseeing the entire food rescue network.

Responsibilities:
- Monitor donations and active missions.
- View NGOs and volunteers.
- Monitor courier activity and delivery progress.
- Reassign volunteers.
- Abort missions when necessary.
- Investigate and resolve operational exceptions.
- Access activity logs and audit records.

---

# 2. Existing Technical Architecture

Do not rebuild the application from scratch. Continue using the existing implementation.

## 2.1 Current Technology Stack

| Layer | Existing Technology |
|---|---|
| Frontend | Next.js 14.2.5 (App Router) |
| UI | React 18.3.1 |
| Frontend Language | TypeScript 5.5.4 |
| Styling | CSS (`app/globals.css`) |
| Icons | Lucide React |
| Backend | FastAPI (Python 3.11+) |
| Database ORM | SQLAlchemy 2.0 Async |
| Validation | Pydantic v2 |
| Authentication | JWT + bcrypt |
| HTTP Client | HTTPX / Fetch |
| Development Database | SQLite (`aiosqlite`) / Supabase PostgreSQL |
| Production Database Support | PostgreSQL (`asyncpg`) |
| AI Integration | AgentRouter / OpenRouter Image API |
| Testing | Pytest, pytest-asyncio, httpx |

## 2.2 Existing Project Structure

```text
RescueLoop/
│
├── app/
│   ├── layout.tsx             # Root layout with DM Sans & metadata
│   ├── page.tsx               # Main entry rendering RescueLoopApp
│   └── globals.css            # Complete application stylesheet
│
├── components/
│   └── RescueLoopApp.tsx      # Unified 18-screen frontend component
│
├── lib/
│   └── api.ts                 # Unified typed API client
│
├── scripts/
│   └── generate_image.py      # OpenRouter Recraft image generation script
│
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app lifespan, CORS, and router registration
│   │   ├── config.py          # Settings, .env resolution & DB URL normalization
│   │   ├── database.py        # Async engine with NullPool for cloud PG
│   │   │
│   │   ├── agents/
│   │   │   ├── intake_agent.py   # AI intake parsing
│   │   │   └── orchestrator.py   # Multi-agent coordination
│   │   │
│   │   ├── auth/
│   │   │   ├── router.py         # Login, registration, demo-login, /me
│   │   │   ├── security.py       # JWT creation/decoding, bcrypt
│   │   │   └── dependencies.py   # Token extraction and RBAC guards
│   │   │
│   │   ├── models/
│   │   │   ├── entities.py       # 14 SQLAlchemy relational models
│   │   │   └── schemas.py        # Pydantic v2 schemas
│   │   │
│   │   ├── routers/
│   │   │   ├── donor.py          # Donor workspace APIs
│   │   │   ├── ngo.py            # NGO workspace APIs
│   │   │   ├── volunteer.py      # Volunteer workspace APIs
│   │   │   ├── ops.py            # Operations console APIs
│   │   │   └── ai.py             # AI intake & orchestration APIs
│   │   │
│   │   └── services/
│   │       ├── allocation_engine.py # Haversine & capacity matching
│   │       ├── audit_service.py     # Immutable audit log recorder
│   │       └── seed_data.py         # Core demonstration dataset
│   │
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_donations.py
│   │   ├── test_allocation.py
│   │   ├── test_volunteer_flow.py
│   │   ├── test_ops_audit.py
│   │   └── test_full_system_audit.py
│   │
│   ├── prisma/
│   │   └── schema.prisma      # Prisma schema representation
│   ├── requirements.txt
│   └── .env.example
│
├── HANDOVER_BLUEPRINT.md      # This document
└── README.md
```

## 2.3 Existing Backend Model Entities

The 14 database models in `backend/app/models/entities.py`:

1. `User`: Core authentication entity (email, password hash, role, phone, active state).
2. `DonorProfile`: Commercial kitchen / organization details, address, coordinates, license.
3. `NgoProfile`: Shelter / receiver details, daily and free capacity, refrigeration/storage flags.
4. `VolunteerProfile`: Courier details, vehicle type, max capacity, availability, rating.
5. `Donation`: Surplus food submission, meals, temperature, packaging, status.
6. `DonationAllocation`: Multi-recipient allocation junction with assigned quantity and status.
7. `Mission`: Logistics job tracking pickup through deliveries.
8. `MissionAssignment`: Courier assignment with OTP challenge and timestamps.
9. `MissionEvent`: Ordered state-transition audit log per mission.
10. `AgentRun`: AI agent execution logs (intake, matching, dispatch).
11. `ExceptionRecord`: Operations exception tickets with severity and resolution state.
12. `Handover`: Proof of delivery per stop with verified quantity and temperature.
13. `Notification`: In-app user notifications.
14. `AuditLog`: Immutable platform ledger of all state mutations.

---

# 3. Current Implementation Status (Updated Audit)

### Completed Capabilities:
1. **JWT Authentication & RBAC**: Fully functional login, token verification, role permissions.
2. **Onboarding & Registration**: Active interactive modal on frontend + `/api/v1/auth/register` backend supporting Donor, NGO, and Volunteer roles.
3. **Database Integration**: Connected to live PostgreSQL (Supabase) with dynamic driver normalization (`postgresql+asyncpg://`) and `NullPool` connection management.
4. **All Core Tests Passing**: Full backend test suite passing (`test_auth`, `test_donations`, `test_allocation`, `test_volunteer_flow`, `test_ops_audit`, `test_full_system_audit`).
5. **Deterministic Allocation Engine**: Haversine distance (<15km radius) + storage temperature matching + greedy capacity allocation with atomic capacity restoration on decline.
6. **Volunteer Workflow**: Step progression (assigned -> pickup -> in-transit -> handover) and OTP verification.
7. **Operations Mission Control**: Real-time queue, manual overrides, mission reassignments.
8. **Frontend UI (18 Screens)**: Preserved and connected across all 4 roles.
9. **OpenRouter Image Generator**: Working utility script `scripts/generate_image.py`.

### Remaining blueprint items, completed in this handover:
1. **External SMS OTP Delivery**: Twilio when `SMS_PROVIDER=twilio`; console fallback otherwise. Handover OTP is sent at recipient arrival, expires after 15 minutes, and is not resent inside a 60-second window.
2. **Live Courier GPS Tracking**: `POST /api/v1/volunteer/location` plus browser `watchPosition` on the volunteer task screen.
3. **Interactive Map Component**: Operations overview uses Leaflet / OpenStreetMap markers from `/ops/telemetry/map`, refreshed every 15 seconds.
4. **Operations Exception Resolution UI**: Open exceptions can be resolved from the operations console.
5. **Operations Network Management UI**: Network directory lists NGOs, volunteers, and donors and can update verification and capacity.
6. **PDF Donation Receipts**: `GET /api/v1/donor/donations/{id}/receipt` returns a ReportLab PDF.
7. **File & Photo Uploads**: `POST /api/v1/uploads` stores inspection and handover photos; the volunteer task screen uploads them.
8. **Alembic Database Migrations**: Async Alembic env plus a generated schema revision. Startup still calls `create_all` so existing local databases keep working.
9. **API Rate Limiting & Security Hardening**: SlowAPI limits login, registration, OTP verification, and password reset outside the test environment. Production responses send HSTS plus standard security headers. Forgotten-password tokens are hashed, single-use, and emailed (SMTP or console).
10. **Frontend Automated Testing & CI/CD**: `npm test` checks map coordinate filtering with Node’s built-in test runner. GitHub Actions runs pytest, that frontend test, TypeScript, and the Next.js build. Dockerfiles and Compose are in the repo root. `npm run test:vitest` is available where the Vitest native binary is allowed to load.

---

# 4. PHASE-BY-PHASE IMPLEMENTATION BLUEPRINT

## Phase 0: Repository Handover and Baseline Verification
**Priority: CRITICAL**
1. Check repository state:
   ```bash
   git status
   git log -5 --oneline
   ```
2. Verify virtual environment and install backend dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   pip install -r backend/requirements.txt
   ```
3. Run the test suite:
   ```bash
   python -m pytest backend/tests -v
   ```
4. Verify Next.js frontend builds cleanly:
   ```bash
   npm install
   npx tsc --noEmit
   npm run build
   ```

---

## Phase 1: Real OTP Delivery & Notification Infrastructure
**Priority: HIGH**
1. **SMS Provider Setup**:
   - Integrate Twilio, AWS SNS, or regional provider in `backend/app/services/sms_service.py`.
   - Read credentials from `backend/.env` (`SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID`).
2. **OTP Dispatch**:
   - In `backend/app/routers/volunteer.py`, when courier arrives at an NGO stop (`ARRIVAL_AT_NGO`), dispatch the OTP via SMS to the NGO contact phone.
   - Enforce rate-limits and expiry (e.g. 15 minutes).
3. **In-App Notifications**:
   - Create notification service to write `Notification` table records on key lifecycle milestones.
   - Expose `GET /api/v1/notifications` in `backend/app/routers/` for users to view alerts.

---

## Phase 2: Live Courier GPS & Interactive Maps
**Priority: HIGH**
1. **Volunteer Location Telemetry**:
   - Add endpoint `POST /api/v1/volunteer/location`:
     ```json
     { "mission_id": "...", "latitude": 13.085, "longitude": 80.21, "accuracy": 10 }
     ```
   - Update `VolunteerProfile.current_lat` and `current_lng`.
2. **Frontend Geolocation**:
   - In `components/RescueLoopApp.tsx` (Volunteer Task Screen), prompt for `navigator.geolocation.watchPosition` during active missions.
3. **Interactive Operations Map**:
   - Replace static SVG in Operations Overview with `react-leaflet` / OpenStreetMap.
   - Plot live courier marker, donor pickup location, and NGO destination points.

---

## Phase 3: Operations Exception Resolution & Network Management
**Priority: HIGH**
1. **Exception Resolution Frontend**:
   - Connect `POST /api/v1/ops/exceptions/{id}/resolve` to the frontend Operations Exception tab.
   - Provide resolution input (action notes, status update) and refresh the exception feed.
2. **Network Management Screen**:
   - Build UI for viewing, verifying, and adjusting capacity for NGOs and volunteers.
   - Wire to `GET /api/v1/ops/network` and `PATCH /api/v1/ops/network/ngos/{id}`.

---

## Phase 4: PDF Donation Receipts & Photo Evidence Uploads
**Priority: MEDIUM**
1. **PDF Generation**:
   - Install `reportlab` or `weasyprint`.
   - Create `backend/app/services/receipt_service.py` to generate PDF receipts for completed donations.
   - Expose endpoint `GET /api/v1/donor/donations/{id}/receipt` returning `application/pdf`.
2. **Photo Uploads**:
   - Implement `POST /api/v1/uploads` accepting multipart file uploads (food inspection photos, delivery proof).
   - Store in S3-compatible object storage or local media directory with sanitized filenames.

---

## Phase 5: Database Migrations with Alembic
**Priority: HIGH BEFORE PRODUCTION RELEASE**
1. Initialize Alembic:
   ```bash
   cd backend
   alembic init alembic
   ```
2. Configure `env.py` to import `Base.metadata` from `backend.app.models.entities`.
3. Generate initial migration:
   ```bash
   alembic revision --autogenerate -m "initial_schema"
   alembic upgrade head
   ```

---

## Phase 6: Security Hardening & Rate Limiting
**Priority: CRITICAL FOR PUBLIC DEPLOYMENT**
1. **Rate Limiting**:
   - Add `slowapi` to FastAPI for `/auth/login`, `/auth/register`, `/volunteer/missions/{id}/verify-otp`.
2. **Secret Management**:
   - Ensure all secrets (`JWT_SECRET`, database credentials, API keys) are supplied strictly via environment variables.
   - Enforce HTTPS and secure cookie headers for production sessions.
3. **Password Reset Flow**:
   - Implement secure token generation and email dispatch for forgotten passwords.

---

## Phase 7: Deployment & CI/CD Pipeline
**Priority: HIGH**
1. **Dockerization**:
   - Create `Dockerfile.backend` (Python 3.11 slim, uvicorn).
   - Create `Dockerfile.frontend` (Node 18 alpine, multi-stage Next.js build).
   - Provide `docker-compose.yml` for unified local stack testing.
2. **GitHub Actions Workflow**:
   - Create `.github/workflows/ci.yml`:
     - Run `pytest backend/tests`
     - Run `npx tsc --noEmit`
     - Run `npm run build`

---

# 5. Developer Handover Rules & Working Protocol

1. **Do not rebuild the frontend or backend from scratch**: Build iteratively on the completed structure.
2. **Branch Workflow**: Maintain branch-based development:
   ```bash
   git checkout -b feat/your-feature-name
   ```
   Submit Pull Requests to `main`.
3. **Always Run Tests Before Committing**:
   ```bash
   python -m pytest backend/tests -v
   npx tsc --noEmit
   ```
4. **Preserve Deterministic Fallbacks**: Never let an external service outage (AI, SMS, Maps) crash core application functions.
5. **No Hardcoded Secrets**: Keep all credentials in `.env` and `.env.example`.
