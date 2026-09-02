#!/usr/bin/env bash
# Per-boot startup for the Crêperies Inventory Cloud Agent environment.
# Brings up the local Postgres + Neon HTTP proxy, writes the local env file,
# then applies migrations and seeds data. Idempotent and safe to re-run.
set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=.cursor/lib.sh
source .cursor/lib.sh

echo "==> Starting Docker daemon"
ensure_dockerd

echo "==> Starting Postgres + Neon HTTP proxy"
ensure_db

echo "==> Writing .env.local"
write_env_local

echo "==> Applying database migrations"
npm run db:migrate

echo "==> Seeding database (idempotent)"
npm run db:seed

echo "==> Start complete"
