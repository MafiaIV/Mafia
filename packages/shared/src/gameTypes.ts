import type { RoleId, Team } from './roles.js';
import type { RoleDistribution } from './roleDistribution.js';

export type GamePhase =
  | 'lobby'
  | 'role_assignment'
  | 'night'
  | 'day_reveal'
  | 'day_discussion'
  | 'voting'
  | 'game_over';

export interface PublicPlayer {
  id: string;
  name: string;
  avatarSeed: string;
  alive: boolean;
  isHost: boolean;
  connected: boolean;
  isMayorRevealed: boolean;
}

export interface NightActionPayload {
  /** id of the target player, or null to skip / no action */
  targetId: string | null;
  /** only used by the witch: choose which of her two powers to use */
  witchChoice?: 'save' | 'poison' | 'none';
}

export interface RoomConfig {
  distribution: RoleDistribution;
}

/** Broadcast to all clients in a room — never contains anyone's secret role. */
export interface RoomStateSummary {
  code: string;
  phase: GamePhase;
  round: number;
  players: PublicPlayer[];
  hostId: string;
  config: RoomConfig;
  /** Shuffled once at role_assignment, shown to everyone, order never changes after. */
  roleDeck: RoleId[];
  night: {
    actingRoles: RoleId[];
  } | null;
  day: {
    votes: Record<string, string>; // voterId -> targetId
  } | null;
  lastNightResult: {
    diedPlayerIds: string[];
  } | null;
  lastVoteResult: {
    lynchedPlayerId: string | null;
  } | null;
  winner: {
    team: Team | 'jester';
    playerIds: string[];
  } | null;
  /** Only populated once phase is 'game_over' — every role is safe to reveal at that point. */
  revealedRoles: Record<string, RoleId> | null;
}

/** Sent privately (socket.emit, never broadcast) to a single player. */
export interface RoleAssignedPayload {
  roleId: RoleId;
}

export interface NightYourTurnPayload {
  actingRole: RoleId;
  /** other living players, to pick a target from */
  candidates: { id: string; name: string }[];
  /** for the witch only: who the mafia targeted this night, if anyone */
  mafiaTargetId?: string | null;
  hasHeal?: boolean;
  hasPoison?: boolean;
  /** for mafia only: their fellow living mafia members */
  mafiaTeammates?: { id: string; name: string }[];
}

/** Live view of every mafia member's current (possibly still-changing) pick, so they can coordinate. */
export interface MafiaPicksPayload {
  picks: { playerId: string; targetId: string | null }[];
}

export interface InvestigationResultPayload {
  targetId: string;
  isEvil: boolean;
}

export interface ChatMessagePayload {
  channel: 'alive' | 'dead' | 'mafia';
  senderId: string;
  senderName: string;
  text: string;
  ts: number;
}
