# Independent Job Sarthi Authentication Design

## Authentication model

Job Sarthi will authenticate users with **email and password**. The database remains the single source of truth. Existing numeric user IDs and all candidate-owned foreign keys are preserved.

| Capability | Design |
| --- | --- |
| Password storage | Argon2id password hashes only. Plaintext passwords never enter database writes, logs, or tokens. |
| Session | A 256-bit opaque random token is sent only in a secure HttpOnly cookie. The database stores a SHA-256 token hash, user ID, expiration, rotation parent, creation, and revocation timestamps. |
| Session rotation | Successful credential login creates a new session. Logout revokes only the current session. Password change and reset revoke all existing sessions before creating a fresh one. |
| Legacy OAuth user | The existing `openId` stays nullable and unique for history. The existing user ID and related data are kept. An OAuth-created user has `passwordHash = NULL` and is guided through one-time independent password setup. |
| Registration | A unique normalized email, name, password confirmation, and terms acceptance create a Job Sarthi user and cookie session. |
| Reset token | A cryptographically random token is emailed only when an outbound service is configured. The database stores a hash, expiration, and `usedAt`; the public response is generic. In development, token delivery is explicitly unavailable rather than exposed. |
| Rate limits | An in-memory fixed-window guard protects credential, registration, password-setup, and password-reset endpoints. It is intentionally bounded and returns `TOO_MANY_REQUESTS` rather than locking a user permanently. |
| Google | No Google provider is added because no permitted credentials are configured. The UI clearly reports that Google sign-in is unavailable while password authentication remains functional. |
| Scheduled jobs | Cron callbacks remain independently authenticated by the platform scheduler. They never use a Job Sarthi candidate session. |

## Cookie policy

The authentication cookie is named `job_sarthi_session`. It uses `HttpOnly`, `Path=/`, `SameSite=Lax`, and `Secure` when the request is HTTPS or behind an HTTPS proxy. It is short lived (seven days) and is never mirrored to localStorage, sessionStorage, an Authorization header, or frontend runtime state.

## Database migration

The migration is additive. It makes `users.openId` nullable, adds independent credential metadata, and creates `auth_sessions`, `password_reset_tokens`, and `auth_rate_limit_events`. No existing `users.id` values or resource relationships are changed. The migration adds a unique email index after normalizing existing non-empty values; the current audited database has one email-backed legacy user.

## Endpoints and tRPC procedures

Credential actions are exposed through the existing `auth` router: `register`, `login`, `logout`, `me`, `setupLegacyPassword`, `changePassword`, `forgotPassword`, `resetPassword`, `sessions`, and `revokeOtherSessions`. The client uses only tRPC and `credentials: include`. Public pages are `/login`, `/register`, `/forgot-password`, and `/reset-password`; all candidate and administrator routes continue to depend on the same central `protectedProcedure` and `adminProcedure` checks.

> For external deployment, configure `DATABASE_URL` and a strong `JWT_SECRET` (used as an application secret, not as a browser token). Google credentials are not required. If an email sender is later connected, the reset-token delivery adapter can be enabled without modifying the session or user model.
