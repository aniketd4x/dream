// lib/haptics.ts
/**
 * Triggers native haptic feedback on mobile browsers supporting navigator.vibrate
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'alert' | 'selection' = 'light') {
  if (typeof window === 'undefined' || !('navigator' in window) || !navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case 'light':
      case 'selection':
        navigator.vibrate(8);
        break;
      case 'medium':
        navigator.vibrate(18);
        break;
      case 'success':
        navigator.vibrate([12, 40, 16]);
        break;
      case 'alert':
        navigator.vibrate([40, 80, 40, 80, 60]);
        break;
    }
  } catch (e) {
    // Graceful fallback on non-vibrating devices or disabled permissions
  }
}
