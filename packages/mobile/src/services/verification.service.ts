import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

/** Key used to persist verification history locally. */
const HISTORY_KEY = 'smartseed_verification_history';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VerificationResult {
  id: string;
  status: 'verified' | 'suspicious' | 'warning' | 'counterfeit' | 'expired';
  product: {
    name: string;
    brand: string;
    cropType: string;
    variety: string;
    batchNumber: string;
    mfgDate: string;
    expiryDate: string;
    manufacturer: string;
  };
  riskScore: number;
  riskLevel: string;
  journey: JourneyStep[];
  certifications: string[];
  blockchain: {
    verified: boolean;
    transactionCount: number;
  };
  scannedAt: string;
}

export interface JourneyStep {
  stage: string;
  date: string;
  location: string;
  verified: boolean;
}

export interface ReportData {
  qrToken: string;
  reason: 'suspected_fake' | 'quality_issue' | 'packaging_damage' | 'expired' | 'other';
  description: string;
  shopName?: string;
  photoUri?: string;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * Verify a QR code token against the backend.
 */
export async function verifyQrCode(token: string): Promise<VerificationResult> {
  const response = await api.post<VerificationResult>(
    `/qr/verify/${encodeURIComponent(token)}`,
  );
  return response.data;
}

/**
 * Report a suspected counterfeit product.
 */
export async function reportCounterfeit(data: ReportData): Promise<void> {
  const formData = new FormData();
  formData.append('qrToken', data.qrToken);
  formData.append('reason', data.reason);
  formData.append('description', data.description);
  if (data.shopName) formData.append('shopName', data.shopName);
  if (data.photoUri) {
    formData.append('photo', {
      uri: data.photoUri,
      type: 'image/jpeg',
      name: 'report_photo.jpg',
    } as unknown as Blob);
  }

  await api.post('/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ---------------------------------------------------------------------------
// Local storage helpers (offline access)
// ---------------------------------------------------------------------------

/**
 * Retrieve verification history stored on the device.
 */
export async function getVerificationHistory(): Promise<VerificationResult[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VerificationResult[];
  } catch {
    return [];
  }
}

/**
 * Save a verification result to local storage for offline access.
 * Most recent results are kept at the front; the list is capped at 50.
 */
export async function saveVerification(
  result: VerificationResult,
): Promise<void> {
  const history = await getVerificationHistory();
  const updated = [result, ...history.filter((h) => h.id !== result.id)].slice(
    0,
    50,
  );
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}
