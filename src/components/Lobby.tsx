'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { motion } from 'motion/react';
import type { ClientView } from '@/lib/server/store';
import { Avatar } from './characters/Avatar';
import { Button } from './ui/Button';
import { Seal } from './brand/Seal';
import { play } from '@/lib/client/sound';

export function Lobby({
  view,
  onStart,
  onAddBot,
  onRemoveBot,
}: {
  view: ClientView;
  onStart: () => void;
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [botPending, startBotTransition] = useTransition();
  const me = view.players.find((p) => p.id === view.me);
  const isHost = !!me?.isHost;
  const count = view.players.length;
  const hasBots = view.players.some((p) => p.isBot);

  // Chime when a human joins (everyone present + the joiner). Bots don't count.
  const prevHumans = useRef<number | null>(null);
  useEffect(() => {
    const humans = view.players.filter((p) => !p.isBot).length;
    if (prevHumans.current === null) {
      if (humans > 1) play('join'); // you joined a room that already had players
    } else if (humans > prevHumans.current) {
      play('join'); // someone joined while you're here
    }
    prevHumans.current = humans;
  }, [view.players]);

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `Join my Chor Police room — code ${view.code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Chor Police', text, url });
        return;
      }
    } catch {
      /* fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div className="safe-px mx-auto flex w-full max-w-md flex-col items-center gap-6 py-8">
      <div className="paper inked flex w-full flex-col gap-3 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 shrink font-display text-[clamp(2.25rem,14vw,3rem)] font-800 tracking-[0.25em] text-vermilion-dark">
            {view.code}
          </p>
          <button
            type="button"
            onClick={share}
            aria-label={copied ? 'Invite link copied' : 'Share invite link'}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-ink/30 bg-paper-100 px-4 font-display text-base font-700 text-ink transition-colors hover:bg-paper-200 active:scale-95"
          >
            <span aria-hidden>{copied ? '✓' : '🔗'}</span>
            {copied ? 'Copied!' : 'Share invite'}
          </button>
        </div>
        <p className="text-sm text-ink-soft">Share the code with 3 friends to start.</p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((seat) => {
          const p = view.players[seat];
          return (
            <motion.div
              key={seat}
              layout
              className={[
                'flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5',
                p
                  ? 'border-paper-50/30 bg-felt-800/70'
                  : 'border-dashed border-paper-50/20 bg-felt-800/30',
              ].join(' ')}
            >
              {p ? (
                <>
                  <div className="relative">
                    <Avatar emoji={p.avatar} seat={seat} size={44} />
                    <span
                      className={[
                        'absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-felt-900',
                        p.connected ? 'bg-teal' : 'bg-zinc-500',
                      ].join(' ')}
                      title={p.connected ? 'online' : 'offline'}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-600 text-paper-50">
                      {p.isHost && <span aria-label="host">👑 </span>}
                      {p.name}
                      {p.id === view.me ? ' ·' : ''}
                    </p>
                    {/* Host-only bot tag; non-hosts can't tell a bot from a human. */}
                    {isHost && p.isBot && (
                      <span className="text-[11px] font-700 text-paper-200/70">🤖 bot</span>
                    )}
                  </div>
                  {/* Host-only: clear, always-visible remove (no hover on mobile). */}
                  {isHost && p.isBot && (
                    <button
                      type="button"
                      onClick={() => startBotTransition(() => onRemoveBot(p.id))}
                      disabled={botPending}
                      aria-label={`Remove bot ${p.name}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-vermilion/50 bg-vermilion/15 font-700 text-vermilion transition-colors active:scale-90 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  )}
                </>
              ) : isHost ? (
                <button
                  type="button"
                  onClick={() => startBotTransition(onAddBot)}
                  disabled={botPending}
                  aria-label="Add a bot to this seat"
                  className="flex w-full items-center justify-center gap-1.5 text-sm font-600 text-paper-200/70 transition-colors hover:text-marigold disabled:opacity-50"
                >
                  <span aria-hidden className="text-xl">🤖</span> Add bot
                </button>
              ) : (
                <span className="text-2xl text-paper-200/40" aria-label="empty seat">
                  ➕
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-sm text-paper-200">
        <span aria-hidden>{view.mode === 'rounds' ? '🎯' : '🏁'}</span>{' '}
        <span className="font-700 text-paper-50">{view.modeValue}</span>
        {' · '}
        <span className="font-600 text-paper-50">{count}/4</span>
      </p>

      {isHost && hasBots && (
        <p className="-mt-3 text-center text-xs text-paper-200/70">
          Tap ✕ on a 🤖 bot to free a seat for a friend.
        </p>
      )}

      {isHost ? (
        <Button
          onClick={onStart}
          disabled={!view.canStart}
          className="w-full"
          aria-label={view.canStart ? 'Start game' : `Waiting for players ${count} of 4`}
        >
          {view.canStart ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Seal className="h-6 w-6" /> Start game
            </span>
          ) : (
            `⏳ Waiting… ${count}/4`
          )}
        </Button>
      ) : (
        <p className="text-center text-paper-200" aria-label="Waiting for host">
          {count < 4 ? `⏳ Waiting… ${count}/4` : '⏳ Waiting for host…'}
        </p>
      )}
    </div>
  );
}
