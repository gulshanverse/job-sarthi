# Job Sarthi Feature Extension Audit

## Existing architecture

Job Sarthi is a React and tRPC application backed by Drizzle and MySQL/TiDB. Candidate-facing routes use protected procedures, while administrator job operations use `adminProcedure`. The existing database already contains candidate profiles, jobs, saved jobs, applications, recommendations, notifications, and a Heartbeat-backed weekly digest configuration. The product has a consistent protected-shell design system, a candidate notification menu, explainable matching, and an administrator job-management route.

| Requested area | Existing capability | Integration decision |
| --- | --- | --- |
| Administrator job management | Manual create, list, and active/paused/closed status updates with server-side admin authorization | Extend the existing `adminJobs` router and `/admin/jobs` page rather than create a separate administrative application. |
| Job matching and alerts | Newly active jobs are evaluated against confirmed profiles; recommendations are written at 60+ and deduplicated high-match notifications are written at 80+ | Preserve the event-driven helper, introduce one shared configurable threshold, and apply candidate notification preferences before notification creation. |
| Notification center | Private in-app list, unread count, mark-read, dismiss, and fingerprint deduplication | Add mark-all-read, a full notifications route, preference persistence, and entity references while retaining the existing menu and fingerprint strategy. |
| Application tracking | One candidate-owned application per job, lifecycle status, and an unused legacy notes field | Retain existing applications and add candidate-owned note, reminder, and timeline tables rather than overload the legacy field. |
| Scheduled work | Heartbeat weekly digest follows deployment-gated, cron-authenticated, idempotent callbacks | Reuse this pattern for a per-reminder protected callback. No in-process timer or frontend-only reminder mechanism will be added. |
| Job feed | No connected verified feed provider; the current connector inventory includes a disabled Dice job-search integration and no verified feed credential configured for this project | Build a provider abstraction with test-only fixtures and an explicitly unconfigured provider state. Do not claim a live external feed or manufacture production job listings. |

## Lifecycle and security boundaries

Imported jobs will remain in a reviewable state until an administrator explicitly publishes them. Source provider, external identifier, source URL, import and sync timestamps, and review metadata will be retained on the existing job record. The preferred duplicate identity is the provider and external identifier pair; a normalized fallback key will be used only when an external identifier is absent. Existing candidate save and application relationships remain attached to the same internal job identifier when a provider job is re-synchronized.

Candidate notes, reminders, and notifications will be queried and mutated only through candidate-owned resource lookups. Administrative APIs will remain server-side role-gated. Feed credentials, if configured in the future, will be held only in project secrets or a connector and never exposed to candidate routes, log output, source code, or commits.

## Automation decision

The job import is administrator-triggered by default. The provider layer will be idempotent and safe to invoke repeatedly, but scheduled synchronization will remain unconfigured until a real permitted provider is connected and the updated site is published. Interview reminders will use a persisted, task-UID-owned Heartbeat callback after deployment; no `setTimeout`, `setInterval`, `node-cron`, frontend timer, or polling loop will be used.

> The existing weekly digest can be enabled only by a confirmed candidate from Profile after the currently published site includes the relevant callback. The same deployment gate applies to new reminder schedules.
