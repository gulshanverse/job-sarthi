# Job Sarthi: Smart AI-Driven Job Portal

> **Your resume. Your skills. Your career path.**

Job Sarthi is a full-stack, profile-led career discovery platform. It helps candidates build a structured profile from their own preferences and resume content, browse verified stored opportunities, understand explainable job-fit signals, save roles, track application stages, and request career guidance grounded in their profile data and relevant job requirements.

## Included capabilities

The application provides a public landing experience and a protected candidate workspace backed by Manus OAuth. Candidate data includes reviewed contact information, role goals, locations, work preferences, skills, experience, education, projects, certifications, resumes, saved jobs, applications, recommendations, notifications, and career guidance. The workspace also provides command navigation with `⌘K` or `Ctrl+K`.

Resume uploads accept PDF and DOCX files up to **5 MB**. The client validates extension, browser-reported type, empty files, and measurable file-read progress; the server validates file signatures, size, hashes exact duplicates, and stores private file metadata through the object-storage integration. PDF documents are passed to the server-side model through a signed URL, while DOCX files are extracted on the server before structured profile extraction. In both cases, the extraction prompt requires the model to use only material present in the uploaded resume. Candidates can review and edit the resulting profile before confirming it.

The recommendation and career-guidance services operate only after profile confirmation. Job relevance is centrally calculated as a 100-point breakdown: skills (45), role direction (20), experience (15), education (10), location (5), and work preferences (5). The LLM can clarify those calculated facts but does not set or invent scores. Career skill-gap evidence reports frequencies from the selected recommended jobs and states that it is learning context, not a hiring guarantee.

## Candidate workspace and operations

Candidates can save roles, use a dedicated Saved Jobs view, and maintain a candidate-controlled lifecycle of **saved, applied, under review, interviewing, offer, selected,** or **rejected**. Opening an external application never marks a role applied; the candidate must explicitly confirm that separately.

The protected in-app notification inbox only records meaningful events, including profile confirmation, resume processing outcomes, high-relevance matches, and application milestones. Notification fingerprints prevent duplicate entries.

Admins have a role-gated `/admin/jobs` workflow for publishing verified real opportunities, pausing or closing them, and updating active candidate relevance records without showing any candidate-private data. The application does not ship synthetic job data as genuine opportunities.

## Weekly digest scheduling

Candidates can opt into a weekly **in-app** match digest from Profile. The schedule uses the platform Heartbeat system and runs Mondays at 09:00 UTC through `/api/scheduled/weekly-digest`. The callback is cron-authenticated, idempotent by task UID and week, and produces an in-app digest notification rather than an unconfigured email send.

> The site must be published before a candidate enables or tests this setting. The scheduler’s callback cannot reach the development sandbox.

## Local commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local development server. |
| `pnpm test` | Run the unit-test suite. |
| `pnpm check` | Type-check the client and server. |
| `pnpm build` | Create a production build. |
| `pnpm drizzle-kit generate` | Generate a migration after editing `drizzle/schema.ts`. |

## Data and security boundaries

All candidate procedures are protected server-side. Unauthenticated visitors can view only the public marketing page and are routed to sign-in when they enter a candidate workspace. Admin job operations use the server-side `adminProcedure`; candidate data is not exposed through the management view. Static private resumes are not served from a public project folder, and no secrets or `.env` files are committed.

## Current validation

The implemented project passes its matching, protected-route, and logout unit tests, as well as TypeScript compilation and the production build.
