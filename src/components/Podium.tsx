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

const MEDALS = ['🥇', '🥈', '🥉'];

// place: 1 = gold/center, 2 = silver/left, 3 = bronze/right.
const METAL = {
  1: { from: '#f6c544', to: '#d97e0a', ring: '#b8650a' },
  2: { from: '#e6eaee', to: '#a9b2ba', ring: '#8c959d' },
  3: { from: '#e0a473', to: '#b87333', ring: '#8f561f' },
} as const;

const BLOCK_H = { 1: 132, 2: 96, 3: 72 } as const;

function PodiumSpot({
  name,
  emoji,
  seat,
  score,
  place,
  isMe,
  isWinner,
  reduce,
}: {
  name: string;
  emoji: string;
  seat: number;
  score: number;
  place: 1 | 2 | 3;
  isMe: boolean;
  isWinner: boolean;
  reduce: boolean | null;
}) {
  const metal = METAL[place];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 130, damping: 14, delay: 0.08 * (3 - place) }}
      className="flex w-full flex-col items-center justify-end gap-1"
    >
      {place === 1 && (
        <motion.span
          className="text-3xl"
          aria-label="champion"
          animate={reduce ? undefined : { y: [0, -5, 0], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          👑
        </motion.span>
      )}
      <Avatar emoji={emoji} seat={seat} size={place === 1 ? 72 : 56} />
      <p className="max-w-full truncate text-center font-display text-sm font-800 text-paper-50">
        {name}
        {isMe && <span className="text-paper-200"> ·</span>}
      </p>
      <p className="font-display text-base font-800 tabular-nums text-gold">{score}</p>
      <div
        className={[
          'mt-1 flex w-full items-start justify-center rounded-t-2xl border-2 border-b-0 pt-2',
          isWinner ? 'glow-marigold' : '',
        ].join(' ')}
        style={{
          height: BLOCK_H[place],
          background: `linear-gradient(180deg, ${metal.from}, ${metal.to})`,
          borderColor: metal.ring,
        }}
      >
        <span className="font-display text-2xl font-800">{MEDALS[place - 1]}</span>
      </div>
    </motion.div>
  );
}

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

  const score = (id: string) => view.totals[id] ?? 0;
  const seatOf = (id: string) => view.players.findIndex((p) => p.id === id);
  const [first, second, third, fourth] = ranked;

  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const rows: ShareRow[] = ranked.map((p, i) => ({
    name: p.name,
    emoji: p.avatar,
    seat: seatOf(p.id),
    score: score(p.id),
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
      if (res.method === 'share') {
        setToast('Shared! 📋 Link copied — add it as a story sticker so friends can tap through');
      } else if (res.reason === 'insecure') {
        setToast('Sharing needs HTTPS — saved the image instead. (Deploy or run dev over https to get the share sheet.)');
      } else {
        setToast(
          res.linkCopied
            ? 'Image saved 📋 + link copied — share it anywhere!'
            : 'Image saved — share it anywhere!',
        );
      }
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
      <p className="font-display text-xl font-800 text-paper-50">🏆 Final standings</p>

      {/* Olympic podium: 2nd · 1st · 3rd, stepped. */}
      <div className="grid w-full grid-cols-3 items-end gap-2">
        {second && (
          <PodiumSpot
            name={second.name}
            emoji={second.avatar}
            seat={seatOf(second.id)}
            score={score(second.id)}
            place={2}
            isMe={second.id === view.me}
            isWinner={winners.includes(second.id)}
            reduce={reduce}
          />
        )}
        {first && (
          <PodiumSpot
            name={first.name}
            emoji={first.avatar}
            seat={seatOf(first.id)}
            score={score(first.id)}
            place={1}
            isMe={first.id === view.me}
            isWinner={winners.includes(first.id)}
            reduce={reduce}
          />
        )}
        {third && (
          <PodiumSpot
            name={third.name}
            emoji={third.avatar}
            seat={seatOf(third.id)}
            score={score(third.id)}
            place={3}
            isMe={third.id === view.me}
            isWinner={winners.includes(third.id)}
            reduce={reduce}
          />
        )}
      </div>

      {/* Fourth place only. */}
      {fourth && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-paper-50/20 bg-felt-800/70 px-3 py-2.5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center font-display text-sm font-800 text-paper-200">
            4
          </span>
          <Avatar emoji={fourth.avatar} seat={seatOf(fourth.id)} size={40} />
          <p className="min-w-0 flex-1 truncate font-600 text-paper-50">
            {fourth.name}
            {fourth.id === view.me && <span className="text-paper-200"> ·</span>}
          </p>
          <span className="font-display text-lg font-800 tabular-nums text-gold">
            {score(fourth.id)}
          </span>
        </motion.div>
      )}

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
