import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/auth.store';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'te', label: 'తెలుగు' },
];

export default function ProfileScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const changeLanguage = async (code: string) => {
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem('preferred_language', code);
    setCurrentLang(code);
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout', 'Logout'),
      t('profile.logoutConfirm', 'Are you sure you want to logout?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('profile.logout', 'Logout'), style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Info */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {isAuthenticated ? (user?.firstName?.[0] || 'F').toUpperCase() : '👤'}
          </Text>
        </View>
        <Text style={styles.userName}>
          {isAuthenticated ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : t('profile.guest', 'Guest Farmer')}
        </Text>
        {isAuthenticated && <Text style={styles.userEmail}>{user?.email}</Text>}
        {!isAuthenticated && (
          <Text style={styles.guestText}>{t('profile.guestInfo', 'Using SmartSeed without an account')}</Text>
        )}
      </View>

      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌍 {t('profile.language', 'Language')}</Text>
        <View style={styles.langOptions}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langButton, currentLang === lang.code && styles.langActive]}
              onPress={() => changeLanguage(lang.code)}
            >
              <Text style={[styles.langText, currentLang === lang.code && styles.langTextActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ {t('profile.about', 'About SmartSeed')}</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>
            {t('profile.aboutText', 'SmartSeed is a blockchain-based seed supply chain traceability platform that helps farmers verify the authenticity of their seed purchases.')}
          </Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('profile.version', 'Version')}</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('profile.platform', 'Platform')}</Text>
            <Text style={styles.aboutValue}>SmartSeed</Text>
          </View>
        </View>
      </View>

      {/* Help */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>❓ {t('profile.help', 'Help & FAQ')}</Text>
        <View style={styles.helpCard}>
          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>{t('profile.faq1Q', 'How do I scan a QR code?')}</Text>
            <Text style={styles.faqA}>{t('profile.faq1A', 'Tap the "Scan QR Code" button on the home screen and point your camera at the QR code on the seed packet.')}</Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>{t('profile.faq2Q', 'What does "Verified" mean?')}</Text>
            <Text style={styles.faqA}>{t('profile.faq2A', 'A verified product has been confirmed authentic through our blockchain-based traceability system.')}</Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>{t('profile.faq3Q', 'How do I report a fake product?')}</Text>
            <Text style={styles.faqA}>{t('profile.faq3A', 'After scanning, if the product is suspicious, tap "Report Problem" to submit a report to our investigation team.')}</Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      {isAuthenticated && (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('profile.logout', 'Logout')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center',
    marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6',
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#dcfce7',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#16a34a' },
  userName: { fontSize: 22, fontWeight: '800', color: '#111827' },
  userEmail: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  guestText: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  langOptions: { flexDirection: 'row', gap: 10 },
  langButton: {
    flex: 1, backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', borderWidth: 2, borderColor: '#e5e7eb',
  },
  langActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  langText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  langTextActive: { color: '#16a34a' },
  aboutCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#f3f4f6' },
  aboutText: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 16 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  aboutLabel: { fontSize: 14, color: '#6b7280' },
  aboutValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  helpCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#f3f4f6' },
  faqItem: { marginBottom: 16 },
  faqQ: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  faqA: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  logoutButton: {
    backgroundColor: '#fef2f2', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#fecaca',
  },
  logoutText: { fontSize: 18, fontWeight: '700', color: '#dc2626' },
});

