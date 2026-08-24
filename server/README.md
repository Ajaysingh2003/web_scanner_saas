# AetherScan backend

Async FastAPI service for passive website health and security scans. Dependencies are pinned by range in `requirements.txt`; `pyproject.toml` is retained for tooling and package metadata.

## Run locally

```bash
docker compose up --build
```

Compose uses the service hostnames `db` and `redis` by default. To override settings, copy `.env.example` to `.env` before starting.

The API is available at `http://localhost:8000`, with OpenAPI documentation at `/docs`.

Create a scan:

```bash
curl -X POST http://localhost:8000/api/v1/scans \
  -H 'x-api-key: replace-with-your-key' \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}'
```

Run a read-only robots/site crawl with `POST /api/scans/robots-crawl` or
`POST /api/v1/scans/robots-crawl` using `{"url":"https://example.com"}`.
The equivalent `GET` endpoint accepts the URL as a query parameter and
reruns the same idempotent check: `GET /api/scans/robots-crawl?url=...`.
It checks robots.txt, uses sitemap URLs when available, otherwise performs a
same-domain depth-two crawl capped at 50 HTML pages with eight concurrent
fetches and a ten-second per-page timeout.

API-key authentication is enabled by default. Set `API_KEYS=key-one,key-two`
to long random values. Keys are accepted through `x-api-key` or
`Authorization: Bearer <key>`. The default Redis-backed limit is 60 API
requests per IP or API key every 60 seconds; configure it with
`RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS`, and `RATE_LIMIT_ENABLED`.
Each key has an isolated scan list and cannot read another key's scans.
Set `AUTH_JWT_SECRET` to a random value of at least 32 characters; the API
refuses to start without it.

## User authentication

Run `alembic upgrade head` before using the account routes. Email/password
accounts require a 12-character password and email verification by default.
For local API testing only, set `AUTH_EMAIL_VERIFICATION_REQUIRED=false` to
mark newly created users verified immediately. Configure
`SMTP_*` to deliver verification links; Google and GitHub OAuth are enabled
when their client ID, secret, and callback settings are provided.

- `POST /api/v1/auth/register`, `POST /api/v1/auth/verify-email`, `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`
- `GET /api/v1/auth/google`, `GET /api/v1/auth/google/callback`
- `GET /api/v1/auth/github`, `GET /api/v1/auth/github/callback`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/api-keys`, `GET /api/v1/auth/api-keys`, `DELETE /api/v1/auth/api-keys/{key_id}`

API secrets are shown only once, stored as hashes, revocable, and tied to the
owning user. Access tokens expire quickly and refresh tokens rotate on use.
The same routes are available under `/api` without the `/v1` prefix.

## Billing and plans

Stripe-backed billing is available through the API:

- `GET /api/v1/billing/plans`
- `GET /api/v1/billing/account`
- `POST /api/v1/billing/checkout` with `{"plan":"pro","interval":"monthly"}`
- `POST /api/v1/billing/portal`
- `POST /api/v1/billing/webhook` for Stripe events

Checkout uses Stripe-hosted subscription pages. Subscription state is changed
only from verified, idempotently processed Stripe webhooks; the frontend is
never treated as proof of payment. Project creation, API-key creation, direct
scans, active security scans, extended scans, and scheduled scans enforce the
current plan limits in the API. Starter is the safe default until a verified
subscription webhook activates another plan. Add the blank `STRIPE_*` values
from `.env.example` after creating Stripe prices and a webhook endpoint.

Uptime monitoring and report delivery are API-first:

- `POST/GET /api/v1/projects/{project_id}/uptime`
- `GET /api/v1/projects/{project_id}/uptime/checks`
- `GET /api/v1/projects/{project_id}/uptime/incidents`
- `GET /api/v1/public/status/{status_token}`
- `GET /api/v1/scans/{scan_id}/diff`
- `GET /api/v1/scans/projects/{project_id}/scan-history`
- `GET /api/v1/scans/{scan_id}/export?format=markdown|pdf`
- `POST /api/v1/scans/{scan_id}/share`
- `DELETE /api/v1/scans/{scan_id}/share/{link_id}`
- `GET /api/v1/public/reports/{share_token}?format=json|markdown|pdf`

The worker performs read-only uptime checks on the configured interval, stores
response-time samples, opens/resolves incidents on state transitions, and
sends signed `uptime.down` and `uptime.recovered` webhooks. Scan comparisons
persist new, fixed, unchanged, score delta, and regression data in scan
metadata; a regression is sent as `scan.regression` when the project has an
uptime alert webhook. Public report links are random, hashed at rest, expiring,
and revocable. PDF generation uses the backend report renderer; white-label
branding is restricted to Max-plan users.

## Projects

Projects let one user manage production, staging, and preview URLs. Use the
following routes with a user access token:

- `POST /api/v1/projects` and `GET /api/v1/projects`
- `GET/PATCH/DELETE /api/v1/projects/{project_id}`
- `POST/GET /api/v1/projects/{project_id}/api-keys`
- `DELETE /api/v1/projects/{project_id}/api-keys/{key_id}`
- `POST/PUT/GET/DELETE /api/v1/projects/{project_id}/supabase`
- `POST /api/v1/projects/{project_id}/security-scans/sql-injection`
- `POST /api/v1/projects/{project_id}/security-scans/xss`
- `POST /api/v1/projects/{project_id}/security-scans/authentication`
- `GET/POST /api/v1/otp-sessions/{session_id}` and `/submit`

Extended checks are separate URL-triggered jobs at
`POST /api/v1/scans/security/{scan_type}`. Supported scan types are
`github_sast`, `dependencies`, `firebase`, `tenant_isolation`,
`audit_logging`, `ddos_resilience`, `mobile_api`, and `hosting_security`.
Every request requires `url` and `authorized: true`. Repository scans also
require `repository_url` and optionally an encrypted GitHub token; tenant
isolation additionally requires explicitly configured authorized test actors.
The DDoS check is passive and never floods a target. URL-only results clearly
mark integration-required checks as incomplete instead of claiming proof.

Repository scans use bounded GitHub tree access and query OSV for exact
versions from supported package manifests/lockfiles. The SAST pass reports
potential same-file source-to-sink flows and is intentionally marked for code
review rather than presented as exploit proof. Tenant isolation requires two
distinct authorized actors plus paths owned by actor A; the worker uses
separate browser contexts and reports a potential cross-tenant read only when
actor A succeeds and actor B also receives a successful non-empty response.
Firebase checks can inspect Realtime Database, Firestore, Storage, and Auth
signals when the project URL/API credentials are supplied. Provider checks use
least-purpose Vercel, Netlify, or Cloudflare API calls when their scoped token
and resource ID are provided; tokens are encrypted and never returned.

Create a project-backed scan with `{"project_id":"...","environment":"staging"}`
or keep using a direct `url`. Project API keys are restricted to their project.
Schedules support intervals from 60 minutes to 30 days and run through the
ARQ worker; scheduled scans use the selected environment URL and persist the
project settings used for that run.

Connect Supabase with `project_url`, `anon_key`, and an optional
`service_role_key`. Both keys are encrypted at rest and never returned by the
API. A project can have one connection. Connected project scans add the
`supabase_security` configuration scanner; scans without a connection do not
run it. The scanner checks frontend bundles for leaked credentials, probes
effective anonymous table access, and checks accessible Auth and Storage
signals. Direct RLS/policy metadata is not available from project URL and
client keys alone, so findings describe effective access and should be
confirmed in Supabase SQL/dashboard.

SQL injection testing is intentionally separate from normal scans. Call the
security-test endpoint with `authorized: true` to confirm you control the
target. It runs only `sqli_security`, never the normal scanner set:

```json
{
  "environment": "staging",
  "authorized": true,
  "include_post_requests": false,
  "include_time_based": false,
  "max_pages": 25
}
```

The scanner uses bounded, non-destructive probes and reports redacted
parameter evidence. POST and time-based testing are opt-in because they can
affect application behavior and response latency. It does not extract data or
modify database records.

Active XSS testing is also separate from normal scans:

```json
{
  "environment": "staging",
  "authorized": true,
  "include_post_requests": false,
  "max_pages": 50
}
```

It runs Playwright only in the ARQ worker, blocks third-party browser requests,
limits page/form coverage, and reports confirmed browser execution separately
from reflection-only signals. It also tests URL parameters and URL fragments
on every discovered same-origin page. Install the Chromium browser in worker images
before enabling this endpoint.

Authentication-flow testing is also opt-in and queued through the worker:
`POST /api/v1/projects/{project_id}/security-scans/authentication`. The test
account supports `email`, `phone`, `username`, or a generic `identifier`, plus
password. Flow steps reference values as `test_account.email`,
`test_account.phone`, `test_account.username`, or `test_account.password`, so
email-only assumptions are not required. The endpoint requires an authorized
staging/preview flow and a client-provided webhook secret. Events are signed
with `X-AetherScan-Signature`; OTP sessions expire after three minutes and are
submitted through `/api/v1/otp-sessions/{id}/submit`. Credentials and OTPs are
encrypted temporarily and never returned in scan metadata or webhooks.

To test brute-force protection, explicitly enable the bounded rate-limit probe
inside the same request. It submits 3–8 invalid attempts using a disposable
test account, waits 250–2,000 ms between attempts, and stops immediately on a
429, `Retry-After`, exhausted rate-limit header, CAPTCHA, challenge, or
lockout signal. It never uses the real password, stores or returns response
bodies, or runs during a normal scan:

```json
{
  "environment": "staging",
  "authorized": true,
  "webhook_url": "https://scanner.example/webhooks/aetherscan",
  "webhook_secret": "a-random-secret-at-least-32-characters-long",
  "test_account": {
    "email": "scanner-test@example.com",
    "password": "correct-password-kept-encrypted"
  },
  "rate_limit_probe": {
    "enabled": true,
    "start_url": "/login",
    "identifier_selector": "input[name=email]",
    "identifier_from": "test_account.email",
    "password_selector": "input[name=password]",
    "submit_selector": "button[type=submit]",
    "wrong_password": "different-invalid-password-123",
    "attempts": 5,
    "delay_ms": 500,
    "endpoint_path": "/api/auth/login"
  },
  "flow": {
    "type": "login",
    "steps": [
      {"action": "open_url", "url": "/login"}
    ]
  }
}
```

If no observable protection appears after the bounded probe, the result is a
high-severity potential finding with redacted status codes and response paths.
This is a controlled signal, not proof that every authentication path is
unprotected; verify the server's per-account, per-IP, device, and distributed
rate-limit configuration before remediation.

Project responses use a consistent `success`, `message`, `data`, and `meta`
envelope. `meta` includes a request ID, timestamp, and list total where
applicable. The same request ID is returned in the `X-Request-ID` header.

Scanners are passive, timeout-protected, and registered in `app/scanners/registry.py`. The current checks include strict HSTS enforcement, SPF/DMARC/DKIM email authentication, third-party script SRI, broad mixed-content detection, and a separate `compliance_check` for legal-policy, cookie-consent, and GDPR indicators. Compliance findings are website signals, not legal certification; have counsel review the final policies.

URL-only coverage also includes exposed artifact and secret discovery (public
`.env`, repository/config files, backups, source maps, and JavaScript bundles),
browser storage inspection for token-like values, safe input-validation and
query-reflection signals, and domain watchtower checks for dangling hosted
service records. These checks are read-only; the input probe uses a harmless
marker and never submits form data. Repeated signals are fingerprinted and
merged while retaining affected page or path evidence.

## Phase 2 progress

`GET /api/v1/scans/{scan_id}` includes durable scanner progress with total, completed, failed, and current scanner counts. Clients that need push updates can connect to `ws://localhost:8000/api/v1/scans/{scan_id}/events`.

Phase 2 adds passive XSS-sink detection, open-redirect checks, durable progress, scanner failure accounting, and category-aware scoring.

Each scan response also includes `report`, with an executive summary, risk level,
severity counts, category scores, prioritized findings, and next steps. The
underlying `metadata.scoring` remains available. The stricter benchmark uses
critical 40, high 25, medium 14, low 6, and info 1 point times confidence;
category scores are averaged so multiple findings cannot incorrectly collapse
the whole report to zero, while each failed scanner costs 10 coverage points.
`scanner_runs` shows whether
each scanner completed with zero findings or failed with an error.
Completed scans are recalculated with the current benchmark when read, so
older records that were previously stored as `0` recover without a migration.
Every finding also includes a provider-neutral `remediation_prompt` that can
be pasted into any AI coding agent. It includes the finding, evidence,
remediation, and safe validation requirements.
