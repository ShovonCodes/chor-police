'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { createRoom, joinRoom } from '@/app/actions';
import { storePlayerId, getStoredName, storeName } from '@/lib/client/useRoom';
import { Button } from '@/components/ui/Button';
import { MuteToggle } from '@/components/ui/MuteToggle';
import { CharacterByRole, ROLE_LABELS, ROLE_NUMBERS } from '@/components/characters';
import { WordmarkStacked } from '@/components/brand/Wordmark';
import type { MatchMode, Role } from '@/lib/game';

const HOME_ROLES: Role[] = ['babu', 'police', 'dakat', 'chor'];

type Tab = 'create' | 'join';

const noopSubscribe = () => () => {};

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('create');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Seed both name fields from the remembered name; null override = "user edited".
  const savedName = useSyncExternalStore(noopSubscribe, getStoredName, () => '');
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [joinNameOverride, setJoinNameOverride] = useState<string | null>(null);
  const name = nameOverride ?? savedName;
  const joinName = joinNameOverride ?? savedName;

  const [mode, setMode] = useState<MatchMode>('rounds');
  const [modeValue, setModeValue] = useState(7);

  const [code, setCode] = useState('');
  const [openRole, setOpenRole] = useState<Role | null>(null);

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const res = await createRoom(name, mode, modeValue);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      storeName(name);
      storePlayerId(res.value.code, res.value.playerId);
      router.push(`/room/${res.value.code}`);
    });
  };

  const handleJoin = () => {
    setError(null);
    startTransition(async () => {
      const res = await joinRoom(code, joinName);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      storeName(joinName);
      storePlayerId(res.value.code, res.value.playerId);
      router.push(`/room/${res.value.code}`);
    });
  };

  return (
    <main className="safe-px safe-pt safe-pb flex flex-1 flex-col items-center justify-center gap-5 py-4">
      <div className="fixed right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))]">
        <MuteToggle />
      </div>

      <div className="text-center">
        <motion.div
          className="flex items-end justify-center gap-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {HOME_ROLES.map((role, i) => {
            const label = ROLE_LABELS[role];
            return (
              <div key={role} className="relative">
                {openRole === role && (
                  <motion.span
                    initial={{ opacity: 0, y: 4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg border-2 border-ink bg-paper-50 px-2 py-1 text-xs font-700 text-ink shadow-md"
                  >
                    {label.bn} · {label.roman} · {ROLE_NUMBERS[role]}
                  </motion.span>
                )}
                <button
                  type="button"
                  onClick={() => setOpenRole((r) => (r === role ? null : role))}
                  className="animate-bob block"
                  style={{ animationDelay: `${i * 180}ms` }}
                  aria-label={`${label.roman} — tap to see role`}
                >
                  <CharacterByRole role={role} size={74} title={label.roman} />
                </button>
              </div>
            );
          })}
        </motion.div>
        <WordmarkStacked className="mx-auto mt-1 w-[min(11.5rem,50vw)] drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]" />
        <h1 className="sr-only">Chor Police</h1>
        <p className="mt-0.5 font-bangla text-base text-marigold">বাবু পুলিশ ডাকাত চোর</p>
        <p className="mt-0.5 text-sm text-paper-200">
          Four friends · four secret roles · one sneaky thief
        </p>
      </div>

      <div className="paper inked w-full max-w-sm overflow-hidden p-1">
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-ink/10 p-1">
          {(['create', 'join'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setError(null);
              }}
              className={[
                'min-h-[44px] rounded-lg font-display text-base font-700 capitalize transition-colors',
                tab === t ? 'bg-marigold text-ink shadow' : 'text-ink-soft hover:bg-ink/5',
              ].join(' ')}
            >
              {t === 'create' ? '✨ Create' : '🔑 Join'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 px-3 pb-3">
          {tab === 'create' ? (
            <>
              <input
                value={name}
                onChange={(e) => setNameOverride(e.target.value)}
                maxLength={16}
                aria-label="Your name"
                placeholder="🙂 Name"
                className={inputClass}
                suppressHydrationWarning
              />

              <div className="grid grid-cols-2 gap-2">
                {(['rounds', 'target'] as MatchMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-label={m === 'rounds' ? 'Fixed rounds' : 'First to score'}
                    aria-pressed={mode === m}
                    onClick={() => {
                      setMode(m);
                      setModeValue(m === 'rounds' ? 7 : 5000);
                    }}
                    className={[
                      'flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 text-2xl transition-colors',
                      mode === m
                        ? 'border-vermilion bg-vermilion/10'
                        : 'border-ink/20 hover:bg-ink/5',
                    ].join(' ')}
                  >
                    {m === 'rounds' ? '🎯' : '🏁'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span aria-hidden className="text-2xl">
                  {mode === 'rounds' ? '🔁' : '🏆'}
                </span>
                <input
                  type="number"
                  min={1}
                  value={modeValue}
                  onChange={(e) => setModeValue(Number(e.target.value))}
                  step={mode === 'rounds' ? 1 : 500}
                  aria-label={mode === 'rounds' ? 'Number of rounds' : 'Target score'}
                  className={`${inputClass} text-center font-display text-xl font-700`}
                  suppressHydrationWarning
                />
              </div>

              {error && <p className="text-sm font-600 text-vermilion-dark">{error}</p>}
              <Button onClick={handleCreate} disabled={pending || !name.trim()} aria-label="Create room">
                {pending ? '…' : '✨ Create'}
              </Button>
            </>
          ) : (
            <>
              <input
                value={joinName}
                onChange={(e) => setJoinNameOverride(e.target.value)}
                maxLength={16}
                aria-label="Your name"
                placeholder="🙂 Name"
                className={inputClass}
                suppressHydrationWarning
              />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="ABCD"
                aria-label="Room code"
                className={`${inputClass} text-center font-display text-2xl tracking-[0.4em]`}
                suppressHydrationWarning
              />
              {error && <p className="text-sm font-600 text-vermilion-dark">{error}</p>}
              <Button
                onClick={handleJoin}
                disabled={pending || !joinName.trim() || code.length !== 4}
                aria-label="Join room"
              >
                {pending ? '…' : '🔑 Join'}
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

const inputClass =
  'w-full min-h-[44px] rounded-xl border-2 border-ink/20 bg-paper-50 px-3 text-base text-ink placeholder:text-ink-soft/50 focus:border-vermilion focus:outline-none';
