import { NIGHT_ACTING_ROLES, ROLES_BY_ID, type RoleId } from '@mafia/shared';
import type { RoleDistribution } from '@mafia/shared';

export interface NightStep {
  roles: RoleId[];
}

/**
 * Groups night-acting roles present in this game's distribution by their
 * nightOrder. Roles sharing an order (doctor + bodyguard) act in the same
 * step — the server waits for all of them before advancing.
 */
export function buildNightSequence(distribution: RoleDistribution): NightStep[] {
  const present = NIGHT_ACTING_ROLES.filter((id) => (distribution[id] ?? 0) > 0);
  const byOrder = new Map<number, RoleId[]>();
  for (const id of present) {
    const order = ROLES_BY_ID[id].nightOrder ?? 0;
    if (!byOrder.has(order)) byOrder.set(order, []);
    byOrder.get(order)!.push(id);
  }
  return [...byOrder.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, roles]) => ({ roles }));
}
