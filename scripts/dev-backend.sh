#!/usr/bin/env bash
# Starts the FastAPI backend locally for development.
# Run this in one terminal, then run dev-frontend.sh in another.
#
# Requires: uv (https://github.com/astral-sh/uv), PostgreSQL running (docker-compose)
#
# Usage:
#   ./scripts/dev-backend.sh

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$(cd "$REPO_ROOT/../gym-backend" && pwd)"

echo "→ Backend dir: $BACKEND_DIR"
echo ""

# Tip: if you need your local IP for EXPO_PUBLIC_API_URL in .env, run:
#   ip addr | grep 192
# Then update EXPO_PUBLIC_API_URL in gym-app/.env before starting the frontend.

echo "Starting PostgreSQL (docker compose)..."
cd "$BACKEND_DIR"
docker compose up -d

echo ""
# Free port 8000 if something is already using it (e.g. a ghost uvicorn process)
if lsof -ti :8000 &>/dev/null; then
    echo "Port 8000 already in use — killing existing process..."
    kill "$(lsof -ti :8000)" 2>/dev/null || true
    sleep 1
fi

echo "Starting uvicorn (hot-reload)..."
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
