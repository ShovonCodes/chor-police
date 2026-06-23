'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import type { ClientView } from '@/lib/server/store';
import { Avatar } from './characters/Avatar';
import { Button } from './ui/Button';
import { play } from '@/lib/client/sound';
import { vibrate } from '@/lib/client/haptics';
import { shareResult, type ShareRow } from '@/lib/client/shareImage';

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
  const champion = ranked[0];

  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const rows: ShareRow[] = ranked.map((p, i) => ({
    name: p.name,
    emoji: p.avatar,
    seat: view.players.indexOf(p),
    score: view.totals[p.id] ?? 0,
    rank: i,
    isWinner: winners.includes(p.id),
  }));

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const res = await shareResult({
        code: view.code,
        origin: window.location.origin,
        rows,
      });
      setToast(
        res.linkCopied
          ? 'Link copied 📋 — add it as a story link sticker so friends can tap through'
          : res.method === 'download'
            ? 'Image saved — share it to your story!'
            : 'Shared! 🎉',
      );
    } catch {
      setToast('Couldn’t make the image. Try again.');
    } finally {
      setSharing(false);
      setTimeout(() => setToast(null), 4500);
    }
  };

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
    <div className="safe-px mx-auto flex w-full max-w-md flex-col items-center gap-5 py-8">
      {champion && (
        <motion.div
          initial={{ scale: 0.7, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 12 }}
          className="paper inked glow-marigold relative flex w-full max-w-[20rem] flex-col items-center gap-1 px-6 py-6 text-center"
        >
          <motion.span
            className="text-5xl"
            aria-label="champion"
            animate={reduce ? undefined : { y: [0, -6, 0], rotate: [0, -4, 4, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            👑
          </motion.span>
          <Avatar
            emoji={champion.avatar}
            seat={view.players.indexOf(champion)}
            size={96}
          />
          <span className="mt-1 rounded-full bg-marigold px-3 py-0.5 font-display text-xs font-800 tracking-widest text-ink">
            CHAMPION
          </span>
          <p className="font-display text-3xl font-800 text-vermilion-dark">
            {champion.name}
          </p>
          <p className="font-display text-2xl font-800 text-marigold-dark tabular-nums">
            {view.totals[champion.id] ?? 0}
          </p>
        </motion.div>
      )}

      <div className="flex w-full flex-col gap-2">
        {ranked.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 * i }}
            className={[
              'flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5',
              winners.includes(p.id)
                ? 'border-marigold bg-felt-700/90 glow-marigold'
                : 'border-paper-50/20 bg-felt-800/70',
            ].join(' ')}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-xl">
              {MEDALS[i] ?? <span className="font-display font-800 text-paper-200">{i + 1}</span>}
            </span>
            <Avatar emoji={p.avatar} seat={view.players.indexOf(p)} size={44} />
            <p className="min-w-0 flex-1 truncate font-600 text-paper-50">
              {p.name}
              {p.id === view.me && <span className="text-paper-200"> ·</span>}
            </p>
            <span className="font-display text-lg font-800 tabular-nums text-gold">
              {view.totals[p.id] ?? 0}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="flex w-full flex-col gap-2">
        <Button
          variant="primary"
          onClick={handleShare}
          disabled={sharing}
          className="w-full"
          aria-label="Share the result"
        >
          {sharing ? '🎨 Building…' : '📤 Share result'}
        </Button>

        {isHost ? (
          <Button
            variant="secondary"
            onClick={onPlayAgain}
            className="w-full"
            aria-label="Play again"
          >
            🔄 Play again
          </Button>
        ) : (
          <p
            className="py-1 text-center text-paper-200"
            aria-label="Waiting for host to restart"
          >
            ⏳ Waiting for host…
          </p>
        )}
      </div>

      {toast && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className="paper inked w-full px-4 py-2 text-center text-[13px] font-600 leading-snug text-ink"
        >
          {toast}
        </motion.p>
      )}
    </div>
  );
}
