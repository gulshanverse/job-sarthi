# Ingestion, Matching Notification, and Reminder Design

## Decisions

| Concern | Design decision | Reason |
| --- | --- | --- |
| Imported-job identity | `sourceProvider` plus `externalJobId` is unique when an external ID is available; a normalized fallback key is retained for otherwise-identical source records. | Re-syncs update the existing internal job and preserve saved jobs, applications, and recommendations. |
| Job state | `reviewStatus` records `pending_review`, `approved`, or `rejected`; existing `status` represents `active`, `paused`, `closed`, or `archived`. | Review and publication remain distinct, as a verified source record must not be published solely by import. |
| Feed access | Production uses an explicit provider availability check. A fixture provider exists solely for unit/integration tests and is never a candidate-facing production feed. | There is no configured permitted provider credential in the current project. |
| Import safety | Every attempt receives an ingestion-run row. The import handler validates, normalizes, deduplicates, and records counts without deleting or pausing existing jobs on failure. | Retries are observable and safe. |
| High-match alerts | The existing event-driven matching helper is retained. A shared high-match threshold is applied only after a candidate confirmed profile, preference, and fingerprint checks. | Notifications are grounded in the existing calculated score and stay duplicate-safe. |
| Candidate preferences | Notification-category booleans live with the existing candidate profile and are updated only by the profile owner. | This extends the current Profile workspace and avoids a disconnected settings model. |
| Notes | `application_notes` contains only candidate-owned plaintext notes, never HTML. | Notes need independent create, edit, delete, and ownership controls without losing the existing application record. |
| Reminders | `interview_reminders` contains the candidate-owned interview timestamp, reminder timestamp, status, and Heartbeat task UID. | The backend owns due-reminder delivery and retries are task-UID-bound and idempotent. |
| Timeline | `application_timeline_events` records new status changes and reminder actions when they happen. | The UI shows stored facts only and does not invent application history. |

## State transitions

```text
provider import → pending review → approved → active → archived
                                  ↘ rejected

candidate reminder: scheduled → sent
                       ↘ cancelled
```

An administrator can publish only an approved job with valid candidate-facing content and an external application URL. Publishing invokes the existing new-job recommendation helper. That helper writes/upserts calculated recommendations and creates a high-match in-app notification only when the candidate has enabled that notification category and the calculated score reaches the shared threshold.

## API and scheduling boundary

The application uses tRPC rather than parallel REST endpoints. The extension therefore adds procedures to the existing `adminJobs`, `notifications`, and application namespaces. Every administrative procedure uses `adminProcedure`; every candidate procedure resolves its resource through the authenticated `userId`.

Import is synchronous only for the bounded administrator-requested provider payload. Scheduled feed synchronization is intentionally not activated without a connected permitted provider and a freshly deployed callback. Reminders use a separate Heartbeat callback at `/api/scheduled/interview-reminder`, authenticate cron identity, resolve the reminder by stored task UID, create the deduplicated in-app notification, and atomically mark the reminder sent. All timestamps are UTC in persistence and localized only for display.
