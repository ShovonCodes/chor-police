import { describe, it, expect } from 'vitest';
import { scoreRound, nextTarget } from './scoring';
import { IllegalGuessError } from './errors';
import type { Assignments } from './types';

const assignments: Assignments = {
  pBabu: 'babu',
  pPolice: 'police',
  pDakat: 'dakat',
  pChor: 'chor',
};

describe('nextTarget', () => {
  it('alternates chor -> dakat', () => {
    expect(nextTarget('chor')).toBe('dakat');
  });
  it('alternates dakat -> chor', () => {
    expect(nextTarget('dakat')).toBe('chor');
  });
});

describe('scoreRound — full matrix', () => {
  it('target=chor, caught: babu 1000, police 800, chor 0, dakat 600', () => {
    const { deltas, caught } = scoreRound(assignments, 'pChor', 'chor');
    expect(caught).toBe(true);
    expect(deltas).toEqual({
      pBabu: 1000,
      pPolice: 800,
      pChor: 0,
      pDakat: 600,
    });
  });

  it('target=chor, NOT caught: babu 1000, police 0, chor 400, dakat 600', () => {
    const { deltas, caught } = scoreRound(assignments, 'pDakat', 'chor');
    expect(caught).toBe(false);
    expect(deltas).toEqual({
      pBabu: 1000,
      pPolice: 0,
      pChor: 400,
      pDakat: 600,
    });
  });

  it('target=dakat, caught: babu 1000, police 800, dakat 0, chor 400', () => {
    const { deltas, caught } = scoreRound(assignments, 'pDakat', 'dakat');
    expect(caught).toBe(true);
    expect(deltas).toEqual({
      pBabu: 1000,
      pPolice: 800,
      pDakat: 0,
      pChor: 400,
    });
  });

  it('target=dakat, NOT caught: babu 1000, police 0, dakat 600, chor 400', () => {
    const { deltas, caught } = scoreRound(assignments, 'pChor', 'dakat');
    expect(caught).toBe(false);
    expect(deltas).toEqual({
      pBabu: 1000,
      pPolice: 0,
      pDakat: 600,
      pChor: 400,
    });
  });
});

describe('scoreRound — illegal guesses', () => {
  it('throws when the Police guesses the Babu', () => {
    expect(() => scoreRound(assignments, 'pBabu', 'chor')).toThrow(
      IllegalGuessError,
    );
  });

  it('throws when the Police guesses self (police)', () => {
    expect(() => scoreRound(assignments, 'pPolice', 'chor')).toThrow(
      IllegalGuessError,
    );
  });

  it('throws when the guessed player is not in the round', () => {
    expect(() => scoreRound(assignments, 'ghost', 'chor')).toThrow(
      IllegalGuessError,
    );
  });
});
