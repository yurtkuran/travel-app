# Backup and Restore Runbook

> **Status:** Phase 9 production recovery policy
> **Last reviewed:** 2026-11-14

TravelTrove recovery requires a coordinated PostgreSQL logical dump and a copy
of the persistent media root. A database-only backup is incomplete because media
rows refer to files outside PostgreSQL.

## Backup policy

- Stop the application or otherwise quiesce writes before capturing either
  artifact. Keep PostgreSQL running for `pg_dump`.
- Create a PostgreSQL custom-format dump with the PostgreSQL 18 client shipped in
  the pinned database container. Use `--no-owner --no-acl` so restoration does
  not depend on source-system role identifiers.
- Archive the complete `MEDIA_ROOT`, preserving its relative `places/...` keys.
- Generate SHA-256 checksums for both artifacts and verify them before every
  restore.
- Encrypt backups in transit and at rest. They contain account data, session
  state, private visits, provenance, audit history, and unpublished media.
- Copy completed artifacts to an access-controlled destination independent of
  the application Droplet. A backup left only on the source host is not a
  recoverable backup.
- Never place backup artifacts in the repository, application image, or public
  media path.

## Backup procedure

The Phase 9 production Compose file must provide the database service as `db`
and mount media at a documented host path. With the application stopped and
`BACKUP_DIR`, `POSTGRES_USER`, `POSTGRES_DB`, and `MEDIA_ROOT` set by the operator:

```bash
umask 077
mkdir -p "$BACKUP_DIR"

docker compose exec -T db pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  > "$BACKUP_DIR/postgresql.dump"

tar -C "$MEDIA_ROOT" -czf "$BACKUP_DIR/media.tar.gz" .

(
  cd "$BACKUP_DIR"
  shasum -a 256 postgresql.dump media.tar.gz > SHA256SUMS
)
```

Record the application revision, migration journal revision, UTC capture time,
and PostgreSQL major version beside these files, then transfer the complete set
to the independent backup destination before restarting writes.

## Automated nightly backup

Production uses `deploy/backup.sh` to implement the coordinated procedure and
upload through the pinned `rclone/rclone:1.76.0` container. Configure
`RCLONE_CONFIG_PATH` outside the repository and set `RCLONE_BACKUP_TARGET` to a
scoped path such as `encrypted-remote:traveltrove/production`. The named rclone
remote must be a client-side `crypt` remote layered over an independently
controlled off-host backend.

The script obtains an exclusive backup lock, briefly stops a running app to
quiesce writes, dumps PostgreSQL, archives media, writes release metadata and
SHA-256 checksums, restarts the app, uploads the recovery point, verifies the
remote copy, checks readiness, and removes local staging artifacts. Its transfer
container can read only the rclone configuration and backup staging directory;
it cannot access the live database or media tree.

Install the provided systemd units after placing the repository at
`/opt/traveltrove/current`:

```bash
sudo install -m 0644 deploy/systemd/traveltrove-backup.service /etc/systemd/system/
sudo install -m 0644 deploy/systemd/traveltrove-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now traveltrove-backup.timer
sudo systemctl start traveltrove-backup.service
sudo systemctl status traveltrove-backup.service
sudo systemctl list-timers traveltrove-backup.timer
```

Configure retention or object-lock lifecycle rules at the independent backend;
the application host must not have permission to shorten locked retention. Alert
on failed units and on recovery-point age exceeding 26 hours.

## Restore procedure

Restore into newly provisioned, empty database and media targets. Do not extract
over a live media tree or run `pg_restore --clean` against an unverified target.

1. Keep the application stopped and retrieve the dump, media archive, checksums,
   capture metadata, and separately stored runtime secrets.
2. Verify `(cd "$BACKUP_DIR" && shasum -a 256 -c SHA256SUMS)` before opening
   either artifact.
3. Create the empty target database and an empty staging media directory.
4. Restore PostgreSQL with the matching major-version client:

   ```bash
   docker compose exec -T db pg_restore \
     --exit-on-error \
     --no-owner \
     --no-acl \
     --username="$POSTGRES_USER" \
     --dbname="$POSTGRES_DB" \
     < "$BACKUP_DIR/postgresql.dump"
   ```

5. Extract media into the empty staging directory, validate ownership and
   permissions, then atomically mount or move it to the configured `MEDIA_ROOT`:

   ```bash
   mkdir -p "$RESTORE_MEDIA_DIR"
   tar -xzf "$BACKUP_DIR/media.tar.gz" -C "$RESTORE_MEDIA_DIR"
   ```

6. Run `pnpm db:migrate` to apply migrations newer than the captured release.
7. Start the application, confirm `/health/live` and `/health/ready`, sign in as
   an administrator, and verify representative public and private media.
8. Retain the previous targets until the restored application passes validation.

## Automated restore verification

`pnpm test:backup-restore` exercises this contract without touching development
data. It creates a migrated source database and media tree, inserts unique
sentinels, captures a custom-format dump and compressed media archive, verifies
their checksums, restores into fresh targets, validates both sentinels, and
removes all disposable resources. CI supplies the PostgreSQL service container
identifier; locally the test discovers the running Compose `db` container.

Run this test after changing migrations, PostgreSQL versions, media layout,
backup commands, or deployment storage.

Production additionally runs `deploy/verify-backup.sh` against the newest real
off-host recovery point. The verifier lists only timestamp-shaped directories,
downloads the newest complete recovery point into restricted local staging,
requires the exact expected artifact set, verifies SHA-256 checksums, and rejects
unsafe media archive paths. It restores the PostgreSQL dump into a generated
disposable database in the running database container, confirms representative
application tables and the non-empty Drizzle migration journal, then drops the
disposable database and removes all downloaded artifacts. It never changes the
live application database or media tree and does not stop the application.

Install and enable the monthly verifier alongside the nightly backup timer:

```bash
sudo install -m 0644 deploy/systemd/traveltrove-restore-verification.service /etc/systemd/system/
sudo install -m 0644 deploy/systemd/traveltrove-restore-verification.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now traveltrove-restore-verification.timer
sudo systemctl start traveltrove-restore-verification.service
sudo systemctl status traveltrove-restore-verification.service
sudo systemctl list-timers traveltrove-restore-verification.timer
```

The timer runs on the first day of each month at 05:15 UTC with up to two hours
of randomized delay. Alert on any failed verification unit and investigate
before allowing newer recovery points to age out. A successful job identifies
the verified remote recovery point in its journal output. Retain that evidence
with the monthly operations record.
