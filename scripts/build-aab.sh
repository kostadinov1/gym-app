#!/usr/bin/env bash
# Builds a production AAB for upload to Google Play Console.
# Uses the EAS "production" profile:
#   - AAB format (required by Play Store)
#   - EXPO_PUBLIC_ENV=production → Sentry enabled, real AdMob IDs, real RevenueCat key
#   - API: Render production server
#
# Before running, ensure .env.production is fully filled out:
#   EXPO_PUBLIC_SENTRY_DSN
#   EXPO_PUBLIC_REVENUECAT_API_KEY  (prod key)
#   EXPO_PUBLIC_ADMOB_APP_ID        (real AdMob App ID)
#   EXPO_PUBLIC_ADMOB_BANNER_ID     (real banner unit ID)
#
# Also ensure app.json has the real AdMob androidAppId (not the test ID).
# See docs/PRE_PRODUCTION_CHECKLIST.md for the full checklist.
#
# After the build:
#   1. Download the .aab from expo.dev (or EAS will print a link)
#   2. Go to Play Console → Testing → Internal testing → Create release → Upload AAB
#   3. To promote to production: Play Console → Production → Promote release
#
# Requires: eas-cli (`npm install -g eas-cli`), logged in (`eas login`)
#
# Usage:
#   ./scripts/build-aab.sh

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "Building AAB (production profile)..."
echo "→ API: https://gym-api-m6vx.onrender.com"
echo "→ Output: AAB (Google Play)"
echo ""

# Optional: check that .env.production has no empty required values
missing=0
while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    if [[ -z "$value" ]]; then
        echo "⚠️  WARNING: $key is empty in .env.production"
        missing=1
    fi
done < .env.production

if [[ $missing -eq 1 ]]; then
    echo ""
    echo "Some .env.production values are empty. See docs/PRE_PRODUCTION_CHECKLIST.md."
    read -rp "Continue anyway? [y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
    echo ""
fi

eas build --platform android --profile production
