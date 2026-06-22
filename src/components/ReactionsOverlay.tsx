'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ActiveReaction } from '@/lib/client/useRoom';

// Deterministic 0..1 from the reaction id so the same reaction lands in the same
// column on every client and across re-renders (no Math.random in render).
function hashUnit(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// Everyone sees every reaction the server echoes back. AnimatePresence keys by
// reaction.id; the useRoom hook prunes each entry ~2.8s after arrival, which
// triggers the exit animation. The id is unique per reaction event, so a single
// emoji never double-renders even if React re-runs.
export function ReactionsOverlay({
  reactions,
}: {
  reactions: ActiveReaction[];
}) {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => {
          const u = hashUnit(r.id);
          const leftPct = 10 + u * 75; // ~10vw .. 85vw
          const wobble = (u - 0.5) * 60; // small horizontal drift, px
          const label = r.me ? 'You' : r.fromName;

          return (
            <motion.div
              key={r.id}
              className="absolute flex flex-col items-center"
              style={{ left: `${leftPct}%`, bottom: '28%' }}
              initial={
                reduce
                  ? { opacity: 0, scale: 0.9 }
                  : { opacity: 0, x: 0, y: 0, scale: 0.5 }
              }
              animate={
                reduce
                  ? { opacity: 1, scale: 1 }
                  : {
                      opacity: [0, 1, 1, 0],
                      x: [0, wobble * 0.4, wobble],
                      y: [0, -120, -260],
                      scale: [0.5, 1.25, 1.1, 0.95],
                    }
              }
              exit={{ opacity: 0 }}
              transition={
                reduce
                  ? { duration: 0.3 }
                  : { duration: 2.5, ease: 'easeOut', times: [0, 0.15, 0.75, 1] }
              }
            >
              <span
                className={[
                  'select-none text-5xl drop-shadow-lg',
                  r.me ? 'opacity-90' : '',
                ].join(' ')}
                aria-hidden
              >
                {r.emoji}
              </span>
              <span className="mt-0.5 max-w-[10ch] truncate rounded-full bg-felt-900/70 px-2 py-0.5 text-[11px] font-700 text-paper-100">
                {label}
              </span>
              <span className="sr-only">{label} reacted {r.emoji}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
