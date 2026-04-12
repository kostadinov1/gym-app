import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Purchases from 'react-native-purchases';

import { useTheme } from '../theme';
import { useEntitlements } from '../context/EntitlementContext';

// ---------------------------------------------------------------------------
// Feature list shown in the paywall
// ---------------------------------------------------------------------------

const PRO_FEATURES = [
  { icon: 'infinite-outline',   label: 'Unlimited plans & workout history' },
  { icon: 'cloud-outline',      label: 'Cloud sync across devices' },
  { icon: 'download-outline',   label: 'Export to CSV & JSON (Strong-compatible)' },
  { icon: 'bar-chart-outline',  label: 'Full analytics — all-time history' },
  { icon: 'ban-outline',        label: 'No ads' },
] as const;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PaywallScreen() {
  const theme    = useTheme();
  const navigation = useNavigation();
  const { monthlyPackage } = useEntitlements();

  const [purchasing, setPurchasing]  = useState(false);
  const [restoring,  setRestoring]   = useState(false);

  // ── Price display ─────────────────────────────────────────────────────────
  const priceText = monthlyPackage
    ? monthlyPackage.product.priceString
    : '—';

  const trialText = monthlyPackage?.product.introPrice
    ? `${monthlyPackage.product.introPrice.periodNumberOfUnits}-${monthlyPackage.product.introPrice.periodUnit.toLowerCase()} free trial`
    : '14-day free trial';

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSubscribe = async () => {
    if (!monthlyPackage) {
      Alert.alert('Not available', 'Could not load subscription details. Please try again.');
      return;
    }
    setPurchasing(true);
    try {
      await Purchases.purchasePackage(monthlyPackage);
      navigation.goBack();
    } catch (e: any) {
      // User cancelled: error code 1 — no toast needed
      if (e?.code !== 1) {
        Alert.alert('Purchase failed', e?.message ?? 'An unexpected error occurred.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await Purchases.restorePurchases();
      Alert.alert('Restored', 'Your purchases have been restored.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? 'An unexpected error occurred.');
    } finally {
      setRestoring(false);
    }
  };

  const handlePrivacyPolicy = () => {
    // Replace with your actual privacy policy URL
    Linking.openURL('https://your-domain.com/privacy');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="barbell" size={52} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>Gym Tracker Pro</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Everything you need, no limits.
          </Text>
        </View>

        {/* Features */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {PRO_FEATURES.map(f => (
            <View key={f.icon} style={styles.featureRow}>
              <Ionicons name={f.icon} size={20} color={theme.colors.primary} style={styles.featureIcon} />
              <Text style={[styles.featureLabel, { color: theme.colors.text }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Trial badge */}
        <View style={[styles.trialBadge, { backgroundColor: theme.colors.primary + '22', borderColor: theme.colors.primary }]}>
          <Ionicons name="gift-outline" size={16} color={theme.colors.primary} />
          <Text style={[styles.trialText, { color: theme.colors.primary }]}>
            {' '}Start with a {trialText}
          </Text>
        </View>

        {/* Subscribe CTA */}
        <TouchableOpacity
          style={[styles.subscribeButton, { backgroundColor: theme.colors.primary }, purchasing && styles.disabled]}
          onPress={handleSubscribe}
          disabled={purchasing || restoring}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.subscribeButtonText}>Start Free Trial</Text>
              <Text style={styles.subscribeButtonSub}>{priceText} / month after trial</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Fine print */}
        <Text style={[styles.finePrint, { color: theme.colors.textSecondary }]}>
          Cancel anytime. Subscription auto-renews monthly after the trial.
          Manage in Google Play → Subscriptions.
        </Text>

        {/* Restore purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={purchasing || restoring}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          ) : (
            <Text style={[styles.restoreText, { color: theme.colors.textSecondary }]}>
              Restore Purchases
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePrivacyPolicy}>
          <Text style={[styles.privacyText, { color: theme.colors.textSecondary }]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  featureIcon: {
    marginRight: 12,
    width: 24,
  },
  featureLabel: {
    fontSize: 15,
    flex: 1,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
  },
  trialText: {
    fontWeight: '600',
    fontSize: 14,
  },
  subscribeButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subscribeButtonSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  disabled: {
    opacity: 0.6,
  },
  finePrint: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  restoreButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  restoreText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  privacyText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
