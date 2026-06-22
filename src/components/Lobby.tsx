'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { ClientView } from '@/lib/server/store';
import { Avatar } from './characters/Avatar';
import { Button } from './ui/Button';
import { Seal } from './brand/Seal';

export function Lobby({
  view,
  onStart,
}: {
  view: ClientView;
  onStart: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const me = view.players.find((p) => p.id === view.me);
  const isHost = !!me?.isHost;
  const count = view.players.length;

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
                  <div className="min-w-0">
                    <p className="truncate font-600 text-paper-50">
                      {p.isHost && <span aria-label="host">👑 </span>}
                      {p.name}
                      {p.id === view.me ? ' ·' : ''}
                    </p>
                  </div>
                </>
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
