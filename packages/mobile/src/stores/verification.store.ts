import { create } from 'zustand';
import {
  verifyQrCode,
  saveVerification,
  getVerificationHistory,
  VerificationResult,
} from '../services/verification.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VerificationState {
  /** The result of the most recent verification. */
  currentResult: VerificationResult | null;
  /** Whether the camera scanner is active. */
  isScanning: boolean;
  /** Whether an API verification call is in flight. */
  isVerifying: boolean;
  /** Locally-stored scan history. */
  scanHistory: VerificationResult[];

  /** Verify a QR token and persist the result. */
  verify: (token: string) => Promise<void>;
  /** Clear the current result (e.g. before a new scan). */
  clearResult: () => void;
  /** Manually add a result to history (for offline / cached display). */
  addToHistory: (result: VerificationResult) => Promise<void>;
  /** Load scan history from local storage. */
  loadHistory: () => Promise<void>;
  /** Toggle the scanning state. */
  setScanning: (scanning: boolean) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useVerificationStore = create<VerificationState>((set, get) => ({
  currentResult: null,
  isScanning: false,
  isVerifying: false,
  scanHistory: [],

  verify: async (token: string) => {
    set({ isVerifying: true });
    try {
      const result = await verifyQrCode(token);
      // Stamp the scan time.
      const stamped: VerificationResult = {
        ...result,
        scannedAt: result.scannedAt ?? new Date().toISOString(),
      };
      await saveVerification(stamped);
      const history = await getVerificationHistory();
      set({ currentResult: stamped, isVerifying: false, scanHistory: history });
    } catch (error) {
      set({ isVerifying: false });
      throw error;
    }
  },

  clearResult: () => set({ currentResult: null }),

  addToHistory: async (result: VerificationResult) => {
    await saveVerification(result);
    const history = await getVerificationHistory();
    set({ scanHistory: history });
  },

  loadHistory: async () => {
    const history = await getVerificationHistory();
    set({ scanHistory: history });
  },

  setScanning: (scanning: boolean) => set({ isScanning: scanning }),
}));
