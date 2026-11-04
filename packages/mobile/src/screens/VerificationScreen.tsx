import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useVerificationStore } from '../stores/verification.store';
import StatusBadge from '../components/StatusBadge';
import ProductInfoCard from '../components/ProductInfoCard';

export default function VerificationScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const { token, cachedResult } = route.params || {};
  const { currentResult, isVerifying, verify, clearResult } = useVerificationStore();

  useEffect(() => {
    if (cachedResult) return; // Using cached result from history
    if (token) {
      verify(token);
    }
    return () => clearResult();
  }, [token]);

  const result = cachedResult || currentResult;

  const handleShare = async () => {
    if (!result) return;
    try {
      await Share.share({
        message: `SmartSeed Verification\nProduct: ${result.productName}\nBatch: ${result.batchNumber}\nStatus: ${result.verificationStatus}\nManufacturer: ${result.manufacturerName}`,
      });
    } catch (e) { /* user cancelled */ }
  };

  if (isVerifying && !cachedResult) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>{t('verification.verifying', 'Verifying product...')}</Text>
        <Text style={styles.loadingSubtext}>{t('verification.pleaseWait', 'Please wait while we check the blockchain')}</Text>
      </View>
    );
  }

  if (!result) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>{t('verification.error', 'Verification Failed')}</Text>
        <Text style={styles.errorText}>{t('verification.errorText', 'Could not verify this product. Please try again.')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>{t('verification.tryAgain', 'Try Again')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const riskScore = result.riskScore ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Badge */}
      <View style={styles.statusSection}>
        <StatusBadge status={result.verificationStatus || 'unverified'} />
      </View>

      {/* Risk Score */}
      <View style={styles.riskContainer}>
        <Text style={styles.riskLabel}>{t('verification.riskScore', 'Risk Score')}</Text>
        <View style={styles.riskBarBg}>
          <View style={[styles.riskBarFill, {
            width: `${Math.min(riskScore, 100)}%`,
            backgroundColor: riskScore >= 80 ? '#dc2626' : riskScore >= 60 ? '#ea580c' : riskScore >= 30 ? '#eab308' : '#16a34a',
          }]} />
        </View>
        <View style={styles.riskScoreRow}>
          <Text style={[styles.riskValue, {
            color: riskScore >= 80 ? '#dc2626' : riskScore >= 60 ? '#ea580c' : riskScore >= 30 ? '#eab308' : '#16a34a',
          }]}>{riskScore}</Text>
          <Text style={styles.riskMax}>/100</Text>
        </View>
      </View>

      {/* Product Info */}
      <ProductInfoCard data={result} />

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ProductPassport', { data: result })}
        >
          <Text style={styles.actionIcon}>📜</Text>
          <Text style={styles.actionText}>{t('verification.viewJourney', 'View Full Journey')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={handleShare}
        >
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionText}>{t('verification.share', 'Share Result')}</Text>
        </TouchableOpacity>
      </View>

      {/* Report Button */}
      {(result.verificationStatus === 'suspicious' || result.verificationStatus === 'warning') && (
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => navigation.navigate('Report', { batchId: result.batchId, batchNumber: result.batchNumber })}
        >
          <Text style={styles.reportIcon}>🚨</Text>
          <Text style={styles.reportText}>{t('verification.reportProblem', 'Report Problem')}</Text>
        </TouchableOpacity>
      )}

      {/* Scan Another */}
      <TouchableOpacity
        style={styles.scanAnotherButton}
        onPress={() => navigation.navigate('Scanner')}
      >
        <Text style={styles.scanAnotherText}>{t('verification.scanAnother', 'Scan Another Packet')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 32 },
  loadingText: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 20 },
  loadingSubtext: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  errorIcon: { fontSize: 56, marginBottom: 16 },
  errorTitle: { fontSize: 24, fontWeight: '700', color: '#dc2626', marginBottom: 8 },
  errorText: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: '#16a34a', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12 },
  retryButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  statusSection: { alignItems: 'center', marginBottom: 20 },
  riskContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f3f4f6' },
  riskLabel: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 10 },
  riskBarBg: { height: 12, backgroundColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' },
  riskBarFill: { height: '100%', borderRadius: 6 },
  riskScoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  riskValue: { fontSize: 32, fontWeight: '800' },
  riskMax: { fontSize: 16, color: '#9ca3af', marginLeft: 2 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionButton: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 18,
    alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb',
  },
  shareButton: {},
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionText: { fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'center' },
  reportButton: {
    backgroundColor: '#fef2f2', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#fecaca', marginBottom: 16,
  },
  reportIcon: { fontSize: 24, marginRight: 8 },
  reportText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
  scanAnotherButton: {
    backgroundColor: '#16a34a', borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', marginTop: 8,
  },
  scanAnotherText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});

