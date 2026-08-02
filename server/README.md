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

Project responses use a consistent `success`, `message`, `data`, and `meta`
envelope. `meta` includes a request ID, timestamp, and list total where
applicable. The same request ID is returned in the `X-Request-ID` header.

Scanners are passive, timeout-protected, and registered in `app/scanners/registry.py`. The current checks include strict HSTS enforcement, SPF/DMARC/DKIM email authentication, third-party script SRI, broad mixed-content detection, and a separate `compliance_check` for legal-policy, cookie-consent, and GDPR indicators. Compliance findings are website signals, not legal certification; have counsel review the final policies.

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
