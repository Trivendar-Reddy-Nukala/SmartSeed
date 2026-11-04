import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

/** Key used to persist the JWT in SecureStore. */
const TOKEN_KEY = 'smartseed_auth_token';

/** Base URL — swap via environment variable or fall back to localhost. */
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

// ---------------------------------------------------------------------------
// Token helpers (SecureStore-backed)
// ---------------------------------------------------------------------------

/**
 * Persist a JWT token to SecureStore.
 */
export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/**
 * Read the stored JWT token (returns `null` when nothing is stored).
 */
export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

/**
 * Remove the stored JWT token.
 */
export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---- Request interceptor: attach JWT if available ----
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ---- Response interceptor: handle 401 ----
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear stored credentials.
      await clearAuthToken();
      // Downstream consumers (e.g. the auth store) should react to the
      // missing token and redirect the user to login.
    }
    return Promise.reject(error);
  },
);

export default api;
