# Job Sarthi

> **Your resume. Your skills. Your career path.**

Job Sarthi is a full-stack, AI-powered, profile-led career discovery platform. It helps candidates build a structured profile from their own preferences and resume content, browse stored opportunities, understand explainable job-fit signals, save roles, track application stages, and request career guidance grounded in their profile data and relevant job requirements.

## Included capabilities

The application provides a public landing experience and a protected candidate workspace backed by Manus OAuth. Candidate data includes role goals, locations, work preferences, skills, experience, education, resumes, saved jobs, applications, recommendations, and career guidance.

Resume uploads accept PDF and DOCX files up to 7 MB. Files are stored through the secure object-storage integration; only storage metadata is persisted in the database. PDF documents are passed to the server-side model through a signed URL, while DOCX files are extracted on the server before structured profile extraction. In both cases, the extraction prompt requires the model to use only material present in the uploaded resume. Candidates can review and edit the resulting profile before confirming it.

The recommendation and career-guidance services operate only after profile confirmation. Their prompts receive the candidate’s stored profile and the supplied job records, return structured outputs, and include an explainable rule-based fallback if an LLM call cannot be completed.

## Local commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local development server. |
| `pnpm test` | Run the unit-test suite. |
| `pnpm check` | Type-check the client and server. |
| `pnpm build` | Create a production build. |
| `pnpm drizzle-kit generate` | Generate a migration after editing `drizzle/schema.ts`. |

## Data and security boundaries

All candidate procedures are protected server-side. Unauthenticated visitors can view only the public marketing page and are routed to sign-in when they enter a candidate workspace. The app currently expects job records to be created through the project database or a future admin ingestion workflow; it does not present synthetic job listings as real opportunities.

## Current validation

The implemented project passes its matching, protected-route, and logout unit tests, as well as TypeScript compilation and the production build.
