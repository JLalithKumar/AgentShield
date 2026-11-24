# AgentShield — Production Render + Neon Deployment Guide
**Team Code Battalions | Visionet Techthon 2026**  
**Repository Branch:** `deploy/render-only` (Target: `main`)

---

## 1. Executive Summary & Architecture Overview

AgentShield is an enterprise-grade AI safety and automated change-control platform designed for autonomous banking agents. It enforces a strict **Five-Stage Evaluation Workflow** (Behavioral Scenarios, Invariant Assertion Engine, Safety Policy Evaluator, Risk Categorization, and Release Gate Decision) that intercepts behavioral regressions before agents deploy to production.

To ensure **Visionet Techthon mentors** can evaluate AgentShield on a stable, publicly accessible HTTPS URL 24/7—without requiring the developer's laptop to remain online—the platform is engineered for zero-cost cloud deployment combining **Render** and **Neon Serverless PostgreSQL**.

Authentication is secured using **Argon2id password hashing**, **cryptographically secure HttpOnly session cookies**, **Double-Submit CSRF token enforcement**, and **persistent database-backed rate limiting** for brute-force and abuse protection—without reliance on third-party CAPTCHA widgets.

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                     |
|  - React 19 + Vite Single Page Application (SPA)                                      |
|  - Stitch-Inspired Modern SaaS UI (WCAG 2.2 AA compliant)                              |
|  - Accessible, frictionless Login / Sign Up with inline validation                    |
+-------------------------------------------+-------------------------------------------+
                                            |
                   HTTPS (e.g. https://agentshield-frontend.onrender.com)
                                            |
                                            v
+-------------------------------------------+-------------------------------------------+
|                          RENDER STATIC SITE (FRONTEND)                                |
|  - Static Assets (/assets/*)  --> Served with immutable caching                       |
|  - Client Routing (/*)        --> Rewrites to /index.html (SPA client-side router)    |
|  - API Proxying (/api/*)      --> Rewrites & proxies to Render Backend Web Service    |
+-------------------------------------------+-------------------------------------------+
                                            |
                         HTTPS Internal/Public Proxying (/api/*)
                                            |
                                            v
+-------------------------------------------+-------------------------------------------+
|                          RENDER WEB SERVICE (FASTAPI BACKEND)                         |
|  - Runtime: Python 3.12 (uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT)    |
|  - Authentication: Argon2id password hashing, HttpOnly session cookies                |
|  - CSRF Defense: Double-Submit CSRF cookie & header validation                        |
|  - Abuse Protection: Persistent rate limiting on /login, /register, and /evaluations  |
|  - 5-Stage Evaluator: 24 Banking Scenarios (Deterministic zero-Ollama serverless mode)|
|  - Multi-Tenant Isolation: User-scoped queries preventing IDOR leaks                  |
|  - Single-Origin Fallback: Built-in SPA static file serving capability                |
+-------------------------------------------+-------------------------------------------+
                                            |
                     TLS/SSL Encrypted (sslmode=require) via PgBouncer Pooler
                                            |
                                            v
+-------------------------------------------+-------------------------------------------+
|                         NEON SERVERLESS POSTGRESQL                                    |
|  - Endpoint: ep-xxxx-pooler.[region].aws.neon.tech (Connection Pooling Mode)          |
|  - Connection Pooling: pool_pre_ping=True, pool_size=5, max_overflow=10               |
|  - Tables: users, auth_sessions, evaluation_runs, scenario_results,                   |
|            evidence_traces, rate_limit_records                                        |
+---------------------------------------------------------------------------------------+
```

### Component Roles & Guarantees
1. **Frontend (React 19 + Vite):** Deployed as a Render Static Site with instantaneous global CDN delivery. Supports client-side routing across `/`, `/auth`, `/home`, and `/app` (`evaluations`, `library`, `trace`, `history`).
2. **Backend (FastAPI on Render):** Deployed as a Render Python Web Service binding to dynamic `$PORT`. Serves session authentication, rate limiting, and the 5-stage evaluation gate runner.
3. **Database (Neon Serverless PostgreSQL):** Managed PostgreSQL with auto-scaling storage and built-in PgBouncer connection pooling. Persistently stores all registered user accounts, evaluation histories, and rate limit counters.
4. **Brute-Force & Abuse Protection:** Database-backed sliding-window rate limiting on `/api/auth/login`, `/api/auth/register`, and `/api/evaluations` ensures consistent protection across serverless and free-tier instances without third-party challenge services.
5. **Deterministic Evaluation Engine:** Runs all 24 banking scenarios in ~1.5 seconds without requiring an external GPU or Ollama daemon:
   - **Candidate v1.1:** Evaluates to **23/24 PASS**, 1 Critical Regression (Scenario `T002` - `PAYMENT_STATUS_MISMATCH`), Release Gate Decision: **BLOCKED**.
   - **Candidate v1.2:** Evaluates to **24/24 PASS**, 0 Critical Regressions, Release Gate Decision: **ALLOWED**.

---

## 2. Prerequisites & Free-Tier Suitability

All target infrastructure runs on free, non-commercial tiers suitable for student competitions:
- **GitHub:** Free repository hosting.
- **Render Free Tier:** Free Web Service (512 MB RAM, shared CPU) + Free Static Site hosting (unlimited bandwidth).
- **Neon Free Tier:** 0.5 GiB storage, free compute endpoints with PgBouncer connection pooling.

---

## 3. Step-by-Step Provisioning Guide

### Option A: Render Blueprint (Recommended — 1-Click Setup)

The repository includes a root `render.yaml` Blueprint file that configures both the backend and frontend automatically.

1. **Push Branch to GitHub:**
   Ensure branch `deploy/render-only` is pushed to your GitHub repository.
2. **In Render Dashboard:**
   - Go to [https://dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)
   - Click **New Blueprint Instance**.
   - Connect your GitHub repository `AgentShield-Techthon-2026` and select branch `deploy/render-only`.
3. **Set Parameters:**
   - Render will parse `render.yaml` and create both `agentshield-backend` and `agentshield-frontend`.
   - Enter your `DATABASE_URL` (from Neon).
4. **Deploy:**
   - Click **Apply**. Render builds and deploys both services automatically!

---

### Option B: Manual Setup via Render Dashboard

If configuring services manually in the Render dashboard:

#### Phase 1 — Neon Serverless PostgreSQL Setup
1. **Sign Up / Log In to Neon:** Navigate to [https://neon.tech](https://neon.tech).
2. **Create a Project:** Name it `agentshield-db`, Postgres 16.
3. **Copy Pooled Connection String:** Under **Connection Details**, ensure **Pooled connection** is checked (contains `-pooler` in host).
   ```text
   postgresql://neondb_owner:npg_xYzA1234@ep-patient-water-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Provision Tables with `scripts/init_neon_db.py`:**
   Run from your local terminal with virtualenv active:
   ```bash
   python scripts/init_neon_db.py "YOUR_NEON_POOLED_CONNECTION_STRING"
   ```
   *Output validates that `users`, `auth_sessions`, `evaluation_runs`, `scenario_results`, `evidence_traces`, and `rate_limit_records` are created.*

#### Phase 2 — Render Backend Web Service Setup
1. In Render Dashboard, click **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository `AgentShield-Techthon-2026` (branch: `deploy/render-only`).
3. Configure settings:
   - **Name:** `agentshield-backend`
   - **Language:** `Python`
   - **Region:** `Ohio (US East)` (recommended to match Neon region)
   - **Branch:** `deploy/render-only`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/health`
4. Set Environment Variables (see Section 4 for values).
5. Click **Deploy Web Service**. Note your backend URL (e.g., `https://agentshield-backend.onrender.com`).

#### Phase 3 — Render Frontend Static Site Setup
1. In Render Dashboard, click **New +** $\rightarrow$ **Static Site**.
2. Connect your GitHub repository `AgentShield-Techthon-2026` (branch: `deploy/render-only`).
3. Configure settings:
   - **Name:** `agentshield-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm ci && npm run build`
   - **Publish Directory:** `dist`
4. **Configure Redirects / Rewrites:**
   Under **Redirects/Rewrites**, add two rules (in exact order):
   - **Rule 1 (API Proxy):**
     - Type: `Rewrite`
     - Source: `/api/*`
     - Destination: `https://agentshield-backend.onrender.com/api/*` (use your actual backend URL)
   - **Rule 2 (SPA Fallback):**
     - Type: `Rewrite`
     - Source: `/*`
     - Destination: `/index.html`
5. Click **Deploy Static Site**.

---

## 4. Complete Environment Variables Matrix

Enter these variables in **Render Backend Service -> Environment Variables**:

| Variable Name | Sensitive? | Production Value | Description & Purpose |
|---|---|---|---|
| `DATABASE_URL` | **YES** | `postgresql://user:pass@ep-pooler.neon.tech/neondb?sslmode=require` | Pooled connection string to Neon PostgreSQL. |
| `PYTHON_VERSION` | No | `3.12.8` | Enforces verified Python runtime version on Render. |
| `AGENTSHIELD_LIVE_LLM` | No | `false` | Enforces fast, reproducible deterministic 5-stage evaluation without live Ollama daemon. |
| `ENABLE_LIVE_LLM` | No | `false` | Alias flag ensuring zero external LLM dependencies. |
| `COOKIE_SECURE` | No | `true` | Enforces `Secure` flag on cookies over HTTPS (auto-enabled on Render). |
| `COOKIE_SAMESITE` | No | `lax` | Enforces `SameSite=Lax` cookie attribute for CSRF safety. |
| `RATE_LIMIT_LOGIN_MAX` | No | `10` | Maximum login attempts per 60 seconds per IP. |
| `RATE_LIMIT_REGISTER_MAX` | No | `5` | Maximum registration attempts per 60 seconds per IP. |
| `RATE_LIMIT_EVALUATIONS_MAX` | No | `30` | Maximum evaluation triggers per 60 seconds per IP. |
| `CORS_ORIGINS` | No | `https://agentshield-frontend.onrender.com` | Optional explicit CORS whitelist for your frontend domain. |
| `DB_POOL_SIZE` | No | `5` | SQLAlchemy pool size tuned for serverless connection conservation. |
| `DB_MAX_OVERFLOW` | No | `10` | Maximum temporary overflow connections for burst requests. |
| `DB_POOL_RECYCLE` | No | `300` | Recycles idle connections every 5 minutes to prevent stale socket errors. |

---

## 5. Single-Origin Web Service Fallback (Zero-Proxy Alternative)

If an evaluator prefers deploying the entire application under **one single URL** (without a separate static site or rewrite proxies), AgentShield includes built-in static file serving directly in FastAPI:

1. In Render, deploy a single **Web Service**:
   - **Build Command:** `npm --prefix frontend ci && npm --prefix frontend run build && pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
2. `backend/app/main.py` detects `frontend/dist` and automatically mounts `/assets` and handles SPA client routing for `/`, `/auth`, `/home`, `/app/*` under the same unified origin.

---

## 6. Mentor Acceptance Test Protocol (Verification Runbook)

Mentors and evaluators can verify the deployment step-by-step:

```
+---------------------------------------------------------------------------------------+
| STEP 1: USER REGISTRATION & AUTHENTICATION                                            |
| Action: Open https://<your-project>.onrender.com in a browser.                         |
| Expected Result:                                                                      |
|  - Page displays Sign In / Create Account form directly (clean, no CAPTCHA widget).   |
|  - Enter Full Name, Email ("mentor@visionet.com"), and a password (>= 8 chars).       |
|  - Submit registration: Password is cryptographically hashed with Argon2id.           |
|  - User is created in Neon DB and seamlessly redirected to the Authenticated Homepage.|
+---------------------------------------------------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| STEP 2: AUTHENTICATED HOMEPAGE & WORKSPACE ACCESS                                     |
| Action: Review Authenticated Homepage; click "Launch Evaluation Console".             |
| Expected Result:                                                                      |
|  - Header displays user profile ("mentor@visionet.com") and Sign Out button.          |
|  - Interactive comparison hero allows previewing Candidate v1.1 vs v1.2.              |
|  - Clicking "Launch Evaluation Console" opens the protected Evaluation Workspace.     |
+---------------------------------------------------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| STEP 3: AUTHENTICATED SESSION & SECURITY HEADERS                                      |
| Action: Inspect browser cookies and network requests (F12 DevTools -> Application).   |
| Expected Result:                                                                      |
|  - Cookie 'agentshield_session' is set with HttpOnly=True, Secure=True, SameSite=Lax. |
|  - Cookie 'agentshield_csrf' is present and sent via 'X-CSRF-Token' header.           |
|  - Direct unauthenticated access to /api/evaluations receives 401 Unauthorized.       |
|  - Sensitive endpoints return Cache-Control: no-store, private.                       |
+---------------------------------------------------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| STEP 4: EVALUATE CANDIDATE v1.1 (CRITICAL REGRESSION DETECTED)                        |
| Action: Navigate to Evaluation Console, select Candidate v1.1, click "Run Evaluation".|
| Expected Result:                                                                      |
|  - Execution finishes deterministically in ~1.5 - 2.0 seconds.                        |
|  - Pass Rate: 23/24 Scenarios Passed (95.8%).                                         |
|  - Invariant Violations: 1 Critical Violation identified in Scenario T002:            |
|      * Scenario: T002 - International Wire Transfer with Duplicate Reference           |
|      * Failure: PAYMENT_STATUS_MISMATCH                                               |
|      * Contradiction: Agent reported SUCCESS while Banking API returned REJECTED.     |
|  - Release Gate Decision: *** BLOCKED *** (Red badge with safety explanation).         |
+---------------------------------------------------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| STEP 5: EVALUATE CANDIDATE v1.2 (ZERO REGRESSIONS - RELEASE ALLOWED)                  |
| Action: Switch candidate selector to Candidate v1.2, click "Run Evaluation".          |
| Expected Result:                                                                      |
|  - Execution completes in ~1.5 - 2.0 seconds.                                         |
|  - Pass Rate: 24/24 Scenarios Passed (100.0%).                                        |
|  - Invariant Violations: 0 Critical, 0 High, 0 Medium, 0 Low.                         |
|  - Release Gate Decision: *** ALLOWED *** (Green badge confirming safe production).   |
+---------------------------------------------------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| STEP 6: PERSISTENT EVALUATION HISTORY IN NEON                                         |
| Action: Click "Evaluation History" in the workspace sidebar.                          |
| Expected Result:                                                                      |
|  - Both runs (v1.1 BLOCKED and v1.2 ALLOWED) are listed in chronological order.       |
|  - Displays Run ID, Timestamp, Candidate Version, Pass Rate, and Release Gate status. |
|  - Data is fetched directly from Neon PostgreSQL, persisting across page reloads.     |
+---------------------------------------------------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| STEP 7: EVIDENCE TRACE EXPLORER                                                       |
| Action: Click "View Evidence Trace" for Scenario T002 in either the Console or History|
| Expected Result:                                                                      |
|  - Deep-dive evidence modal opens.                                                    |
|  - Shows Prompt, Tool Invocations, Invariant Failure Details, and API response logs.  |
|  - Plain-language safety diagnosis clearly identifies why change control intercepted  |
|    the banking transfer regression.                                                   |
+---------------------------------------------------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| STEP 8: LOGOUT & SERVER-SIDE REVOCATION                                               |
| Action: Click "Sign Out" in the user dropdown or header.                              |
| Expected Result:                                                                      |
|  - Session record in Neon 'auth_sessions' is stamped with 'revoked_at'.               |
|  - Cookies are cleared from the browser.                                              |
|  - Application redirects to the unauthenticated login view.                           |
|  - Subsequent API requests to /api/evaluations immediately receive 401 Unauthorized.  |
+---------------------------------------------------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| STEP 9: MULTI-TENANT ISOLATION & IDOR PROTECTION                                      |
| Action: Open a Private/Incognito browser window. Register a second account.           |
| Expected Result:                                                                      |
|  - New user's Evaluation History is completely empty (zero cross-tenant data leak).   |
|  - Attempting to query the first user's run_id via API returns 404 / 403 Forbidden.   |
|  - Strict user ownership isolation enforced at the database query layer.              |
+---------------------------------------------------------------------------------------+
```

---

## 7. Render Free-Tier Limitations & Mitigations

1. **Free Tier Instance Spindown (Cold Starts):**
   - *Behavior:* Render spins down free Web Services after 15 minutes of inactivity.
   - *Mitigation:* The first incoming request wakes the instance in ~30–50 seconds. Once awake, subsequent API calls respond in <100ms. Render Static Sites never spin down and always respond instantly.
2. **Neon Auto-Suspend:**
   - *Behavior:* Free Neon compute endpoints auto-suspend after 5 minutes of inactivity.
   - *Mitigation:* SQLAlchemy is configured with `pool_pre_ping=True` in `backend/app/database/session.py`. When Neon wakes up (~1.5s), the pool reconnects cleanly without dropping requests.
3. **512 MB Memory Limit:**
   - *Mitigation:* In deterministic evaluation mode (`AGENTSHIELD_LIVE_LLM=false`), memory usage stays below ~90 MB, well within Render's 512 MB free quota.

---

## 8. Rollback & Troubleshooting Runbook

### Rollback Strategy
1. **Instant Render Rollback:**
   - In Render Dashboard, go to your Web Service or Static Site $\rightarrow$ **Events**.
   - Locate the previous successful deploy and click **Rollback to this deploy**.

### Common Issues & Quick Remedies

| Issue / Error | Likely Root Cause | Exact Remedy |
|---|---|---|
| `500 Internal Server Error` on `/api/auth/register` | Database tables missing or connection string misconfigured. | Run `python scripts/init_neon_db.py "<DATABASE_URL>"` and verify all 6 tables exist in Neon. |
| `429 Too Many Requests` | Rate limit threshold exceeded during rapid automated testing. | Wait 60 seconds for the sliding window to reset, or adjust `RATE_LIMIT_*` variables. |
| `CORS Error in Browser Console` | Request made to backend without matching origin. | Ensure the Static Site rewrite rule `/api/*` $\rightarrow$ `https://<backend>.onrender.com/api/*` is active, or set `CORS_ORIGINS` to your frontend domain. |
| `401 Unauthorized` on `/api/evaluations` | User is not logged in or session cookie expired. | Sign in through `/auth` to generate a valid `agentshield_session` cookie. |
| Free tier backend slow on first visit | Render free service waking from cold sleep. | Wait 45 seconds on first access for the container to initialize. |
