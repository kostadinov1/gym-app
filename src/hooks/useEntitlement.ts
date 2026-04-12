// ---------------------------------------------------------------------------
// useEntitlement — computed feature gates derived from the EntitlementContext.
//
// Usage:
//   const { canExport, showAds, openPaywall } = useEntitlement();
//   if (!canExport) { openPaywall(); return; }
// ---------------------------------------------------------------------------

import { useAuth } from '../context/AuthContext';
import { useEntitlements } from '../context/EntitlementContext';

export const useEntitlement = () => {
  const { isGuest } = useAuth();
  const { isPro, isTrial, trialEndsAt, openPaywall } = useEntitlements();

  return {
    // ── Tier flags ──────────────────────────────────────────────────────────
    isPro,
    isTrial,
    isGuest,
    trialEndsAt,

    // ── Feature gates ────────────────────────────────────────────────────────
    // Export is Pro/Trial only
    canExport: isPro || isTrial,

    // Cloud sync requires a real account (not guest) AND Pro/Trial
    canCloudSync: !isGuest && (isPro || isTrial),

    // Full analytics chart history is Pro/Trial only; guests see empty state
    canViewFullAnalytics: !isGuest && (isPro || isTrial),

    // Ads are shown to guests and free registered users; hidden for Pro/Trial
    showAds: !isPro && !isTrial,

    // ── Navigation helper ─────────────────────────────────────────────────
    openPaywall,
  };
};
