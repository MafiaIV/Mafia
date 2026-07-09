import { ROLES_BY_ID, type RoleId, type Team } from '@mafia/shared';

export interface WinCheckPlayer {
  id: string;
  roleId: RoleId | null;
  alive: boolean;
}

export interface WinResult {
  team: Team;
  playerIds: string[];
}

/** Called after any death (night resolution or lynch, excluding a jester lynch, which is checked separately). */
export function checkWinConditions(players: WinCheckPlayer[]): WinResult | null {
  const alive = players.filter((p) => p.alive && p.roleId);
  const evilAlive = alive.filter((p) => ROLES_BY_ID[p.roleId!].team === 'evil');
  const goodAlive = alive.filter((p) => ROLES_BY_ID[p.roleId!].team === 'good');

  if (evilAlive.length === 0) {
    return {
      team: 'good',
      playerIds: players.filter((p) => p.roleId && ROLES_BY_ID[p.roleId].team === 'good').map((p) => p.id),
    };
  }
  if (evilAlive.length >= goodAlive.length) {
    return {
      team: 'evil',
      playerIds: players.filter((p) => p.roleId && ROLES_BY_ID[p.roleId].team === 'evil').map((p) => p.id),
    };
  }
  return null;
}
