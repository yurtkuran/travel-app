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
: "${TRAVELTROVE_RELEASE:?set TRAVELTROVE_RELEASE}"
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

verification_id="$(date -u +%Y%m%dT%H%M%SZ)-$$"
staging_root="$TRAVELTROVE_DATA_ROOT/backup-staging"
verification_directory="$staging_root/verify-$verification_id"
lock_directory="$TRAVELTROVE_DATA_ROOT/restore-verification.lock"
database_name="traveltrove_restore_verify_${verification_id//[^0-9]/_}"
database_created=false

umask 077
mkdir -p "$staging_root"
if ! mkdir "$lock_directory" 2>/dev/null; then
  echo "Another restore verification appears to be running: $lock_directory" >&2
  exit 75
fi

cleanup() {
  if [[ "$database_created" == true ]]; then
    "${compose[@]}" exec -T db psql \
      --username="$POSTGRES_USER" \
      --dbname=postgres \
      --set=ON_ERROR_STOP=1 \
      --command="DROP DATABASE IF EXISTS \"$database_name\" WITH (FORCE);" \
      >/dev/null || true
  fi
  rm -rf -- "$verification_directory"
  rmdir "$lock_directory" 2>/dev/null || true
}
trap cleanup EXIT
mkdir "$verification_directory"

if [[ -z $("${compose[@]}" ps --status running -q db) ]]; then
  echo "Production database container is not running" >&2
  exit 69
fi

remote_listing=$("${compose[@]}" --profile tools run --rm restore-transfer \
  lsf "$RCLONE_BACKUP_TARGET" --dirs-only)
latest_recovery_point=$(
  printf '%s\n' "$remote_listing" \
    | sed 's:/$::' \
    | grep -E '^[0-9]{8}T[0-9]{6}Z$' \
    | sort \
    | tail -n 1 \
    || true
)
if [[ -z "$latest_recovery_point" ]]; then
  echo "No timestamped recovery point exists at $RCLONE_BACKUP_TARGET" >&2
  exit 65
fi

remote_directory="${RCLONE_BACKUP_TARGET%/}/$latest_recovery_point"
container_directory="/backup/verify-$verification_id"
"${compose[@]}" --profile tools run --rm restore-transfer \
  copy "$remote_directory" "$container_directory" --checksum

for required_file in SHA256SUMS manifest.json media.tar.gz postgresql.dump; do
  if [[ ! -f "$verification_directory/$required_file" ]]; then
    echo "Recovery point is missing $required_file" >&2
    exit 65
  fi
done

expected_checksum_files=$'manifest.json\nmedia.tar.gz\npostgresql.dump'
actual_checksum_files=$(
  awk '{ print $2 }' "$verification_directory/SHA256SUMS" | sort
)
if [[ "$actual_checksum_files" != "$expected_checksum_files" ]]; then
  echo "SHA256SUMS does not contain the exact expected artifact set" >&2
  exit 65
fi
(
  cd "$verification_directory"
  sha256sum --check SHA256SUMS
)
if ! grep -Fq '"version": 1' "$verification_directory/manifest.json" \
  || ! grep -Fq \
    "\"capturedAt\": \"$latest_recovery_point\"" \
    "$verification_directory/manifest.json"; then
  echo "Recovery manifest does not match the selected recovery point" >&2
  exit 65
fi

archive_listing="$verification_directory/media-archive.list"
if ! tar -tzf "$verification_directory/media.tar.gz" > "$archive_listing"; then
  echo "Media archive cannot be read" >&2
  exit 65
fi
while IFS= read -r archive_path; do
  if [[ "$archive_path" == /* || "$archive_path" =~ (^|/)\.\.(/|$) ]]; then
    echo "Media archive contains an unsafe path: $archive_path" >&2
    exit 65
  fi
done < "$archive_listing"

"${compose[@]}" exec -T db createdb \
  --username="$POSTGRES_USER" \
  "$database_name"
database_created=true

"${compose[@]}" exec -T db pg_restore \
  --exit-on-error \
  --no-owner \
  --no-acl \
  --username="$POSTGRES_USER" \
  --dbname="$database_name" \
  < "$verification_directory/postgresql.dump"

schema_check=$("${compose[@]}" exec -T db psql \
  --username="$POSTGRES_USER" \
  --dbname="$database_name" \
  --tuples-only \
  --no-align \
  --set=ON_ERROR_STOP=1 \
  --command="SELECT CASE WHEN
    to_regclass('public.user') IS NOT NULL AND
    to_regclass('public.places') IS NOT NULL AND
    to_regclass('public.media') IS NOT NULL AND
    to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AND
    (SELECT count(*) FROM drizzle.__drizzle_migrations) > 0
  THEN 'verified' ELSE 'invalid' END;")

if [[ "$schema_check" != "verified" ]]; then
  echo "Restored database failed required schema validation" >&2
  exit 65
fi

echo "Verified off-host recovery point: $remote_directory"
