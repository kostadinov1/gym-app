# Pre-Production Checklist

Tasks to complete before submitting to the App Store / Play Store.

---

## 1. App Name & Identity

- [ ] **Decide on the final app name** (currently "GymLogic" in `app.json`)
- [ ] Update `app.json`:
  - `name` — display name on the device home screen
  - `slug` — URL-safe identifier used by Expo (affects the Google OAuth redirect URI below)
  - `scheme` — deep-link scheme (currently `gymlogic`, change if name changes)
  - `android.package` — currently `com.gencho.gymlogic`
  - `ios.bundleIdentifier` — currently `com.gencho.gymlogic`
- [ ] Update `app/main.py` startup message if desired
- [ ] Update `gym-backend/.env` `APP_SCHEME` to match new scheme

---

## 2. Google Sign-In

> Requires the app name/slug to be finalised first (redirect URI includes the slug).

### Google Cloud Console
- [ ] Create project at [console.cloud.google.com](https://console.cloud.google.com)
- [ ] Configure OAuth consent screen (External → add app name, support email)
- [ ] Add your Gmail as a **Test User** while in Testing mode
- [ ] Create **OAuth 2.0 Client ID** → Application type: **Web application**
- [ ] Add Authorized Redirect URI:
  ```
  https://auth.expo.io/@<expo-owner>/<app-slug>
  ```
  With current values: `https://auth.expo.io/@gencho/gym-tracker`
  *(Update this if you rename the slug)*
- [ ] For production standalone builds, also add:
  ```
  <scheme>://
  ```
  e.g. `gymlogic://`

### Environment variables
- [ ] `gym-backend/.env` → `GOOGLE_CLIENT_ID=<web-client-id>`
- [ ] `gym-app/.env` → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web-client-id>`

### Backend packages
- [ ] Run in `gym-backend/`: `uv sync` (installs `google-auth` and `resend`)

---

## 3. Email (Resend)

### Resend account
- [ ] Sign up / log in at [resend.com](https://resend.com)
- [ ] Create API key → **Full access**
- [ ] Add `RESEND_API_KEY` to `gym-backend/.env`

### Development (no domain needed)
- [ ] Set `EMAIL_FROM_DOMAIN=resend.dev` in `gym-backend/.env`
  — allows sending from `noreply@resend.dev` to any address

### Production (custom domain)
- [ ] Add your domain in Resend → Domains → Add Domain
- [ ] Add the DNS records (TXT + MX) at your DNS provider
- [ ] Wait for verification (usually < 5 minutes)
- [ ] Update `EMAIL_FROM_DOMAIN=yourdomain.com` in `gym-backend/.env`
- [ ] Update `APP_BASE_URL=https://api.yourdomain.com` (used in verification email links)

---

## 4. Database Migration (MANDATORY before backend restart)

> The new `is_email_verified` and `google_id` columns were added to the User model.
> The backend will crash on every auth request until this migration is applied.

- [ ] Run in `gym-backend/`:
  ```bash
  alembic upgrade head
  ```

---

## 5. Production Backend Config

- [ ] `gym-backend/.env`:
  ```
  ENVIRONMENT=production
  APP_BASE_URL=https://api.yourdomain.com
  APP_SCHEME=<your-scheme>
  ```
- [ ] Set strong `SECRET_KEY` (generate: `openssl rand -hex 32`)
- [ ] Confirm `ACCESS_TOKEN_EXPIRE_MINUTES` is acceptable (currently 43200 = 30 days)

---

## 6. App Store / Play Store Preparation

- [ ] Test Google Sign-In on a real device (not just simulator)
- [ ] Test the full forgot-password deep-link flow on a real device
- [ ] Set OAuth consent screen status to **Published** in Google Console
  *(required for users outside your test list)*
- [ ] Add Privacy Policy URL (required by both stores and Google OAuth)
- [ ] Review App Store / Play Store screenshots and description

---

## Summary — Minimum steps to run new auth features locally

| Step | Command / Action |
|------|-----------------|
| Install new Python packages | `cd gym-backend && uv sync` |
| Apply DB migration | `cd gym-backend && alembic upgrade head` |
| Add Google Client ID | Fill `.env` in both projects |
| Add Resend API key | Fill `gym-backend/.env` |
