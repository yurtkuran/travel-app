#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/production.env" >&2
  exit 64
fi

environment_file=$1
if [[ ! -r "$environment_file" ]]; then
  echo "Environment file is not readable: $environment_file" >&2
  exit 66
fi

set -a
# The file is trusted, operator-owned, and required to use shell assignment syntax.
# shellcheck disable=SC1090
. "$environment_file"
set +a

: "${TRAVELTROVE_DATA_ROOT:?set TRAVELTROVE_DATA_ROOT}"
: "${TRAVELTROVE_DOMAIN:?set TRAVELTROVE_DOMAIN}"
: "${TRAVELTROVE_RELEASE:?set TRAVELTROVE_RELEASE}"
: "${POSTGRES_DB:?set POSTGRES_DB}"
: "${POSTGRES_USER:?set POSTGRES_USER}"
: "${RCLONE_BACKUP_TARGET:?set RCLONE_BACKUP_TARGET}"
: "${RCLONE_CONFIG_PATH:?set RCLONE_CONFIG_PATH}"

if [[ ! "$RCLONE_BACKUP_TARGET" =~ ^[^:]+:.+[^/]$ ]]; then
  echo "RCLONE_BACKUP_TARGET must be a scoped remote path, not a remote root" >&2
  exit 65
fi
if [[ ! -r "$RCLONE_CONFIG_PATH" ]]; then
  echo "rclone configuration is not readable: $RCLONE_CONFIG_PATH" >&2
  exit 66
fi

repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
compose=(
  docker compose
  --env-file "$environment_file"
  -f "$repository_root/compose.production.yaml"
)

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
staging_root="$TRAVELTROVE_DATA_ROOT/backup-staging"
backup_directory="$staging_root/$timestamp"
lock_directory="$TRAVELTROVE_DATA_ROOT/backup.lock"
media_root="$TRAVELTROVE_DATA_ROOT/media"
app_was_running=false
app_restarted=false

umask 077
mkdir -p "$staging_root"
if ! mkdir "$lock_directory" 2>/dev/null; then
  echo "Another backup appears to be running: $lock_directory" >&2
  exit 75
fi
mkdir "$backup_directory"

restore_app() {
  if [[ "$app_was_running" == true && "$app_restarted" == false ]]; then
    "${compose[@]}" start app >/dev/null
    app_restarted=true
  fi
}

cleanup() {
  restore_app || true
  rm -rf -- "$backup_directory"
  rmdir "$lock_directory" 2>/dev/null || true
}
trap cleanup EXIT

if [[ -n $("${compose[@]}" ps --status running -q app) ]]; then
  app_was_running=true
fi
if [[ -z $("${compose[@]}" ps --status running -q db) ]]; then
  echo "Production database container is not running" >&2
  exit 69
fi
if [[ ! -d "$media_root" ]]; then
  echo "Media root does not exist: $media_root" >&2
  exit 72
fi

if [[ "$app_was_running" == true ]]; then
  "${compose[@]}" stop --timeout 60 app >/dev/null
fi

"${compose[@]}" exec -T db pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  > "$backup_directory/postgresql.dump"

tar -C "$media_root" -czf "$backup_directory/media.tar.gz" .

cat > "$backup_directory/manifest.json" <<EOF
{
  "version": 1,
  "capturedAt": "$timestamp",
  "applicationRevision": "$TRAVELTROVE_RELEASE",
  "postgresImage": "postgres:18.6-alpine3.24",
  "hostname": "$TRAVELTROVE_DOMAIN"
}
EOF

(
  cd "$backup_directory"
  sha256sum postgresql.dump media.tar.gz manifest.json > SHA256SUMS
)

restore_app

remote_directory="${RCLONE_BACKUP_TARGET%/}/$timestamp"
"${compose[@]}" --profile tools run --rm backup-transfer \
  copy "/backup/$timestamp" "$remote_directory" \
  --checksum \
  --create-empty-src-dirs

"${compose[@]}" --profile tools run --rm backup-transfer \
  check "/backup/$timestamp" "$remote_directory" \
  --one-way

if [[ "$app_was_running" == true ]]; then
  curl --fail --silent --show-error \
    --retry 12 \
    --retry-all-errors \
    --retry-delay 5 \
    "https://$TRAVELTROVE_DOMAIN/health/ready" >/dev/null
fi

echo "Backup uploaded and verified: $remote_directory"
