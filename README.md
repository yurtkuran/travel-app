# TravelTrove

Clean-sheet replacement for the legacy PHP travel application.

The legacy application and SQL dump in the parent directory are reference
material only. New application code, configuration, migrations, tests, and
deployment assets belong in this directory.

## Initial scope

- Accessible web interface for large tablets and computers (minimum 1024 CSS-pixel
  viewport at default zoom)
- Invitation-only Better Auth authentication with `user` and `admin` roles
- City, category, place, and media administration
- User-submitted places and proposed edits with admin publication approval
- Private personal visit history
- Public reviews and capability-based star ratings
- PostgreSQL with versioned migrations
- Docker-based local development and DigitalOcean deployment

Bulk migration of legacy data and the hand-authored destination guides are
outside the initial scope.

## Documentation

- [Implementation plan](docs/implementation-plan.md)
- [Design references](docs/design/README.md)
- [Access-control model](docs/product/access-control.md)
- [Place contract](docs/product/place-model.md)
- [Reviews, visits, and ratings contract](docs/product/reviews-visits-ratings.md)
- [Route inventory](docs/product/routes.md)
- [Technical foundation](docs/architecture/foundation.md)
- [Database schema](docs/architecture/database-schema.md)
- [Authentication and authorization](docs/architecture/authentication-authorization.md)

## Local development

TravelTrove uses Node.js 24 LTS and pnpm 12. Docker Compose is the recommended
way to get an identical application and PostgreSQL environment on every
workstation.

### Docker workflow

1. Start the application and database:

   ```bash
   docker compose up --build
   ```

2. In another terminal, apply migrations:

   ```bash
   docker compose exec app pnpm db:migrate
   ```

3. Open <http://localhost:3000>. The liveness and database-readiness endpoints
   are available at `/health/live` and `/health/ready`.

Stop the services with `docker compose down`. Add `--volumes` only when you
intentionally want to delete the local PostgreSQL and package-cache volumes.

### Native Node.js workflow

Install Node.js 24 (the `.nvmrc` and `.node-version` files pin the supported
major), enable Corepack, install dependencies, and start PostgreSQL:

```bash
corepack enable
pnpm install
cp .env.example .env.local
docker compose up -d db
pnpm db:migrate
pnpm dev
```

Use a unique, randomly generated `BETTER_AUTH_SECRET` in every non-local
environment. Never commit populated environment files.

## Quality checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

Unit tests do not require services. Integration tests require PostgreSQL and
the browser suite manages its own Next.js development server. GitHub Actions
runs the same checks on pushes to `master` and on pull requests.

## Account bootstrap and provisioning

Authentication is invitation-only. After migrations, create the first admin from
a trusted terminal; the password is read from an environment variable so it does
not appear as a command-line argument:

```bash
read -s TRAVELTROVE_BOOTSTRAP_PASSWORD
export TRAVELTROVE_BOOTSTRAP_PASSWORD
pnpm auth:bootstrap-admin -- --email admin@example.com --name "Admin Name"
unset TRAVELTROVE_BOOTSTRAP_PASSWORD
```

See the [authentication documentation](docs/architecture/authentication-authorization.md)
for user provisioning and admin-assisted recovery commands.

## Source organization

- `src/app` — Next.js routes and layouts
- `src/features` — feature-owned domain code (added as features are built)
- `src/components` — shared interface components
- `src/db` — database connection and typed schemas
- `src/lib` — framework-independent infrastructure
- `src/tests` — unit, integration, and browser tests
- `drizzle` — reviewed, versioned SQL migrations
