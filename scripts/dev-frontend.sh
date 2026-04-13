#!/usr/bin/env bash
# Starts the Expo Metro bundler for local development.
# Run this in a second terminal after dev-backend.sh is running.
#
# Before running:
#   - Make sure EXPO_PUBLIC_API_URL in .env points to your local machine IP
#     (run `ip addr | grep 192` to find it, e.g. http://192.168.x.x:8000)
#
# Usage:
#   ./scripts/dev-frontend.sh [--android | --ios | --web]

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "→ Frontend dir: $REPO_ROOT"
echo "→ API URL: ${EXPO_PUBLIC_API_URL:-$(grep EXPO_PUBLIC_API_URL .env | grep -v '#' | tail -1)}"
echo ""

npx expo start "$@"
