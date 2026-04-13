# Gym App – Architecture Brief

## Purpose
A mobile workout planning and tracking app that supports routine planning, guided workouts, history logging, and analytics.

## Core Stack
- Client: Expo + React Native (TypeScript)
- Navigation: React Navigation (bottom tabs + native stacks)
- Server State: React Query (cache, refetch, error handling)
- Local State: React Context (Auth, Theme)
- Storage: SecureStore (auth token), AsyncStorage (theme)
- UI/UX: react-native-calendars, react-native-gifted-charts, react-native-toast-message, gesture handler
- API: REST endpoints with OAuth2 token flow

## High-Level Architecture
- App shell composes providers (Auth, Theme, React Query) and global error handling.
- Navigation uses a tab-first structure with feature-level stacks for depth.
- API is centralized in `src/api/*`, with a shared `client` responsible for auth headers and 401 logout.
- Feature logic lives in `screens/*`; reusable UI in `components/*`.

## Key Functional Areas
1. Auth
- Login/register, token restore on launch.
- Global 401 handling triggers logout.

2. Workout Execution
- Start routine from plan.
- Track sets (weight/reps/time), add ad-hoc exercises.
- Finish workout posts full session payload.

3. Plans & Routines
- Create plans with duration/start date.
- Weekly plan view with per-day routines.
- Routine editor for targets, progression, reordering.

4. Exercise Library
- Search/filter exercises.
- Create/edit custom exercises.
- Copy system templates into custom library.

5. History & Editing
- Calendar-based session browsing.
- Session details and editing.

6. Analytics
- Volume chart with time windows and plan filters.
- Interactive tooltips and latest navigation.

7. Profile
- Stats, chart preview, theme toggle, account actions.

## Data & State Flow
- Server is the source of truth for plans, routines, history, exercises.
- React Query ensures consistent cache, refetch on screen focus, and error reporting.
- Context handles cross-cutting concerns (auth, theme).

## Compact Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│                         Expo App                           │
│  App.tsx: Providers (Auth + Theme + ReactQuery + Toast)     │
└────────────────────────────────────────────────────────────┘
                    │
                    ▼
        ┌────────────────────────────┐
        │       Navigation            │
        │ Tabs: Workout/History/Plans │
        │       Exercises/Profile     │
        └────────────────────────────┘
     ┌─────────┬─────────┬─────────┬──────────┬──────────┐
     ▼         ▼         ▼         ▼          ▼
  Workout   History     Plans   Exercises    Profile
  Stack     Stack       Stack    Screen      Stack
     │         │         │         │          │
  Active    Calendar   Plan      Library    Analytics
  Workout   Details    Details   CRUD        Profile
     │         │         │
     └─────────┴─────────┴───────────────┐
                                         ▼
                             ┌────────────────────┐
                             │   API Layer         │
                             │ src/api/* + client  │
                             │ Auth headers, 401   │
                             └────────────────────┘
                                         ▼
                                   REST Backend
```
