import { IllegalGuessError } from './errors';
import { ROLE_NUMBERS } from './roles';
import type { Assignments, PlayerId, RoundTarget, ScoreDelta } from './types';

export interface RoundScore {
  deltas: ScoreDelta;
  caught: boolean;
}

/** Strict alternation of the round target (chor ⇄ dakat). */
export function nextTarget(prev: RoundTarget): RoundTarget {
  return prev === 'chor' ? 'dakat' : 'chor';
}

// Scoring per round (target = the outlaw role the Police must catch):
//   babu      -> 1000 always
//   police    -> 800 if caught, else 0
//   target    -> 0 if caught, else his number
//   non-target-> always his number
export function scoreRound(
  assignments: Assignments,
  policeGuess: PlayerId,
  target: RoundTarget,
): RoundScore {
  const guessedRole = assignments[policeGuess];

  if (guessedRole === undefined) {
    throw new IllegalGuessError(
      `Guessed player "${policeGuess}" is not in this round.`,
    );
  }
  if (guessedRole !== 'chor' && guessedRole !== 'dakat') {
    throw new IllegalGuessError(
      `Police may only guess an unrevealed outlaw (chor or dakat), not ${guessedRole}.`,
    );
  }

  const caught = guessedRole === target;

  const deltas: ScoreDelta = {};
  for (const [playerId, role] of Object.entries(assignments)) {
    let points: number;
    if (role === 'babu') {
      points = ROLE_NUMBERS.babu;
    } else if (role === 'police') {
      points = caught ? ROLE_NUMBERS.police : 0;
    } else if (role === target) {
      points = caught ? 0 : ROLE_NUMBERS[role];
    } else {
      points = ROLE_NUMBERS[role];
    }
    deltas[playerId] = points;
  }

  return { deltas, caught };
}
