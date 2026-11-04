import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format, isPast, addDays, isWithinInterval } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductInfo {
  name: string;
  brand: string;
  cropType: string;
  variety: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  manufacturer: string;
}

interface ProductInfoCardProps {
  product: ProductInfo;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

function getExpiryWarning(
  expiryDate: string,
): 'expired' | 'near_expiry' | null {
  try {
    const expiry = new Date(expiryDate);
    if (isPast(expiry)) return 'expired';
    if (isWithinInterval(new Date(), { start: new Date(), end: addDays(expiry, -30) }) === false) {
      // Within 30 days of expiry
      if (isWithinInterval(new Date(), { start: addDays(expiry, -30), end: expiry })) {
        return 'near_expiry';
      }
    }
  } catch {
    // Ignore malformed dates
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ProductInfoCard: React.FC<ProductInfoCardProps> = ({ product }) => {
  const { t } = useTranslation();
  const expiryWarning = getExpiryWarning(product.expiryDate);

  const rows: { label: string; value: string }[] = [
    { label: t('verification.productName'), value: product.name },
    { label: t('verification.manufacturer'), value: product.manufacturer },
    { label: 'Brand', value: product.brand },
    { label: 'Crop Type', value: product.cropType },
    { label: 'Variety', value: product.variety },
    { label: t('verification.batchNumber'), value: product.batchNumber },
    { label: t('verification.mfgDate'), value: formatDate(product.mfgDate) },
    {
      label: t('verification.expiryDate'),
      value: formatDate(product.expiryDate),
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('verification.productInfo')}</Text>

      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}

      {/* Expiry warning banner */}
      {expiryWarning === 'expired' && (
        <View style={styles.expiredBanner}>
          <Ionicons name="alert-circle" size={20} color="#dc2626" />
          <Text style={styles.expiredText}>{t('verification.expired')}</Text>
        </View>
      )}
      {expiryWarning === 'near_expiry' && (
        <View style={styles.nearExpiryBanner}>
          <Ionicons name="warning" size={20} color="#eab308" />
          <Text style={styles.nearExpiryText}>Expiring soon</Text>
        </View>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  label: {
    fontSize: 16,
    color: '#64748b',
    flex: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1.2,
    textAlign: 'right',
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  expiredText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },
  nearExpiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fefce8',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  nearExpiryText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#eab308',
  },
});

export default ProductInfoCard;
