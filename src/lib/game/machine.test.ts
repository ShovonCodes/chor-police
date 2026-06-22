import { describe, it, expect } from 'vitest';
import { advance, initMatch, winners } from './machine';
import { nextTarget } from './scoring';
import { InvalidTransitionError } from './errors';
import type { Assignments, MatchState, RoundTarget } from './types';

const PLAYERS = ['pBabu', 'pPolice', 'pDakat', 'pChor'];
const assignments: Assignments = {
  pBabu: 'babu',
  pPolice: 'police',
  pDakat: 'dakat',
  pChor: 'chor',
};

/** Run a full round ending in `scoring`, using the given guess and target. */
function playRound(
  state: MatchState,
  guess: string,
  target: RoundTarget,
): MatchState {
  let s = advance(state, { type: 'START_DEAL', assignments, target });
  s = advance(s, { type: 'FINISH_DRAW' });
  s = advance(s, { type: 'ANNOUNCE' });
  s = advance(s, { type: 'GUESS', policeGuess: guess });
  s = advance(s, { type: 'REVEAL' });
  s = advance(s, { type: 'SCORE' });
  return s;
}

describe('machine — happy path', () => {
  it('walks dealing→drawing→announce→guessing→reveal→scoring and carries target', () => {
    const init = initMatch({ players: PLAYERS, mode: 'rounds', modeValue: 3 });
    expect(init.phase).toBe('lobby');

    let s = advance(init, { type: 'START_DEAL', assignments, target: 'chor' });
    expect(s.phase).toBe('dealing');
    expect(s.currentRound?.target).toBe('chor');
    s = advance(s, { type: 'FINISH_DRAW' });
    expect(s.phase).toBe('drawing');
    s = advance(s, { type: 'ANNOUNCE' });
    expect(s.phase).toBe('announce');
    s = advance(s, { type: 'GUESS', policeGuess: 'pChor' });
    expect(s.phase).toBe('guessing');
    expect(s.currentRound?.caught).toBe(true);
    expect(s.currentRound?.policeGuess).toBe('pChor');
    s = advance(s, { type: 'REVEAL' });
    expect(s.phase).toBe('reveal');
    s = advance(s, { type: 'SCORE' });
    expect(s.phase).toBe('scoring');
  });

  it('does not mutate the input state', () => {
    const init = initMatch({ players: PLAYERS, mode: 'rounds', modeValue: 3 });
    advance(init, { type: 'START_DEAL', assignments, target: 'chor' });
    expect(init.phase).toBe('lobby');
    expect(init.currentRound).toBeNull();
  });
});

describe('machine — out-of-phase rejection', () => {
  it('rejects GUESS while in lobby', () => {
    const init = initMatch({ players: PLAYERS, mode: 'rounds', modeValue: 3 });
    expect(() =>
      advance(init, { type: 'GUESS', policeGuess: 'pChor' }),
    ).toThrow(InvalidTransitionError);
  });

  it('rejects SCORE before reveal', () => {
    const init = initMatch({ players: PLAYERS, mode: 'rounds', modeValue: 3 });
    const s = advance(init, { type: 'START_DEAL', assignments, target: 'chor' });
    expect(() => advance(s, { type: 'SCORE' })).toThrow(InvalidTransitionError);
  });

  it('rejects FINISH_DRAW from lobby', () => {
    const init = initMatch({ players: PLAYERS, mode: 'rounds', modeValue: 3 });
    expect(() => advance(init, { type: 'FINISH_DRAW' })).toThrow(
      InvalidTransitionError,
    );
  });
});

describe('machine — tally accumulation', () => {
  it('accumulates totals across alternating-target rounds', () => {
    const init = initMatch({ players: PLAYERS, mode: 'rounds', modeValue: 3 });
    // Round 1: target chor, caught.
    let s = playRound(init, 'pChor', 'chor');
    expect(s.totals).toEqual({
      pBabu: 1000,
      pPolice: 800,
      pChor: 0,
      pDakat: 600,
    });
    s = advance(s, { type: 'NEXT' });
    // Round 2: target dakat (alternated), NOT caught (police points at chor).
    const t2 = nextTarget('chor');
    s = playRound(s, 'pChor', t2);
    expect(s.totals).toEqual({
      pBabu: 2000,
      pPolice: 800,
      pChor: 400,
      pDakat: 1200,
    });
    expect(s.history).toHaveLength(2);
  });
});

describe('machine — match end (rounds mode)', () => {
  it('reaches podium after exactly modeValue rounds', () => {
    const init = initMatch({ players: PLAYERS, mode: 'rounds', modeValue: 2 });
    let s = playRound(init, 'pChor', 'chor');
    s = advance(s, { type: 'NEXT' });
    expect(s.phase).toBe('scoring');
    s = playRound(s, 'pChor', 'chor');
    s = advance(s, { type: 'NEXT' });
    expect(s.phase).toBe('podium');
    expect(s.winners).toEqual(['pBabu']);
  });
});

describe('machine — match end (target mode)', () => {
  it('reaches podium when a running total hits the target score', () => {
    const init = initMatch({ players: PLAYERS, mode: 'target', modeValue: 1500 });
    let s = playRound(init, 'pChor', 'chor'); // pBabu at 1000
    s = advance(s, { type: 'NEXT' });
    expect(s.phase).toBe('scoring');
    s = playRound(s, 'pChor', 'chor'); // pBabu at 2000 >= 1500
    s = advance(s, { type: 'NEXT' });
    expect(s.phase).toBe('podium');
    expect(s.winners).toEqual(['pBabu']);
  });
});

describe('winners', () => {
  it('returns the single highest scorer', () => {
    expect(winners({ a: 10, b: 5, c: 1 })).toEqual(['a']);
  });

  it('returns all tied top players', () => {
    expect(
      winners({ a: 10, b: 10, c: 1, d: 3 }, ['a', 'b', 'c', 'd']),
    ).toEqual(['a', 'b']);
  });

  it('returns every player when all tied', () => {
    expect(winners({ a: 0, b: 0 }, ['a', 'b'])).toEqual(['a', 'b']);
  });
});
