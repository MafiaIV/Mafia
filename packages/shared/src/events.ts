import type { RoleDistribution } from './roleDistribution.js';
import type {
  ChatMessagePayload,
  InvestigationResultPayload,
  MafiaPicksPayload,
  NightActionPayload,
  NightYourTurnPayload,
  RoleAssignedPayload,
  RoomStateSummary,
} from './gameTypes.js';
import type { VoicePeerInfo, VoiceSignalPayload, VoiceSignalRelayPayload } from './voiceTypes.js';

export interface ClientToServerEvents {
  'room:create': (
    payload: { playerName: string },
    ack: (res: { ok: true; code: string; playerId: string } | { ok: false; error: string }) => void,
  ) => void;
  'room:join': (
    payload: { code: string; playerName: string },
    ack: (res: { ok: true; playerId: string } | { ok: false; error: string }) => void,
  ) => void;
  'room:rejoin': (
    payload: { code: string; playerId: string },
    ack: (res: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  'room:updateConfig': (payload: { distribution: RoleDistribution }) => void;
  'room:start': () => void;
  'day:startVoting': () => void;
  'night:action': (payload: NightActionPayload) => void;
  'day:vote': (payload: { targetId: string | null }) => void;
  'day:revealMayor': () => void;
  'chat:message': (payload: { text: string; channel?: 'mafia' }) => void;
  'room:leave': () => void;
  'room:restart': () => void;
  'voice:join': () => void;
  'voice:leave': () => void;
  'voice:signal': (payload: VoiceSignalPayload) => void;
  'voice:mute': (payload: { muted: boolean }) => void;
}

export interface ServerToClientEvents {
  'room:update': (state: RoomStateSummary) => void;
  'room:error': (payload: { error: string }) => void;
  'role:assigned': (payload: RoleAssignedPayload) => void;
  'night:yourTurn': (payload: NightYourTurnPayload) => void;
  'night:waiting': () => void;
  /** Sent instead of night:waiting when the reason is specifically "the seductress blocked you". */
  'night:blocked': () => void;
  'night:mafiaPicks': (payload: MafiaPicksPayload) => void;
  'investigation:result': (payload: InvestigationResultPayload) => void;
  'chat:message': (payload: ChatMessagePayload) => void;
  'voice:peers': (payload: { peers: VoicePeerInfo[] }) => void;
  'voice:peerJoined': (payload: VoicePeerInfo) => void;
  'voice:peerLeft': (payload: { id: string }) => void;
  'voice:signal': (payload: VoiceSignalRelayPayload) => void;
  'voice:muteChanged': (payload: { id: string; muted: boolean }) => void;
  /** One-way: dead players silently listen in on the alive channel. */
  'voice:listenPeers': (payload: { peers: VoicePeerInfo[] }) => void;
  'voice:aliveMemberJoined': (payload: VoicePeerInfo) => void;
  'voice:aliveMemberLeft': (payload: { id: string }) => void;
}
