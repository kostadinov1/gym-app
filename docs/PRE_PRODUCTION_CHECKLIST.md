# Pre-Production Checklist

Everything needed before uploading to Google Play Console.

> **Currently testing locally (APK sideload)?**
> You can skip all of this for now. The app degrades gracefully:
> - Sentry is disabled when `EXPO_PUBLIC_ENV !== 'production'`
> - RevenueCat skips init when the API key is empty (app runs with guest-tier limits)
> - AdMob already uses Google test IDs in `.env` (no account needed, no real traffic)
> - Privacy policy links just won't open — not a blocker for functional testing

---

## 1. Sentry (Error Tracking)

- [ ] Create account at [sentry.io](https://sentry.io)
- [ ] New Project → React Native → name it "Hardlog"
- [ ] Copy the DSN (looks like `https://xxxx@oYYY.ingest.sentry.io/ZZZZ`)
- [ ] Paste into `.env.production`: `EXPO_PUBLIC_SENTRY_DSN=<your DSN>`
- [ ] Verify: production build throws a test error → it appears in the Sentry Issues dashboard

---

## 2. RevenueCat (Subscriptions)

- [ ] Create account at [app.revenuecat.com](https://app.revenuecat.com)
- [ ] Create **two separate apps** in RevenueCat (both with package `com.gencho.hardlog`):
  - "Hardlog Dev" — for development builds
  - "Hardlog Prod" — for production builds
- [ ] Copy Dev API key → paste into `.env`: `EXPO_PUBLIC_REVENUECAT_API_KEY=<dev key>`
- [ ] Copy Prod API key → paste into `.env.production`: `EXPO_PUBLIC_REVENUECAT_API_KEY=<prod key>`
- [ ] After creating the Play Console subscription product (step 8):
  - In the **Prod** RevenueCat app: Products → Add `monthly_pro`
  - Entitlements → Create `pro` → attach `monthly_pro`
  - Offerings → Create `default` offering → add `monthly_pro` as the monthly package

---

## 3. AdMob (Ads)

> Identity verification can take ~24 hours. Do this first.

- [ ] Create account at [admob.google.com](https://admob.google.com)
- [ ] Add app: Apps → Add app → Android → App not published yet → name "Hardlog" → package `com.gencho.hardlog`
- [ ] Copy the **App ID** (format `ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN`)
  - Paste into `.env.production`: `EXPO_PUBLIC_ADMOB_APP_ID=<real app ID>`
  - Replace the test ID in `app.json`:
    ```json
    "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~NNNNNNNNNN"
    ```
- [ ] Create ad unit: Ad units → Add ad unit → Banner → name "Home Banner"
- [ ] Copy the **Banner Ad Unit ID** (format `ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN`)
  - Paste into `.env.production`: `EXPO_PUBLIC_ADMOB_BANNER_ID=<real banner ID>`

---

## 4. Privacy Policy & Terms of Service

- [ ] Write a privacy policy (must cover: data collected, ad partners, user rights, contact email)
  - Simple option: create a public Notion page, GitHub Gist, or a free GitHub Pages site
- [ ] Write terms of service (covers subscription, cancellation, refund policy)
- [ ] Host both at stable HTTPS URLs, e.g.:
  - `https://your-domain.com/privacy`
  - `https://your-domain.com/terms`

---

## 5. Code: Replace Placeholder URLs

Two files have `https://your-domain.com/privacy` hardcoded — replace after hosting the policy:

- [ ] `src/screens/PaywallScreen.tsx` line 88:
  ```ts
  Linking.openURL('https://your-domain.com/privacy');
  // → replace with your real privacy policy URL
  ```
- [ ] `src/screens/ProfileScreen.tsx` line 330:
  ```ts
  onPress={() => Linking.openURL('https://your-domain.com/privacy')}
  // → replace with your real privacy policy URL
  ```

---

## 6. Fill .env.production

All four values must be filled before the production EAS build:

```
EXPO_PUBLIC_SENTRY_DSN=https://xxxx@oXXX.ingest.sentry.io/YYYY     ← from step 1
EXPO_PUBLIC_REVENUECAT_API_KEY=appl_PROD_KEY_HERE                   ← from step 2
EXPO_PUBLIC_ADMOB_APP_ID=ca-app-pub-REAL~APPID                      ← from step 3
EXPO_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-REAL/BANNERID                ← from step 3
```

---

## 7. Google Play Console Setup

- [ ] Register developer account at [play.google.com/console](https://play.google.com/console) ($25 one-time fee)
- [ ] Create app → Android → Package name `com.gencho.hardlog`
- [ ] **Create subscription product**: Monetize → Subscriptions → Create product
  - Product ID: `monthly_pro`
  - Set monthly price (e.g. €4.99 / $4.99)
  - Add 14-day free trial in the subscription settings
  - Activate the product
- [ ] Complete **Data safety form**:
  - Account info: email address (collected, not shared)
  - Fitness info: workout logs (collected, not shared, user can delete)
  - Financial info: not collected directly (handled by Play Billing)
- [ ] Complete **Content rating questionnaire** → "Everyone"
- [ ] Add **store listing**:
  - Short description (80 chars max)
  - Full description
  - At least 2 phone screenshots
  - Feature graphic (1024×500 px)
  - App icon (512×512 px)
  - Privacy policy URL (from step 4)
- [ ] After publishing: link the Play Console app to the **RevenueCat Prod** app (RevenueCat → App settings → Google Play)

---

## 8. Keystore & EAS Build

- [ ] Generate upload keystore (if not already done):
  ```bash
  eas credentials --platform android
  # Select: Set up a new keystore
  ```
- [ ] **Back up the keystore** to a password manager or secure cloud storage
  - Losing the keystore means you cannot update the app — you'd have to publish a new one
- [ ] Run the production build:
  ```bash
  eas build --platform android --profile production
  ```
- [ ] Download the `.aab` from the EAS dashboard
- [ ] Upload to Play Console → Testing → Internal testing → Create new release → Upload AAB

---

## 9. Final QA (on test device, internal test track)

Do this after uploading to the internal test track — not with a sideloaded APK.

- [ ] Guest flow: browse exercises, create plan, log a workout, view in history
- [ ] Registration + migration: ghost data fully appears after creating an account
- [ ] RevenueCat free trial: subscribe → Pro features unlocked, ads disappear
- [ ] Export: Pro user exports CSV → share sheet opens → file opens in spreadsheet
- [ ] AdMob: banner visible for guest/free user (test accounts see test ads, not real ones)
- [ ] Sentry: trigger a test error in the app → it appears in the Sentry Issues dashboard
- [ ] Privacy policy link in ProfileScreen opens the correct page
- [ ] Manage Subscription link in ProfileScreen opens Play Store subscriptions

---

## Quick Reference: Files Modified During Setup

| File | What to change |
|---|---|
| `.env` | `EXPO_PUBLIC_REVENUECAT_API_KEY` (Dev key from step 2) |
| `.env.production` | All 4 values (steps 1, 2, 3) |
| `app.json` | `androidAppId` → real AdMob App ID (step 3) |
| `src/screens/PaywallScreen.tsx:88` | Privacy policy URL (step 5) |
| `src/screens/ProfileScreen.tsx:330` | Privacy policy URL (step 5) |
