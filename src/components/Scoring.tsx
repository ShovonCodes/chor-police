'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { ClientView } from '@/lib/server/store';
import { CharacterByRole, ROLE_LABELS } from './characters';
import { Button } from './ui/Button';
import { play } from '@/lib/client/sound';
import { vibrate } from '@/lib/client/haptics';

function useCountUp(to: number, from: number, run: boolean) {
  // Show the final total until `run` flips true, then climb from `from` (no flicker).
  const [val, setVal] = useState(() => (run ? from : to));
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!run) return;
    const start = performance.now();
    const dur = 900;
    let lastTick = -1;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - t) ** 3;
      const current = Math.round(from + (to - from) * eased);
      setVal(current);
      const tick = Math.floor(t * 8);
      if (tick !== lastTick && t < 1) {
        lastTick = tick;
        play('tally-tick');
      }
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [to, from, run]);

  return val;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function ScoreRow({
  view,
  playerIndex,
  rank,
  run,
  maxDelta,
}: {
  view: ClientView;
  playerIndex: number;
  rank: number;
  run: boolean;
  maxDelta: number;
}) {
  const reduce = useReducedMotion();
  const p = view.players[playerIndex];
  const delta = view.round?.deltas?.[p.id] ?? 0;
  const total = view.totals[p.id] ?? 0;
  const before = total - delta;
  const role = view.assignments?.[p.id] ?? null;
  const shown = useCountUp(total, before, run);
  const isRoundWinner = run && delta > 0 && delta >= maxDelta && maxDelta > 0;

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className={[
        'relative flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 transition-colors',
        isRoundWinner
          ? 'border-marigold bg-felt-700/90'
          : 'border-paper-50/25 bg-felt-800/70',
      ].join(' ')}
    >
      {MEDALS[rank] && (
        <motion.span
          aria-label={`Rank ${rank}`}
          className="absolute -left-2.5 -top-2.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-paper-50 text-sm shadow-md"
          animate={reduce ? undefined : { scale: [1, 1.14, 1] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
        >
          {MEDALS[rank]}
        </motion.span>
      )}
      {role ? (
        <CharacterByRole role={role} size={44} title={ROLE_LABELS[role].roman} />
      ) : (
        <span className="text-2xl">{p.avatar}</span>
      )}
      <p className="min-w-0 flex-1 truncate font-600 text-paper-50">{p.name}</p>
      {delta !== 0 && run && (
        <motion.span
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={delta > 0 ? 'font-700 text-teal' : 'font-700 text-vermilion'}
        >
          {delta > 0 ? `+${delta}` : delta}
        </motion.span>
      )}
      <span className="w-16 text-right font-display text-xl font-800 text-gold tabular-nums">
        {shown}
      </span>
    </motion.div>
  );
}

export function Scoring({
  view,
  isHost,
  onNext,
}: {
  view: ClientView;
  isHost: boolean;
  onNext: () => void;
}) {
  const [run, setRun] = useState(false);
  const caught = view.round?.caught;

  const deltas = view.round?.deltas ?? {};
  const maxDelta = Math.max(0, ...Object.values(deltas));

  // After this round's scoring, would the next step end the match? (rounds played
  // hit the target, or someone reached the target score.) If so, "Next" → podium.
  const isLastRound =
    view.mode === 'rounds'
      ? (view.round?.roundNumber ?? 0) >= view.modeValue
      : Math.max(0, ...Object.values(view.totals)) >= view.modeValue;

  useEffect(() => {
    const id = window.setTimeout(() => {
      setRun(true);
      play(caught ? 'win' : 'lose');
      vibrate(caught ? 'success' : 'fail');
    }, 250);
    return () => window.clearTimeout(id);
  }, [caught]);

  return (
    <div className="safe-px mx-auto flex w-full max-w-md flex-col items-center gap-5 py-8">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-5xl"
        aria-label={caught ? 'Caught' : 'Escaped'}
      >
        {caught ? '👮‍♂️✅' : '😈💨'}
      </motion.div>

      <div className="flex w-full flex-col gap-2.5">
        {view.players
          .map((p, i) => ({ i, total: view.totals[p.id] ?? 0 }))
          .sort((a, b) => b.total - a.total)
          .map((entry, rank) => (
            <ScoreRow
              key={view.players[entry.i].id}
              view={view}
              playerIndex={entry.i}
              rank={rank + 1}
              run={run}
              maxDelta={maxDelta}
            />
          ))}
      </div>

      {isHost ? (
        <Button
          onClick={onNext}
          className="w-full"
          aria-label={isLastRound ? 'Show results' : 'Next round'}
        >
          {isLastRound ? '🏆 Show results' : '▶️ Next round'}
        </Button>
      ) : (
        <p className="text-paper-200" aria-label="Waiting for host">
          ⏳ Waiting for host…
        </p>
      )}
    </div>
  );
}
