'use server';

import {
  gameStore,
  newReactionId,
  StoreError,
  type ClientView,
} from '@/lib/server/store';
import { nextTarget, type MatchMode, type PlayerId, type RoundTarget } from '@/lib/game';

export type ActionError =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_IN_PROGRESS'
  | 'NOT_HOST'
  | 'NOT_A_PLAYER'
  | 'NOT_YOUR_TURN'
  | 'WRONG_PHASE'
  | 'NOT_ENOUGH_PLAYERS'
  | 'ILLEGAL_MOVE'
  | 'BAD_INPUT';

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: ActionError; message: string };

function fail(error: ActionError, message: string): Result<never> {
  return { ok: false, error, message };
}

function toFailure(err: unknown): Result<never> {
  if (err instanceof StoreError) {
    const known: ActionError =
      err.code === 'ROOM_NOT_FOUND'
        ? 'ROOM_NOT_FOUND'
        : err.code === 'ROOM_FULL'
          ? 'ROOM_FULL'
          : err.code === 'ROOM_IN_PROGRESS'
            ? 'ROOM_IN_PROGRESS'
            : err.code === 'NOT_HOST'
              ? 'NOT_HOST'
              : 'ILLEGAL_MOVE';
    return fail(known, err.message);
  }
  const message = err instanceof Error ? err.message : 'Illegal move.';
  return fail('ILLEGAL_MOVE', message);
}

export async function createRoom(
  hostName: string,
  mode: MatchMode,
  modeValue: number,
): Promise<Result<{ code: string; playerId: PlayerId }>> {
  const name = hostName?.trim();
  if (!name) return fail('BAD_INPUT', 'Host name is required.');
  if (mode !== 'rounds' && mode !== 'target')
    return fail('BAD_INPUT', 'Invalid mode.');
  if (!Number.isFinite(modeValue) || modeValue <= 0)
    return fail('BAD_INPUT', 'Mode value must be positive.');

  try {
    const { code, hostId } = await gameStore.createRoom(name, mode, modeValue);
    return { ok: true, value: { code, playerId: hostId } };
  } catch (err) {
    return toFailure(err);
  }
}

export async function joinRoom(
  code: string,
  name: string,
): Promise<Result<{ code: string; playerId: PlayerId; view: ClientView }>> {
  const trimmed = name?.trim();
  if (!code) return fail('BAD_INPUT', 'Room code is required.');
  if (!trimmed) return fail('BAD_INPUT', 'Name is required.');

  try {
    const { playerId } = await gameStore.joinRoom(code.toUpperCase(), trimmed);
    const view = await gameStore.viewFor(code.toUpperCase(), playerId);
    if (!view) return fail('ROOM_NOT_FOUND', 'Room not found.');
    return { ok: true, value: { code: code.toUpperCase(), playerId, view } };
  } catch (err) {
    return toFailure(err);
  }
}

export async function addBot(
  code: string,
  playerId: PlayerId,
): Promise<Result<ClientView>> {
  try {
    await gameStore.addBot(code, playerId);
    return view(code, playerId);
  } catch (err) {
    return toFailure(err);
  }
}

export async function removeBot(
  code: string,
  playerId: PlayerId,
  botId: PlayerId,
): Promise<Result<ClientView>> {
  try {
    await gameStore.removeBot(code, playerId, botId);
    return view(code, playerId);
  } catch (err) {
    return toFailure(err);
  }
}

export async function restartMatch(
  code: string,
  playerId: PlayerId,
): Promise<Result<ClientView>> {
  try {
    await gameStore.restartMatch(code, playerId);
    return view(code, playerId);
  } catch (err) {
    return toFailure(err);
  }
}

export async function startMatch(
  code: string,
  playerId: PlayerId,
): Promise<Result<ClientView>> {
  try {
    const room = await gameStore.getRoom(code);
    if (!room) return fail('ROOM_NOT_FOUND', 'Room not found.');

    const actor = room.players.find((p) => p.id === playerId);
    if (!actor) return fail('NOT_A_PLAYER', 'You are not in this room.');
    if (!actor.isHost) return fail('NOT_HOST', 'Only the host can start.');
    if (room.match.phase !== 'lobby')
      return fail('WRONG_PHASE', 'Match already started.');
    if (room.players.length !== 4)
      return fail('NOT_ENOUGH_PLAYERS', 'Need exactly 4 players to start.');

    gameStore.seatPlayers(code);
    const seated = await gameStore.getRoom(code);
    const ids = seated!.players.map((p) => p.id);
    const assignments = gameStore.dealAssignments(ids);
    // Round 1 target is random; subsequent rounds strictly alternate (see advancePhase).
    const target: RoundTarget = Math.random() < 0.5 ? 'chor' : 'dakat';
    await gameStore.advanceRoom(code, { type: 'START_DEAL', assignments, target });
    // Land everyone in 'drawing' immediately; drawing is local per-player from here.
    await gameStore.advanceRoom(code, { type: 'FINISH_DRAW' });

    return view(code, playerId);
  } catch (err) {
    return toFailure(err);
  }
}

// Player has looked at their chit (fired on draw). Once everyone has looked,
// advance drawing→announce so the Mantri gets the guess screen. No further per-player
// action is required — seeing the chit is the only gate.
export async function markSeen(
  code: string,
  playerId: PlayerId,
): Promise<Result<ClientView>> {
  try {
    const room = await gameStore.getRoom(code);
    if (!room) return fail('ROOM_NOT_FOUND', 'Room not found.');
    if (!room.players.some((p) => p.id === playerId))
      return fail('NOT_A_PLAYER', 'You are not in this room.');
    if (room.match.phase !== 'drawing') return view(code, playerId);

    const { allDrawn } = await gameStore.markDrawn(code, playerId);
    gameStore.emitChange(code);
    if (allDrawn) {
      // Grace so the last player actually sees their card before the guess screen.
      gameStore.scheduleAnnounce(code, 3500);
    }
    return view(code, playerId);
  } catch (err) {
    return toFailure(err);
  }
}

export async function submitGuess(
  code: string,
  playerId: PlayerId,
  targetId: PlayerId,
): Promise<Result<ClientView>> {
  try {
    const room = await gameStore.getRoom(code);
    if (!room) return fail('ROOM_NOT_FOUND', 'Room not found.');
    if (!room.players.some((p) => p.id === playerId))
      return fail('NOT_A_PLAYER', 'You are not in this room.');

    const round = room.match.currentRound;
    if (!round) return fail('WRONG_PHASE', 'No round in progress.');

    // Engine accepts GUESS only in 'announce'; auto-advance from drawing.
    if (room.match.phase === 'drawing') {
      await gameStore.advanceRoom(code, { type: 'ANNOUNCE' });
    } else if (room.match.phase !== 'announce') {
      return fail('WRONG_PHASE', 'Cannot guess in the current phase.');
    }

    if (round.assignments[playerId] !== 'police')
      return fail('NOT_YOUR_TURN', 'Only the Police may guess.');

    await gameStore.advanceRoom(code, {
      type: 'GUESS',
      policeGuess: targetId,
    });
    // The guess itself flips all chits — no separate host reveal step.
    await gameStore.advanceRoom(code, { type: 'REVEAL' });
    // Dwell on the reveal so everyone reads the outcome; host may skip sooner.
    gameStore.scheduleScore(code, 6000);
    return view(code, playerId);
  } catch (err) {
    return toFailure(err);
  }
}

export async function advancePhase(
  code: string,
  playerId: PlayerId,
  action: 'reveal' | 'score' | 'next',
): Promise<Result<ClientView>> {
  try {
    const room = await gameStore.getRoom(code);
    if (!room) return fail('ROOM_NOT_FOUND', 'Room not found.');
    const actor = room.players.find((p) => p.id === playerId);
    if (!actor) return fail('NOT_A_PLAYER', 'You are not in this room.');
    if (!actor.isHost)
      return fail('NOT_HOST', 'Only the host drives phase changes.');

    if (action === 'reveal') {
      await gameStore.advanceRoom(code, { type: 'REVEAL' });
    } else if (action === 'score') {
      await gameStore.advanceRoom(code, { type: 'SCORE' });
    } else {
      // The next round's target alternates from the round just finished; read it
      // before NEXT clears currentRound. Fall back to random if it's somehow gone.
      const prevTarget = room.match.currentRound?.target;
      const target: RoundTarget = prevTarget
        ? nextTarget(prevTarget)
        : Math.random() < 0.5
          ? 'chor'
          : 'dakat';
      // After NEXT, if not at podium, deal fresh roles for the next round.
      await gameStore.advanceRoom(code, { type: 'NEXT' });
      const after = await gameStore.getRoom(code);
      if (after && after.match.phase === 'scoring' && !after.match.currentRound) {
        const ids = after.players.map((p) => p.id);
        const assignments = gameStore.dealAssignments(ids);
        await gameStore.advanceRoom(code, { type: 'START_DEAL', assignments, target });
        await gameStore.advanceRoom(code, { type: 'FINISH_DRAW' });
      }
    }
    return view(code, playerId);
  } catch (err) {
    return toFailure(err);
  }
}

export async function sendReaction(
  code: string,
  playerId: PlayerId,
  emoji: string,
): Promise<Result<true>> {
  try {
    const room = await gameStore.getRoom(code);
    if (!room) return fail('ROOM_NOT_FOUND', 'Room not found.');
    const sender = room.players.find((p) => p.id === playerId);
    if (!sender) return fail('NOT_A_PLAYER', 'You are not in this room.');
    const trimmed = emoji?.trim();
    if (!trimmed) return fail('BAD_INPUT', 'Emoji required.');

    // Reactions are ephemeral: broadcast as a dedicated SSE event, not in ClientView.
    gameStore.broadcastReaction(code, {
      id: newReactionId(),
      fromId: playerId,
      fromName: sender.name,
      emoji: trimmed,
    });
    return { ok: true, value: true };
  } catch (err) {
    return toFailure(err);
  }
}

async function view(
  code: string,
  playerId: PlayerId,
): Promise<Result<ClientView>> {
  const v = await gameStore.viewFor(code, playerId);
  if (!v) return fail('ROOM_NOT_FOUND', 'Room not found.');
  return { ok: true, value: v };
}
