import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = 'verified' | 'suspicious' | 'warning' | 'counterfeit' | 'expired';

interface StatusBadgeProps {
  status: Status;
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  Status,
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; labelKey: string }
> = {
  verified: {
    color: '#16a34a',
    bg: '#dcfce7',
    icon: 'checkmark-circle',
    labelKey: 'verification.verified',
  },
  suspicious: {
    color: '#f97316',
    bg: '#fff7ed',
    icon: 'alert-circle',
    labelKey: 'verification.suspicious',
  },
  warning: {
    color: '#eab308',
    bg: '#fefce8',
    icon: 'warning',
    labelKey: 'verification.warning',
  },
  counterfeit: {
    color: '#dc2626',
    bg: '#fef2f2',
    icon: 'close-circle',
    labelKey: 'verification.unverified',
  },
  expired: {
    color: '#6b7280',
    bg: '#f3f4f6',
    icon: 'time',
    labelKey: 'verification.expired',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={48} color={config.color} />
      <Text style={[styles.label, { color: config.color }]}>
        {t(config.labelKey)}
      </Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 16,
    minHeight: 120,
  },
  label: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default StatusBadge;
