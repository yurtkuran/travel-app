# Ansible Provisioning Handoff

> **Status:** Phase 9 host-provisioning contract
> **Last reviewed:** 2026-11-14

Implementation of this contract is deferred until the Phase 9A
[local hosted-PostgreSQL shakedown](local-shakedown.md) is complete. It remains
the provisioning target for the Phase 9B DigitalOcean deployment.

This document defines the boundary between the TravelTrove application
repository and the separate Ansible project used to provision its DigitalOcean
Droplets. The application repository owns the runtime and recovery contracts;
Ansible owns repeatable host convergence to those contracts.

Do not copy application logic into Ansible. Check out an immutable reviewed
TravelTrove commit and use the Compose file, scripts, Caddy configuration, and
systemd units from that checkout.

## Responsibility boundary

The Ansible project owns:

- DigitalOcean Droplet, VPC, firewall, DNS, Droplet-backup, and optional volume
  resources;
- the supported Ubuntu LTS base, security updates, time synchronization, SSH
  hardening, and the non-root deployment operator;
- Docker Engine and the Docker Compose plugin from Docker's official repository;
- persistent directories, ownership, protected environment files, and the
  external rclone configuration;
- checkout of the exact reviewed Git revision at `/opt/traveltrove/current`;
- installation and enablement of the supplied systemd timer units;
- integration with the chosen monitoring and alert destination.

This repository owns:

- `compose.production.yaml`, `Dockerfile`, and `deploy/Caddyfile`;
- database migrations and immutable release image construction;
- `deploy/preflight.sh`, `deploy/backup.sh`, and
  `deploy/verify-backup.sh`;
- the supplied backup and restore-verification systemd units;
- application health endpoints and deployment, rollback, backup, and recovery
  procedures.

## Required Ansible inputs

Keep secret values in Ansible Vault or another approved secret store. Inventory
may contain non-secret environment metadata, but generated production files must
never be committed to either repository.

| Input                        | Secret | Production contract                                |
| ---------------------------- | ------ | -------------------------------------------------- |
| Deployment operator          | No     | Non-root user with SSH-key and Docker access       |
| TravelTrove Git revision     | No     | Full, reviewed 40-character commit SHA             |
| Domain and ACME email        | No     | Environment-specific production values             |
| Compose project name         | No     | Unique to the environment                          |
| Data root                    | No     | `/srv/traveltrove` by default                      |
| Minimum free bytes           | No     | At least `10737418240` by default                  |
| PostgreSQL database and user | No     | Environment-specific identifiers                   |
| PostgreSQL password          | Yes    | Random value of at least 24 characters             |
| Better Auth secret           | Yes    | Independent random value of at least 32 characters |
| rclone configuration         | Yes    | Client-side encrypted remote configuration         |
| rclone backup target         | No     | Scoped path below the encrypted remote root        |

Derive `DATABASE_URL` from the configured database identifiers and URL-encoded
password. It must address the private Compose service at `db:5432`; never place
PostgreSQL on a public interface.

## Required host state

An idempotent Ansible run must converge the host to all of the following:

1. The deployment operator has SSH-key access and can use Docker. Password SSH
   and direct root SSH are disabled only after key access has been verified.
2. The DigitalOcean firewall permits TCP 80 and 443 plus UDP 443 publicly. TCP
   22 is restricted to approved operator sources. PostgreSQL and Adminer have no
   public rule.
3. `/opt/traveltrove/current` is a clean checkout whose `HEAD` equals the
   configured release SHA. Ansible must not deploy an unreviewed branch tip.
4. `/srv/traveltrove` and its `backup-staging`, `caddy-config`, `caddy-data`,
   `media`, and `postgres` children exist with the permissions described in
   [the deployment runbook](deployment.md).
5. `/etc/traveltrove/production.env` and `/etc/traveltrove/rclone.conf` are owned
   by the deployment operator, use mode `0600`, and contain no template values.
6. The four supplied systemd files are installed under `/etc/systemd/system`,
   followed by `systemctl daemon-reload`:
   - `traveltrove-backup.service`
   - `traveltrove-backup.timer`
   - `traveltrove-restore-verification.service`
   - `traveltrove-restore-verification.timer`
7. Both timers are enabled and started. The oneshot services are not started by
   ordinary convergence; they run from their timers or an explicit operator
   verification.
8. DigitalOcean Droplet backups are enabled. Optional volume snapshots must not
   replace the independent logical database and media backups.

## Data-safety and idempotency rules

Provisioning convergence must be safe to repeat against an operating host.

- Never run `docker compose down --volumes`, remove persistent directories, or
  recreate an existing PostgreSQL data directory.
- Never replace, truncate, recursively re-own, or restore over existing
  PostgreSQL or media data during an ordinary Ansible run.
- Never regenerate production secrets after their initial creation. Secret
  rotation is a separate, planned operation with application validation.
- Initialize PostgreSQL directory ownership through the pinned image only when
  the target directory is empty.
- Treat a release change as an explicit deployment, not incidental provisioning
  convergence. Run the backup, migration, replacement, and validation sequence
  from the deployment runbook.
- Installing changed timer or service definitions may notify a daemon reload,
  but must not automatically launch a backup, restore drill, migration, or
  application replacement.
- Keep staging and production inventories, secrets, domains, data roots, backup
  targets, and Droplets independent.

## Provisioning acceptance

After Ansible converges a new host, run these checks before the first migration:

```bash
sudo -u <deployment-operator> \
  /opt/traveltrove/current/deploy/preflight.sh \
  /etc/traveltrove/production.env

systemctl is-enabled traveltrove-backup.timer
systemctl is-active traveltrove-backup.timer
systemctl is-enabled traveltrove-restore-verification.timer
systemctl is-active traveltrove-restore-verification.timer
```

Then follow the controlled first-deployment procedure in
[`deployment.md`](deployment.md). After the application is healthy:

1. Run `traveltrove-backup.service` explicitly and confirm that the encrypted
   remote recovery point and checks pass.
2. Run `traveltrove-restore-verification.service` explicitly and confirm that
   it restores the newest recovery point into a disposable database and cleans
   up successfully.
3. Confirm both HTTPS health endpoints and a representative authenticated
   administrator workflow.
4. Confirm Docker exposes only Caddy's intended public ports.
5. Record the Ansible revision, TravelTrove revision, image IDs, migration
   result, backup reference, UTC timestamp, and operator in the deployment log.

The Phase 9 provisioning gate is complete only after a fresh Droplet passes
these checks and the documented recovery inputs are stored independently of the
Droplet.
