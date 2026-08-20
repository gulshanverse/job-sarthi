# Environment Configuration

Job Sarthi runs on the managed full-stack platform, which injects the required database, OAuth, session, storage, and LLM configuration at runtime. No populated environment file is committed to this repository.

The application references the platform-managed `DATABASE_URL`, `JWT_SECRET`, OAuth settings, and server-side Forge credentials only through the scaffold’s environment helpers. Local values should be configured through the project’s secure settings interface rather than committed to source control.

For production and development, do not add real API keys, database URLs, session secrets, or OAuth credentials to `.env` files in Git. The repository ignore rules already exclude populated `.env` files.

## Scheduled weekly digest

The weekly match digest relies on the platform-managed Heartbeat service and the server-side Forge credentials that are already injected for the project. It does not require an additional API key or a committed environment variable.

The published application must be reachable before a user enables a digest schedule. Once enabled from the protected Profile workspace, the platform calls the cron-only `POST /api/scheduled/weekly-digest` endpoint. The handler authenticates the platform cron identity, resolves the candidate profile by its stored task UID, and creates a deduplicated in-app notification. Do not implement an in-process timer, `setInterval`, or `node-cron` as a substitute.
