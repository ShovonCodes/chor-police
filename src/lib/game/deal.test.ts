import { describe, it, expect } from 'vitest';
import { dealRoles } from './deal';
import { InvalidPlayersError } from './errors';
import { ALL_ROLES } from './roles';
import type { Role } from './types';

const PLAYERS = ['p1', 'p2', 'p3', 'p4'];

/** rng that replays a fixed sequence, clamped to the last value. */
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('dealRoles', () => {
  it('assigns exactly one of each role', () => {
    const assignments = dealRoles(PLAYERS, seq([0, 0, 0]));
    const roles = Object.values(assignments).sort();
    expect(roles).toEqual([...ALL_ROLES].sort());
    expect(Object.keys(assignments).sort()).toEqual([...PLAYERS].sort());
  });

  it('is deterministic for a fixed rng', () => {
    const a = dealRoles(PLAYERS, seq([0.1, 0.5, 0.9]));
    const b = dealRoles(PLAYERS, seq([0.1, 0.5, 0.9]));
    expect(a).toEqual(b);
  });

  it('produces the expected permutation for a known rng (Fisher–Yates)', () => {
    // rng() = 0 for every draw → j is always 0.
    // ['p1','p2','p3','p4'] -> ['p2','p3','p4','p1'] after the walk.
    const assignments = dealRoles(PLAYERS, seq([0, 0, 0]));
    const expected: Record<string, Role> = {
      p2: 'babu',
      p3: 'police',
      p4: 'dakat',
      p1: 'chor',
    };
    expect(assignments).toEqual(expected);
  });

  it('rejects fewer than 4 players', () => {
    expect(() => dealRoles(['p1', 'p2', 'p3'], seq([0]))).toThrow(
      InvalidPlayersError,
    );
  });

  it('rejects more than 4 players', () => {
    expect(() =>
      dealRoles(['p1', 'p2', 'p3', 'p4', 'p5'], seq([0])),
    ).toThrow(InvalidPlayersError);
  });

  it('rejects duplicate player ids', () => {
    expect(() => dealRoles(['p1', 'p1', 'p2', 'p3'], seq([0]))).toThrow(
      InvalidPlayersError,
    );
  });
});
