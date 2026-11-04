import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useVerificationStore } from '../stores/verification.store';

export default function HistoryScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { scanHistory } = useVerificationStore();

  const statusEmoji = (status: string) => {
    switch (status) {
      case 'verified': return '✅';
      case 'suspicious': return '⚠️';
      case 'warning': return '🟡';
      case 'counterfeit': return '🔴';
      case 'expired': return '⏰';
      default: return '❓';
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'verified': return '#16a34a';
      case 'suspicious': return '#ea580c';
      case 'warning': return '#eab308';
      case 'counterfeit': return '#dc2626';
      case 'expired': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Verification', { cachedResult: item })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.emoji}>{statusEmoji(item.verificationStatus)}</Text>
        <View style={styles.cardContent}>
          <Text style={styles.productName} numberOfLines={1}>{item.productName || 'Unknown Product'}</Text>
          <Text style={styles.batchText}>Batch: {item.batchNumber || '—'}</Text>
          <Text style={styles.brandText}>{item.brandName || ''}</Text>
        </View>
        <View style={styles.rightSection}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(item.verificationStatus) + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor(item.verificationStatus) }]}>
              {item.verificationStatus?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.scannedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('history.title', 'Scan History')}</Text>
        <Text style={styles.count}>{scanHistory.length} {t('history.scans', 'scans')}</Text>
      </View>

      {scanHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>{t('history.empty', 'No Scans Yet')}</Text>
          <Text style={styles.emptyText}>
            {t('history.emptyText', 'Your scanned products will appear here. Start by scanning a QR code on a seed packet.')}
          </Text>
          <TouchableOpacity style={styles.scanButton} onPress={() => navigation.navigate('Scanner')}>
            <Text style={styles.scanButtonText}>{t('history.startScan', 'Start Scanning')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={scanHistory}
          renderItem={renderItem}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  count: { fontSize: 14, color: '#6b7280' },
  listContent: { padding: 20, paddingTop: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  emoji: { fontSize: 28, marginRight: 12 },
  cardContent: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  batchText: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  brandText: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  rightSection: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  dateText: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  scanButton: { backgroundColor: '#16a34a', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12 },
  scanButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});

