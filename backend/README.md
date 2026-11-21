# RescueLoop FastAPI + Prisma + PostgreSQL Backend

RescueLoop is an enterprise-grade food rescue and logistics coordination platform connecting food donors (commercial kitchens, restaurants, bakeries), non-profit community shelters (NGOs), volunteer rescue couriers, and operations dispatchers.

## Technology Stack

- **Backend Framework**: Python 3.11+, FastAPI, Pydantic v2
- **Database ORM**: Prisma ORM (`prisma/schema.prisma`) & SQLAlchemy 2.0 Async (`asyncpg` / `aiosqlite`)
- **Authentication**: JWT (JSON Web Tokens), PBKDF2/Bcrypt password hashing, OAuth2 password bearer
- **AI Agent Orchestrator**: Modular multi-agent coordination (Intake Agent, Matching Agent, Dispatch Agent, Recovery Agent) with deterministic capacity-safe fallbacks
- **Testing**: Pytest & Httpx asynchronous test harness

---

## Architecture & Database Entities

The relational database architecture is defined in [backend/prisma/schema.prisma](file:///c:/Users/Admin/Desktop/RescueLoop/backend/prisma/schema.prisma) and mapped in [backend/app/models/entities.py](file:///c:/Users/Admin/Desktop/RescueLoop/backend/app/models/entities.py):

1. **Users & Profiles**: `users`, `donor_profiles`, `ngo_profiles`, `volunteer_profiles`
2. **Donations & Allocations**: `donations`, `donation_allocations`
3. **Missions & Telemetry**: `missions`, `mission_assignments`, `mission_events`
4. **Operations & Governance**: `exception_records`, `handovers`, `agent_runs`, `notifications`, `audit_logs`

---

## 4 User Workspaces & 18 Screens API Matrix

| Screen # | Screen Name | Role | Backend Endpoint(s) | Method |
|---|---|---|---|---|
| **1** | Portal Landing / Login | Public / Auth | `/api/v1/auth/login`, `/api/v1/auth/demo-login/{role}` | `POST` |
| **2** | Organization Onboarding | Public / Auth | `/api/v1/auth/register` | `POST` |
| **3** | Donor Dashboard | Donor | `/api/v1/donor/dashboard-stats`, `/api/v1/donor/donations/active` | `GET` |
| **4** | Create Donation Form | Donor | `/api/v1/donor/donations`, `/api/v1/ai/intake-copilot` | `POST` |
| **5** | Donation Batch Details | Donor | `/api/v1/donor/donations/{id}` | `GET` |
| **6** | Donation History & Receipts | Donor | `/api/v1/donor/donations/history` | `GET` |
| **7** | NGO Dashboard | NGO | `/api/v1/ngo/dashboard-stats`, `/api/v1/ngo/capacity` | `GET` |
| **8** | Incoming Surplus Offers | NGO | `/api/v1/ngo/offers` | `GET` |
| **9** | Review & Accept Offer | NGO | `/api/v1/ngo/offers/{id}`, `/api/v1/ngo/offers/{id}/respond` | `GET`, `POST` |
| **10** | Intake Capacity & Preferences | NGO | `/api/v1/ngo/preferences` | `GET`, `PUT` |
| **11** | Volunteer Dashboard | Volunteer | `/api/v1/volunteer/dashboard-stats`, `/api/v1/volunteer/availability` | `GET`, `PUT` |
| **12** | Active Mission Route & Handover | Volunteer | `/api/v1/volunteer/tasks/{id}`, `/api/v1/volunteer/tasks/{id}/step`, `/api/v1/volunteer/tasks/{id}/verify-otp` | `GET`, `POST` |
| **13** | Operations Network Command | Operations | `/api/v1/ops/network-stats`, `/api/v1/ops/telemetry/nodes` | `GET` |
| **14** | Central Mission Control Queue | Operations | `/api/v1/ops/missions` | `GET` |
| **15** | Mission Details & AI Dispatch | Operations | `/api/v1/ops/missions/{id}`, `/api/v1/ai/dispatch/{mission_id}` | `GET`, `POST` |
| **16** | Exceptions & Approvals Feed | Operations | `/api/v1/ops/exceptions`, `/api/v1/ops/exceptions/{id}/resolve` | `GET`, `POST` |
| **17** | Network & Fleet Management | Operations | `/api/v1/ops/telemetry/nodes` | `GET` |
| **18** | Ledger & Audit Trail | Operations / All | `/api/v1/ops/audit-trail` | `GET` |

---

## Installation & Running

### 1. Requirements

- Python 3.11+
- Node.js 18+

### 2. Backend Setup & Startup

From project root:

```bash
# Navigate to backend directory or run from root
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

The database automatically initializes upon first run and seeds the minimal required dataset:
- **1 Donor**: Alex Rivera (`alex@abcrestaurant.com` / `password123`)
- **2 NGOs**: Sarah Kumar, Hope Community Kitchen (`sarah@hopefoundation.org`); Dr. Ramanathan, Anna Nagar Care Centre (`care@annagarcenter.org`)
- **2 Volunteers**: Jordan Mathew (`jordan@rescuecouriers.org`); Priya S. (`priya@rescuecouriers.org`)
- **1 Operations Admin**: K. Mathew (`ops@rescueloop.org`)
- **3 Sample Donations & Missions**: RL-00124 (In transit), RL-00128 (Courier assigned), RL-00119 (Delivered)

### 3. Interactive API Documentation (Swagger)

Open your browser to:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

### 4. Running Automated Tests

Run the full pytest suite:

```bash
python -m pytest backend/tests -v
```

All 22 tests test authorization, allocation logic, state transitions, OTP verification, exceptions, and audit logs.

### 5. Frontend Development Server

In a separate terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to interact with the application.
