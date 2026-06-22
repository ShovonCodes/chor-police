'use client';

// Feature-detected haptics: no-op where navigator.vibrate is unavailable.

export type HapticPattern = 'tap' | 'select' | 'success' | 'fail' | 'reveal';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  select: 20,
  success: [20, 40, 20],
  fail: [60, 30, 60],
  reveal: [10, 30, 10, 30, 40],
};

export function vibrate(pattern: HapticPattern): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== 'function') return;
  try {
    nav.vibrate(PATTERNS[pattern]);
  } catch {}
}
