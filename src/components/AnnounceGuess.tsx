'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { ClientView } from '@/lib/server/store';
import { CharacterByRole, ROLE_LABELS } from './characters';
import { RoleCard } from './RoleCard';
import { play } from '@/lib/client/sound';
import { vibrate } from '@/lib/client/haptics';

// The Police must catch this round's target (Chor or Dakat). Babu + Police are
// public during the callout, so their cards sit face-up; the two seats absent
// from `publicRoles` are the hidden Chor/Dakat pair shown as face-down "?" cards.
// Only the Police can tap a "?" card to accuse it; the server auto-advances the
// resulting guess straight to the reveal phase.
export function AnnounceGuess({
  view,
  onGuess,
}: {
  view: ClientView;
  onGuess: (targetId: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const isPolice = view.myRole === 'police';
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const target = view.round?.target ?? 'chor';
  const targetLabel = ROLE_LABELS[target];

  // The Police is publicly known during the callout, so find their name to tell
  // everyone else exactly who is deciding.
  const policeId = Object.entries(view.publicRoles).find(
    ([, role]) => role === 'police',
  )?.[0];
  const policeName =
    view.players.find((p) => p.id === policeId)?.name ?? 'Police';

  const accuse = async (targetId: string) => {
    if (pending) return;
    setPending(targetId);
    setError(null);
    play('drumroll');
    vibrate('select');
    const res = await onGuess(targetId);
    if (!res.ok) {
      setError(res.message ?? 'That accusation was not allowed.');
      setPending(null);
    }
  };

  return (
    <div className="safe-px mx-auto flex w-full max-w-md flex-col items-center gap-5 py-6">
      {/* Compact visual callout: Police → catch [target character]. */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="paper inked flex w-full items-center justify-center gap-3 px-4 py-4"
      >
        <CharacterByRole role="police" size={64} title={ROLE_LABELS.police.roman} />
        <motion.span
          className="font-display text-4xl font-800 text-vermilion-dark"
          aria-hidden
          animate={{ x: [0, 6, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          →
        </motion.span>
        <div className="relative">
          <CharacterByRole
            role={target}
            size={64}
            title={`Catch the ${targetLabel.roman}`}
          />
          <span className="absolute -right-1 -top-2 text-2xl" aria-hidden>
            🎯
          </span>
        </div>
        <span className="sr-only">Police, catch the {targetLabel.en}</span>
      </motion.div>

      {isPolice ? (
        <motion.p
          className="flex items-center gap-2 text-center font-display text-lg font-800 text-marigold"
          aria-label={`You are the Police — catch the ${targetLabel.en}. Tap a card.`}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <span aria-hidden>👮 You&apos;re the Police — catch the {targetLabel.roman}!</span>
          <CharacterByRole role={target} size={28} title={targetLabel.roman} />
        </motion.p>
      ) : (
        <p
          className="flex items-center gap-2 text-center text-lg font-700 text-paper-200"
          aria-label={`${policeName} is guessing the ${targetLabel.en}`}
        >
          <span aria-hidden>👮 🤔</span>
          <span>
            <span className="text-paper-50">{policeName}</span> is guessing the{' '}
            <span className="text-marigold">{targetLabel.roman}</span>…
          </span>
        </p>
      )}

      <div className="grid w-full grid-cols-2 gap-3">
        {view.players.map((p) => {
          const publicRole = view.publicRoles[p.id] ?? null;
          const isCandidate = publicRole === null;
          const canAccuse = isPolice && isCandidate;
          return (
            <RoleCard
              key={p.id}
              name={p.name}
              role={publicRole}
              revealed={publicRole !== null}
              isMe={p.id === view.me}
              highlight={pending === p.id ? 'accused' : null}
              shimmer={isCandidate && !isPolice}
              invite={canAccuse && pending === null}
              onClick={canAccuse ? () => accuse(p.id) : undefined}
              disabled={canAccuse ? pending !== null && pending !== p.id : true}
            />
          );
        })}
      </div>

      {error && (
        <p className="text-center text-sm font-600 text-vermilion">{error}</p>
      )}
    </div>
  );
}
