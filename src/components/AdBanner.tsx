// ---------------------------------------------------------------------------
// AdBanner — renders a standard AdMob banner ad.
//
// • Does NOT render until AdMob is initialised (useAdsReady).
// • Does NOT render for Pro / Trial users (showAds gate).
// • Dev builds always use the Google test banner unit ID so real AdMob
//   accounts are never flagged for invalid traffic.
// ---------------------------------------------------------------------------

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { useAdsReady } from './ConsentManager';
import { useEntitlement } from '../hooks/useEntitlement';

// In dev use the Google-provided test ID; in production use the real unit ID
// from the .env file.
const AD_UNIT_ID =
  process.env.EXPO_PUBLIC_ENV === 'production'
    ? (process.env.EXPO_PUBLIC_ADMOB_BANNER_ID ?? TestIds.BANNER)
    : TestIds.BANNER;

export const AdBanner = () => {
  const adsReady = useAdsReady();
  const { showAds } = useEntitlement();

  if (!adsReady || !showAds) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
});
