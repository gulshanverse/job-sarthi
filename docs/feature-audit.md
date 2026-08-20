# Job Sarthi Production Audit

**Audit basis:** source-code inspection of the React client, tRPC routers, Drizzle schema, storage-backed resume workflow, matching service, server bootstrap, package scripts, and current documentation.

## Verified implementation status

| Area | Status | Evidence and observed gap |
| --- | --- | --- |
| Public landing page | Complete | A branded, responsive landing page contains value proposition, dual calls to action, workflow explanation, feature sections, and footer. It does not present fabricated testimonials, ratings, or employer logos. |
| Authentication and access control | Complete within the platform model | Manus OAuth supplies identity and server-side protected procedures guard candidate APIs. This application deliberately does **not** implement password registration, password validation, or password hashing because credentials are managed by the OAuth provider. |
| Candidate onboarding | Partial | Role goals, locations, work mode, employment preference, experience level, skills, experience, education, resume upload, and confirmation are persisted. Profile completion and richer contact/project/certification review are not yet modeled. |
| Resume upload and storage | Partial | PDF and DOCX uploads are size-limited, stored through the private storage integration, and processed server-side. The user experience lacks extension/empty-file/duplicate checks, a persisted retry flow, and clearer processing outcomes. |
| Resume extraction | Partial | Server-side LLM extraction returns headline, target roles, skills, experience, and education without intentionally inventing data. Personal-contact, projects, certifications, explicit section parsing, and central skill normalization are absent. |
| Profile editing | Partial | Candidates can review and edit core profile, preferences, skills, experience, and education. Projects, certifications, contact details, and completion guidance are missing. |
| Job system and search | Partial | Stored jobs support title, company, location, work mode, type, level, salary, description, requirements, nice-to-have skills, and application URLs. Current filtering is server-side but materializes all jobs before filtering; category, skills, salary, and sort controls are incomplete. |
| Job detail and external apply | Partial | Detail, save, tracker, and external application actions exist. Applying externally is not falsely marked as submitted, but the post-application lifecycle needs clearer labels and status help. |
| Recommendations | Partial | Recommendations use the confirmed profile and stored jobs; matching and missing skills are shown. The current fallback scoring does not provide the required centralized per-factor weight breakdown, and recommendation filtering/grouping is limited. |
| Saved jobs and applications | Partial | Unique database constraints prevent duplicate saved jobs and applications. The tracker supports saved, applied, interviewing, offer, and rejected; richer lifecycle language, synchronization feedback, and notifications are missing. |
| Dashboard and insights | Partial | The dashboard has a protected next-action card, basic profile signal, and recommendation preview. Its profile-completion calculation and next-action rules are intentionally lightweight; it lacks applications, notification, and data-driven skill-frequency summaries. |
| Notifications and automation | Missing | No notification table, event service, scheduled callback, digest architecture, or mounted `/api/scheduled/*` handler exists. |
| Admin job management | Missing | The current `admin` role exists but has no admin-only job ingestion or management surface. |
| Accessibility and responsive UX | Partial | The interface has semantic controls, labels, protected states, loading/empty/error patterns, and visual checks at several sizes. A full keyboard, focus, command-palette, and broad breakpoint audit is still required. |
| Security and configuration | Partial | Secrets are not committed, populated environment files are ignored, APIs use validation and protected procedures, and resumes are stored privately. Rate limiting, security headers, and a credential-free `.env.example` cannot be added directly under this managed environment; safe environment guidance exists in `docs/environment.md`. |
| Tests and verification | Partial | Existing tests cover logout, protected-route denial, input validation, and rule-based matching. Coverage needs expansion across resume validation, profile persistence, scoring dimensions, filters, saves, applications, notifications, and automation. |

## Priority completion sequence

1. Make resume-derived profile data richer, normalized, reviewable, and visibly complete.
2. Replace the coarse fallback match score with a centralized, explainable weighted relevance model and use it across recommendations.
3. Complete truthful job actions, application lifecycle, dashboard next steps, and relevant skill-gap insight.
4. Add private in-app notifications and event-driven refreshes before introducing recurring digest delivery.
5. Add a minimal protected job-ingestion route for admins, then validate the full candidate flow with actual stored jobs rather than fabricated UI data.
6. Expand test coverage, keyboard/responsive review, documentation, and final release verification.

## Architectural boundaries

The application uses **React, Express, tRPC, Drizzle, MySQL-compatible storage, Manus OAuth, private object storage, and a server-side LLM integration**. The audit and follow-up work retain this architecture. Password-based login, MongoDB-specific controls, unverified email delivery, fake job data, fake job applications, and fabricated user-generated content are outside the shipped scope unless a supported integration and real data source are configured.
