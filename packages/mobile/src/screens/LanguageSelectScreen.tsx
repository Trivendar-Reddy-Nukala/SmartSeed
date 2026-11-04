import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
];

export default function LanguageSelectScreen({ navigation }: any) {
  const { i18n } = useTranslation();

  const selectLanguage = async (code: string) => {
    await i18n.changeLanguage(code);
    await AsyncStorage.setItem('preferred_language', code);
    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌍</Text>
      <Text style={styles.title}>Choose Your Language</Text>
      <Text style={styles.subtitle}>अपनी भाषा चुनें • మీ భాషను ఎంచుకోండి</Text>

      <View style={styles.buttonContainer}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={styles.langButton}
            onPress={() => selectLanguage(lang.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <View style={styles.langTextContainer}>
              <Text style={styles.langNative}>{lang.native}</Text>
              <Text style={styles.langLabel}>{lang.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 24 },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 40 },
  buttonContainer: { width: '100%', gap: 16 },
  langButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    paddingVertical: 20, paddingHorizontal: 24, borderRadius: 16,
    borderWidth: 2, borderColor: '#e5e7eb', minHeight: 72,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  flag: { fontSize: 32, marginRight: 16 },
  langTextContainer: { flex: 1 },
  langNative: { fontSize: 22, fontWeight: '700', color: '#111827' },
  langLabel: { fontSize: 14, color: '#6b7280', marginTop: 2 },
});

