# Environment Configuration

Job Sarthi uses its own email/password authentication, database-backed sessions, storage, and LLM configuration at runtime. No populated environment file is committed to this repository.

The application references server-side `DATABASE_URL`, `JWT_SECRET`, `JOB_SCHEDULER_SECRET`, and any configured LLM or storage credentials only through backend environment helpers. Local values should be configured through secure deployment settings rather than committed to source control.

For production and development, do not add real API keys, database URLs, session secrets, or OAuth credentials to `.env` files in Git. The repository ignore rules already exclude populated `.env` files.

## Independent scheduler and weekly digest

The weekly digest is invoked through the application-owned machine-authenticated endpoints below. They accept only `Authorization: Bearer <JOB_SCHEDULER_SECRET>`. Candidate cookies, administrator sessions, OAuth tokens, and browser requests cannot authorize these endpoints.

| Internal endpoint | Schedule | Purpose |
| --- | --- | --- |
| `POST /api/internal/scheduler/weekly-digest` | Monday 09:00 UTC | Processes a bounded batch of confirmed candidates with `weeklyDigestEnabled = true`. |
| `POST /api/internal/scheduler/interview-reminders` | Every six hours | Processes due interview reminders. |
| `POST /api/internal/scheduler/health` | On demand | Confirms machine authentication without returning the secret. |

No in-process timer, `setInterval`, or `node-cron` is used because autoscaled deployments cannot guarantee that those timers survive. The repository includes two optional external scheduler workflows under `.github/workflows/`. To enable them, configure these **repository secrets** after deployment:

| Secret | Required value |
| --- | --- |
| `JOB_SCHEDULER_URL` | The production Job Sarthi base URL, without a trailing slash. |
| `JOB_SCHEDULER_SECRET` | The same high-entropy server-side `JOB_SCHEDULER_SECRET` configured for the deployed application. |

The digest uses UTC as the documented default because candidate timezones are not stored yet. Its durable delivery record is keyed by Job Sarthi user ID plus ISO week. The in-app notification is always the real delivery fallback. Email delivery is recorded as `pending_provider` until a real email sender is configured; no email is fabricated.
