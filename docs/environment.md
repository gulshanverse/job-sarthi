# Environment Configuration

Job Sarthi runs on the managed full-stack platform, which injects the required database, OAuth, session, storage, and LLM configuration at runtime. No populated environment file is committed to this repository.

The application references the platform-managed `DATABASE_URL`, `JWT_SECRET`, OAuth settings, and server-side Forge credentials only through the scaffold’s environment helpers. Local values should be configured through the project’s secure settings interface rather than committed to source control.

For production and development, do not add real API keys, database URLs, session secrets, or OAuth credentials to `.env` files in Git. The repository ignore rules already exclude populated `.env` files.
