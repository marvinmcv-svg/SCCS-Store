/** Sparing, haptic-style feedback where supported (Android Chrome). */
export function haptic(kind: 'tap' | 'success' | 'error' = 'tap') {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const pattern = kind === 'success' ? [12, 40, 12] : kind === 'error' ? [30, 30, 30] : 8;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
