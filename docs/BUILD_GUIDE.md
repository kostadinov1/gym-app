# Build & Run Guide

## Quick Reference

| Scenario | Backend | API target | Script |
|---|---|---|---|
| 1. Local development | Local uvicorn | `http://192.168.x.x:8000` | `dev-backend.sh` + `dev-frontend.sh` |
| 2. APK for friends | Render (live) | `gym-api-m6vx.onrender.com` | `build-apk.sh` |
| 3. Internal test track | Render (live) | `gym-api-m6vx.onrender.com` | `build-aab.sh` → upload to Play Console |
| 4. Production release | Render (live) | `gym-api-m6vx.onrender.com` | Promote release in Play Console (no new build) |

---

## Scenario 1 — Local Development

Used for active coding and debugging. Hot reload on both frontend and backend.

**Prerequisites:**
- Docker running (for PostgreSQL)
- `uv` installed
- `EXPO_PUBLIC_API_URL` in `.env` set to your machine's local IP

**Find your local IP:**
```bash
ip addr | grep 192
# e.g. 192.168.10.121 → set EXPO_PUBLIC_API_URL=http://192.168.10.121:8000 in .env
```

**Step 1 — Start the backend (Terminal 1):**
```bash
./scripts/dev-backend.sh
# Starts PostgreSQL via docker-compose, then uvicorn on port 8000
```

**Step 2 — Start the frontend (Terminal 2):**
```bash
./scripts/dev-frontend.sh
# Opens Expo Metro bundler — scan QR with Expo Go, or press 'a' for Android emulator
```

**Flags for the frontend script:**
```bash
./scripts/dev-frontend.sh --android   # open directly on connected Android device/emulator
./scripts/dev-frontend.sh --clear     # clear Metro cache (fixes stale module errors)
```

**Notes:**
- Both your phone and your computer must be on the same Wi-Fi network
- Sentry is disabled (`EXPO_PUBLIC_ENV=development`)
- AdMob uses test IDs — no real account needed
- RevenueCat skips init if key is empty — app runs with guest-tier limits

---

## Scenario 2 — APK for Friend Testing

Used for sharing with friends to test on real devices — no Play Store needed, no developer account needed on their end.

**Prerequisites:**
- `eas-cli` installed: `npm install -g eas-cli`
- Logged in: `eas login`
- Render backend running (it always is — it's live at gym-api-m6vx.onrender.com)

**Build:**
```bash
./scripts/build-apk.sh
# Runs: eas build --platform android --profile preview
```

EAS builds in the cloud (~10–15 min). When done, you get a download link on expo.dev.

**Share with friends:**

Option A — Share the expo.dev link (easiest):
```
EAS prints a URL like: https://expo.dev/accounts/YOUR_ACCOUNT/projects/gym-tracker/builds/...
Friends open it in a browser → tap "Download" → install
```

Option B — Send the APK file directly:
```bash
# Download the APK from the EAS link, then send it via WhatsApp, Telegram, email, etc.
```

**Friends must enable "Install unknown apps"** on their Android:
- Settings → Apps → Special app access → Install unknown apps → (their browser or file manager) → Allow

**What's active in this build:**
- API: Render production server
- AdMob: test IDs (no real ads)
- Sentry: disabled
- RevenueCat: skips init if key is empty

---

## Scenario 3 — Internal Test Track (AAB)

Used for testing via Google Play Console before public release. Testers install via Play Store (not sideload). Closest to the real production experience.

**Prerequisites:**
- `eas-cli` installed and logged in
- `docs/PRE_PRODUCTION_CHECKLIST.md` items 1–7 completed (Sentry, RevenueCat, AdMob, `.env.production` filled, `app.json` updated)
- Play Console developer account + app created

**Build:**
```bash
./scripts/build-aab.sh
# Runs: eas build --platform android --profile production
# Script checks .env.production for empty values before building
```

**Upload to Play Console:**
1. Download the `.aab` from the EAS link
2. Play Console → your app → Testing → Internal testing
3. Create release → Upload AAB → Save → Review → Start rollout

**Add internal testers:**
- Play Console → Internal testing → Testers → Manage testers
- Add Google accounts by email
- Each tester gets an opt-in link to install from Play Store

**What's active in this build:**
- `EXPO_PUBLIC_ENV=production` — Sentry enabled, real AdMob IDs, real RevenueCat key
- API: Render production server
- Full production behavior

---

## Scenario 4 — Production Release

**No new build needed.** Promote the AAB you built in Scenario 3.

**Promote from internal → production:**
1. Play Console → your app → Production
2. Create release → "Promote from Internal testing"
3. Select the release → Review → Start rollout to production

**Or use staged rollout** (recommended for first release):
- Start at 10–20% of users → monitor crash rate in Play Console → expand to 100%

**eas submit (alternative — auto-uploads directly to Play Console):**
```bash
eas submit --platform android --profile production
# Requires Play Console API key configured in EAS — see EAS docs for setup
```

---

## Environment Summary

| Profile | `EXPO_PUBLIC_ENV` | API URL | AdMob | Sentry | RevenueCat |
|---|---|---|---|---|---|
| `npx expo start` | `development` | Local IP | Test IDs | Disabled | Skipped if key empty |
| `preview` (APK) | `preview` | Render | Test IDs | Disabled | Skipped if key empty |
| `production` (AAB) | `production` | Render | Real IDs | Enabled | Real key required |

---

## Troubleshooting

**Metro can't connect to backend (local dev):**
- Make sure phone and laptop are on the same Wi-Fi
- Run `ip addr | grep 192` and update `.env` `EXPO_PUBLIC_API_URL`
- Try `./scripts/dev-frontend.sh --clear` to reset Metro cache

**EAS build fails with "missing credentials":**
```bash
eas credentials --platform android
# Follow prompts to generate or upload a keystore
```

**APK won't install ("App not installed"):**
- The phone may have a conflicting version — uninstall the old one first
- Or "Install unknown apps" is not enabled for the browser/file manager

**`.env.production` values missing (build-aab.sh warns you):**
- See `docs/PRE_PRODUCTION_CHECKLIST.md` for where to get each value
