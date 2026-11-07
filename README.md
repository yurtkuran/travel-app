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
