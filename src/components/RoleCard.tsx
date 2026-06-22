'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { Role } from '@/lib/game';
import { CharacterByRole, ROLE_COLOR, ROLE_LABELS, ROLE_NUMBERS } from './characters';

export type CardHighlight = 'accused' | 'target' | null;

// Presentational table card. Two faces:
//  - revealed: a face-up paper chit (character + bn/roman label + number + name)
//  - hidden:   a dashed-paper "?" chit (only the player's name shows)
// `highlight` rings the card during reveal ('accused' = Police's pick, 'target' =
// the actual outlaw). The flip uses a Y-axis rotation; reduced-motion gets an
// instant swap.
export function RoleCard({
  name,
  role,
  revealed,
  isMe = false,
  onClick,
  disabled = false,
  highlight = null,
  flip = false,
  flipDelay = 0,
  shimmer = false,
  invite = false,
}: {
  name: string;
  // The seat's role. Required when `revealed`, ignored when hidden.
  role?: Role | null;
  revealed: boolean;
  isMe?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: CardHighlight;
  // Animate a face-down → face-up flip on mount (used at reveal).
  flip?: boolean;
  flipDelay?: number;
  // Sweep a "deciding" shimmer over a hidden card (guessing phase, non-Police).
  shimmer?: boolean;
  // Pulsing ring inviting the Police to tap this hidden candidate.
  invite?: boolean;
}) {
  const reduce = useReducedMotion();
  const tappable = !!onClick && !disabled;

  const ring =
    highlight === 'accused'
      ? 'glow-marigold'
      : highlight === 'target'
        ? 'ring-4 ring-vermilion'
        : '';

  const flipInitial = flip && !reduce ? { rotateY: 180, opacity: 0 } : false;
  const flipAnimate = { rotateY: 0, opacity: 1 };
  const flipTransition =
    flip && !reduce
      ? { type: 'spring' as const, stiffness: 90, damping: 12, delay: flipDelay }
      : { duration: 0 };

  const inner = revealed && role ? (
    <>
      <CharacterByRole role={role} size={64} title={ROLE_LABELS[role].roman} />
      <span
        className="rounded-full px-2 py-0.5 text-[11px] font-700 text-ink"
        style={{ background: ROLE_COLOR[role] }}
      >
        {ROLE_LABELS[role].bn}
      </span>
      <span className="font-display text-base font-800 text-vermilion-dark">
        {ROLE_NUMBERS[role]}
      </span>
      <p className="max-w-full truncate text-xs font-700 text-ink">
        {name}
        {isMe && <span className="text-ink-soft"> ·</span>}
      </p>
    </>
  ) : (
    <>
      <span
        className="flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-dashed border-ink/40 font-display text-4xl font-800 text-ink/50"
        aria-hidden
      >
        ?
      </span>
      <p className="max-w-full truncate text-xs font-700 text-ink">
        {name}
        {isMe && <span className="text-ink-soft"> ·</span>}
      </p>
    </>
  );

  const cardClass = [
    'paper inked flex min-h-[156px] w-full flex-col items-center justify-center gap-1.5 px-2 py-3 text-center',
    revealed ? '' : 'bg-paper-100',
    shimmer ? 'shimmer' : '',
    invite && !ring ? 'invite-pulse' : '',
    ring,
    tappable
      ? 'cursor-pointer transition-transform active:scale-95 hover:-translate-y-0.5'
      : '',
    disabled ? 'opacity-60' : '',
  ].join(' ');

  const motionProps = {
    initial: flipInitial,
    animate: flipAnimate,
    transition: flipTransition,
    style: { transformStyle: 'preserve-3d' as const },
  };

  if (tappable) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        className={cardClass}
        {...motionProps}
      >
        {inner}
      </motion.button>
    );
  }

  return (
    <motion.div className={cardClass} {...motionProps}>
      {inner}
    </motion.div>
  );
}
