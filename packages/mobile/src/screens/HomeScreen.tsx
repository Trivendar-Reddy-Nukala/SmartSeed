import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useVerificationStore } from '../stores/verification.store';
import { useAuthStore } from '../stores/auth.store';

export default function HomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { scanHistory } = useVerificationStore();
  const { user } = useAuthStore();

  const totalScans = scanHistory.length;
  const verifiedCount = scanHistory.filter((s: any) => s.verificationStatus === 'verified').length;
  const suspiciousCount = scanHistory.filter((s: any) => s.verificationStatus === 'suspicious' || s.verificationStatus === 'warning').length;
  const recentHistory = scanHistory.slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome */}
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeEmoji}>👋</Text>
        <Text style={styles.welcomeText}>{t('home.welcome', 'Welcome')},</Text>
        <Text style={styles.userName}>{user?.firstName || t('home.farmer', 'Farmer')}</Text>
      </View>

      {/* Primary Action */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('Scanner')}
        activeOpacity={0.8}
      >
        <Text style={styles.scanIcon}>📷</Text>
        <Text style={styles.scanButtonText}>{t('home.scanQr', 'SCAN QR CODE')}</Text>
        <Text style={styles.scanSubtext}>{t('home.scanSubtext', 'Verify your seed packet')}</Text>
      </TouchableOpacity>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>{totalScans}</Text>
          <Text style={styles.statLabel}>{t('home.totalScans', 'Total Scans')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{verifiedCount}</Text>
          <Text style={styles.statLabel}>{t('home.verified', 'Verified')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fef2f2' }]}>
          <Text style={[styles.statValue, { color: '#dc2626' }]}>{suspiciousCount}</Text>
          <Text style={styles.statLabel}>{t('home.suspicious', 'Suspicious')}</Text>
        </View>
      </View>

      {/* Recent History */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.recentScans', 'Recent Scans')}</Text>
          {scanHistory.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAll}>{t('home.seeAll', 'See All')}</Text>
            </TouchableOpacity>
          )}
        </View>
        {recentHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>{t('home.noScans', 'No scans yet. Tap the button above to scan a seed packet QR code.')}</Text>
          </View>
        ) : (
          recentHistory.map((item: any, index: number) => (
            <TouchableOpacity
              key={index}
              style={styles.historyItem}
              onPress={() => navigation.navigate('Verification', { cachedResult: item })}
            >
              <View style={[styles.statusDot, {
                backgroundColor: item.verificationStatus === 'verified' ? '#16a34a' :
                  item.verificationStatus === 'suspicious' ? '#ea580c' : '#dc2626'
              }]} />
              <View style={styles.historyContent}>
                <Text style={styles.historyProduct} numberOfLines={1}>{item.productName || 'Unknown Product'}</Text>
                <Text style={styles.historyBatch}>Batch: {item.batchNumber || '—'}</Text>
              </View>
              <Text style={styles.historyDate}>{new Date(item.scannedAt).toLocaleDateString()}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  welcomeCard: { marginBottom: 24 },
  welcomeEmoji: { fontSize: 32 },
  welcomeText: { fontSize: 18, color: '#6b7280', marginTop: 8 },
  userName: { fontSize: 28, fontWeight: '800', color: '#111827' },
  scanButton: {
    backgroundColor: '#16a34a', borderRadius: 20, paddingVertical: 28,
    alignItems: 'center', marginBottom: 24,
    shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  scanIcon: { fontSize: 40, marginBottom: 8 },
  scanButtonText: { fontSize: 22, fontWeight: '800', color: '#ffffff', letterSpacing: 1.5 },
  scanSubtext: { fontSize: 14, color: '#bbf7d0', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 14, color: '#16a34a', fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: 32, backgroundColor: '#ffffff', borderRadius: 16 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24 },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    padding: 16, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  historyContent: { flex: 1 },
  historyProduct: { fontSize: 16, fontWeight: '600', color: '#111827' },
  historyBatch: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  historyDate: { fontSize: 12, color: '#9ca3af' },
});

