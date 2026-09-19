import { Capacitor } from '@capacitor/core';

/**
 * Returns the dynamic base URL of the domain for frontend menu links, QR codes, and routing.
 * 
 * - In a web browser: dynamically uses window.location.origin (e.g. https://yourdomain.com or http://localhost:5173).
 * - In native Capacitor mobile apps (where origin is capacitor://localhost or http://localhost):
 *   falls back to configured environment variables or defaults to the production domain.
 */
export function getBaseUrl(): string {
  // 1. In browser environment (non-native Capacitor)
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.trim();
    const isNative =
      Capacitor.isNativePlatform() ||
      origin.startsWith('capacitor://') ||
      origin.startsWith('ionic://');

    if (!isNative && origin && origin !== 'null') {
      return origin.replace(/\/+$/, '');
    }
  }

  // 2. Environment variable override (e.g. Capacitor native app builds or SSR)
  const envUrl =
    import.meta.env.VITE_APP_URL ||
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    import.meta.env.VITE_BASE_URL;

  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. Fallback production domain
  return 'https://dishgaze.com';
}
