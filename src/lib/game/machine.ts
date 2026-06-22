import { InvalidTransitionError } from './errors';
import { scoreRound } from './scoring';
import type {
  Assignments,
  MatchMode,
  MatchState,
  PlayerId,
  RoundState,
  RoundTarget,
} from './types';

export type Action =
  | { type: 'START_DEAL'; assignments: Assignments; target: RoundTarget }
  | { type: 'FINISH_DRAW' }
  | { type: 'ANNOUNCE' }
  | { type: 'GUESS'; policeGuess: PlayerId }
  | { type: 'REVEAL' }
  | { type: 'SCORE' }
  | { type: 'NEXT' };

export interface InitMatchOptions {
  players: PlayerId[];
  mode: MatchMode;
  modeValue: number;
}

export function initMatch({
  players,
  mode,
  modeValue,
}: InitMatchOptions): MatchState {
  const totals: Record<PlayerId, number> = {};
  for (const id of players) totals[id] = 0;
  return {
    players,
    phase: 'lobby',
    mode,
    modeValue,
    totals,
    currentRound: null,
    history: [],
    winners: null,
  };
}

/** Highest scorer(s); ties return every tied top player, in `players` order. */
export function winners(
  totals: Record<PlayerId, number>,
  order?: PlayerId[],
): PlayerId[] {
  const ids = order ?? Object.keys(totals);
  let max = -Infinity;
  for (const id of ids) max = Math.max(max, totals[id]);
  return ids.filter((id) => totals[id] === max);
}

function isMatchOver(state: MatchState): boolean {
  if (state.mode === 'rounds') {
    return state.history.length >= state.modeValue;
  }
  return Object.values(state.totals).some((t) => t >= state.modeValue);
}

function expect(state: MatchState, phase: MatchState['phase'], action: Action): void {
  if (state.phase !== phase) {
    throw new InvalidTransitionError(
      `Action ${action.type} requires phase "${phase}" but match is in "${state.phase}".`,
    );
  }
}

// Pure transition function; never mutates input, throws on out-of-phase actions.
export function advance(state: MatchState, action: Action): MatchState {
  switch (action.type) {
    case 'START_DEAL': {
      // A new round may be dealt from the lobby or after the previous round is scored.
      if (state.phase !== 'lobby' && state.phase !== 'scoring') {
        throw new InvalidTransitionError(
          `START_DEAL requires phase "lobby" or "scoring" but match is in "${state.phase}".`,
        );
      }
      const round: RoundState = {
        roundNumber: state.history.length + 1,
        assignments: action.assignments,
        target: action.target,
        policeGuess: null,
        caught: null,
        deltas: null,
      };
      return { ...state, phase: 'dealing', currentRound: round };
    }

    case 'FINISH_DRAW': {
      expect(state, 'dealing', action);
      return { ...state, phase: 'drawing' };
    }

    case 'ANNOUNCE': {
      expect(state, 'drawing', action);
      return { ...state, phase: 'announce' };
    }

    case 'GUESS': {
      expect(state, 'announce', action);
      const round = state.currentRound!;
      // scoreRound throws IllegalGuessError on an illegal guess, so the phase won't advance.
      const { deltas, caught } = scoreRound(
        round.assignments,
        action.policeGuess,
        round.target,
      );
      const scoredRound: RoundState = {
        ...round,
        policeGuess: action.policeGuess,
        caught,
        deltas,
      };
      return { ...state, phase: 'guessing', currentRound: scoredRound };
    }

    case 'REVEAL': {
      expect(state, 'guessing', action);
      return { ...state, phase: 'reveal' };
    }

    case 'SCORE': {
      expect(state, 'reveal', action);
      const round = state.currentRound!;
      const deltas = round.deltas!;
      const totals = { ...state.totals };
      for (const [id, pts] of Object.entries(deltas)) {
        totals[id] = (totals[id] ?? 0) + pts;
      }
      return {
        ...state,
        phase: 'scoring',
        totals,
        currentRound: round,
        history: [...state.history, round],
      };
    }

    case 'NEXT': {
      expect(state, 'scoring', action);
      if (isMatchOver(state)) {
        return {
          ...state,
          phase: 'podium',
          currentRound: null,
          winners: winners(state.totals, state.players),
        };
      }
      // Stay in scoring with no current round until the next START_DEAL.
      return { ...state, currentRound: null };
    }

    default: {
      const _exhaustive: never = action;
      throw new InvalidTransitionError(
        `Unknown action: ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}
