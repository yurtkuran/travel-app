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

for command_name in docker git getent stat df awk; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command is unavailable: $command_name" >&2
    exit 69
  fi
done

set -a
# The file is trusted, operator-owned, and required to use shell assignment syntax.
# shellcheck disable=SC1090
. "$environment_file"
set +a

: "${COMPOSE_PROJECT_NAME:?set COMPOSE_PROJECT_NAME}"
: "${TRAVELTROVE_RELEASE:?set TRAVELTROVE_RELEASE}"
: "${TRAVELTROVE_DOMAIN:?set TRAVELTROVE_DOMAIN}"
: "${TRAVELTROVE_DATA_ROOT:?set TRAVELTROVE_DATA_ROOT}"
: "${ACME_EMAIL:?set ACME_EMAIL}"
: "${POSTGRES_DB:?set POSTGRES_DB}"
: "${POSTGRES_USER:?set POSTGRES_USER}"
: "${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}"
: "${DATABASE_URL:?set DATABASE_URL}"
: "${BETTER_AUTH_SECRET:?set BETTER_AUTH_SECRET}"
: "${RCLONE_CONFIG_PATH:?set RCLONE_CONFIG_PATH}"
: "${RCLONE_BACKUP_TARGET:?set RCLONE_BACKUP_TARGET}"

minimum_free_bytes=${TRAVELTROVE_MIN_FREE_BYTES:-10737418240}
if [[ ! "$minimum_free_bytes" =~ ^[0-9]+$ || "$minimum_free_bytes" -lt 1073741824 ]]; then
  echo "TRAVELTROVE_MIN_FREE_BYTES must be an integer of at least 1073741824" >&2
  exit 65
fi
if [[ ! "$TRAVELTROVE_RELEASE" =~ ^[0-9a-f]{40}$ ]]; then
  echo "TRAVELTROVE_RELEASE must be a full lowercase Git commit SHA" >&2
  exit 65
fi
if [[ ! "$COMPOSE_PROJECT_NAME" =~ ^[a-z0-9][a-z0-9_-]+$ ]]; then
  echo "COMPOSE_PROJECT_NAME contains unsupported characters" >&2
  exit 65
fi
if [[ ! "$TRAVELTROVE_DOMAIN" =~ ^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$ ]]; then
  echo "TRAVELTROVE_DOMAIN must be a lowercase fully qualified domain name" >&2
  exit 65
fi
if [[ "$TRAVELTROVE_DATA_ROOT" != /* || "$TRAVELTROVE_DATA_ROOT" == / ]]; then
  echo "TRAVELTROVE_DATA_ROOT must be a scoped absolute path" >&2
  exit 65
fi
if [[ ! "$ACME_EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  echo "ACME_EMAIL must be a valid operational email address" >&2
  exit 65
fi
if [[ ! "$POSTGRES_DB" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ \
  || ! "$POSTGRES_USER" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "PostgreSQL database and user names must be simple identifiers" >&2
  exit 65
fi
case "$DATABASE_URL" in
  postgresql://*@"db:5432/$POSTGRES_DB" | postgresql://*@"db:5432/$POSTGRES_DB"\?*) ;;
  *)
    echo "DATABASE_URL must target the private db service and configured database" >&2
    exit 65
    ;;
esac
if [[ ${#POSTGRES_PASSWORD} -lt 24 ]]; then
  echo "POSTGRES_PASSWORD must contain at least 24 characters" >&2
  exit 65
fi
if [[ ${#BETTER_AUTH_SECRET} -lt 32 ]]; then
  echo "BETTER_AUTH_SECRET must contain at least 32 characters" >&2
  exit 65
fi
if [[ ! "$RCLONE_BACKUP_TARGET" =~ ^[^:]+:.+[^/]$ ]]; then
  echo "RCLONE_BACKUP_TARGET must be a scoped remote path, not a remote root" >&2
  exit 65
fi

for configuration_value in \
  "$TRAVELTROVE_RELEASE" \
  "$TRAVELTROVE_DOMAIN" \
  "$ACME_EMAIL" \
  "$POSTGRES_PASSWORD" \
  "$BETTER_AUTH_SECRET"; do
  if [[ "$configuration_value" == *replace-with* || "$configuration_value" == *example.com* ]]; then
    echo "Production configuration still contains a template placeholder" >&2
    exit 65
  fi
done

if [[ ! -r "$RCLONE_CONFIG_PATH" ]]; then
  echo "rclone configuration is not readable: $RCLONE_CONFIG_PATH" >&2
  exit 66
fi

environment_mode=$(stat -c '%a' "$environment_file")
rclone_mode=$(stat -c '%a' "$RCLONE_CONFIG_PATH")
if (( (8#$environment_mode & 8#077) != 0 )); then
  echo "Environment file must not be accessible by group or other users" >&2
  exit 77
fi
if (( (8#$rclone_mode & 8#077) != 0 )); then
  echo "rclone configuration must not be accessible by group or other users" >&2
  exit 77
fi

if [[ ! -d "$TRAVELTROVE_DATA_ROOT" || -L "$TRAVELTROVE_DATA_ROOT" ]]; then
  echo "Data root must exist and must not be a symbolic link" >&2
  exit 72
fi
for directory_name in backup-staging caddy-config caddy-data media postgres; do
  directory_path="$TRAVELTROVE_DATA_ROOT/$directory_name"
  if [[ ! -d "$directory_path" || -L "$directory_path" ]]; then
    echo "Required persistent directory is missing or symbolic: $directory_path" >&2
    exit 72
  fi
done

available_kib=$(df -Pk "$TRAVELTROVE_DATA_ROOT" | awk 'NR == 2 { print $4 }')
minimum_free_kib=$(( (minimum_free_bytes + 1023) / 1024 ))
if [[ ! "$available_kib" =~ ^[0-9]+$ || "$available_kib" -lt "$minimum_free_kib" ]]; then
  echo "Data volume does not meet the configured free-space reserve" >&2
  exit 75
fi

repository_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
if [[ $(git -C "$repository_root" rev-parse HEAD) != "$TRAVELTROVE_RELEASE" ]]; then
  echo "Checked-out commit does not match TRAVELTROVE_RELEASE" >&2
  exit 65
fi
if [[ -n $(git -C "$repository_root" status --porcelain) ]]; then
  echo "Deployment checkout contains uncommitted or untracked files" >&2
  exit 65
fi

if ! getent ahosts "$TRAVELTROVE_DOMAIN" >/dev/null; then
  echo "Deployment domain does not resolve: $TRAVELTROVE_DOMAIN" >&2
  exit 69
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker Engine is unavailable to the deployment operator" >&2
  exit 69
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is unavailable" >&2
  exit 69
fi

docker compose \
  --env-file "$environment_file" \
  -f "$repository_root/compose.production.yaml" \
  config --quiet

echo "Production preflight passed for $TRAVELTROVE_DOMAIN at $TRAVELTROVE_RELEASE"
