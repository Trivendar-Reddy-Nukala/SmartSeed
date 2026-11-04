import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import ProductInfoCard from '../components/ProductInfoCard';
import JourneyTimeline from '../components/JourneyTimeline';

export default function ProductPassportScreen({ route }: any) {
  const { t } = useTranslation();
  const { data } = route.params || {};

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('passport.noData', 'No product data available')}</Text>
      </View>
    );
  }

  const journey = data.journey || [];
  const certifications = data.certifications || [];
  const isExpired = data.isExpired;
  const daysUntilExpiry = data.daysUntilExpiry;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('passport.title', 'Digital Product Passport')}</Text>
      <Text style={styles.subtitle}>{t('passport.subtitle', 'Complete product traceability record')}</Text>

      {/* Product Info */}
      <ProductInfoCard data={data} />

      {/* Manufacturer Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏭 {t('passport.manufacturer', 'Manufacturer')}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('passport.company', 'Company')}</Text>
          <Text style={styles.infoValue}>{data.manufacturerName || '—'}</Text>
        </View>
      </View>

      {/* Supply Chain Journey */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚚 {t('passport.journey', 'Supply Chain Journey')}</Text>
        {journey.length > 0 ? (
          <JourneyTimeline events={journey} />
        ) : (
          <Text style={styles.emptyText}>{t('passport.noJourney', 'No journey data available')}</Text>
        )}
      </View>

      {/* Certifications */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 {t('passport.certifications', 'Certifications')}</Text>
        {certifications.length > 0 ? (
          certifications.map((cert: string, i: number) => (
            <View key={i} style={styles.certItem}>
              <Text style={styles.certIcon}>✅</Text>
              <Text style={styles.certText}>{cert}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>{t('passport.noCerts', 'No certifications listed')}</Text>
        )}
      </View>

      {/* Blockchain Verification */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔗 {t('passport.blockchain', 'Blockchain Verification')}</Text>
        <View style={styles.blockchainStatus}>
          <Text style={styles.verifiedIcon}>{data.blockchainVerified ? '✅' : '❌'}</Text>
          <Text style={[styles.verifiedText, { color: data.blockchainVerified ? '#16a34a' : '#dc2626' }]}>
            {data.blockchainVerified
              ? t('passport.blockchainVerified', 'Verified on blockchain')
              : t('passport.blockchainUnverified', 'Not verified on blockchain')
            }
          </Text>
        </View>
        {data.totalTransactions != null && (
          <Text style={styles.txCount}>
            {t('passport.totalTx', 'Total blockchain transactions')}: {data.totalTransactions}
          </Text>
        )}
      </View>

      {/* Expiry Info */}
      <View style={[styles.card, isExpired ? styles.expiredCard : null]}>
        <Text style={styles.cardTitle}>📅 {t('passport.expiry', 'Expiry Information')}</Text>
        <View style={styles.expiryContent}>
          {isExpired ? (
            <>
              <Text style={styles.expiredBadge}>⛔ {t('passport.expired', 'EXPIRED')}</Text>
              <Text style={styles.expiryDate}>{t('passport.expiredOn', 'Expired on')}: {data.expiryDate}</Text>
            </>
          ) : (
            <>
              <Text style={styles.validBadge}>✅ {t('passport.valid', 'VALID')}</Text>
              <Text style={styles.expiryDate}>{t('passport.expiresOn', 'Expires on')}: {data.expiryDate}</Text>
              {daysUntilExpiry != null && daysUntilExpiry <= 90 && (
                <Text style={styles.expiryWarning}>
                  ⚠️ {t('passport.expiringSoon', 'Expiring in {{days}} days', { days: daysUntilExpiry })}
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6b7280' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  expiredCard: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  emptyText: { fontSize: 14, color: '#9ca3af', fontStyle: 'italic' },
  certItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  certIcon: { fontSize: 16, marginRight: 8 },
  certText: { fontSize: 14, color: '#374151' },
  blockchainStatus: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  verifiedIcon: { fontSize: 20, marginRight: 8 },
  verifiedText: { fontSize: 16, fontWeight: '600' },
  txCount: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  expiryContent: { alignItems: 'flex-start' },
  expiredBadge: { fontSize: 18, fontWeight: '800', color: '#dc2626', marginBottom: 8 },
  validBadge: { fontSize: 18, fontWeight: '800', color: '#16a34a', marginBottom: 8 },
  expiryDate: { fontSize: 15, color: '#374151' },
  expiryWarning: { fontSize: 14, color: '#ea580c', fontWeight: '600', marginTop: 8 },
});

