import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

// Placeholder notifications — in production these come from push notifications / API
const PLACEHOLDER_NOTIFICATIONS: any[] = [];

export default function NotificationsScreen() {
  const { t } = useTranslation();

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.card, !item.isRead && styles.unreadCard]}>
      <View style={styles.row}>
        <View style={[styles.dot, !item.isRead && styles.unreadDot]} />
        <View style={styles.content}>
          <Text style={[styles.cardTitle, !item.isRead && styles.unreadTitle]}>{item.title}</Text>
          <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('notifications.title', 'Notifications')}</Text>
      </View>

      {PLACEHOLDER_NOTIFICATIONS.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>{t('notifications.empty', 'No Notifications')}</Text>
          <Text style={styles.emptyText}>
            {t('notifications.emptyText', 'You will receive alerts about your scanned products and important updates here.')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={PLACEHOLDER_NOTIFICATIONS}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  listContent: { padding: 20, paddingTop: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: '#16a34a', backgroundColor: '#f0fdf4' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent', marginTop: 6, marginRight: 10 },
  unreadDot: { backgroundColor: '#16a34a' },
  content: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  unreadTitle: { fontWeight: '700', color: '#111827' },
  cardMessage: { fontSize: 14, color: '#6b7280', marginTop: 4, lineHeight: 20 },
  cardDate: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24 },
});

