import { InvalidPlayersError } from './errors';
import { ALL_ROLES } from './roles';
import type { Assignments, PlayerId } from './types';

// Fisher–Yates shuffle; rng must return a float in [0, 1). One role per player.
export function dealRoles(
  playerIds: PlayerId[],
  rng: () => number,
): Assignments {
  if (playerIds.length !== 4) {
    throw new InvalidPlayersError(
      `Expected exactly 4 players, got ${playerIds.length}.`,
    );
  }
  if (new Set(playerIds).size !== playerIds.length) {
    throw new InvalidPlayersError('Player ids must be unique.');
  }

  const shuffled = [...playerIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const assignments: Assignments = {};
  shuffled.forEach((id, index) => {
    assignments[id] = ALL_ROLES[index];
  });
  return assignments;
}
