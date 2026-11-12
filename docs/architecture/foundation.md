# Technical Foundation

This document records the conventions established in Phase 1. It complements
the living implementation plan and should be updated when a convention changes.

## Supported toolchain

- Node.js 24 LTS
- pnpm 12, pinned in `package.json`
- Next.js 16 with the App Router and React 19
- PostgreSQL 18
- Drizzle ORM and reviewed SQL migrations
- Tailwind CSS 4

The checked-in lockfile is authoritative. Dependency updates should be made in a
focused change and verified with the complete quality suite.

## Module boundaries

- `src/app` owns routing, layouts, route handlers, and composition.
- `src/features/<feature>` owns a feature's domain rules, services, components,
  and tests. Features must not reach into another feature's private files.
- `src/components` contains genuinely shared interface primitives, not
  feature-specific components.
- `src/db` contains the database client and schema definitions. Application code
  should access persistence through feature services rather than issuing SQL in
  route components.
- `src/lib` contains small framework and infrastructure utilities.
- `src/tests` contains cross-cutting unit, integration, and browser tests.

Imports within `src` use the `@/` alias. Relative imports are reserved for files
within the same small module, such as a command-line entry point and its sibling.
Dependencies should flow from routes into features and infrastructure; domain
logic must not import from `src/app`.

## Configuration and secrets

Server configuration is parsed lazily through `src/lib/env.ts`. Adding a new
environment variable requires updating the schema and `.env.example`. Secret
values must never use a `NEXT_PUBLIC_` prefix, appear in logs, or be committed.

## Database changes

The TypeScript schema is the source for generated migrations. Every schema
change must produce a checked-in SQL migration, and its SQL must be reviewed.
Previously applied migrations are immutable. Corrections are made with a new
migration.

## Logging and health checks

Application logs are newline-delimited JSON with a stable event name and
optional context. Errors are serialized without exposing request data or
secrets. `/health/live` verifies that the process can answer HTTP; `/health/ready`
also verifies PostgreSQL connectivity and reveals no connection details.

## Test lanes

- Unit tests are isolated and require no external services.
- Integration tests may use PostgreSQL and must clean up records they create.
- Playwright covers critical user-visible workflows at the supported desktop
  and large-tablet viewport range.

## Secret boundaries

Local environment files, private-key formats, credential stores, Git metadata,
build output, and persistent application data are excluded from the Docker build
context. The production image is built without `.env.local`, runtime secrets, or
a live database; session-aware route groups are explicitly dynamic so secrets
are read only when the container serves a request.

The `Security scans` workflow uses Trivy's secret scanner against both the
checked-out repository and a freshly built production image. Either scan fails
the workflow when a secret is detected. Documented local and CI credentials are
non-production placeholders and must never be reused outside their isolated
environments.

CI runs formatting, linting, strict type-checking, unit tests, database
integration tests, a production build, and the Chromium browser suite.
