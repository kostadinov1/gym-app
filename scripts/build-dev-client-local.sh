#!/usr/bin/env bash
# Builds a development client APK using YOUR LOCAL CPU instead of EAS cloud queue.
# Same output as build-dev-client.sh but no queue wait — runs entirely on this machine.
#
# You only need to rebuild this when:
#   - You add or remove a native module (npm install a package with native code)
#   - You change app.json plugins
#   - First time setting up a new device
#
# Requires: eas-cli (`npm install -g eas-cli`), logged in (`eas login`)
#
# Usage:
#   ./scripts/build-dev-client-local.sh

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "Building development client LOCALLY (profile: development)..."
echo "→ Using local CPU — no EAS cloud queue"
echo "→ Install the resulting APK on your phone, then use dev-frontend.sh"
echo ""

eas build --platform android --profile development --local
