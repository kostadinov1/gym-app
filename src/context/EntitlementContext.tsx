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

import React, { createContext, useContext, useEffect, useState } from 'react';
import Purchases from 'react-native-purchases';
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
  const { userToken, isGuest } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Ghost users have no subscription — skip RevenueCat entirely.
    if (isGuest) return;

    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
    if (!apiKey) return; // key not set in .env yet

    let active = true;

    const setup = async () => {
      setIsLoading(true);
      try {
        Purchases.configure({ apiKey, appUserID: userToken ?? undefined });

        const info = await Purchases.getCustomerInfo();
        if (active) setCustomerInfo(info);

        const offerings = await Purchases.getOfferings();
        const pkg =
          offerings.current?.monthly ??
          offerings.current?.availablePackages[0] ??
          null;
        if (active) setMonthlyPackage(pkg);

        // Stay in sync when the subscription changes (e.g. after purchase)
        Purchases.addCustomerInfoUpdateListener(updated => {
          if (active) setCustomerInfo(updated);
        });
      } catch (e) {
        // Graceful degradation — treat as free tier
        console.warn('[EntitlementContext] RevenueCat setup failed:', e);
      }
      if (active) setIsLoading(false);
    };

    setup();

    return () => {
      active = false;
    };
  }, [userToken, isGuest]);

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
