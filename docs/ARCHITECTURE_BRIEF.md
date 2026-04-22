# GymLogic – Architecture Brief

## Purpose
A mobile workout planning and tracking app supporting routine planning, guided workouts, history logging, analytics, and offline-first guest usage.

## Core Stack

| Layer | Tech |
|---|---|
| Client | Expo SDK 54 + React Native (TypeScript) |
| Navigation | React Navigation (bottom tabs + native stacks) |
| Server state | React Query (cache, refetch, error handling) |
| Local DB | expo-sqlite + drizzle-orm (guest/offline users) |
| Auth tokens | expo-secure-store (JWT), AsyncStorage (guest flag, theme) |
| Subscriptions | react-native-purchases (RevenueCat) |
| Ads | react-native-google-mobile-ads (AdMob + UMP consent) |
| Export | expo-file-system + expo-sharing |
| Error tracking | @sentry/react-native (production only) |
| UI | react-native-gifted-charts, react-native-calendars, gesture handler, toast-message |
| API | REST + OAuth2 token flow (FastAPI backend on Render) |

---

## High-Level Architecture

```
App.tsx
  └── Providers
        ├── AuthProvider          ← token / guest flag / promote guest
        ├── EntitlementProvider   ← RevenueCat: isPro, isTrial, openPaywall()
        ├── AdsProvider           ← UMP consent → MobileAds.initialize()
        ├── StorageProvider       ← injects LocalService (guest) or RemoteService (logged-in)
        ├── ThemeProvider
        └── QueryClientProvider
              └── NavigationContainer
                    ├── LoginScreen (unauthenticated)
                    └── RootNavigator (authenticated or guest)
                          ├── Tab: Workout / History / Plans / Exercises / Profile
                          └── Modal: PaywallScreen
```

---

## Storage Abstraction (IAppService)

All screens call `useStorage()` — they are unaware of whether data comes from the API or SQLite.

```
useStorage() → IAppService
  ├── isGuest = true  → LocalService   (drizzle-orm queries against SQLite)
  └── isGuest = false → RemoteService  (wraps src/api/* functions)
```

Key files:
- `src/services/types.ts` — `IAppService` interface
- `src/services/LocalService.ts` — SQLite implementation
- `src/services/RemoteService.ts` — API wrapper
- `src/context/StorageContext.tsx` — injects the correct service

---

## Local SQLite Database

**File:** `gymlogic.db` (in app's private storage, not accessible to other apps)

**Tables:** `exercises`, `workout_plans`, `workout_routines`, `routine_exercises`, `workout_sessions`, `session_sets`

**Migrations** are managed by drizzle-orm and run on every app launch (idempotent — already-applied migrations are skipped).

### Adding a new migration

1. Edit `src/db/schema.ts` with your changes
2. Run `npx drizzle-kit generate` — this creates a new `.sql` file in `src/db/migrations/`
3. Open `src/db/migrations/migrations.js` and add the new migration as an inlined string:

```js
// Add after the existing m0000 constant:
const m0001 = `ALTER TABLE \`workout_plans\` ADD COLUMN \`notes\` text;`;

export default {
  journal,
  migrations: { m0000, m0001 },
};
```

**Why inline strings?** Metro bundler cannot reliably import `.sql` files as text modules without complex tooling (babel-plugin-inline-import conflicts with Expo SDK 54's internal Babel setup). Inlining SQL as JS string constants is simpler, stable, and works identically in dev and production builds.

---

## Auth & Guest Flow

```
App launch
  ├── SecureStore has JWT    → logged-in user → RemoteService
  ├── AsyncStorage isGuest   → guest user     → LocalService
  └── neither                → LoginScreen
```

- `guestSignIn()` — sets AsyncStorage flag, no network call
- `promoteGuest(token)` — called after ghost→registered migration; clears React Query cache first to prevent stale local data showing in remote-backed screens
- `signOut()` — clears both JWT and guest flag

---

## Entitlements & Feature Gating

```
EntitlementContext (RevenueCat)
  └── useEntitlement() hook
        ├── canExport          → isPro || isTrial
        ├── canViewFullAnalytics → isPro || isTrial
        ├── showAds            → !isPro && !isTrial
        └── openPaywall()      → navigates to PaywallScreen via navigationRef
```

Guest users: RevenueCat is not initialized. Entitlement = guest-tier limits applied locally.

---

## Key Files Map

```
src/
  db/
    schema.ts              ← drizzle table definitions
    client.ts              ← opens gymlogic.db, exports db handle + runMigrations()
    seed.ts                ← seeds system exercises (no-op if already done)
    migrations/
      migrations.js        ← MANUALLY MAINTAINED — SQL inlined as strings (see above)
      0000_bumpy_ted_forrester.sql  ← source of truth for m0000 SQL
  services/
    types.ts               ← IAppService interface
    RemoteService.ts       ← wraps src/api/* (logged-in)
    LocalService.ts        ← drizzle queries (guest)
    progressionEngine.ts   ← port of backend workouts.py:68-113
    ExportService.ts       ← Strong CSV + JSON via expo-file-system
    GhostMigrationService.ts ← collects SQLite snapshot, POSTs to /migrate
  context/
    AuthContext.tsx         ← token, isGuest, guestSignIn, promoteGuest
    StorageContext.tsx      ← injects service, runs migrations + seeding
    EntitlementContext.tsx  ← RevenueCat wrapper
  hooks/
    useEntitlement.ts      ← computed access gates
  navigation/
    navigationRef.ts       ← createNavigationContainerRef (for outside-tree navigation)
    RootNavigator.tsx      ← tab navigator + PaywallScreen modal
  components/
    ConsentManager.tsx     ← UMP consent → MobileAds.initialize()
    AdBanner.tsx           ← banner ad (test IDs in dev, real in prod)
assets/
  system_exercises.json    ← bundled exercise catalog (seeded into SQLite on first guest launch)
```

---

## Compact Data Flow

```
Screen
  └── useStorage().getPlans() / finishWorkout() / etc.
        ├── guest  → LocalService → drizzle → SQLite (gymlogic.db)
        └── logged → RemoteService → src/api/* → REST API → PostgreSQL (Render)
```

React Query caches all reads. `queryClient.clear()` is called before `promoteGuest()` to ensure the cache is flushed before switching from local to remote service.
