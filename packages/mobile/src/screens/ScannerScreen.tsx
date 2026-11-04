import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';

export default function ScannerScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Extract token from QR data — supports full URL or raw token
    let token = data;
    const urlMatch = data.match(/\/verify\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) {
      token = urlMatch[1];
    }

    navigation.navigate('Verification', { token });
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>{t('scanner.loading', 'Loading camera...')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionIcon}>📸</Text>
        <Text style={styles.permissionTitle}>{t('scanner.permissionTitle', 'Camera Permission Needed')}</Text>
        <Text style={styles.permissionText}>
          {t('scanner.permissionText', 'We need camera access to scan QR codes on seed packets.')}
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>{t('scanner.grantPermission', 'Grant Permission')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        enableTorch={flashOn}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top */}
        <View style={styles.overlaySection}>
          <Text style={styles.instructionText}>
            {t('scanner.instruction', 'Point camera at the QR code on the seed packet')}
          </Text>
        </View>

        {/* Scan Frame */}
        <View style={styles.scanFrameRow}>
          <View style={styles.overlayFill} />
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.overlayFill} />
        </View>

        {/* Bottom Controls */}
        <View style={styles.controlsSection}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setFlashOn(!flashOn)}
          >
            <Text style={styles.controlIcon}>{flashOn ? '🔦' : '💡'}</Text>
            <Text style={styles.controlLabel}>{flashOn ? t('scanner.flashOff', 'Flash Off') : t('scanner.flashOn', 'Flash On')}</Text>
          </TouchableOpacity>

          {scanned && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.rescanText}>{t('scanner.scanAgain', 'Scan Again')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.controlIcon}>✕</Text>
            <Text style={styles.controlLabel}>{t('common.cancel', 'Cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const FRAME_SIZE = 260;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 32 },
  permissionIcon: { fontSize: 56, marginBottom: 16 },
  permissionTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  permissionText: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  permissionButton: { backgroundColor: '#16a34a', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12 },
  permissionButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  overlaySection: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20 },
  instructionText: { fontSize: 16, color: '#fff', textAlign: 'center', paddingHorizontal: 40 },
  scanFrameRow: { flexDirection: 'row', height: FRAME_SIZE },
  overlayFill: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scanFrame: { width: FRAME_SIZE, height: FRAME_SIZE },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#16a34a', borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  controlsSection: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row',
    justifyContent: 'space-around', alignItems: 'center', paddingTop: 30,
  },
  controlButton: { alignItems: 'center', padding: 12 },
  controlIcon: { fontSize: 28 },
  controlLabel: { fontSize: 12, color: '#fff', marginTop: 4 },
  rescanButton: { backgroundColor: '#16a34a', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  rescanText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

