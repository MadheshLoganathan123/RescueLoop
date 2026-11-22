# RescueLoop - Current Project Status Report

Audit date: 2026-11-22

Repository audited: `C:\Users\Admin\Desktop\New folder (2)\RescueLoop`

## 1. Project Overview

RescueLoop is a four-role food rescue platform:

- Donors submit surplus food batches.
- NGOs review and accept or decline allocation offers.
- Volunteers progress assigned missions and verify recipient handovers.
- Operations staff monitor missions, exceptions, telemetry, and audit events.

The implementation uses a Next.js frontend, a FastAPI backend, SQLAlchemy persistence, JWT authentication, deterministic allocation and dispatch agents, and a backend-only AgentRouter intake client.

The application is no longer an isolated frontend prototype. A backend, database models, API routers, audit logging, role checks, and several database-backed workflows exist. However, production integrations, live end-to-end provider verification, complete test stability, and several operations/frontend details remain incomplete.

## 2. Current Repository State

Verified Git state:

- Branch: `main`
- HEAD: `9ff1afea7da1937a5b7d1414032a8855a45137ef`
- Commit `9ff1afe` exists.
- Commit `9ff1afe` is contained in `origin/main`.
- `origin/main` is at the same implementation commit.
- Working tree: clean before creation of this report.
- No untracked application files were present before this report.
- Configured remote:
  `https://github.com/MadheshLoganathan123/RescueLoop.git`
- The remote URL has no spelling mistake in the Git configuration.

Local Git identity at audit time:

- Name: `KanishJebaMathewM`
- Email: `kanishjebamathew.m@gmail.com`

Commit `9ff1afe` verification:

- It was found in local Git history.
- It was found on the remote-tracking branch `origin/main`.
- It changed 20 files.
- It created `backend/tests/test_intake_agent.py`.
- It did not add a Docker deployment file or deployment configuration.

Files changed in `9ff1afe`:

- `.gitignore`
- `app/globals.css`
- `backend/.env.example`
- `backend/app/agents/intake_agent.py`
- `backend/app/auth/router.py`
- `backend/app/config.py`
- `backend/app/main.py`
- `backend/app/models/entities.py`
- `backend/app/models/schemas.py`
- `backend/app/routers/donor.py`
- `backend/app/routers/ngo.py`
- `backend/app/routers/ops.py`
- `backend/app/routers/volunteer.py`
- `backend/requirements.txt`
- `backend/tests/test_allocation.py`
- `backend/tests/test_full_system_audit.py`
- `backend/tests/test_intake_agent.py`
- `backend/tests/test_volunteer_flow.py`
- `components/RescueLoopApp.tsx`
- `lib/api.ts`

## 3. Current Technology Stack

Frontend:

- Next.js 14.2.5
- React 18.3.1
- TypeScript 5.5.4
- Lucide React
- A monolithic `components/RescueLoopApp.tsx`

Backend:

- FastAPI
- Uvicorn
- Pydantic v2 and Pydantic Settings
- SQLAlchemy async
- PyJWT
- bcrypt/passlib
- httpx
- pytest and pytest-asyncio

Database:

- SQLite async by default with `aiosqlite`
- PostgreSQL support through `asyncpg`
- `DATABASE_URL` normalization for PostgreSQL and SQLite

Authentication:

- JWT bearer tokens
- 7-day default token lifetime
- Password hashing with bcrypt
- Role-based route dependencies

AI:

- Native AgentRouter capability endpoint
- Deterministic Python fallback parser
- Pydantic validation

Infrastructure:

- No Dockerfile.
- No Compose file.
- No deployment manifest or CI workflow was found.

## 4. Implementation Summary

The latest implementation round genuinely added or changed the following areas:

- Mandatory JWT secret validation and explicit CORS configuration.
- Environment-based demo seeding and production demo-login restrictions.
- Public registration limited to donor, NGO, and volunteer roles.
- AgentRouter intake integration and mock-transport tests.
- Database-backed donor, NGO, volunteer, and operations routes.
- Donation creation, allocation, mission creation, and dispatch assignment.
- NGO offer accept/decline and preference endpoints.
- Volunteer task transitions and OTP handover.
- Operations mission, telemetry, exception, audit, reassign, and abort routes.
- Dynamic frontend record selection and API-backed detail loading in several screens.
- Real offer and mission API calls in portions of the frontend.
- Random mission OTP generation for newly created missions.
- CSV history export in the frontend.
- Google Maps links for selected pickup and drop-off addresses.

## 5. Feature-by-Feature Status Matrix

| Area | Status | Evidence |
|---|---|---|
| Login | Implemented | `backend/app/auth/router.py`, `/auth/login`; `Login` in `components/RescueLoopApp.tsx` |
| Demo login | Implemented with environment guard | `/auth/demo-login/{role}`, blocked in production |
| Registration | Implemented for donor/NGO/volunteer | `/auth/register`; ops registration is blocked |
| Donor overview | Mostly live API | `/donor/dashboard-stats`, `/active-donations`, `/pickups/today`, `/activity-feed` |
| Donor create donation | Implemented | `/donor/donations`; dynamic form and database persistence |
| Donor detail | Live API-backed | `/donor/donations/{idOrCode}`; no known hardcoded ID in the detail loader |
| Donor history | Live API-backed | `/donor/history`; dynamic table and CSV export |
| NGO overview | Mostly live API | `/ngo/dashboard-stats`, `/ngo/offers`; some remaining capacity presentation |
| NGO offer queue | Live API-backed | `/ngo/offers` |
| NGO offer detail | Live API-backed | `/ngo/offers/{allocation_id}` |
| NGO accept/decline | Partially implemented | Backend logic exists, but offer queue status classification and tests are unstable |
| NGO capacity/preferences | Implemented | `/ngo/capacity`, `/ngo/preferences` |
| NGO history | Live API-backed | `/ngo/history` |
| Volunteer overview | Live API-backed | Dashboard, availability, and active tasks are fetched |
| Volunteer task detail | Live API-backed | `/volunteer/tasks/{task_id}` |
| Volunteer transitions | Implemented | Steps 2-4, inspections, handover fields |
| Volunteer history | Live API-backed | `/volunteer/history` |
| Operations overview | Mostly live API | Network stats, missions, exceptions, telemetry; map remains static |
| Operations mission queue | Live API-backed | `/ops/missions` |
| Operations mission detail | Live API-backed | `/ops/missions/{mission_id}` |
| Operations reassign | Integrated | `/ops/missions/{mission_id}/reassign` |
| Operations abort | Integrated | `/ops/missions/{mission_id}/abort` |
| Exception resolution | Backend implemented, frontend not connected | `/ops/exceptions/{id}/resolve`; no resolve action in the React screens |
| Audit trail | Backend/live table | `/ops/audit-trail`; operations/history consumes it |
| Static map | Not live GIS | SVG at the operations overview |
| GPS navigation | External web navigation only | Google Maps URL generation |
| OTP delivery | Missing | OTP stored and verified in database only |
| PDF receipt | Missing | Print action or plain UI only; no PDF generation |
| File upload | Missing | No upload or storage endpoint |
| Push/email/SMS | Missing | No provider integration |

## 6. Previously Identified Issues - Resolution Matrix

| Previous issue | Status | Evidence |
|---|---|---|
| Donor active donations mismatch | RESOLVED | `/donor/active-donations` exists and frontend `donorApi.getActiveDonations()` uses it |
| Donor history mismatch | RESOLVED | `/donor/history` exists and frontend uses it |
| Missing NGO history | RESOLVED | `/ngo/history` exists and frontend uses it |
| Missing volunteer history | RESOLVED | `/volunteer/history` exists and frontend uses it |
| AI intake mismatch | RESOLVED in contract | `/ai/intake-extract` accepts `{ prompt }`, matching `aiApi.intakeCopilot()` |
| Operations exception resolution missing | PARTIALLY RESOLVED | Backend endpoint exists, but frontend has no resolve control |
| Donation details hardcoded to RL-00124 | RESOLVED | `DonationDetails` loads `donationId` or an available record |
| Offer details hardcoded to RL-00128 | RESOLVED | `OfferDetail` loads `offerId` or the first current offer |
| Volunteer task hardcoded seed ID | RESOLVED | `Task` loads `taskId` or the first active task |
| Mission details static | RESOLVED | `MissionDetail` loads mission ID dynamically |
| Hardcoded action IDs | MOSTLY RESOLVED | Main detail and history navigation passes selected IDs |
| Mocked dashboard information | PARTIALLY RESOLVED | Several dashboards use APIs, but seed-account names and some fallback presentation remain |
| Donor actual-detail workflow | PARTIALLY VERIFIED | Create and detail routes are covered by tests and frontend calls exist |
| NGO accept/reject actual offer | PARTIALLY RESOLVED | Backend logic exists, but offer queue misclassification causes failed test flows for delivered allocations |
| Accepted offer dispatch workflow | IMPLEMENTED IN CODE; NOT FULLY VERIFIED | Acceptance updates allocation status; mission dispatch orchestration was exercised in the E2E test |
| Dynamic volunteer assignments | IMPLEMENTED IN CODE | Active tasks are database/assignment-backed |
| Volunteer handover workflow | IMPLEMENTED AND FOCUSED TEST PASSED | Multi-allocation and OTP logic passed focused volunteer test |
| Operations inspect missions | IMPLEMENTED | `/ops/missions/{mission_id}` and mission detail UI |
| Operations resolve exceptions | PARTIALLY RESOLVED | Backend endpoint exists, but no frontend resolution action |
| Static SVG map | STILL MISSING | Operations map is hand-written SVG |
| Mocked GPS navigation | PARTIALLY RESOLVED | It opens Google Maps externally rather than a live tracking interface |
| Simulated OTP | PARTIALLY RESOLVED | OTP is database-backed and randomly generated for new missions, but no delivery channel exists |
| Missing network management | PARTIALLY RESOLVED | Reassign/abort exists; broader fleet/network management is absent |
| Missing PDF receipts | STILL MISSING | No PDF library or endpoint |
| Missing cloud file uploads | STILL MISSING | No upload or object-storage integration |
| Exposed Supabase credentials | HISTORICAL / NOT ROTATION VERIFIED | Historical commits contain database credential patterns; current `.env.example` is safe |
| Insecure default JWT secret | RESOLVED in validation, BUT EXTERNAL USE UNKNOWN | `JWT_SECRET` is mandatory and rejects known default values |
| Missing rate limiting | STILL MISSING | No limiter dependency or middleware found |
| Monolithic frontend | STILL MISSING | Main implementation remains one large component file |
| Production environment separation | PARTIALLY RESOLVED | Environment guard exists, but no deployment manifests or separate production configuration |

## 7. Functional Workflow Verification

Donor workflow:

- The frontend form collects title, category, quantity, packaging, storage, allergens, notes, address, contact, preparation time, and pickup time.
- `POST /api/v1/donor/donations` creates a database donation.
- The allocation engine creates recipient allocations.
- A mission and matching/dispatch agent runs are created.
- The actual donation code is returned.
- The frontend navigates to the detail screen using the created ID.
- The donor detail and history endpoints exist.
- Back-end E2E and donation tests provide partial workflow evidence.

NGO workflow:

- The NGO offer queue is database-backed.
- Offer details are allocation/NGO-scoped.
- Accept and decline transitions update allocation status and NGO capacity.
- The queue mapper has a status bug: allocations in terminal states such as `DELIVERED` can fall through to `"Awaiting response"` because only accepted, declined, and proposed statuses are explicitly mapped.
- The accept/decline tests currently fail for this reason or because offered records are already answered.
- This makes offer handling still partially broken at the seed/test boundary and indicates that test and product state assumptions need correction.

Volunteer workflow:

- Missions are scoped to the assigned volunteer.
- Task details include origin, recipient stops, status, deadline, transport, and current stop.
- Steps 2-4 enforce backend status transitions and inspections.
- OTP is checked against the mission OTP.
- Each accepted allocation is handed over one stop at a time.
- Mission completion occurs after all valid recipient allocations are delivered.
- The focused volunteer handover test passed.

Operations workflow:

- Mission, telemetry, network, exception, and audit endpoints exist.
- Reassignment and mission abort endpoints exist.
- Exception records can be resolved through the backend.
- The frontend calls exception and telemetry APIs, but it does not expose exception resolution controls.
- The operations mission detail UI is dynamic.

## 8. AgentRouter Integration Status

Integration code:

- Gemini-specific code is not present in the active backend implementation.
- The README still contains obsolete Gemini setup and feature references.
- AgentRouter key usage is exclusively in backend settings and `intake_agent.py`.
- No provider key is read by `lib/api.ts` or React code.

Configuration:

- `AGENT_ROUTER_API_KEY`
- `AGENT_ROUTER_BASE_URL`
- `AGENT_ROUTER_MODEL`
- `AGENT_ROUTER_TIMEOUT_SECONDS`

The backend default base URL is:

`https://api.agentrouter.to/api/agentic-api`

The configured local `.env` contains the key field but it is blank. The model field is also blank. This means the live provider path is disabled and the deterministic fallback is used locally.

Request format:

- Bearer authentication.
- `POST /domains/models/capabilities/chat-complete/execute`.
- OpenAI-style `messages`.
- `model`, `temperature`, `max_tokens`, and `allowFallback`.

Response handling:

- Expects top-level `success: true`.
- Expects `completionText`.
- Parses completion text as JSON.
- Validates it with `AiIntakeResponse`.
- Rejects malformed JSON or invalid Pydantic data.
- Adds clarification for unknown quantity.
- Falls back for missing key/model, timeout, transport errors, HTTP 401/403/429, other HTTP errors, and malformed responses.

Verification distinction:

- AgentRouter integration code: present.
- Contract and fallback tests with mock HTTP: passing.
- Real authenticated AgentRouter request: not verified.
- Actual live AI extraction through the frontend: not verified.
- Deterministic fallback in unit tests: passing.

No API key was added or printed for this audit.

## 9. External API and Credentials Checklist

| Provider | Purpose | Status | Credentials | Required | Configuration | Verification | Next action |
|---|---|---|---|---|---|---|---|
| AgentRouter | AI intake | Partially integrated | `AGENT_ROUTER_API_KEY`, `AGENT_ROUTER_MODEL`, `AGENT_ROUTER_BASE_URL` | Yes for live AI | Base URL set; key and model missing/blank | Mock contract tests pass; live request not tested | Configure account key and live model ID |
| PostgreSQL host | Production database | Code support only | `DATABASE_URL` | Yes for production | Missing in repository; default SQLite is used | SQLite tests pass | Provision PostgreSQL and set asyncpg URL |
| Google Maps | Web directions and address search | Partial | No API key for browser links | No | External links require no key | Links are generated, no browser journey run | Optional: replace with embedded/maps SDK if required |
| GPS/vehicle provider | Live courier position | Missing | Provider-specific | Conditional | Missing | Static/seed coordinates only | Choose provider and add tracking endpoints |
| SMS/OTP provider | Real OTP delivery | Missing | Provider-specific API key, sender ID | Conditional | Missing | Database OTP verification only | Choose Twilio or another approved SMS provider |
| Email | Account and mission notifications | Missing | SMTP or provider credentials | Optional | Missing | No delivery integration | Choose provider and implement notification service |
| Push notifications | Real-time user alerts | Missing | Provider credentials | Optional | Missing | No integration | Add only if push is a product requirement |
| Cloud file storage | Receipts, attachments, evidence | Missing | Object-store credentials/bucket | Optional | Missing | No upload endpoint | Add S3-compatible or cloud provider integration |
| PDF | Donation/receipt generation | Missing | None normally | Optional | Missing | No PDF library/endpoint | Add ReportLab or WeasyPrint and a download endpoint |

## 10. Backend and Database Status

Application structure:

- `backend/app/main.py` creates the FastAPI app and mounts all role/AI routers.
- Health endpoints exist.
- CORS is explicit.
- Development and test startup seeds data.
- Production startup does not seed data.

Database models:

- `User`
- `DonorProfile`
- `NgoProfile`
- `VolunteerProfile`
- `Donation`
- `DonationAllocation`
- `Mission`
- `MissionAssignment`
- `MissionEvent`
- `AgentRun`
- `ExceptionRecord`
- `Handover`
- `Notification`
- `AuditLog`

Major endpoint groups:

- Auth: `/api/v1/auth`
- Donor: `/api/v1/donor`
- NGO: `/api/v1/ngo`
- Volunteer: `/api/v1/volunteer`
- Operations: `/api/v1/ops`
- AI: `/api/v1/ai`

Major implemented capabilities:

- Ownership-scoped donor and volunteer queries.
- NGO allocation ownership checks.
- Role-based route dependencies.
- Audit event insertion.
- Deterministic multi-recipient allocation.
- Mission assignment and reassign logic.
- Task step validation.
- Sequential handover allocation logic.
- Exception resolution and audit logging.

Potential runtime and logic issues:

- `/ngo/offers` does not separately classify `AWAITING_RESPONSE`, `IN_TRANSIT`, `DELIVERED`, or `CANCELLED`, causing status-label and queue-selection defects.
- Offer decline test uses the first offer, which may be terminal in the seed dataset.
- The seed data status/capacity state is shared across session tests.
- Mission assignment status begins as `OFFERED`; there is no dedicated volunteer accept/decline assignment endpoint.
- Volunteer task assignment is automatically assigned without an explicit courier acceptance workflow.
- Notification model exists, but no notification service or endpoint creates or retrieves records.
- No migration system or migration files were found.
- No background worker/job queue was found.
- Handover OTP is stored in the mission record and not delivered externally.
- SQLAlchemy defaults and datetime values use naive `utcnow`, creating future timezone consistency risks.

## 11. Frontend Status

Implemented:

- 14 named screen/component areas plus login and shared controls.
- Role-aware navigation.
- Dynamic selected IDs for main detail screens.
- Live API calls in `lib/api.ts`.
- Loading, toast, validation, and error notifications in several workflows.
- NGO accept/decline forms.
- Volunteer step progression and handover fields.
- Operations mission detail, reassign, and abort actions.
- CSV export for history.

Remaining frontend weaknesses:

- The app is concentrated in one monolithic component.
- Demo login buttons remain in the production UI; the backend blocks them in production.
- The login forgot-password action is not real: it only sends an alert.
- The operations map is static SVG.
- The operation overview still depends on live API data but lacks real loading skeletons.
- Exception resolution has no UI control.
- Some UI text and vehicle/profile values remain seed/profile-based rather than fully dynamic.
- No responsive browser/device verification was performed.
- No front-end test suite was found.
- No ESLint configuration exists, so `next lint` opens an interactive setup prompt and exits.
- Local state and browser localStorage are used for token storage and one donation draft, but no full persisted draft reload was found.

## 12. Testing and Verification Results

### Full backend suite

Command:

`DATABASE_URL=sqlite+aiosqlite:///:memory: venv\Scripts\python.exe -m pytest backend\tests -q`

Result:

- 34 passed
- 2 failed
- 195 warnings

Failed tests:

- `backend/tests/test_allocation.py::test_ngo_accept_offer`
- `backend/tests/test_full_system_audit.py::test_ngo_decline_restores_capacity`

Failure diagnosis:

- The backend `/ngo/offers` response labels a non-pending allocation as `"Awaiting response"` or `"New offer"` when it is not one of the accepted, declined, or proposed statuses.
- The seed database includes a delivered allocation.
- A test chooses the first allocation based on the queue label and calls accept or decline.
- The backend then correctly rejects it with `409` because the allocation is delivered or already answered.
- This is a test-state and offer-status classification issue rather than evidence that accept/decline logic works in all seed states.

### AgentRouter tests

Command:

`DATABASE_URL=sqlite+aiosqlite:///:memory: venv\Scripts\python.exe -m pytest backend\tests\test_intake_agent.py -q`

Result:

- 6 passed
- 53 warnings

Coverage:

- Native request contract.
- Bearer authorization header.
- Structured valid response.
- Malformed completion fallback.
- 401, 403, 429, and 503 fallback behavior.

No live provider call was made.

### Focused workflow tests

Previously run:

- End-to-end full donation lifecycle: passed in an isolated run.
- Volunteer handover test: passed in an isolated run.

The final full-suite rerun does not have a complete green backend result because of the two NGO offer-state failures.

### TypeScript

Command:

`npx tsc --noEmit`

Result:

- Passed after the production build completed.
- An initial parallel run encountered stale `.next/types` references because build generation was racing the check.

### Frontend lint

Command:

`npm run lint`

Result:

- Did not run automated lint checks.
- `next lint` displayed the interactive ESLint configuration prompt.
- No ESLint configuration was present.

### Production build

Command:

`npm run build`

Result:

- Compiled successfully.
- Static generation completed for 4 pages.
- Route output generated.
- Build passed.

## 13. Security Findings

CRITICAL:

- No live secret values should be assumed safe based solely on repository code.
- Git history has historical known-secret patterns, including a hardcoded JWT secret and database credential patterns.
- If any historical production credential is still valid, it must be rotated manually; repository access cannot prove or perform rotation.

HIGH:

- Missing API rate limiting.
- No migration-based database secret or schema management system.
- No delivery or verification mechanism for OTP.
- Local JWT storage in browser localStorage exposes the token to XSS if frontend scripts are compromised.
- The frontend contains demo login controls, although backend production restrictions block them.

MEDIUM:

- CORS is explicit but deployment production origins must be configured outside localhost.
- `.env` is ignored. The tracked `.env.example` contains placeholders only.
- The local JWT secret field is present in an ignored `.env`; its value was not reported.
- JWT tokens are valid for 7 days by default.
- Passwords are truncated to 72 bytes before bcrypt, consistent with bcrypt limits.
- No refresh token or token revocation mechanism was found.
- No login attempt throttling or account lockout was found.
- Audit log IP address is modeled but no request-IP capture was found.
- Production error responses may expose FastAPI detail messages but not full stack traces by default.

LOW:

- Pydantic deprecation warnings are present.
- SQLAlchemy `datetime.utcnow` deprecation warnings are present.
- No security headers middleware was found.
- No CSRF-specific handling was found; JWT bearer auth reduces same-site cookie risk but security headers are still advisable.

Historical exposure status:

- Git history searches found commits containing the known JWT default secret and database URL patterns.
- Relevant history includes `df743e5`, `a008b13`, `afce35f`, and `9ff1afe`.
- Current source and `.env.example` do not contain the known JWT default value.
- The current local `.env` is ignored and must be treated as secret.
- Manual rotation status is unknown.

## 14. Outstanding Issues

1. Fix NGO offer status mapping and terminal-state filtering.
2. Stabilize NGO accept/decline tests and seed-state setup.
3. Add a frontend control to resolve operations exceptions.
4. Remove obsolete Gemini references from README.
5. Configure a real AgentRouter key and live model.
6. Verify a live AgentRouter API response.
7. Implement real OTP delivery.
8. Add live GPS or tracking-provider integration.
9. Replace static SVG map with live telemetry or a real map library.
10. Add PDF receipt generation.
11. Add file uploads and cloud/object storage.
12. Add outbound email or notification delivery.
13. Add API rate limiting.
14. Configure production CORS origins and database settings.
15. Add deployment manifests and CI.
14. Add database migrations.
16. Add frontend automated tests.
17. Configure ESLint.
18. Split monolithic frontend components into role-specific modules.
19. Remove or gate demo UI behavior for production builds.
20. Add refresh/logout/session invalidation behavior.
21. Improve loading, empty, and error states across all screens.
22. Verify responsive layouts and browser workflows.
23. Verify PostgreSQL runtime behavior.
24. Add notification CRUD/endpoints or remove unused model.

## 15. Prioritized Development Backlog

### P0 - Critical blockers

#### Fix NGO offer status and response queue

- Why it matters: Pending offers can include terminal allocations, producing 409 responses and unstable test flows.
- Files: `backend/app/routers/ngo.py`, `backend/tests/test_allocation.py`, `backend/tests/test_full_system_audit.py`.
- Dependencies: Allocation status enum and seed data.
- Complexity: Low to medium.
- External credentials: None.
- Acceptance: `GET /ngo/offers` returns only pending/appropriate statuses for pending filters; terminal allocations appear only in history or delivered/declined filters.

#### Isolate tests and correct seed/test mutation

- Why it matters: Session-scoped seed state makes tests order-dependent.
- Files: `backend/tests/conftest.py`, NGO test files.
- Dependencies: Test database strategy.
- Complexity: Medium.
- External credentials: None.
- Acceptance: Full suite passes repeatedly in memory DB without skips or state assumptions.

#### Configure and verify live AgentRouter

- Why it matters: AI intake is currently fallback-only unless account credentials exist.
- Files: `backend/.env`, `backend/app/config.py`, `backend/app/agents/intake_agent.py`.
- Dependencies: Provider account, live model ID.
- Complexity: Medium.
- External credentials: AgentRouter key and model.
- Acceptance: One live authenticated intake request succeeds and returns validated structured JSON.

#### Rotate historical secrets

- Why it matters: Historical credentials may remain usable outside Git.
- Files: Git history and deployment secrets.
- Dependencies: Provider/provider account access.
- Complexity: Manual/unknown.
- External credentials: Database provider and deployment secret access.
- Acceptance: Old database password and production JWT signing secrets are revoked/replaced and new deployment secrets are documented only in secret managers.

### P1 - Essential functional requirements

#### Add operations exception resolution UI

- Why it matters: Operations backend can resolve exceptions but operators cannot do so from the application.
- Files: `components/RescueLoopApp.tsx`, `lib/api.ts`, `backend/app/routers/ops.py`.
- Dependencies: Exception schema and role auth.
- Complexity: Low.
- External credentials: None.
- Acceptance: Ops user selects exception, resolution status and action, and backend audit record updates.

#### Deliver real OTP

- Why it matters: A real handover cannot use a code unknown to the recipient.
- Files: Mission model/routes, volunteer UI, notification service.
- Dependencies: SMS/email or in-app delivery provider.
- Complexity: Medium.
- External credentials: Provider key and sender configuration.
- Acceptance: Recipient receives current mission OTP through configured channel and handover succeeds once.

#### Add live or provider-backed courier tracking

- Why it matters: Current route and position data is static.
- Files: Volunteer/operations routers, entities, frontend map components.
- Dependencies: GPS provider.
- Complexity: High.
- External credentials: Provider credential and vehicle IDs.
- Acceptance: Courier positions update from a real source and operations telemetry displays current state.

#### Add migrations and production database setup

- Why it matters: `create_all` is insufficient for production schema evolution.
- Files: Database setup, deployment configuration.
- Dependencies: PostgreSQL.
- Complexity: Medium.
- External credentials: PostgreSQL URL.
- Acceptance: Repeated deployments apply forward migrations safely.

#### Configure deployment and CI

- Why it matters: No repeatable production build or release process exists.
- Files: New deployment/CI files.
- Dependencies: Hosting provider.
- Complexity: Medium.
- External credentials: Registry and deployment credentials.
- Acceptance: Automated tests/build run and production artifact deploys with environment variables.

### P2 - Important enhancements

#### Add PDF receipts

- Relevant files: Donor detail route/UI and backend dependencies.
- Complexity: Medium.
- External credentials: None.
- Acceptance: One valid downloadable PDF per delivered donation.

#### Add file uploads

- Relevant files: Backend models/routes, frontend detail screens.
- Complexity: Medium.
- External credentials: Object storage optional.
- Acceptance: Authenticated upload, persistence, and signed retrieval.

#### Add real notification service

- Relevant files: `Notification` model, auth/workflow routers.
- Complexity: Medium.
- External credentials: Email/SMS/push provider.
- Acceptance: Workflow events create and deliver notifications.

#### Add ESLint and frontend tests

- Relevant files: Package configuration, frontend components, test setup.
- Complexity: Medium.
- External credentials: None.
- Acceptance: `npm run lint` and repeatable UI workflow tests pass.

#### Split frontend monolith

- Relevant files: `components/RescueLoopApp.tsx`, new role/component directories.
- Complexity: High.
- External credentials: None.
- Acceptance: Role screens use shared components and focused modules without behavior regressions.

### P3 - Optional improvements

#### Add refresh and session revocation

- Complexity: Medium.
- External credentials: None.

#### Add push notifications

- Complexity: Medium.
- External credentials: Push provider.

#### Improve responsive and accessibility behavior

- Complexity: Medium.
- External credentials: None.

#### Add live GIS SDK

- Complexity: High.
- External credentials: Map provider account if paid features are needed.

## 16. Production Readiness

Frontend:

- Production build passes.
- TypeScript passes after a clean build.
- Dynamic API-backed screens exist.
- ESLint is not configured.
- No frontend test suite or browser journey verification.
- Demo UI and static seed values remain in some areas.
- Status: not production-ready.

Backend:

- Core routers and business logic exist.
- Authentication and role boundaries exist.
- Backend suite is not fully green.
- No rate limiting.
- No migration system.
- No notification or external integration framework.
- Status: prototyping/pre-production, not production-ready.

Database:

- SQLite is suitable for development and tests.
- PostgreSQL code support exists.
- No migrations and no live PostgreSQL verification.
- Status: not production-ready.

AI:

- AgentRouter implementation exists, but provider key/model are missing.
- Live AI is unverified.
- Deterministic fallback is tested.
- Status: fallback operational; live integration unverified.

Integrations:

- Google Maps links only.
- OTP database-only.
- No PDF, upload, SMS, email, or push delivery.
- Status: missing for real-world operations.

Security:

- Mandatory JWT validation is a good improvement.
- CORS and demo restrictions exist.
- Historical secret exposure and missing rate limiting remain.
- Status: additional hardening required.

Deployment:

- No Docker or hosting configuration.
- No CI.
- No database migration plan.
- Status: missing.

## 17. Recommended Next Steps

1. Fix the NGO offer status classifier and pending/terminal filters.
2. Make backend tests isolated and order-independent, then make the full suite green.
3. Add operations exception resolution controls and action logging.
4. Remove obsolete Gemini references from the README.
5. Configure a real AgentRouter key and live model outside source code.
6. Perform and record one real authenticated AgentRouter request.
7. Provision PostgreSQL and validate asyncpg runtime behavior.
8. Add migrations and production environment/deployment configuration.
9. Implement real OTP delivery through an approved SMS/email provider.
10. Add rate limiting, security headers, frontend tests, ESLint, and browser journey verification.
