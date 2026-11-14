# Local Hosted-PostgreSQL Shakedown

> **Status:** Phase 9A planning contract; implementation has not started  
> **Last reviewed:** 2026-11-14

Before creating paid DigitalOcean infrastructure, TravelTrove will run locally
for a shakedown period while using a Supabase Free project as its hosted
PostgreSQL database. This period is intended to expose usability, operational,
and data-model issues through real use while preserving a straightforward path
to the production architecture.

## Scope and boundaries

Supabase is a temporary PostgreSQL host, not an application platform dependency.
TravelTrove will not adopt Supabase Auth, Storage, client SDKs, browser keys, or
generated data APIs during this phase. All database access remains server-side
through the existing PostgreSQL client.

The application already selects its database through `DATABASE_URL`. That value
is the provider boundary and should point to one of the following without any
application-level provider flag:

- the local Compose PostgreSQL service for ordinary development;
- the Supabase project for sustained local shakedown use; or
- the private Compose PostgreSQL service after DigitalOcean deployment.

An additional administrative connection such as `DATABASE_MIGRATION_URL` should
be introduced only if the selected Supabase runtime connection is inappropriate
for migrations, `pg_dump`, or restore operations. That decision must be made
from the tested connection behavior, not merely from the provider name.

## Connection and security decisions

Before implementation:

1. Choose a Supabase direct connection when the workstation has compatible IPv6
   connectivity, or the session pooler on port 5432 when IPv4 compatibility is
   required.
2. Use a connection suitable for prepared statements and persistent server-side
   application traffic. Transaction-mode pooling is not the default choice for
   this application.
3. Require TLS in the PostgreSQL connection string. Prefer full certificate
   verification with the provider CA after validating the local Node/Postgres.js
   configuration.
4. Store credentials only in an ignored local environment file or an approved
   secret store. Never expose the service password or connection string to the
   browser or commit it to Git.
5. Confirm that migrations, logical dumps, and restores work through the chosen
   administrative connection before any meaningful shakedown data accumulates.

Relevant provider references:

- [Connect to Supabase Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement)
- [Supabase pricing and quotas](https://supabase.com/pricing)
- [Free-project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)

The free plan currently advertises a 500 MB database quota, may pause inactive
projects, and does not provide the production backup guarantees required for the
eventual deployment. Provider limits and behavior must be rechecked when setup
begins because they can change.

## Test isolation

Automated tests continue to use the local disposable PostgreSQL infrastructure.
The integration and migration runners create and drop databases and therefore
must never receive the Supabase shakedown URL. Browser tests should run against
their normal isolated application/database setup rather than mutate the hosted
shakedown data.

Environment files and commands must make the distinction obvious. A developer
should be able to run the application against Supabase while test commands still
resolve to disposable local database URLs.

## Media and durability

Supabase Storage is out of scope. Uploaded media stays under the local
`MEDIA_ROOT`, so a usable recovery point always consists of both:

- a PostgreSQL logical dump; and
- a matching media archive with checksums and release metadata.

The local runtime should use a clearly identified durable media path. Before
implementation, decide whether Compose should replace its named media volume
with a bind mount such as `.local-data/media` to make inspection and backup less
error-prone.

Shakedown recovery points must be copied to storage independent of both the Mac
and Supabase. At least one complete database-and-media restore must be tested.
Do not use `docker compose down --volumes` unless deleting local state is
intentional and a verified recovery point exists.

## Planned setup sequence

1. Create the Supabase project and record its region, quota, connection options,
   and inactivity behavior.
2. Select and test runtime and administrative connection strings with TLS.
3. Add the chosen secrets to ignored local configuration without changing the
   browser-visible environment.
4. Apply the reviewed Drizzle migrations to the empty hosted database.
5. Bootstrap the first administrator from a trusted local terminal.
6. Start the application locally with its runtime `DATABASE_URL` pointed at
   Supabase and its media root on durable local storage.
7. Verify liveness, readiness, sign-in, administration, public browsing, private
   activity, media upload, and recovery procedures.
8. Begin regular coordinated PostgreSQL and media recovery points.

## Shakedown exit gate

Phase 9A is complete only when:

- core user and administrator workflows have been exercised through real use;
- no known high-severity security or data-integrity issue remains;
- a coordinated database-and-media recovery point has restored successfully;
- migration from Supabase into clean standard PostgreSQL has been rehearsed;
- usability findings have been reviewed and classified in the backlog; and
- data use remains comfortably below the hosted quota.

## Migration to DigitalOcean

After the exit gate is satisfied, the Ansible project provisions the Phase 9B
Droplet according to the [provisioning handoff](ansible-handoff.md), and the
[DigitalOcean deployment runbook](deployment.md) governs release operations.
The cutover sequence is:

1. Quiesce writes to the shakedown application.
2. Create a final custom-format PostgreSQL dump from Supabase.
3. Archive and checksum the matching local media tree.
4. Restore the dump into a clean DigitalOcean PostgreSQL database.
5. Restore media to the production media path.
6. Apply any migrations newer than the dump's recorded release.
7. Point the production `DATABASE_URL` at the private Compose service `db:5432`.
8. Validate record counts, media retrieval, authentication, private activity,
   administration, and health endpoints.
9. Enable nightly off-host backups and monthly restore verification.
10. Retain the Supabase project and local recovery artifacts through an agreed
    observation window before decommissioning them.

This migration includes both database and media. A successful database restore
alone is not a complete TravelTrove recovery.
