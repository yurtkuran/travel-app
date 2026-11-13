# DigitalOcean Deployment Runbook

> **Status:** Phase 9 deployment foundation  
> **Last reviewed:** 2026-11-13

TravelTrove deploys as a Docker Compose stack containing Caddy, the standalone
Next.js application, PostgreSQL, and a one-shot migration image. Only Caddy
publishes host ports. PostgreSQL remains on an internal network, while database,
media, and Caddy state use explicit persistent host paths.

## Host and DNS prerequisites

- Provision a supported Ubuntu LTS Droplet with Docker Engine and the Compose
  plugin from Docker's official repository.
- Create a non-root deployment operator with SSH keys and Docker access. Disable
  password SSH and direct root SSH after validating key access.
- Allow inbound TCP 22, 80, and 443 plus UDP 443 in the DigitalOcean firewall.
  Restrict SSH to known operator addresses where practical.
- Point the deployment hostname's DNS records at the Droplet before starting
  Caddy. Automatic certificate issuance requires public reachability on ports 80
  and 443.
- Keep staging and production on separate Droplets. Each environment uses its
  own domain, Compose project name, secrets, data root, and backup destination.

## Persistent paths and permissions

The environment file sets `TRAVELTROVE_DATA_ROOT`; `/srv/traveltrove` is the
production default. Create the data root before deployment:

```bash
sudo install -d -m 0750 /srv/traveltrove
sudo install -d -m 0750 /srv/traveltrove/{caddy-config,caddy-data,postgres}
sudo install -d -m 0750 -o 1001 -g 1001 /srv/traveltrove/media
```

Initialize PostgreSQL's bind-mounted directory through the pinned image so its
container user owns the path without relying on a host UID assumption:

```bash
docker run --rm \
  -v /srv/traveltrove/postgres:/var/lib/postgresql \
  postgres:18.6-alpine3.24 \
  sh -c 'chown -R postgres:postgres /var/lib/postgresql'
```

Restrict the data root and backup locations to deployment operators. Media and
database files contain private user data and must not be served directly.

## Environment configuration

Copy `.env.production.example` outside the checkout, then replace every
placeholder with environment-specific values:

```bash
sudo install -d -m 0750 /etc/traveltrove
sudo install -m 0600 .env.production.example /etc/traveltrove/production.env
sudoedit /etc/traveltrove/production.env
```

Generate `POSTGRES_PASSWORD` and `BETTER_AUTH_SECRET` independently with a
cryptographically secure generator. URL-encode the database password when
placing it in `DATABASE_URL`. The environment file must never enter Git, a
container image, logs, tickets, or chat. Keep a recoverable encrypted copy in
the approved secrets system.

Validate interpolation before building:

```bash
docker compose \
  --env-file /etc/traveltrove/production.env \
  -f compose.production.yaml \
  config --quiet
```

## Controlled first deployment

Run migrations as a separate, observable step before starting or replacing the
application:

```bash
docker compose \
  --env-file /etc/traveltrove/production.env \
  -f compose.production.yaml \
  --profile tools \
  run --rm migrate

docker compose \
  --env-file /etc/traveltrove/production.env \
  -f compose.production.yaml \
  up -d --build db app caddy
```

Check container state and both health endpoints:

```bash
docker compose \
  --env-file /etc/traveltrove/production.env \
  -f compose.production.yaml \
  ps

curl --fail --silent --show-error "https://$TRAVELTROVE_DOMAIN/health/live"
curl --fail --silent --show-error "https://$TRAVELTROVE_DOMAIN/health/ready"
```

Caddy obtains and renews HTTPS certificates automatically. Its state directories
must persist across container replacements. The application and Caddy write
structured operational logs to stdout; Docker retains five rotating 10 MB JSON
log files per service. HTTP access logging is intentionally disabled because
account-setup requests can carry one-time credentials in their query strings. Do
not enable proxy access logs until credential-bearing URLs are reliably redacted.

## Staging

Use this same Compose file on a separate staging Droplet with an independent
environment file, hostname, Compose project name, data root, credentials, and
backup destination. Never point staging at production PostgreSQL, media, Caddy
state, or secrets. Validate migrations and release images in staging before a
production rollout.

## Recovery

Follow [`backup-and-restore.md`](backup-and-restore.md) for coordinated database
and media recovery. A Droplet snapshot is useful infrastructure defense but does
not replace independent logical database and media backups.
