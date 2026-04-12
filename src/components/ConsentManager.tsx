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
import MobileAds, { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';

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
      try {
        // 1. Request UMP consent info (non-blocking — only shows a native dialog
        //    for EEA/UK users who haven't consented yet).
        const consentInfo = await AdsConsent.requestInfoUpdate();

        if (
          consentInfo.isConsentFormAvailable &&
          consentInfo.status === AdsConsentStatus.REQUIRED
        ) {
          await AdsConsent.showForm();
        }
      } catch (e) {
        // Consent errors are non-fatal — proceed to init so non-EEA users
        // aren't blocked (likely a simulator / test environment).
        console.warn('[AdsProvider] UMP consent error (non-fatal):', e);
      }

      try {
        // 2. Initialise AdMob after consent is resolved (or skipped).
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
