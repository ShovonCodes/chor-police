'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  useRoom,
  getStoredPlayerId,
  storePlayerId,
  getStoredName,
  storeName,
} from '@/lib/client/useRoom';
import { joinRoom } from '@/app/actions';
import { Lobby } from './Lobby';
import { Chit } from './Chit';
import { AnnounceGuess } from './AnnounceGuess';
import { Reveal } from './Reveal';
import { Scoring } from './Scoring';
import { Podium } from './Podium';
import { ReactionsOverlay } from './ReactionsOverlay';
import { ReactionBar } from './ReactionBar';
import { Button } from './ui/Button';
import { MuteToggle } from './ui/MuteToggle';
import { Emblem } from './brand/Emblem';
import { Wordmark } from './brand/Wordmark';
import { MonogramCP } from './brand/MonogramCP';

const noopSubscribe = () => () => {};

export function RoomClient({ code }: { code: string }) {
  // Returns undefined on the server and first client paint so hydration matches.
  const storedId = useSyncExternalStore<string | null | undefined>(
    noopSubscribe,
    () => getStoredPlayerId(code),
    () => undefined,
  );
  const [joinedId, setJoinedId] = useState<string | null>(null);
  const playerId = joinedId ?? storedId;

  if (playerId === undefined) {
    return <CenterMsg>Loading the table…</CenterMsg>;
  }

  if (playerId === null) {
    return <QuickJoin code={code} onJoined={(id) => setJoinedId(id)} />;
  }

  return <RoomView code={code} playerId={playerId} />;
}

function RoomView({ code, playerId }: { code: string; playerId: string }) {
  const room = useRoom(code, playerId);
  const { view, connected } = room;

  if (!view) {
    return (
      <CenterMsg>
        {connected ? 'This room is no longer available.' : 'Connecting…'}
      </CenterMsg>
    );
  }

  const me = view.players.find((p) => p.id === view.me);
  const isHost = !!me?.isHost;

  const showReactionBar =
    view.phase === 'lobby' ||
    view.phase === 'announce' ||
    view.phase === 'guessing' ||
    view.phase === 'reveal' ||
    view.phase === 'scoring';

  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden">
      <ReactionsOverlay reactions={room.reactions} />
      <header className="safe-px safe-pt flex items-center justify-between gap-2 py-3">
        <span className="flex min-w-0 shrink items-center gap-2">
          <Emblem size={40} className="shrink-0 drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)]" />
          <Wordmark className="h-10 w-auto min-w-0 shrink" />
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border-2 border-paper-50/30 bg-felt-800/70 px-3 py-1 font-display text-sm font-700 tracking-widest text-marigold">
            {view.code}
          </span>
          <span
            className={[
              'h-2.5 w-2.5 rounded-full',
              connected ? 'bg-teal' : 'bg-amber-400',
            ].join(' ')}
            title={connected ? 'connected' : 'reconnecting'}
          />
          <MuteToggle />
        </div>
      </header>

      <div
        className={[
          'flex min-h-0 flex-1 flex-col overflow-y-auto',
          showReactionBar ? '' : 'safe-pb',
        ].join(' ')}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={view.phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex flex-1 flex-col"
          >
            {view.phase === 'lobby' && (
              <Lobby view={view} onStart={() => room.startMatch()} />
            )}

            {(view.phase === 'dealing' || view.phase === 'drawing') && (
              <Chit view={view} onSeen={() => room.markSeen()} />
            )}

            {(view.phase === 'announce' || view.phase === 'guessing') && (
              <AnnounceGuess
                view={view}
                onGuess={async (targetId) => {
                  const res = await room.submitGuess(targetId);
                  return res.ok
                    ? { ok: true }
                    : { ok: false, message: res.message };
                }}
              />
            )}

            {view.phase === 'reveal' && (
              <Reveal view={view} isHost={isHost} onScore={() => room.score()} />
            )}

            {view.phase === 'scoring' && (
              <Scoring view={view} isHost={isHost} onNext={() => room.next()} />
            )}

            {view.phase === 'podium' && (
              <Podium view={view} isHost={isHost} onPlayAgain={() => room.next()} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {showReactionBar && (
        <ReactionBar onPick={(e) => room.sendReaction(e)} />
      )}
    </main>
  );
}

function QuickJoin({
  code,
  onJoined,
}: {
  code: string;
  onJoined: (playerId: string) => void;
}) {
  const router = useRouter();
  const savedName = useSyncExternalStore(noopSubscribe, getStoredName, () => '');
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const name = nameOverride ?? savedName;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await joinRoom(code, name);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      storeName(name);
      storePlayerId(res.value.code, res.value.playerId);
      onJoined(res.value.playerId);
    });
  };

  return (
    <main className="safe-px safe-pt safe-pb flex flex-1 flex-col items-center justify-center">
      <div className="paper inked w-full max-w-sm p-5 text-center">
        <MonogramCP size={48} className="mx-auto mb-2" />
        <p className="font-display text-lg font-700 text-ink-soft">Joining room</p>
        <p className="font-display text-4xl font-800 tracking-[0.3em] text-vermilion-dark">
          {code}
        </p>
        <p className="mb-4 mt-1 text-sm text-ink-soft">
          Enter your name to join your friends.
        </p>
        <input
          value={name}
          onChange={(e) => setNameOverride(e.target.value)}
          maxLength={16}
          aria-label="Your name"
          placeholder="🙂 Name"
          className="mb-3 w-full min-h-[44px] rounded-xl border-2 border-ink/20 bg-paper-50 px-3 text-base text-ink placeholder:text-ink-soft/50 focus:border-vermilion focus:outline-none"
          suppressHydrationWarning
        />
        {error && <p className="mb-2 text-sm font-600 text-vermilion-dark">{error}</p>}
        <div className="flex flex-col gap-2">
          <Button onClick={submit} disabled={pending || !name.trim()} className="w-full" aria-label="Join room">
            {pending ? '…' : '🔑 Join'}
          </Button>
          <Button variant="ghost" onClick={() => router.push('/')} className="w-full" aria-label="Back home">
            🏠
          </Button>
        </div>
      </div>
    </main>
  );
}

function CenterMsg({ children }: { children: React.ReactNode }) {
  return (
    <main className="safe-px flex flex-1 flex-col items-center justify-center gap-4">
      <Emblem size={72} className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]" />
      <p className="font-bangla text-lg text-paper-200">{children}</p>
    </main>
  );
}
