// ---------------------------------------------------------------------------
// EntitlementContext — RevenueCat wrapper.
//
// Exposes the user's subscription tier (isPro / isTrial) and the monthly
// package so the PaywallScreen can present accurate pricing.
//
// Ghost users: RevenueCat is NOT initialised — entitlement = guest limits.
// Free users:  Configured with anonymous ID → no 'pro' entitlement.
// Pro Trial:   entitlements.active['pro'] exists + periodType === 'TRIAL'
// Pro:         entitlements.active['pro'] exists
// ---------------------------------------------------------------------------

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

import { useAuth } from './AuthContext';
import { navigationRef } from '../navigation/navigationRef';

const PRO_ENTITLEMENT_ID = 'pro';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EntitlementContextType {
  isPro: boolean;
  isTrial: boolean;
  trialEndsAt: Date | null;
  /** The monthly package fetched from RevenueCat (null while loading or on error). */
  monthlyPackage: PurchasesPackage | null;
  /** Navigate to the PaywallScreen from anywhere in the app. */
  openPaywall: () => void;
  isLoading: boolean;
}

const EntitlementContext = createContext<EntitlementContextType>({
  isPro: false,
  isTrial: false,
  trialEndsAt: null,
  monthlyPackage: null,
  openPaywall: () => {},
  isLoading: false,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const EntitlementProvider = ({ children }: { children: React.ReactNode }) => {
  const { userToken, userEmail, isGuest } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // RC's native SDK is a singleton — configure only once per app run.
  // Subsequent user switches go through logIn().
  const configuredUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (isGuest) return;
    if (!userToken || !userEmail) return;

    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
    if (!apiKey) return;
    if (configuredUserRef.current === userEmail) return;

    let active = true;

    const setup = async () => {
      setIsLoading(true);
      try {
        if (configuredUserRef.current === null) {
          Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);
          Purchases.configure({ apiKey, appUserID: userEmail });
        } else {
          await Purchases.logIn(userEmail);
        }
        configuredUserRef.current = userEmail;
        Purchases.setEmail(userEmail);

        const info = await Purchases.getCustomerInfo();
        if (active) setCustomerInfo(info);

        Purchases.addCustomerInfoUpdateListener(updated => {
          if (active) setCustomerInfo(updated);
        });

        try {
          const offerings = await Purchases.getOfferings();
          const pkg =
            offerings.current?.monthly ??
            offerings.current?.availablePackages[0] ??
            null;
          if (active) setMonthlyPackage(pkg);
        } catch {
          // Offerings not yet configured in RevenueCat dashboard.
          // Expected until a Play Console product is created and synced.
        }
      } catch (e) {
        console.warn('[EntitlementContext] RevenueCat setup failed:', e);
      }
      if (active) setIsLoading(false);
    };

    setup();

    return () => {
      active = false;
    };
  }, [userToken, userEmail, isGuest]);

  // Derive subscription state from the latest CustomerInfo
  const proEntitlement = customerInfo?.entitlements.active[PRO_ENTITLEMENT_ID];
  const isPro = !!proEntitlement;
  const isTrial = isPro && proEntitlement.periodType === 'TRIAL';
  const trialEndsAt =
    isTrial && proEntitlement.expirationDate
      ? new Date(proEntitlement.expirationDate)
      : null;

  const openPaywall = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Paywall', undefined);
    }
  };

  return (
    <EntitlementContext.Provider
      value={{ isPro, isTrial, trialEndsAt, monthlyPackage, openPaywall, isLoading }}
    >
      {children}
    </EntitlementContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useEntitlements = () => useContext(EntitlementContext);
