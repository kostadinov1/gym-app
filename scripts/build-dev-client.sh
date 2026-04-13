#!/usr/bin/env bash
# Builds a development client APK — a custom Expo Go that includes all native modules
# (react-native-google-mobile-ads, react-native-purchases, @sentry/react-native, etc.)
#
# You only need to rebuild this when:
#   - You add or remove a native module (npm install a package with native code)
#   - You change app.json plugins
#   - First time setting up a new device
#
# After installing this APK on your phone, use dev-frontend.sh as normal.
# The app will connect to your Metro bundler over Wi-Fi (same network required).
#
# Requires: eas-cli (`npm install -g eas-cli`), logged in (`eas login`)
#
# Usage:
#   ./scripts/build-dev-client.sh

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "Building development client (profile: development)..."
echo "→ Includes all native modules (AdMob, RevenueCat, Sentry)"
echo "→ Install the resulting APK on your phone, then use dev-frontend.sh"
echo ""

eas build --platform android --profile development
