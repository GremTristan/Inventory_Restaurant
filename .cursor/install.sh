#!/usr/bin/env bash
# Durable, idempotent setup for the Crêperies Inventory Cloud Agent
# environment. Runs after the repo is checked out; with environment builds it
# produces the baseline snapshot, so it installs system packages, Node
# dependencies, and pre-pulls the Docker images used for the local database.
set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=.cursor/lib.sh
source .cursor/lib.sh

echo "==> Installing Node dependencies (npm ci)"
npm ci

echo "==> Ensuring Docker + fuse-overlayfs are installed"
if ! command -v docker >/dev/null 2>&1 || [ ! -x /usr/bin/fuse-overlayfs ]; then
  sudo apt-get update -qq || true
  # fuse-overlayfs's postinst can exit non-zero in this nested VM (no init to
  # signal) even though the binary installs fine, so don't abort on it.
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io fuse-overlayfs || true
fi
command -v docker >/dev/null 2>&1 || { echo "docker failed to install" >&2; exit 1; }
[ -x /usr/bin/fuse-overlayfs ] || { echo "fuse-overlayfs failed to install" >&2; exit 1; }

echo "==> Pre-pulling database images"
ensure_dockerd
sudo docker pull "$PG_IMAGE"
sudo docker pull "$PROXY_IMAGE"

echo "==> Install complete"
