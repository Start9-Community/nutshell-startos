#!/usr/bin/env bash
set -euo pipefail

# Migrates a database written by the previously packaged release into the one
# the manifest now pins, and asserts the schema version moved. Override the
# baseline when the packaged release changes:
#   tests/smoke-nutshell.sh cashubtc/nutshell:0.20.3
old_image="${1:-cashubtc/nutshell:0.19.2}"
new_image="$(grep -o "cashubtc/nutshell:[^']*" startos/manifest/index.ts | head -1)"
if [ -z "$new_image" ]; then
  echo "Could not read the pinned image out of startos/manifest/index.ts" >&2
  exit 1
fi
smoke_dir="$(mktemp -d /tmp/nutshell-migration-smoke.XXXXXX)"
old_container="scratch-nutshell-smoke-old-$$"
new_container="scratch-nutshell-smoke-new-$$"
mint_key="1111111111111111111111111111111111111111111111111111111111111111"

cleanup() {
  docker rm -f "$old_container" "$new_container" >/dev/null 2>&1 || true
  rm -rf -- "$smoke_dir"
}
trap cleanup EXIT

start_mint() {
  local image="$1"
  local container="$2"

  docker run --detach \
    --name "$container" \
    --publish 127.0.0.1::3338 \
    --volume "$smoke_dir:/data" \
    --env MINT_BACKEND_BOLT11_SAT=FakeWallet \
    --env MINT_DATABASE=/data/mint \
    --env MINT_LISTEN_HOST=0.0.0.0 \
    --env MINT_LISTEN_PORT=3338 \
    --env MINT_PRIVATE_KEY="$mint_key" \
    --env MINT_RATE_LIMIT=false \
    "$image" \
    poetry run mint >/dev/null

  local published
  published="$(docker port "$container" 3338/tcp)"
  local host_port="${published##*:}"

  for _ in $(seq 1 90); do
    if curl --fail --silent --show-error \
      "http://127.0.0.1:${host_port}/v1/info" >/dev/null 2>&1; then
      return 0
    fi

    if [ "$(docker inspect --format '{{.State.Running}}' "$container")" != "true" ]; then
      docker logs "$container"
      return 1
    fi
    sleep 1
  done

  docker logs "$container"
  return 1
}

migration_version() {
  local image="$1"
  docker run --rm \
    --volume "$smoke_dir:/data" \
    "$image" \
    python3 -c \
      "import sqlite3; db=sqlite3.connect('/data/mint/mint.sqlite3'); print(db.execute(\"select version from dbversions where db='mint'\").fetchone()[0])"
}

printf 'Creating a real database with %s...\n' "$old_image"
start_mint "$old_image" "$old_container"
old_version="$(migration_version "$old_image")"
docker stop "$old_container" >/dev/null
docker rm "$old_container" >/dev/null

printf 'Migrating the database with the pinned image...\n'
start_mint "$new_image" "$new_container"
new_version="$(migration_version "$new_image")"

if [ "$new_version" -le "$old_version" ]; then
  printf 'Expected migration version greater than %s, got %s\n' \
    "$old_version" "$new_version" >&2
  exit 1
fi

printf 'Database migration passed: v%s -> v%s\n' "$old_version" "$new_version"
