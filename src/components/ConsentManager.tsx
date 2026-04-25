// ---------------------------------------------------------------------------
// ConsentManager / AdsProvider
//
// Handles the Google UMP (User Messaging Platform) GDPR consent flow and
// initialises AdMob after consent resolves.
//
// • EEA / UK users: consent form shown on first launch if required.
// • Non-EEA users: form skipped; MobileAds initialised immediately.
// • Children render instantly — no blocking spinner.
// • AdBanner components read `adsReady` and hold themselves until true.
// ---------------------------------------------------------------------------

import React, { createContext, useContext, useEffect, useState } from 'react';
import MobileAds, { AdsConsent, AdsConsentStatus, AdsConsentDebugGeography } from 'react-native-google-mobile-ads';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AdsContext = createContext({ adsReady: false });

export const useAdsReady = () => useContext(AdsContext).adsReady;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AdsProvider = ({ children }: { children: React.ReactNode }) => {
  const [adsReady, setAdsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      let consentGranted = true; // default true for non-EEA users

      try {
        // 1. Request UMP consent info (non-blocking — only shows a native dialog
        //    for EEA/UK users who haven't consented yet).
        //
        // DEV ONLY: forces the EEA consent form regardless of real location so
        // you can test the deny path without a VPN or real AdMob IDs.
        // To activate: add your device's hashed advertising ID below.
        // Find it in logcat after first UMP init — search for "Use new ConsentDebugSettings".
        // Safe in production: this block is dead code when EXPO_PUBLIC_ENV=production.
        const debugParams =
          process.env.EXPO_PUBLIC_ENV !== 'production'
            ? {
                debugGeography: AdsConsentDebugGeography.EEA,
                // testDeviceIdentifiers: ['YOUR_HASHED_DEVICE_ID'],
              }
            : undefined;

        const consentInfo = await AdsConsent.requestInfoUpdate(debugParams);

        if (
          consentInfo.isConsentFormAvailable &&
          consentInfo.status === AdsConsentStatus.REQUIRED
        ) {
          await AdsConsent.showForm();
        }

        // Re-read status after the form to detect a deny response.
        // canRequestAds is available in react-native-google-mobile-ads v14+;
        // fall back to status comparison for older versions.
        const finalInfo = await AdsConsent.requestInfoUpdate();
        const canRequest = (finalInfo as any).canRequestAds;
        if (canRequest !== undefined) {
          consentGranted = canRequest;
        } else {
          consentGranted =
            finalInfo.status === AdsConsentStatus.OBTAINED ||
            finalInfo.status === AdsConsentStatus.NOT_REQUIRED;
        }
      } catch (e) {
        // Consent errors are non-fatal — proceed to init so non-EEA users
        // aren't blocked (likely a simulator / test environment).
        console.warn('[AdsProvider] UMP consent error (non-fatal):', e);
      }

      // 2. Only initialise AdMob if consent was granted (or not required).
      //    GDPR: denying consent must not block app use, but ads must not load.
      if (!consentGranted) return;

      try {
        await MobileAds().initialize();
        if (mounted) setAdsReady(true);
      } catch (e) {
        console.warn('[AdsProvider] MobileAds init error:', e);
        // Leave adsReady = false — AdBanner won't render, no crash.
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  return (
    <AdsContext.Provider value={{ adsReady }}>
      {children}
    </AdsContext.Provider>
  );
};
