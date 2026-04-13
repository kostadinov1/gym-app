# Gym Tracker App — Requirements & Goals

## Product Vision

A mobile gym tracker that works immediately, without registration, and grows with the user through a subscription model. Target platform: **Google Play Store** (Android). iOS future consideration.

---

## User Tiers

| Feature | Ghost (no account) | Free (registered) | Pro Trial (14d) | Pro (subscribed) |
|---|---|---|---|---|
| Active plans | 1 (≤3 months) | 1 at a time | Unlimited | Unlimited |
| Workout sessions stored | 30 | 90 | Unlimited | Unlimited |
| Custom exercises | 10 | 20 | Unlimited | Unlimited |
| Cloud sync / backup | No | No | Yes | Yes |
| Export (CSV / JSON) | No | No | Yes | Yes |
| Analytics chart | No (empty state) | 3 months back | All time | All time |
| Ads | Yes (with consent) | Yes | No | No |
| Data storage | Phone only | Phone + cloud | Phone + cloud | Phone + cloud |

### Trial Rules
- **14-day free trial** starts immediately on first registration
- Trial gives full Pro access including cloud sync, unlimited plans, no ads
- On trial expiry: current active plan (date range includes today) continues working; plans created during trial that haven't started yet are **locked** (visible but can't start workouts)
- All logged history is always preserved — never deleted on downgrade

### Subscription Billing
- **Monthly** via Google Play Billing (managed through RevenueCat)
- Price: TBD at launch
- Cancellation: accessible in-app via deep link to Play Store subscriptions

---

## Ghost User (Offline-First)

- User opens app → taps "Continue as Guest" → immediately in the full app
- All data stored locally on device (SQLite via drizzle-orm)
- Progressive overload calculation runs entirely on device (no network needed)
- System exercise catalog (200+ exercises) bundled in the app — works offline from day one
- Subject to ghost tier limits (1 plan, 30 sessions, 10 custom exercises)
- Ads shown from first open (with GDPR consent)

### Ghost → Registration Migration
- Ghost can register at any time via ProfileScreen CTA
- On registration: 14-day Pro trial starts
- All local data (plans, routines, sessions, custom exercises) migrated to cloud automatically
- Migration is idempotent (safe to retry)
- After successful migration, app switches from local to cloud storage seamlessly

---

## Tech Stack

### Frontend
- Expo ~54 (managed workflow — no ejecting)
- React Native 0.81.5 / React 19 / TypeScript
- React Navigation (bottom tabs + native stacks)
- TanStack React Query v5 (server state / cache)
- React Context (auth state, theme, entitlements, storage)
- `expo-sqlite` + `drizzle-orm` (local database for ghost users)
- `react-native-purchases` (RevenueCat — subscription management)
- `react-native-google-mobile-ads` + UMP SDK (AdMob + GDPR consent)
- `@sentry/react-native` (production error tracking)
- `expo-file-system` + `expo-sharing` (data export)

### Backend
- FastAPI (Python) on Render
- PostgreSQL (SQLModel ORM + Alembic migrations)
- JWT authentication (OAuth2PasswordBearer)
- `sentry-sdk[fastapi]` (production error tracking)

---

## Data Export Formats

Available to **Pro users only** (GDPR right to portability also available to all registered users via account deletion flow).

| Format | Purpose | Compatibility |
|---|---|---|
| Strong CSV | Standard gym tracker export | Hevy, Strong, spreadsheets |
| JSON backup | Full fidelity backup | Re-import into this app, custom tools |

Strong CSV columns:
```
Date, Workout Name, Exercise Name, Set Order, Weight (kg), Reps, Duration, Notes
```

---

## Logging & Monitoring

| Layer | Development | Production |
|---|---|---|
| Backend | Python `logging` → stdout (visible in terminal) | Sentry (`sentry-sdk[fastapi]`) on Render |
| Frontend | `console.log/error` → Metro terminal | `@sentry/react-native` (disabled in dev) |

Sentry free tier: 5,000 errors/month. Both frontend and backend in the same project.

GDPR: `beforeSend` hook strips user email before sending to Sentry.

---

## Environment Configuration

### Frontend `.env` (development)
```
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
EXPO_PUBLIC_REVENUECAT_API_KEY=appl_xxxx_dev
EXPO_PUBLIC_ADMOB_APP_ID=ca-app-pub-3940256099942544~3347511713
EXPO_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-3940256099942544/6300978111
EXPO_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/yyyy
```

### Frontend `.env.production`
```
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_API_URL=https://gym-api-m6vx.onrender.com
EXPO_PUBLIC_REVENUECAT_API_KEY=appl_xxxx_prod
EXPO_PUBLIC_ADMOB_APP_ID=ca-app-pub-REAL~ID
EXPO_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-REAL/BANNER_ID
EXPO_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/yyyy
```

### Backend `.env` additions
```
ENVIRONMENT=development
SENTRY_DSN=https://xxxx@sentry.io/yyyy
```

**Critical:** AdMob test IDs (`ca-app-pub-3940256099942544/...`) MUST be used in development. Using real IDs in dev triggers Google's invalid traffic detection and can result in account suspension.

---

## GDPR Compliance

- [x] Account deletion (`DELETE /me`) — cascades all user data
- [ ] Privacy policy — hosted URL required (link in app + Play Console)
- [ ] Terms of service — hosted URL required
- [ ] Data export — Strong CSV + JSON (covers right to portability)
- [ ] Ad consent dialog — UMP SDK shown on first launch before any ad displays
- [ ] In-app privacy policy link — ProfileScreen
- [ ] Sentry PII scrubbing — `beforeSend` strips email field
- [ ] Data safety form in Play Console — declare: Account Info, Fitness Data, Financial Info (Play Billing via RevenueCat)

---

## Google Play Requirements

- [ ] Upload keystore generated and securely backed up (losing it = publish under a new package name)
- [ ] AAB format (`eas build --platform android`)
- [ ] Privacy policy URL in Play Console
- [ ] Data safety form completed
- [ ] In-app subscription cancellation link to Play Store
- [ ] Pro feature description in store listing
- [ ] Screenshots: minimum 2 phone screenshots + feature graphic (1024×500)
- [ ] Content rating questionnaire completed
- [ ] Target API level ≥ 34 (Expo 54 handles automatically)
- [ ] Free trial labeled "14-day free trial" in Play Console product configuration

---

## Ads Strategy

- **Placement:** Banner ads at the bottom of HomeScreen, HistoryScreen, PlansScreen
- **No interstitials** — disruptive UX for a workout app
- **Shown to:** Ghost users and Free registered users
- **Hidden for:** Pro Trial and Pro subscribers
- **GDPR:** UMP consent dialog on first launch; AdMob initialized only after consent resolves

---

## Feature Gating Rules (Subject to Change)

The following features are locked behind subscription:
- Create more than 1 active plan
- Log more than 30 (ghost) / 90 (free) workout sessions
- Create more than 10 (ghost) / 20 (free) custom exercises
- Data export (CSV / JSON)
- Cloud sync / backup
- Full analytics history (beyond 3 months)
- Ad-free experience

The following are always free:
- All system exercises (200+ catalog)
- Progressive overload calculation
- Workout logging (within session limits)
- History viewing (within limit)
- Basic stats (total workouts, last workout)

---

## Future Considerations (Not in Scope for V1)

- iOS App Store release
- Annual subscription billing
- Workout plan templates / marketplace
- Exercise history per-exercise view (Bench Press over time)
- Social features / friend activity
- Apple Watch / Wear OS companion
- Rest timer with notifications
- Offline support for registered users (currently cloud-only post-registration)
- Volume chart for guest users (currently deferred — empty state shown)
