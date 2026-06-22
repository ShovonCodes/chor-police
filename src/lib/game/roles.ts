import type { Assignments, PlayerId, Role } from './types';

export const ROLE_NUMBERS: Record<Role, number> = {
  babu: 1000,
  police: 800,
  dakat: 600,
  chor: 400,
};

export const ALL_ROLES: readonly Role[] = ['babu', 'police', 'dakat', 'chor'];

export function roleOf(assignments: Assignments, playerId: PlayerId): Role {
  return assignments[playerId];
}
