'use client';

import { useEffect } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import type { ClientView } from '@/lib/server/store';
import type { Role } from '@/lib/game';
import { RoleCard, type CardHighlight } from './RoleCard';
import { CharacterByRole, ROLE_COLOR, ROLE_LABELS } from './characters';
import { Avatar } from './characters/Avatar';
import { Button } from './ui/Button';
import { play } from '@/lib/client/sound';
import { vibrate } from '@/lib/client/haptics';

const CONFETTI_COLORS = ['#f4a01c', '#e2483a', '#128f88', '#e8b21e', '#5b2a86'];

function textShapes(emojis: string[], scalar: number): confetti.Shape[] {
  try {
    return emojis.map((text) => confetti.shapeFromText({ text, scalar }));
  } catch {
    return [];
  }
}

function fireWin() {
  const opts: confetti.Options = { spread: 80, startVelocity: 45, colors: CONFETTI_COLORS };
  const party = textShapes(['🎉', '🎊'], 2);
  confetti({ ...opts, particleCount: 90, origin: { y: 0.45 } });
  confetti({
    ...opts,
    particleCount: 50,
    scalar: 2,
    shapes: party.length ? party : undefined,
    origin: { y: 0.4 },
  });
  setTimeout(() => confetti({ ...opts, particleCount: 60, angle: 60, origin: { x: 0, y: 0.6 } }), 180);
  setTimeout(() => confetti({ ...opts, particleCount: 60, angle: 120, origin: { x: 1, y: 0.6 } }), 180);
}

function fireEscape() {
  // Outlaw escaped: emojis rain DOWN from the top with downward gravity.
  const shapes = textShapes(['😈', '💨'], 2.2);
  const common: confetti.Options = {
    particleCount: 14,
    startVelocity: 0,
    gravity: 1.4,
    spread: 70,
    ticks: 200,
    scalar: 2.2,
    flat: true,
    shapes: shapes.length ? shapes : undefined,
  };
  const end = Date.now() + 900;
  const rain = () => {
    confetti({ ...common, origin: { x: Math.random(), y: -0.1 } });
    if (Date.now() < end) setTimeout(rain, 120);
  };
  rain();
}

// Drawn tick / cross on a colored disc — replaces the raw ✅/❌ emoji.
function VerdictMark({ ok, size = 26 }: { ok: boolean; size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-full border-2 border-felt-900 shadow"
      style={{ width: size, height: size, background: ok ? '#128f88' : '#e2483a' }}
      aria-hidden
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ok ? (
          <path d="M5 13l4 4L19 7" />
        ) : (
          <>
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </>
        )}
      </svg>
    </span>
  );
}

export function Reveal({
  view,
  isHost,
  onScore,
}: {
  view: ClientView;
  isHost: boolean;
  onScore: () => void;
}) {
  const reduce = useReducedMotion();
  const assignments = view.assignments;
  const round = view.round;

  const target = round?.target ?? 'chor';
  const accusedId = round?.policeGuess ?? null;
  const caught = round?.caught ?? null;

  const actualTargetId = assignments
    ? (Object.entries(assignments).find(([, role]) => role === target)?.[0] ?? null)
    : null;

  // Split seats: the two formerly-hidden outlaws take center stage; Babu/Police
  // shrink to a side strip.
  const hiddenPlayers = view.players.filter((p) => {
    const role = assignments?.[p.id] ?? null;
    return role !== 'babu' && role !== 'police';
  });
  const sidePlayers = view.players.filter((p) => {
    const role = assignments?.[p.id] ?? null;
    return role === 'babu' || role === 'police';
  });

  const shake = useAnimationControls();

  // Drumroll on enter, then a reveal sting + win/lose cue + confetti + shake.
  useEffect(() => {
    play('whoosh');
    play('drumroll');
    const stingTimer = setTimeout(() => {
      play('reveal');
      play(caught ? 'win' : 'lose');
      vibrate('reveal');
      if (reduce) return;
      if (caught) {
        fireWin();
      } else {
        fireEscape();
        shake.start({
          x: [0, -10, 9, -7, 6, -3, 0],
          transition: { duration: 0.5 },
        });
      }
    }, 850);
    return () => clearTimeout(stingTimer);
  }, [caught, reduce, shake]);

  // Pacing is server-driven (reveal dwells ~6s then advances to scoring) so it
  // works without a host client; the host can skip sooner with the button below.

  const nameOf = (id: string | null) =>
    view.players.find((p) => p.id === id)?.name ?? '?';
  const policeName = nameOf(
    assignments
      ? (Object.entries(assignments).find(([, r]) => r === 'police')?.[0] ?? null)
      : null,
  );
  const accusedName = nameOf(accusedId);
  const accusedRole: Role | null = accusedId
    ? (assignments?.[accusedId] ?? null)
    : null;
  const targetName = nameOf(actualTargetId);
  const targetRoman = ROLE_LABELS[target].roman;

  const policeId = assignments
    ? (Object.entries(assignments).find(([, r]) => r === 'police')?.[0] ?? null)
    : null;
  const seatOf = (id: string | null) =>
    id ? Math.max(0, view.players.findIndex((p) => p.id === id)) : 0;
  const avatarOf = (id: string | null) =>
    view.players.find((p) => p.id === id)?.avatar ?? '❓';

  return (
    <motion.div
      animate={shake}
      className="safe-px mx-auto flex w-full max-w-md flex-col items-center gap-2 py-2"
    >
      {/* Verdict banner — Police character + drawn tick/cross. */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 160, damping: 12 }}
        className={[
          'flex items-center gap-2 rounded-2xl border-2 px-4 py-1.5',
          caught ? 'border-teal bg-teal/15' : 'border-vermilion bg-vermilion/15',
        ].join(' ')}
        aria-label={caught ? 'The Police caught the target' : 'The target escaped'}
      >
        <div className="relative">
          <CharacterByRole role="police" size={42} title="Police" />
          <span className="absolute -bottom-1 -right-1">
            <VerdictMark ok={caught === true} size={20} />
          </span>
        </div>
        <p
          className={[
            'font-display text-2xl font-800',
            caught ? 'text-teal' : 'text-vermilion',
          ].join(' ')}
        >
          {caught ? 'Caught!' : 'Escaped!'}
        </p>
      </motion.div>

      {/* Recap card — Police → accused, with revealed roles. */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="paper inked w-full px-3 py-2"
      >
        <div className="flex items-center justify-center gap-2">
          <div className="flex w-[84px] flex-col items-center gap-0.5">
            <Avatar emoji={avatarOf(policeId)} seat={seatOf(policeId)} size={36} />
            <span className="max-w-full truncate text-xs font-700 text-ink">
              {policeName}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-700 text-ink"
              style={{ background: ROLE_COLOR.police }}
            >
              {ROLE_LABELS.police.roman}
            </span>
          </div>

          <div className="flex flex-col items-center gap-0.5 text-ink-soft">
            <span className="text-[10px] font-800 uppercase tracking-wider">
              accused
            </span>
            <motion.span
              className="text-2xl text-vermilion-dark"
              aria-hidden
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              →
            </motion.span>
          </div>

          <div className="flex w-[84px] flex-col items-center gap-0.5">
            <Avatar emoji={avatarOf(accusedId)} seat={seatOf(accusedId)} size={36} />
            <span className="max-w-full truncate text-xs font-700 text-ink">
              {accusedName}
            </span>
            {accusedRole && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-700 text-ink"
                style={{ background: ROLE_COLOR[accusedRole] }}
              >
                {ROLE_LABELS[accusedRole].roman}
              </span>
            )}
          </div>
        </div>

        <div
          className={[
            'mt-2 flex items-center justify-center gap-2 rounded-xl px-3 py-1',
            caught ? 'bg-teal/15' : 'bg-vermilion/15',
          ].join(' ')}
        >
          <VerdictMark ok={caught === true} size={22} />
          <span
            className={[
              'font-display text-sm font-800',
              caught ? 'text-teal' : 'text-vermilion-dark',
            ].join(' ')}
          >
            {caught
              ? `Caught the ${targetRoman}!`
              : `The ${targetRoman} (${targetName}) got away!`}
          </span>
        </div>
      </motion.div>

      {/* Babu only — Police is already shown in the banner + recap above. */}
      <div className="flex w-full items-center justify-center gap-2">
        {sidePlayers
          .filter((p) => assignments?.[p.id] === 'babu')
          .map((p) => {
            const role: Role | null = assignments?.[p.id] ?? null;
            return (
              <div key={p.id} className="flex items-center gap-2">
                {role && <CharacterByRole role={role} size={30} title={ROLE_LABELS[role].roman} />}
                {role && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-700 text-ink"
                    style={{ background: ROLE_COLOR[role] }}
                  >
                    {ROLE_LABELS[role].bn}
                  </span>
                )}
                <span className="max-w-[120px] truncate text-[12px] text-paper-200">
                  {p.name}
                </span>
              </div>
            );
          })}
      </div>

      {/* Center stage: the two outlaw cards slide in + scale up, then flip open. */}
      <div className="grid w-full max-w-[330px] grid-cols-2 gap-3">
        {hiddenPlayers.map((p, i) => {
          const role: Role | null = assignments?.[p.id] ?? null;
          let highlight: CardHighlight = null;
          if (p.id === accusedId) highlight = 'accused';
          else if (p.id === actualTargetId) highlight = 'target';
          const fromX = i === 0 ? -120 : 120;
          return (
            <motion.div
              key={p.id}
              layout
              initial={reduce ? false : { x: fromX, scale: 0.7, opacity: 0 }}
              animate={{ x: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 110, damping: 14, delay: 0.1 + i * 0.08 }}
            >
              <RoleCard
                name={p.name}
                role={role}
                revealed
                isMe={p.id === view.me}
                highlight={highlight}
                flip
                flipDelay={0.6 + i * 0.12}
              />
            </motion.div>
          );
        })}
      </div>

      {isHost ? (
        <Button onClick={onScore} aria-label="Show scores">
          ▶️ Show scores
        </Button>
      ) : (
        <p className="text-sm text-paper-200/80">🧮 Scores in a moment…</p>
      )}
    </motion.div>
  );
}
