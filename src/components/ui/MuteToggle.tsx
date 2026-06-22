'use client';

import { useState, useSyncExternalStore } from 'react';
import { isMuted, toggleMuted, play } from '@/lib/client/sound';

// useSyncExternalStore gives an SSR-safe initial value (server: true) without a
// setState effect; the pref only changes via this component's click handler.
const subscribe = () => () => {};

export function MuteToggle({ className = '' }: { className?: string }) {
  const stored = useSyncExternalStore(
    subscribe,
    () => isMuted(),
    () => true,
  );
  const [override, setOverride] = useState<boolean | null>(null);
  const muted = override ?? stored;
  const setMuted = setOverride;

  return (
    <button
      type="button"
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      aria-pressed={!muted}
      onClick={() => {
        const next = toggleMuted();
        setMuted(next);
        if (!next) play('tap');
      }}
      className={[
        'inline-flex h-11 w-11 items-center justify-center rounded-full',
        'border-2 border-paper-50/40 bg-felt-800/70 text-xl backdrop-blur',
        'hover:bg-felt-700 transition-colors',
        className,
      ].join(' ')}
    >
      <span aria-hidden>{muted ? '🔇' : '🔊'}</span>
    </button>
  );
}
