import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { verificationService } from '../services/verification.service';

const REASONS = [
  { value: 'suspected_fake', label: 'Suspected Fake Product' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'packaging_damage', label: 'Packaging Damage / Tampering' },
  { value: 'expired', label: 'Expired Product Being Sold' },
  { value: 'other', label: 'Other' },
];

export default function ReportScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const { batchId, batchNumber } = route.params || {};
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [shopName, setShopName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert(t('report.error', 'Error'), t('report.selectReason', 'Please select a reason'));
      return;
    }

    setIsSubmitting(true);
    try {
      await verificationService.reportCounterfeit({
        batchId,
        reason,
        description,
        shopName,
      });
      setSubmitted(true);
    } catch (error) {
      Alert.alert(
        t('report.error', 'Error'),
        t('report.submitError', 'Failed to submit report. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>{t('report.submitted', 'Report Submitted')}</Text>
        <Text style={styles.successText}>
          {t('report.submittedText', 'Thank you for reporting. Our team will investigate this batch. You may be contacted for additional information.')}
        </Text>
        <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
          <Text style={styles.doneButtonText}>{t('common.done', 'Done')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>🚨 {t('report.title', 'Report Suspected Counterfeit')}</Text>
      {batchNumber && (
        <Text style={styles.batchInfo}>{t('report.batch', 'Batch')}: {batchNumber}</Text>
      )}

      {/* Reason Selection */}
      <Text style={styles.label}>{t('report.reason', 'Reason')} *</Text>
      <View style={styles.reasonContainer}>
        {REASONS.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.reasonOption, reason === r.value && styles.reasonSelected]}
            onPress={() => setReason(r.value)}
          >
            <View style={[styles.radio, reason === r.value && styles.radioSelected]} />
            <Text style={[styles.reasonText, reason === r.value && styles.reasonTextSelected]}>
              {t(`report.reasons.${r.value}`, r.label)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description */}
      <Text style={styles.label}>{t('report.description', 'Description')}</Text>
      <TextInput
        style={styles.textArea}
        placeholder={t('report.descriptionPlaceholder', 'Describe the issue in detail...')}
        placeholderTextColor="#9ca3af"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Shop Name */}
      <Text style={styles.label}>{t('report.shopName', 'Shop / Location Name')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('report.shopPlaceholder', 'Where did you buy this?')}
        placeholderTextColor="#9ca3af"
        value={shopName}
        onChangeText={setShopName}
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, (!reason || isSubmitting) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!reason || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{t('report.submit', 'Submit Report')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },
  batchInfo: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 10, marginTop: 16 },
  reasonContainer: { gap: 10 },
  reasonOption: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#e5e7eb',
  },
  reasonSelected: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#d1d5db', marginRight: 12 },
  radioSelected: { borderColor: '#16a34a', borderWidth: 6 },
  reasonText: { fontSize: 16, color: '#374151', flex: 1 },
  reasonTextSelected: { fontWeight: '600', color: '#111827' },
  textArea: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 16, fontSize: 16, minHeight: 120, color: '#111827',
  },
  input: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 16, fontSize: 16, color: '#111827', minHeight: 52,
  },
  submitButton: {
    backgroundColor: '#dc2626', borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', marginTop: 32,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 32 },
  successIcon: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#16a34a', marginBottom: 12 },
  successText: { fontSize: 16, color: '#374151', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  doneButton: { backgroundColor: '#16a34a', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12 },
  doneButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});

