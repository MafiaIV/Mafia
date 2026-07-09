import type { RoleId } from '@mafia/shared';
import type { RoleDistribution } from '@mafia/shared';

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function expandDistribution(distribution: RoleDistribution): RoleId[] {
  const roles: RoleId[] = [];
  for (const [roleId, count] of Object.entries(distribution) as [RoleId, number][]) {
    for (let i = 0; i < (count ?? 0); i++) roles.push(roleId);
  }
  return roles;
}

/**
 * Builds the shuffled role deck for the game and assigns one role to each
 * playerId. The deck order has no relation to player order — it's shuffled
 * again independently so watching the reveal animation can't leak who has
 * what.
 */
export function assignRoles(
  playerIds: string[],
  distribution: RoleDistribution,
): { assignments: Map<string, RoleId>; roleDeck: RoleId[] } {
  const roles = expandDistribution(distribution);
  if (roles.length !== playerIds.length) {
    throw new Error('Role distribution does not match player count');
  }
  const shuffledRoles = shuffle(roles);
  const assignments = new Map<string, RoleId>();
  playerIds.forEach((playerId, i) => {
    assignments.set(playerId, shuffledRoles[i]);
  });
  const roleDeck = shuffle(roles);
  return { assignments, roleDeck };
}
