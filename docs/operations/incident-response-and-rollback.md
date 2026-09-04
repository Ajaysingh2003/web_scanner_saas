# Scanlyst incident response and rollback

Owner: Engineering on-call  
Applies to: web application, API, scanner workers, PostgreSQL, Redis, email, Dodo Payments, and connected providers  
Review cadence: quarterly and after every severity 1 or severity 2 incident

## Severity and response targets

| Severity | Examples | Acknowledge | Update cadence |
| --- | --- | ---: | ---: |
| SEV-1 | Account takeover, secret exposure, destructive scan behavior, payment corruption, broad outage | 15 minutes | Every 30 minutes |
| SEV-2 | Major feature unavailable, delayed scans, incorrect entitlements, partial data exposure | 30 minutes | Every 60 minutes |
| SEV-3 | Degraded performance or limited customer impact with a workaround | 1 business day | As material changes occur |

## First 15 minutes

1. Open an incident record with UTC start time, reporter, affected environment, current release, and incident commander.
2. Preserve evidence: request IDs, deployment logs, worker logs, Dodo event IDs, database timestamps, and relevant configuration changes. Never paste raw secrets into the incident record.
3. Establish scope: affected users, projects, scans, regions, payment events, and whether data confidentiality or integrity is involved.
4. Stop the spread using the least destructive control available:
   - pause scanner workers for unsafe or runaway scans;
   - disable the affected integration or API key;
   - pause checkout while preserving signed Dodo webhook receipt;
   - revoke affected refresh sessions or credentials;
   - place the API behind a maintenance response only if narrower containment is insufficient.
5. Assign one person to remediation and one to communication. The incident commander owns decisions and the timeline.

## Investigation and recovery

1. Compare the failing release with the last known-good release and inspect database migrations separately from application code.
2. Reproduce in staging with sanitized data. Do not run active probes against customer systems while diagnosing.
3. Confirm database, Redis, worker queue, SMTP, and Dodo health before restoring traffic.
4. Validate the critical journey after remediation: login, project isolation, scan enqueue and completion, report export, checkout, signed webhook processing, entitlement update, and customer portal.
5. Monitor error rate, queue age, payment webhook failures, and scan failures for at least 30 minutes after recovery.

## Application rollback

1. Record the current release identifier and the last known-good immutable image or commit.
2. Stop new deployments and pause background workers if their payload or database expectations changed.
3. Deploy the last known-good web, API, and worker artifacts together when they share an API contract.
4. Do not automatically downgrade the database. First confirm the previous application is compatible with the current schema.
5. Resume workers gradually, verify one controlled scan, then restore normal concurrency.

## Database rollback

Database rollback is a last resort because schema downgrades can destroy data.

1. Take and verify a fresh snapshot before any downgrade or restore.
2. Prefer a forward-fix migration when data is intact and the schema can remain backward compatible.
3. If restoration is required, stop all writers, record the exact recovery point, restore into an isolated database, and validate row counts and critical relationships before switching traffic.
4. Reconcile Dodo webhook events received after the recovery point using their immutable webhook IDs. Never replay an event without idempotency protection.
5. Document any lost time window and affected accounts.

## Security and privacy incidents

1. Rotate exposed credentials in this order: signing/encryption keys, payment and OAuth secrets, SMTP credentials, provider tokens, then user/API sessions.
2. Determine whether scan evidence, credentials, personal data, or payment identifiers were accessed.
3. Preserve an audit timeline and obtain legal guidance for customer or regulator notification deadlines.
4. Do not delete evidence during investigation. Temporarily suspend retention cleanup for the scoped records under a documented legal hold.

## Communication templates

Initial: “We are investigating an issue affecting [feature]. Impact began at [UTC time]. We have [contained/not yet contained] the issue and will provide another update by [UTC time].”

Resolved: “The issue affecting [feature] was resolved at [UTC time]. Customer impact was [summary]. We are monitoring recovery and will publish follow-up actions after review.”

## Closure

Within five business days, publish an internal post-incident review covering impact, timeline, root cause, contributing factors, detection gap, corrective actions, owners, and due dates. Test the rollback procedure quarterly and record the restore duration and verified recovery point.
