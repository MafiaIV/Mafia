import type { RoleId } from './roles.js';

export type RoleDistribution = Partial<Record<RoleId, number>>;

/**
 * Default recommended distribution per player count. This is a starting
 * point, not a hard rule — the host can edit counts in the Lobby before
 * starting; the server just validates whatever is submitted.
 */
export const DEFAULT_DISTRIBUTIONS: Record<number, RoleDistribution> = {
  5: { mafia: 1, detective: 1, doctor: 1, villager: 2 },
  6: { mafia: 1, detective: 1, doctor: 1, villager: 3 },
  7: { mafia: 2, detective: 1, doctor: 1, villager: 3 },
  8: { mafia: 2, detective: 1, doctor: 1, seductress: 1, villager: 3 },
  9: { mafia: 2, detective: 1, doctor: 1, bodyguard: 1, seductress: 1, villager: 3 },
  10: { mafia: 2, detective: 1, doctor: 1, bodyguard: 1, witch: 1, seductress: 1, villager: 3 },
  11: { mafia: 3, detective: 1, doctor: 1, bodyguard: 1, witch: 1, seductress: 1, villager: 3 },
  12: {
    mafia: 3,
    detective: 1,
    doctor: 1,
    bodyguard: 1,
    witch: 1,
    seductress: 1,
    jester: 1,
    villager: 3,
  },
  13: {
    mafia: 3,
    detective: 1,
    doctor: 1,
    bodyguard: 1,
    witch: 1,
    seductress: 1,
    jester: 1,
    mayor: 1,
    villager: 3,
  },
  14: {
    mafia: 3,
    detective: 1,
    doctor: 1,
    bodyguard: 1,
    witch: 1,
    seductress: 1,
    jester: 1,
    mayor: 1,
    villager: 4,
  },
  15: {
    mafia: 4,
    detective: 1,
    doctor: 1,
    bodyguard: 1,
    witch: 1,
    seductress: 1,
    jester: 1,
    mayor: 1,
    villager: 4,
  },
};

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 20;

/**
 * For counts outside the curated table, extend the 15-player set with extra
 * villagers. Below MIN_PLAYERS there's no sensible default (the lobby can't
 * start yet regardless), so it returns empty rather than an oversized table.
 */
export function getDefaultDistribution(playerCount: number): RoleDistribution {
  if (playerCount < MIN_PLAYERS) return {};
  if (DEFAULT_DISTRIBUTIONS[playerCount]) {
    return { ...DEFAULT_DISTRIBUTIONS[playerCount] };
  }
  const base = { ...DEFAULT_DISTRIBUTIONS[15] };
  const baseTotal = Object.values(base).reduce((a, b) => a + (b ?? 0), 0);
  base.villager = (base.villager ?? 0) + Math.max(0, playerCount - baseTotal);
  return base;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateDistribution(
  playerCount: number,
  distribution: RoleDistribution,
): ValidationResult {
  const total = Object.values(distribution).reduce((a, b) => a + (b ?? 0), 0);
  if (total !== playerCount) {
    return { valid: false, error: `Ролите (${total}) не съвпадат с броя играчи (${playerCount}).` };
  }
  const mafiaCount = distribution.mafia ?? 0;
  if (mafiaCount < 1) {
    return { valid: false, error: 'Трябва да има поне 1 мафиот.' };
  }
  if (mafiaCount > Math.ceil(playerCount * 0.3)) {
    return { valid: false, error: 'Мафията не може да е повече от ~30% от играчите.' };
  }
  for (const [roleId, count] of Object.entries(distribution)) {
    if ((count ?? 0) < 0) {
      return { valid: false, error: `Невалиден брой за роля ${roleId}.` };
    }
  }
  return { valid: true };
}
