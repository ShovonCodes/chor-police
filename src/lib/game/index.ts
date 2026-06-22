export type {
  Role,
  RoundTarget,
  Phase,
  PlayerId,
  MatchMode,
  Assignments,
  ScoreDelta,
  RoundState,
  MatchState,
} from './types';

export {
  InvalidPlayersError,
  IllegalGuessError,
  InvalidTransitionError,
} from './errors';

export { ROLE_NUMBERS, ALL_ROLES, roleOf } from './roles';

export { dealRoles } from './deal';

export { scoreRound, nextTarget, type RoundScore } from './scoring';

export {
  advance,
  initMatch,
  winners,
  type Action,
  type InitMatchOptions,
} from './machine';
