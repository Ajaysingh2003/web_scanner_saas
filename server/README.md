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

API-key authentication is enabled by default. Set `API_KEYS=key-one,key-two`
to long random values. Keys are accepted through `x-api-key` or
`Authorization: Bearer <key>`. The default Redis-backed limit is 60 API
requests per IP or API key every 60 seconds; configure it with
`RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS`, and `RATE_LIMIT_ENABLED`.
Each key has an isolated scan list and cannot read another key's scans.

Scanners are passive, timeout-protected, and registered in `app/scanners/registry.py`. Add a `BaseScanner` implementation there to make a new scanner part of every scan.

## Phase 2 progress

`GET /api/v1/scans/{scan_id}` includes durable scanner progress with total, completed, failed, and current scanner counts. Clients that need push updates can connect to `ws://localhost:8000/api/v1/scans/{scan_id}/events`.

Phase 2 adds passive XSS-sink detection, open-redirect checks, durable progress, scanner failure accounting, and category-aware scoring.

Each scan response also includes `report`, with an executive summary, risk level,
severity counts, category scores, prioritized findings, and next steps. The
underlying `metadata.scoring` remains available. The stricter benchmark uses
critical 40, high 25, medium 14, low 6, and info 1 point times confidence;
the overall score is capped by both the global score and category mean, and
each failed scanner costs 10 coverage points. `scanner_runs` shows whether
each scanner completed with zero findings or failed with an error.
