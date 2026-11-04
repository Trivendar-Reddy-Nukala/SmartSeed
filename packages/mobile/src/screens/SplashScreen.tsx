import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../stores/auth.store';

export default function SplashScreen({ navigation }: any) {
  const { loadStoredAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await loadStoredAuth();
      setTimeout(() => {
        navigation.replace(isAuthenticated ? 'MainTabs' : 'LanguageSelect');
      }, 2000);
    };
    init();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoIcon}>🌱</Text>
        <Text style={styles.logoText}>SmartSeed</Text>
        <Text style={styles.tagline}>Verify Your Seeds. Protect Your Harvest.</Text>
      </View>
      <ActivityIndicator size="large" color="#16a34a" style={styles.loader} />
      <Text style={styles.version}>v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  logoContainer: { alignItems: 'center' },
  logoIcon: { fontSize: 64, marginBottom: 12 },
  logoText: { fontSize: 36, fontWeight: '800', color: '#16a34a', letterSpacing: 1 },
  tagline: { fontSize: 16, color: '#4b5563', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  loader: { marginTop: 40 },
  version: { position: 'absolute', bottom: 40, fontSize: 14, color: '#9ca3af' },
});

