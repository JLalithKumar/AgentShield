# AgentShield — Production Vercel + Neon Deployment Guide
**Team Code Battalions | Visionet Techthon 2026**  
**Repository Branch:** `deploy/vercel-neon`

---

## 1. Executive Summary & Architecture Overview

AgentShield is an enterprise-grade AI safety and automated change-control platform designed for autonomous banking agents. It enforces a strict **Five-Stage Evaluation Workflow** (Behavioral Scenarios, Invariant Assertion Engine, Safety Policy Evaluator, Risk Categorization, and Release Gate Decision) that intercepts regressions before agents deploy to production.

To ensure **Visionet Techthon mentors** can evaluate AgentShield on a stable, publicly accessible HTTPS URL 24/7—without requiring the developer's laptop to remain online—the platform is engineered for a zero-cost serverless deployment combining **Vercel Hobby**, **Neon Serverless PostgreSQL**, and **Cloudflare Turnstile**.

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                     |
|  - React 19 + Vite Single Page Application (SPA)                                      |
|  - Stitch-Inspired Modern SaaS UI (WCAG 2.2 AA compliant)                              |
|  - Cloudflare Turnstile Bot Challenge Widget                                          |
+-------------------------------------------+-------------------------------------------+
                                            |
                   HTTPS (Single Unified Origin: https://agentshield.vercel.app)
                                            |
                                            v
+-------------------------------------------+-------------------------------------------+
|                               VERCEL EDGE NETWORK                                     |
|  - Static Assets (/assets/*)  --> Cached with immutable headers                       |
|  - Client Routing (/*)        --> Serves Vite index.html (SPA client-side router)     |
|  - API Requests (/api/*)      --> Rewrites to FastAPI Serverless ASGI Function        |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+-------------------------------------------+-------------------------------------------+
|                        FASTAPI BACKEND (SERVERLESS ASGI)                              |
|  - Entrypoint: api/index.py (sys.path bridged to monorepo root)                       |
|  - Authentication: Argon2id password hashing, HttpOnly session cookies                |
|  - CSRF Defense: Double-Submit CSRF cookie & header validation                        |
|  - Bot Protection: Cloudflare Turnstile verification (/api/auth/register, /login)     |
|  - 5-Stage Evaluator: 24 Banking Scenarios (Deterministic zero-Ollama serverless mode)|
|  - Multi-Tenant Isolation: User-scoped queries preventing IDOR leaks                  |
+-------------------------------------------+-------------------------------------------+
                                            |
                     TLS/SSL Encrypted (sslmode=require) via PgBouncer Pooler
                                            |
                                            v
+-------------------------------------------+-------------------------------------------+
|                         NEON SERVERLESS POSTGRESQL                                    |
|  - Endpoint: ep-xxxx-pooler.[region].aws.neon.tech (Connection Pooling Mode)          |
|  - Connection Pooling: pool_pre_ping=True, pool_size=5, max_overflow=10               |
|  - Tables: users, auth_sessions, evaluation_runs, scenario_results, evidence_traces   |
+---------------------------------------------------------------------------------------+
```

### Component Roles & Guarantees
1. **Frontend (React 19 + Vite):** Served via Vercel Edge CDN with instantaneous page loads (<1s). Supports deep client routing across `/`, `/auth`, `/app`, `/scenarios`, `/history`, and `/evidence`.
2. **Backend (FastAPI ASGI on Vercel):** Serverless Python runtime handling session authentication, bot challenge verification, and the five-stage evaluation gate runner.
3. **Database (Neon Serverless PostgreSQL):** Managed, multi-AZ PostgreSQL with auto-scaling storage and built-in PgBouncer connection pooling. Retains all registered user accounts and evaluation histories persistently.
4. **Bot Protection (Cloudflare Turnstile):** Protects public registration and authentication endpoints from credential-stuffing and automated bots while providing a frictionless experience for human reviewers.
5. **Deterministic Evaluation Engine:** Runs all 24 banking scenarios in ~1.5 seconds without requiring an external GPU or Ollama daemon:
   - **Candidate v1.1:** Evaluates to **23/24 PASS**, 1 Critical Regression (Scenario `T002` - `PAYMENT_STATUS_MISMATCH`), Release Gate Decision: **BLOCKED**.
   - **Candidate v1.2:** Evaluates to **24/24 PASS**, 0 Critical Regressions, Release Gate Decision: **ALLOWED**.

---

## 2. Prerequisites & Free-Tier Suitability

All target infrastructure runs on free, non-commercial tiers suitable for student competitions:
- **GitHub:** Free private or public repository.
- **Vercel Hobby:** Free deployment tier (100 GB bandwidth/month, serverless function invocation limits generous for evaluation demos).
- **Neon Free Tier:** 0.5 GiB storage, free compute endpoints with PgBouncer connection pooling.
- **Cloudflare Turnstile:** Free tier supports unlimited bot challenge checks.

---

## 3. Step-by-Step Provisioning Guide

### Phase 1 — Neon Serverless PostgreSQL Setup

1. **Sign Up / Log In to Neon:**
   - Navigate to [https://neon.tech](https://neon.tech) and authenticate (e.g. via GitHub).
2. **Create a New Project:**
   - **Name:** `agentshield-db`
   - **Postgres Version:** `16` (Default)
   - **Region:** Select the region closest to your Vercel deployment (e.g., `US East (N. Virginia)` / `aws-us-east-1` or `aws-us-east-2`).
3. **Enable Connection Pooling & Copy Connection String:**
   - In the Neon Dashboard, go to **Connection Details**.
   - Select the checkbox **Pooled connection** (ensure the hostname contains `-pooler`, e.g., `ep-patient-water-123456-pooler.us-east-2.aws.neon.tech`).
   - Copy the connection string. It will look like:
     ```text
     postgresql://neondb_owner:npg_xYzA1234@ep-patient-water-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
4. **Initialize Schema & Tables with `init_neon_db.py`:**
   - From your local terminal (with project virtualenv active), run:
     ```bash
     python deploy/vercel-neon/init_neon_db.py "postgresql://neondb_owner:npg_xYzA1234@ep-patient-water-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
     ```
   - **Verification Output:**
     The script validates SSL connectivity, creates all 5 tables idempotently, and verifies column counts:
     ```text
     =======================================================
     AgentShield — Neon PostgreSQL Schema Provisioning
     =======================================================
     [SUCCESS] Connected in 182.4ms
     PostgreSQL Version: PostgreSQL 16.6 on x86_64-pc-linux-gnu...
     Applying idempotent schema migrations (create_all)...
     Database Schema Verification:
       ✓ users                (7 columns: id, full_name, email, password_hash...)
       ✓ auth_sessions        (6 columns: id, user_id, session_token_hash, created_at...)
       ✓ evaluation_runs      (10 columns: id, run_id, user_id, baseline_version...)
       ✓ scenario_results     (13 columns: id, run_id, scenario_id, scenario_name...)
       ✓ evidence_traces      (8 columns: id, scenario_result_id, scenario_id, banking_request...)
     [SUCCESS] Neon PostgreSQL database is completely initialized and ready for production!
     ```

---

### Phase 2 — Cloudflare Turnstile Setup

1. **Access Cloudflare Dashboard:**
   - Log in at [https://dash.cloudflare.com/](https://dash.cloudflare.com/) and navigate to **Turnstile** from the sidebar.
2. **Add a Widget:**
   - **Widget Name:** `AgentShield Production`
   - **Domains:** Add:
     - `localhost`
     - `<your-project-name>.vercel.app` (e.g., `agentshield.vercel.app`)
     - `*.vercel.app`
   - **Widget Mode:** `Managed` (recommended) or `Non-interactive`.
3. **Retrieve Keys:**
   - **Site Key (Public):** e.g., `0x4AAAAAAA...`
   - **Secret Key (Confidential):** e.g., `0x4AAAAAAA...`

*(Note: For rapid staging verification without creating a Cloudflare account, the platform supports Cloudflare's official testing keys: Site Key `1x00000000000000000000AA`, Secret `1x0000000000000000000000000000000AA` with `CAPTCHA_MODE=test`)*.

---

### Phase 3 — Vercel Project Deployment

1. **Push Branch to GitHub:**
   - Ensure your code on branch `deploy/vercel-neon` is pushed to your GitHub repository (or merged into `main`).
2. **Import Repository in Vercel:**
   - In [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** -> **Project**.
   - Select your GitHub repository `AgentShield-Techthon-2026`.
3. **Configure Project Settings:**
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./` (Leave as root directory)
   - **Build Command:** Override or leave default (Vercel reads `vercel.json` and executes `cd frontend && npm install && npm run build`).
   - **Output Directory:** `frontend/dist`
4. **Configure Environment Variables:**
   Add all production environment variables (see Section 4 for complete matrix).
5. **Deploy:**
   - Click **Deploy**. Vercel will build the frontend assets, set up the Python ASGI runtime for `api/index.py`, and provision your production URL.

---

## 4. Complete Environment Variables Matrix

Enter these variables in **Vercel Project Settings -> Environment Variables**:

| Variable Name | Scope | Sensitive? | Production Value / Pattern | Description & Purpose |
|---|---|---|---|---|
| `DATABASE_URL` | Backend / All | **YES** | `postgresql://user:pass@ep-pooler.neon.tech/neondb?sslmode=require` | Pooled connection string to Neon PostgreSQL. |
| `AGENTSHIELD_LIVE_LLM` | Backend / All | No | `false` | Disables live external Ollama daemon; enforces fast, reproducible deterministic 5-stage evaluation. |
| `ENABLE_LIVE_LLM` | Backend / All | No | `false` | Alias flag ensuring zero LLM network dependencies. |
| `COOKIE_SECURE` | Backend / All | No | `true` | Enforces `Secure` flag on `session_id` cookie over HTTPS (auto-enabled when `VERCEL=1`). |
| `COOKIE_SAMESITE` | Backend / All | No | `lax` | Enforces SameSite=Lax cookie attribute preventing CSRF in cross-site navigations. |
| `CAPTCHA_MODE` | Backend / All | No | `production` (or `test`) | `production` requires real Cloudflare Turnstile token validation; `test` uses Cloudflare test keys. |
| `TURNSTILE_SECRET_KEY` | Backend / All | **YES** | Cloudflare Secret Key (`0x4AAA...` or `1x0000000000000000000000000000000AA`) | Private secret key used by backend to verify captcha tokens via Cloudflare `siteverify` API. |
| `TURNSTILE_SITE_KEY` | Backend / All | No | Cloudflare Site Key (`0x4AAA...` or `1x00000000000000000000AA`) | Backend fallback for captcha sitekey validation. |
| `VITE_TURNSTILE_SITE_KEY` | Frontend / Build | No | Cloudflare Site Key (`0x4AAA...` or `1x00000000000000000000AA`) | **Crucial:** Injected into client bundle for Turnstile widget rendering. |
| `VITE_API_BASE_URL` | Frontend / Build | No | `/api` | Relative proxy URL ensuring all frontend API calls route through the same origin. |
| `TURNSTILE_EXPECTED_HOSTNAMES` | Backend / All | No | `localhost,127.0.0.1,testserver,example.com,*.vercel.app` | Whitelist of hostnames accepted by Turnstile validator. |
| `DB_POOL_SIZE` | Backend / All | No | `5` | SQLAlchemy client pool size tuned for serverless connection conservation. |
| `DB_MAX_OVERFLOW` | Backend / All | No | `10` | Maximum temporary overflow connections for burst traffic. |
| `DB_POOL_RECYCLE` | Backend / All | No | `300` | Recycles idle connections every 5 minutes to prevent stale PgBouncer socket errors. |

---

## 5. Mentor Acceptance Test Protocol (Verification Runbook)

Mentors and evaluators can follow this step-by-step test plan to verify that AgentShield meets all security, functional, and architectural requirements:

```
+---------------------------------------------------------------------------------------+
| STEP 1: PUBLIC HOMEPAGE & PERFORMANCE                                                 |
| Action: Open https://<your-project>.vercel.app in a browser.                          |
| Expected Result:                                                                      |
|  - Page loads in < 3 seconds with responsive, modern Stitch-inspired styling.         |
|  - Navigation bar displays AgentShield branding, Live Evaluation button, and Login.   |
|  - Synthetic demo preview shows illustrative Candidate v1.1 vs v1.2 comparison.       |
|  - No sensitive backend evaluation data or private user history is exposed.          |
+---------------------------------------------------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| STEP 2: BOT PROTECTION & USER REGISTRATION                                           |
| Action: Click "Get Started" or "Sign Up" to open the registration view.               |
| Expected Result:                                                                      |
|  - Cloudflare Turnstile widget renders cleanly and performs bot challenge.             |
|  - Enter Full Name, Email ("mentor@visionet.com"), and a strong password.             |
|  - Submit registration: Password is cryptographically hashed with Argon2id.           |
|  - User is created in Neon DB and automatically logged into the authenticated shell.   |
+---------------------------------------------------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
| STEP 3: AUTHENTICATED SESSION & SECURITY HEADERS                                      |
| Action: Inspect browser cookies and network requests (F12 DevTools -> Application).   |
| Expected Result:                                                                      |
|  - Cookie 'session_id' is set with HttpOnly=True, Secure=True, and SameSite=Lax.      |
|  - Cookie 'csrftoken' is present and sent via 'X-CSRF-Token' header on mutations.     |
|  - User display name and avatar reflect registered account.                           |
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
| Action: Click "Log Out" in the user dropdown.                                         |
| Expected Result:                                                                      |
|  - Session record in Neon 'auth_sessions' is stamped with 'revoked_at'.               |
|  - 'session_id' cookie is cleared from the browser.                                  |
|  - Application redirects to unauthenticated landing page / auth modal.                |
|  - Direct API requests to /api/evaluations immediately receive 401 Unauthorized.      |
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

## 6. Serverless Caveats & Free-Tier Mitigations

1. **Neon Auto-Suspend (Cold Starts):**
   - *Behavior:* In Neon's free tier, compute endpoints auto-suspend after 5 minutes of inactivity to save compute quotas.
   - *Mitigation:* When a new request arrives, Neon resumes automatically in ~1–2 seconds. In `backend/app/database/session.py`, SQLAlchemy is configured with `pool_pre_ping=True` and connection retries, ensuring transient sleep states do not cause unhandled 500 exceptions.
2. **Vercel Serverless Function Cold Starts:**
   - *Behavior:* If no requests hit FastAPI for >15 minutes, Vercel spins down the container instance.
   - *Mitigation:* The Python ASGI entrypoint (`api/index.py`) initializes in ~1.2s on first boot. Subsequent requests complete in <50ms.
3. **Database Connection Pooling with PgBouncer:**
   - *Behavior:* Serverless function concurrency can quickly exhaust traditional PostgreSQL connection limits.
   - *Mitigation:* Neon provides built-in PgBouncer pooling via the `-pooler` connection string. We configure `DB_POOL_SIZE=5`, `DB_MAX_OVERFLOW=10`, and `DB_POOL_RECYCLE=300` to prevent socket starvation.
4. **Zero GPU Compute Cost:**
   - *Behavior:* Running a live 7B-parameter Ollama model on free serverless infrastructure is impossible due to memory and time limits.
   - *Mitigation:* The platform uses deterministic behavioral fixtures (`AGENTSHIELD_LIVE_LLM=false`) reproducing exact multi-agent banking transactions and API responses with 100% fidelity.

---

## 7. Rollback & Troubleshooting Runbook

### Rollback Strategy
1. **Instant Vercel Rollback:**
   - In the Vercel Dashboard, go to **Deployments**.
   - Find the previous passing deployment and click **... -> Promote to Production**. Rollback takes effect immediately across all edge nodes.
2. **Configuration Mode Switch (Services vs Classic Serverless):**
   - If Vercel Services is unavailable on your account tier, switch to classic serverless deployment:
     ```bash
     cp deploy/vercel-neon/vercel.serverless.json vercel.json
     git add vercel.json
     git commit -m "chore: switch to vercel serverless fallback configuration"
     git push
     ```

### Common Issues & Quick Remedies

| Issue / Error | Likely Root Cause | Exact Remedy |
|---|---|---|
| `500 Internal Server Error` on `/api/auth/register` | Database table missing or connection failed. | Run `python deploy/vercel-neon/init_neon_db.py "<DATABASE_URL>"` and verify all 5 tables are listed. |
| `400 CAPTCHA verification is required` | Cloudflare Turnstile token missing or secret key mismatch. | Ensure `VITE_TURNSTILE_SITE_KEY` is present during frontend build, and `TURNSTILE_SECRET_KEY` matches in Vercel backend environment variables. |
| `Turnstile error: hostname mismatch` | App domain is not whitelisted in Cloudflare Turnstile dashboard. | Add your Vercel domain (e.g. `*.vercel.app`) to the allowed domains list in Cloudflare Turnstile. |
| `CORS Error in Browser Console` | Request made to third-party domain instead of same-origin `/api`. | Verify `VITE_API_BASE_URL` is set to `/api`. Vercel automatically proxies `/api/*` to FastAPI without CORS headers needed. |
| `401 Unauthorized` on `/api/evaluations` | User is not logged in or cookie expired. | Complete login via `/auth` first to establish a valid `session_id` cookie. |
