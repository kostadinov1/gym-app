#!/usr/bin/env bash
# Builds a release APK for friend/tester distribution (no Play Store needed).
# Uses the EAS "preview" profile:
#   - Release APK (signed, installable on any Android device)
#   - API: Render production server (gym-api-m6vx.onrender.com)
#   - Ads: test IDs (no real AdMob account needed)
#   - Sentry: disabled (EXPO_PUBLIC_ENV=preview, not production)
#   - RevenueCat: skips init if key is empty in .env
#
# How to share with friends:
#   1. EAS builds the APK and uploads it to expo.dev
#   2. You get a download link — share it directly, or download and send the file
#   3. Friends must enable "Install from unknown sources" on their Android phone
#
# Requires: eas-cli (`npm install -g eas-cli`), logged in (`eas login`)
#
# Usage:
#   ./scripts/build-apk.sh

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "Building APK (preview profile)..."
echo "→ API: https://gym-api-m6vx.onrender.com"
echo "→ Output: APK (sideloadable)"
echo ""

eas build --platform android --profile preview
