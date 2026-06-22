'use client';

import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import type { ClientView } from '@/lib/server/store';
import { Avatar } from './characters/Avatar';
import { Button } from './ui/Button';
import { play } from '@/lib/client/sound';
import { vibrate } from '@/lib/client/haptics';

const MEDALS = ['🥇', '🥈', '🥉', '🎖️'];

export function Podium({
  view,
  isHost,
  onPlayAgain,
}: {
  view: ClientView;
  isHost: boolean;
  onPlayAgain: () => void;
}) {
  const reduce = useReducedMotion();
  const winners = view.winners ?? [];

  const ranked = [...view.players].sort(
    (a, b) => (view.totals[b.id] ?? 0) - (view.totals[a.id] ?? 0),
  );
  const meWon = winners.includes(view.me);

  useEffect(() => {
    play(meWon ? 'win' : 'lose');
    vibrate(meWon ? 'success' : 'fail');
    if (reduce) return;
    const end = Date.now() + 1400;
    const tick = () => {
      confetti({
        particleCount: 4,
        spread: 70,
        origin: { y: 0.3 },
        colors: ['#f4a01c', '#e2483a', '#128f88', '#e8b21e', '#5b2a86'],
      });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
  }, [meWon, reduce]);

  return (
    <div className="safe-px mx-auto flex w-full max-w-md flex-col items-center gap-6 py-8">
      {ranked[0] && (
        <motion.div
          initial={{ scale: 0.7, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 12 }}
          className="paper inked flex flex-col items-center gap-1 px-6 py-4 text-center"
        >
          <span className="text-4xl" aria-label="champion">👑</span>
          <Avatar emoji={ranked[0].avatar} seat={view.players.indexOf(ranked[0])} size={72} />
          <p className="font-display text-2xl font-800 text-vermilion-dark">{ranked[0].name}</p>
          <p className="font-display text-xl font-800 text-marigold-dark">
            {view.totals[ranked[0].id] ?? 0}
          </p>
        </motion.div>
      )}

      <div className="flex w-full flex-col gap-2">
        {ranked.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i }}
            className={[
              'flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5',
              winners.includes(p.id)
                ? 'border-marigold bg-felt-700/90 glow-marigold'
                : 'border-paper-50/25 bg-felt-800/70',
            ].join(' ')}
          >
            <span className="w-6 text-center text-xl">{MEDALS[i] ?? `${i + 1}`}</span>
            <Avatar emoji={p.avatar} seat={view.players.indexOf(p)} size={40} />
            <p className="min-w-0 flex-1 truncate font-600 text-paper-50">
              {p.name}
              {p.id === view.me && <span className="text-paper-200"> ·</span>}
            </p>
            <span className="font-display text-lg font-800 text-gold tabular-nums">
              {view.totals[p.id] ?? 0}
            </span>
          </motion.div>
        ))}
      </div>

      {isHost ? (
        <Button onClick={onPlayAgain} className="w-full" aria-label="Play again">
          🔄 Play again
        </Button>
      ) : (
        <p className="text-paper-200" aria-label="Waiting for host to restart">
          ⏳ Waiting for host…
        </p>
      )}
    </div>
  );
}
