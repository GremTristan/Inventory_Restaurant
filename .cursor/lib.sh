#!/usr/bin/env bash
# Shared helpers for the Crêperies Inventory Cloud Agent environment.
#
# The app talks to Postgres through the Neon serverless HTTP driver, so local
# development runs a Postgres container behind the community
# local-neon-http-proxy (which speaks Neon's SQL-over-HTTP protocol). Both run
# on the host network inside the (nested) Cloud Agent VM.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PG_CONTAINER="creperie-postgres"
PROXY_CONTAINER="creperie-neon-proxy"
PG_IMAGE="postgres:17"
PROXY_IMAGE="ghcr.io/timowilhelm/local-neon-http-proxy:main"

# Bring the Docker daemon up. Cloud Agent VMs are nested containers, so the
# fuse-overlayfs storage driver is used and the daemon is launched manually
# (there is no init system running it).
ensure_dockerd() {
  sudo mkdir -p /etc/docker
  if [ ! -f /etc/docker/daemon.json ]; then
    echo '{"storage-driver":"fuse-overlayfs"}' | sudo tee /etc/docker/daemon.json >/dev/null
  fi

  if sudo docker info >/dev/null 2>&1; then
    return 0
  fi

  echo "Starting dockerd..."
  sudo bash -c 'nohup dockerd >/var/log/dockerd.log 2>&1 &'
  for _ in $(seq 1 30); do
    if sudo docker info >/dev/null 2>&1; then
      echo "dockerd is ready."
      return 0
    fi
    sleep 1
  done

  echo "dockerd failed to start; last log lines:" >&2
  sudo tail -n 20 /var/log/dockerd.log >&2 || true
  return 1
}

# (Re)create the Postgres + Neon HTTP proxy containers and wait until both are
# reachable. Idempotent: skips containers that are already running, recreates
# any that are missing/stopped.
#
# Ordering matters: the proxy bootstraps its control-plane schema by running
# psql against Postgres at startup, so Postgres must be accepting connections
# BEFORE the proxy container starts — otherwise queries fail with
# "Control plane request failed".
ensure_db() {
  if ! sudo docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
    sudo docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
    sudo docker run -d --name "$PG_CONTAINER" --network host --restart unless-stopped \
      -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=main \
      "$PG_IMAGE" >/dev/null
  fi

  echo "Waiting for Postgres..."
  local pg_ready=""
  for _ in $(seq 1 60); do
    if sudo docker exec "$PG_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
      echo "Postgres is ready."
      pg_ready=1
      break
    fi
    sleep 1
  done
  [ -n "$pg_ready" ] || { echo "Postgres did not become ready" >&2; return 1; }

  if ! sudo docker ps --format '{{.Names}}' | grep -qx "$PROXY_CONTAINER"; then
    sudo docker rm -f "$PROXY_CONTAINER" >/dev/null 2>&1 || true
    sudo docker run -d --name "$PROXY_CONTAINER" --network host --restart unless-stopped \
      -e PG_CONNECTION_STRING=postgres://postgres:postgres@localhost:5432/main \
      "$PROXY_IMAGE" >/dev/null
  fi

  # Probe the proxy with a real query (via the Neon serverless driver) rather
  # than a bare TCP/HTTP check, so we only proceed once end-to-end SQL works.
  echo "Waiting for the Neon HTTP proxy..."
  for _ in $(seq 1 60); do
    if node "$REPO_ROOT/.cursor/db-ping.mjs" >/dev/null 2>&1; then
      echo "Neon HTTP proxy is ready."
      return 0
    fi
    sleep 1
  done

  echo "Neon HTTP proxy did not become ready; proxy logs:" >&2
  sudo docker logs --tail 20 "$PROXY_CONTAINER" >&2 || true
  return 1
}

# Write the local .env.local used by the app and DB scripts, unless one that
# already defines DATABASE_URL exists (so a hand-provided config is preserved).
# The *.localtest.me hostname resolves to loopback and is required by the proxy.
write_env_local() {
  if [ -f "$REPO_ROOT/.env.local" ] && grep -q '^DATABASE_URL=' "$REPO_ROOT/.env.local"; then
    echo ".env.local already defines DATABASE_URL; leaving it untouched."
    return 0
  fi

  cat > "$REPO_ROOT/.env.local" <<'EOF'
# Written by .cursor/start.sh for local development (git-ignored).
# Local Postgres runs in Docker; the Neon serverless HTTP driver reaches it
# through the local-neon-http-proxy on :4444.
DATABASE_URL=postgres://postgres:postgres@db.localtest.me:5432/main
DATABASE_URL_UNPOOLED=postgres://postgres:postgres@localhost:5432/main
NEON_LOCAL_FETCH_ENDPOINT=http://db.localtest.me:4444/sql
EOF
  echo "Wrote $REPO_ROOT/.env.local"
}
