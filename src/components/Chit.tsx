'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { ClientView } from '@/lib/server/store';
import { CharacterByRole, ROLE_LABELS, ROLE_NUMBERS } from './characters';
import { Button } from './ui/Button';
import { play } from '@/lib/client/sound';
import { vibrate } from '@/lib/client/haptics';

// Drawing renders only the player's own role (view.myRole), never others'.
// Drawing is LOCAL per player — one player's tap never changes another's screen.
// onSeen (markSeen) reports that this player has looked; once everyone has, the
// server advances to the guess phase. No second per-player action gates it.
export function Chit({
  view,
  onSeen,
}: {
  view: ClientView;
  onSeen: () => void;
}) {
  const reduce = useReducedMotion();
  const [drawn, setDrawn] = useState(false);
  const [hidden, setHidden] = useState(false);
  const role = view.myRole;

  useEffect(() => {
    play('shuffle');
  }, []);

  const draw = () => {
    setDrawn(true);
    onSeen();
    play('flip');
    vibrate('reveal');
  };

  if (!drawn) {
    return (
      <div className="safe-px flex flex-1 flex-col items-center justify-center gap-8 py-6">
        <div className="text-center">
          <p className="font-bangla text-base text-paper-200">চিঠি বিলি হচ্ছে…</p>
          <h2 className="font-display text-2xl font-800 text-paper-50">
            Shuffling the chits
          </h2>
        </div>
        <div className="relative h-56 w-full max-w-sm">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 h-32 w-24 -translate-x-1/2 -translate-y-1/2"
              initial={{ rotate: 0, x: 0, y: 0 }}
              animate={
                reduce
                  ? { rotate: (i - 1.5) * 8 }
                  : {
                      rotate: [(i - 1.5) * 30, (1.5 - i) * 20, (i - 1.5) * 10],
                      x: [(i - 1.5) * 40, (1.5 - i) * 30, (i - 1.5) * 12],
                      y: [0, -10, 0],
                    }
              }
              transition={{ duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: i * 0.08 }}
            >
              <ChitBack />
            </motion.div>
          ))}
        </div>
        <Button onClick={draw} aria-label="Draw my chit">Draw my chit 🤞</Button>
      </div>
    );
  }

  return (
    <div className="safe-px flex flex-1 flex-col items-center justify-center gap-6 py-6">
      <div className="relative h-56 w-44" style={{ perspective: 800 }}>
        <motion.div
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: hidden ? 0 : 180 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 14 }}
        >
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
            <ChitBack label />
          </div>
          <div
            className="paper inked absolute inset-0 flex flex-col items-center justify-center gap-1 px-3"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {role ? (
              <>
                <CharacterByRole role={role} size={96} title={ROLE_LABELS[role].roman} />
                <p className="font-bangla text-2xl font-700 leading-none text-ink">
                  {ROLE_LABELS[role].bn}
                </p>
                <p className="font-display text-2xl font-800 leading-none text-vermilion-dark">
                  {ROLE_NUMBERS[role]}
                </p>
              </>
            ) : (
              <p className="text-ink-soft">…</p>
            )}
          </div>
        </motion.div>
      </div>

      <Button
        variant="secondary"
        onClick={() => setHidden((h) => !h)}
        aria-label={hidden ? 'Peek at my chit' : 'Hide my chit'}
      >
        {hidden ? '👀' : '🤫'}
      </Button>

      {view.seenCount >= 4 ? (
        <motion.p
          className="font-display text-lg font-700 text-marigold"
          animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
          transition={{ duration: 0.9, repeat: Infinity }}
          aria-label="Prepare to guess"
        >
          🥁 Prepare to guess…
        </motion.p>
      ) : (
        <div
          className="flex items-center gap-1.5"
          aria-label={`${view.seenCount} of 4 looked`}
        >
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={[
                'h-2.5 w-2.5 rounded-full',
                i < view.seenCount ? 'bg-marigold' : 'bg-paper-50/25',
              ].join(' ')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Brand seal: red roundel + gold star (transparent background).
function SealMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Chor Police seal">
      <circle cx="50" cy="52" r="30" fill="#e2483a" stroke="#2b2118" strokeWidth="3.5" />
      <circle cx="50" cy="52" r="30" fill="none" stroke="#e8b21e" strokeWidth="1.4" />
      <path
        d="M50 37 L53.8 46.7 L64.3 47.4 L56.2 54 L58.8 64.1 L50 58.5 L41.2 64.1 L43.8 54 L35.7 47.4 L46.2 46.7 Z"
        fill="#e8b21e"
        stroke="#2b2118"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Chit back — same `paper inked` card as the role face, so back and front share
// the exact size + shape. Fills its box (works at shuffle and flip-card sizes).
function ChitBack({ label = false }: { label?: boolean }) {
  return (
    <div className="paper inked flex h-full w-full flex-col items-center justify-center gap-2">
      <SealMark className="w-1/2" />
      {label && (
        <p className="font-bangla text-sm font-600 text-ink-soft">চোর পুলিশ</p>
      )}
    </div>
  );
}
