'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientView, ReactionEvent } from '@/lib/server/store';
import {
  addBot as addBotAction,
  advancePhase as advancePhaseAction,
  markSeen as markSeenAction,
  removeBot as removeBotAction,
  sendReaction as sendReactionAction,
  startMatch as startMatchAction,
  submitGuess as submitGuessAction,
} from '@/app/actions';

const STORAGE_PREFIX = 'chor-police:player:';

function storageKey(code: string): string {
  return `${STORAGE_PREFIX}${code.toUpperCase()}`;
}

export function getStoredPlayerId(code: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(storageKey(code));
}

export function storePlayerId(code: string, playerId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(code), playerId);
}

const NAME_KEY = 'chor-police:name';

export function getStoredName(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(NAME_KEY) ?? '';
}

export function storeName(name: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim();
  if (trimmed) window.localStorage.setItem(NAME_KEY, trimmed);
}

export type ActiveReaction = ReactionEvent & { me: boolean };

const REACTION_TTL_MS = 2800;
const MAX_REACTIONS = 12;

export interface UseRoom {
  view: ClientView | null;
  connected: boolean;
  reactions: ActiveReaction[];
  addBot: () => ReturnType<typeof addBotAction>;
  removeBot: (botId: string) => ReturnType<typeof removeBotAction>;
  startMatch: () => ReturnType<typeof startMatchAction>;
  markSeen: () => ReturnType<typeof markSeenAction>;
  submitGuess: (targetId: string) => ReturnType<typeof submitGuessAction>;
  reveal: () => ReturnType<typeof advancePhaseAction>;
  score: () => ReturnType<typeof advancePhaseAction>;
  next: () => ReturnType<typeof advancePhaseAction>;
  sendReaction: (emoji: string) => ReturnType<typeof sendReactionAction>;
}

export function useRoom(
  code: string,
  playerId?: string | null,
): UseRoom {
  const [view, setView] = useState<ClientView | null>(null);
  const [connected, setConnected] = useState(false);
  const [reactions, setReactions] = useState<ActiveReaction[]>([]);

  const resolvedId = playerId ?? getStoredPlayerId(code);

  // Hold resolvedId in a ref so action wrappers read it without being re-created.
  const idRef = useRef(resolvedId);
  useEffect(() => {
    idRef.current = resolvedId;
  }, [resolvedId]);

  useEffect(() => {
    if (!code || !resolvedId) return;

    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let cancelled = false;
    const pruneTimers = new Set<ReturnType<typeof setTimeout>>();

    const connect = () => {
      if (cancelled) return;
      const url = `/api/rooms/${encodeURIComponent(
        code,
      )}/stream?playerId=${encodeURIComponent(resolvedId)}`;
      source = new EventSource(url);

      source.onopen = () => {
        attempts = 0;
        setConnected(true);
      };

      source.onmessage = (e) => {
        try {
          setView(JSON.parse(e.data) as ClientView);
        } catch {
          // ignore malformed frames (keep-alive comments aren't messages)
        }
      };

      source.addEventListener('gone', () => {
        setView(null);
      });

      source.addEventListener('reaction', (e) => {
        try {
          const r = JSON.parse((e as MessageEvent).data) as ReactionEvent;
          const active: ActiveReaction = {
            ...r,
            me: r.fromId === resolvedId,
          };
          setReactions((prev) => [...prev, active].slice(-MAX_REACTIONS));
          const timer = setTimeout(() => {
            pruneTimers.delete(timer);
            setReactions((prev) => prev.filter((x) => x.id !== r.id));
          }, REACTION_TTL_MS);
          pruneTimers.add(timer);
        } catch {
          // ignore malformed reaction frames
        }
      });

      source.onerror = () => {
        setConnected(false);
        source?.close();
        source = null;
        if (cancelled) return;
        // Exponential backoff, capped at 5s.
        const delay = Math.min(5000, 500 * 2 ** attempts);
        attempts += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      for (const t of pruneTimers) clearTimeout(t);
      pruneTimers.clear();
      setReactions([]);
      source?.close();
    };
  }, [code, resolvedId]);

  const addBot = useCallback(
    () => addBotAction(code, idRef.current ?? ''),
    [code],
  );
  const removeBot = useCallback(
    (botId: string) => removeBotAction(code, idRef.current ?? '', botId),
    [code],
  );
  const startMatch = useCallback(
    () => startMatchAction(code, idRef.current ?? ''),
    [code],
  );
  const markSeen = useCallback(
    () => markSeenAction(code, idRef.current ?? ''),
    [code],
  );
  const submitGuess = useCallback(
    (targetId: string) => submitGuessAction(code, idRef.current ?? '', targetId),
    [code],
  );
  const reveal = useCallback(
    () => advancePhaseAction(code, idRef.current ?? '', 'reveal'),
    [code],
  );
  const score = useCallback(
    () => advancePhaseAction(code, idRef.current ?? '', 'score'),
    [code],
  );
  const next = useCallback(
    () => advancePhaseAction(code, idRef.current ?? '', 'next'),
    [code],
  );
  const sendReaction = useCallback(
    (emoji: string) => sendReactionAction(code, idRef.current ?? '', emoji),
    [code],
  );

  return {
    view,
    connected,
    reactions,
    addBot,
    removeBot,
    startMatch,
    markSeen,
    submitGuess,
    reveal,
    score,
    next,
    sendReaction,
  };
}
