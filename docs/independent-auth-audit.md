# Independent Authentication Migration Audit

## Current authentication dependency

Job Sarthi currently resolves identity through the platform OAuth SDK. The OAuth callback exchanges a platform authorization code, upserts a user by `openId`, signs a long-lived JWT cookie, and redirects to the application. Request context delegates every user resolution to that SDK. The client starts the same OAuth flow for unauthenticated requests and also forwards a platform-preview token from browser storage.

| Layer | Current dependency | Migration action |
| --- | --- | --- |
| User identity | `users.openId`, OAuth login method, automatic platform-user synchronization | Preserve the numeric `users.id`; retain `openId` as a nullable legacy identity only; add unique email, password-hash, and credential-state fields. |
| Session | JWT holding OAuth-flavored `openId`, cookie named `app_session_id` | Replace with server-stored, rotating opaque session IDs in an HttpOnly cookie. |
| Request context | `sdk.authenticateRequest()` | Resolve the session cookie, session record, and existing user entirely from the Job Sarthi database. |
| Login callback | `/api/oauth/callback` | Remove the callback and register independent credential and password-reset routes. |
| Client auth | `startLogin`, platform nonce cookie, preview bearer fallback, browser storage mirror | Replace with `/login` routing and cookie-only authenticated tRPC requests. |
| Authorization | `protectedProcedure` and `adminProcedure` use `ctx.user` and role | Keep unchanged after the new context resolves the same existing `User` record. |
| Scheduled callbacks | Current callbacks use a platform cron identity | Keep scheduler authentication separate from user authentication. The scheduler never needs a candidate login session. |

## Production preservation baseline

At audit time, the database contains one legacy OAuth-created administrator record with an email and no linked candidate profile, applications, saved jobs, or notifications. The migration will not delete this record, change its numeric ID, or alter relationship foreign keys. It will mark the record as requiring an independent password setup before regular Job Sarthi login.

## Non-negotiable security decisions

Passwords will be hashed with Argon2id. Sessions and reset tokens will be random, opaque values; only SHA-256 hashes are persisted. Browser authentication will use a secure, HttpOnly, SameSite cookie and will not use localStorage or sessionStorage for credentials. Login, registration, reset request, and password setup will have a bounded server-side rate limit. The application will use generic password-reset responses to reduce account-enumeration risk.

> Google OAuth is intentionally not implemented in this migration because no permitted Google client credentials are configured. The email-and-password flow remains fully independent. A future optional provider can be added as a separate account-identity table without changing existing user IDs or ownership relationships.
