import type { Server } from 'socket.io';
import {
  ROLES_BY_ID,
  getDefaultDistribution,
  validateDistribution,
  type RoleId,
  type RoleDistribution,
  type GamePhase,
  type Team,
  type PublicPlayer,
  type RoomStateSummary,
  type NightActionPayload,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@mafia/shared';
import { assignRoles } from './assignRoles.js';
import { buildNightSequence, type NightStep } from './nightOrder.js';
import { checkWinConditions } from './winConditions.js';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;

interface InternalPlayer {
  id: string;
  socketId: string | null;
  name: string;
  avatarSeed: string;
  roleId: RoleId | null;
  alive: boolean;
  isHost: boolean;
  connected: boolean;
  isMayorRevealed: boolean;
  witchHealUsed: boolean;
  witchPoisonUsed: boolean;
  bodyguardUsed: boolean;
  lastProtectedId: string | null;
}

interface NightActions {
  seductressBlockId: string | null;
  mafiaVotes: Map<string, string | null>;
  mafiaFinalTargetId: string | null;
  detectiveTargetId: string | null;
  doctorProtectId: string | null;
  bodyguardProtectId: string | null;
  witchChoice: 'save' | 'poison' | 'none' | null;
  witchPoisonTargetId: string | null;
  submitted: Set<string>;
}

const DAY_REVEAL_MS = 4000;

function emptyNightActions(): NightActions {
  return {
    seductressBlockId: null,
    mafiaVotes: new Map(),
    mafiaFinalTargetId: null,
    detectiveTargetId: null,
    doctorProtectId: null,
    bodyguardProtectId: null,
    witchChoice: null,
    witchPoisonTargetId: null,
    submitted: new Set(),
  };
}

export class GameRoom {
  readonly code: string;
  private io: IoServer;
  private players = new Map<string, InternalPlayer>();
  private playerOrder: string[] = [];
  private phase: GamePhase = 'lobby';
  private round = 0;
  private distribution: RoleDistribution = {};
  private distributionCustomized = false;
  private roleDeck: RoleId[] = [];
  private nightSequence: NightStep[] = [];
  private nightStepIndex = -1;
  private nightActions: NightActions = emptyNightActions();
  private currentActors = new Set<string>();
  private dayVotes = new Map<string, string | null>();
  private lastNightResult: { diedPlayerIds: string[] } | null = null;
  private lastVoteResult: { lynchedPlayerId: string | null } | null = null;
  private winner: { team: Team | 'jester'; playerIds: string[] } | null = null;
  /** playerId -> the voice channel they're currently registered in, if any. */
  private voiceChannel = new Map<string, 'alive' | 'dead'>();
  /** Dead players silently listening in on the alive channel (one-way — they never send audio there). */
  private aliveListeners = new Set<string>();

  constructor(code: string, io: IoServer) {
    this.code = code;
    this.io = io;
  }

  get hostId(): string {
    return this.playerOrder.find((id) => this.players.get(id)?.isHost) ?? '';
  }

  addPlayer(playerId: string, socketId: string, name: string): void {
    const isHost = this.players.size === 0;
    this.players.set(playerId, {
      id: playerId,
      socketId,
      name,
      avatarSeed: playerId,
      roleId: null,
      alive: true,
      isHost,
      connected: true,
      isMayorRevealed: false,
      witchHealUsed: false,
      witchPoisonUsed: false,
      bodyguardUsed: false,
      lastProtectedId: null,
    });
    this.playerOrder.push(playerId);
    this.io.sockets.sockets.get(socketId)?.join(this.code);
    this.io.in(socketId).socketsJoin(`${this.code}:alive`);
    if (!this.distributionCustomized) {
      this.distribution = getDefaultDistribution(this.playerOrder.length);
    }
    this.broadcastState();
  }

  reconnectPlayer(playerId: string, socketId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;
    player.socketId = socketId;
    player.connected = true;
    this.io.sockets.sockets.get(socketId)?.join(this.code);
    this.io.in(socketId).socketsJoin(`${this.code}:${player.alive ? 'alive' : 'dead'}`);
    if (player.roleId) {
      this.io.to(socketId).emit('role:assigned', { roleId: player.roleId });
      if (player.roleId === 'mafia') this.io.in(socketId).socketsJoin(`${this.code}:mafia`);
    }
    this.broadcastState();
    return true;
  }

  markDisconnected(socketId: string): void {
    const player = [...this.players.values()].find((p) => p.socketId === socketId);
    if (!player) return;
    player.connected = false;
    this.removeFromVoice(player.id);
    this.broadcastState();
  }

  /** Explicit "leave game" click — same effect as a disconnect, but instant instead of waiting on the socket timeout. */
  leaveRoom(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    player.connected = false;
    this.removeFromVoice(playerId);
    this.broadcastState();
  }

  joinVoice(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player || this.voiceChannel.has(playerId)) return;
    const channel = player.alive ? 'alive' : 'dead';
    const peers = [...this.voiceChannel.entries()]
      .filter(([, ch]) => ch === channel)
      .map(([id]) => id)
      .map((id) => this.players.get(id)!)
      .filter(Boolean)
      .map((p) => ({ id: p.id, name: p.name }));
    this.voiceChannel.set(playerId, channel);
    if (player.socketId) {
      this.io.to(player.socketId).emit('voice:peers', { peers });
    }
    for (const peer of peers) {
      const peerSocket = this.players.get(peer.id)?.socketId;
      if (peerSocket) {
        this.io.to(peerSocket).emit('voice:peerJoined', { id: playerId, name: player.name });
      }
    }

    if (channel === 'alive') {
      // Any dead players already listening in should also connect to this new voice.
      for (const listenerId of this.aliveListeners) {
        const listenerSocket = this.players.get(listenerId)?.socketId;
        if (listenerSocket) {
          this.io.to(listenerSocket).emit('voice:aliveMemberJoined', { id: playerId, name: player.name });
        }
      }
    } else {
      // Dead players automatically hear the living, one-way, without ever sending audio there.
      this.aliveListeners.add(playerId);
      const aliveMembers = [...this.voiceChannel.entries()]
        .filter(([, ch]) => ch === 'alive')
        .map(([id]) => id)
        .map((id) => this.players.get(id)!)
        .filter(Boolean)
        .map((p) => ({ id: p.id, name: p.name }));
      if (player.socketId) {
        this.io.to(player.socketId).emit('voice:listenPeers', { peers: aliveMembers });
      }
    }
  }

  leaveVoice(playerId: string): void {
    this.removeFromVoice(playerId);
  }

  private removeFromVoice(playerId: string): void {
    const channel = this.voiceChannel.get(playerId);
    this.aliveListeners.delete(playerId);
    if (!channel) return;
    this.voiceChannel.delete(playerId);
    for (const [otherId, otherChannel] of this.voiceChannel) {
      if (otherChannel !== channel) continue;
      const otherSocket = this.players.get(otherId)?.socketId;
      if (otherSocket) {
        this.io.to(otherSocket).emit('voice:peerLeft', { id: playerId });
      }
    }
    if (channel === 'alive') {
      for (const listenerId of this.aliveListeners) {
        const listenerSocket = this.players.get(listenerId)?.socketId;
        if (listenerSocket) this.io.to(listenerSocket).emit('voice:aliveMemberLeft', { id: playerId });
      }
    }
  }

  relayVoiceSignal(fromPlayerId: string, toPlayerId: string, data: unknown): void {
    const target = this.players.get(toPlayerId);
    if (!target?.socketId) return;
    this.io.to(target.socketId).emit('voice:signal', { fromPlayerId, data });
  }

  setVoiceMute(playerId: string, muted: boolean): void {
    const channel = this.voiceChannel.get(playerId);
    if (!channel) return;
    for (const [otherId, otherChannel] of this.voiceChannel) {
      if (otherChannel !== channel || otherId === playerId) continue;
      const otherSocket = this.players.get(otherId)?.socketId;
      if (otherSocket) {
        this.io.to(otherSocket).emit('voice:muteChanged', { id: playerId, muted });
      }
    }
  }

  isEmpty(): boolean {
    return ![...this.players.values()].some((p) => p.connected);
  }

  updateConfig(distribution: RoleDistribution): { ok: boolean; error?: string } {
    if (this.phase !== 'lobby') return { ok: false, error: 'Играта вече е започнала.' };
    const result = validateDistribution(this.playerOrder.length, distribution);
    if (!result.valid) return { ok: false, error: result.error };
    this.distribution = distribution;
    this.distributionCustomized = true;
    this.broadcastState();
    return { ok: true };
  }

  startGame(): { ok: boolean; error?: string } {
    if (this.phase !== 'lobby') return { ok: false, error: 'Играта вече е започнала.' };
    const validation = validateDistribution(this.playerOrder.length, this.distribution);
    if (!validation.valid) return { ok: false, error: validation.error };

    const { assignments, roleDeck } = assignRoles(this.playerOrder, this.distribution);
    this.roleDeck = roleDeck;
    for (const [playerId, roleId] of assignments) {
      const player = this.players.get(playerId)!;
      player.roleId = roleId;
      if (player.socketId) {
        this.io.to(player.socketId).emit('role:assigned', { roleId });
        if (roleId === 'mafia') this.io.in(player.socketId).socketsJoin(`${this.code}:mafia`);
      }
    }
    this.phase = 'role_assignment';
    this.round = 1;
    this.broadcastState();
    setTimeout(() => this.beginNight(), 3000);
    return { ok: true };
  }

  /** Same players, fresh shuffle — resets every per-player game flag and jumps straight back into role assignment. */
  restartGame(): { ok: boolean; error?: string } {
    if (this.phase !== 'game_over') return { ok: false, error: 'Играта все още не е приключила.' };
    for (const player of this.players.values()) {
      player.roleId = null;
      player.alive = true;
      player.isMayorRevealed = false;
      player.witchHealUsed = false;
      player.witchPoisonUsed = false;
      player.bodyguardUsed = false;
      player.lastProtectedId = null;
      if (player.socketId) {
        this.io.in(player.socketId).socketsLeave(`${this.code}:mafia`);
        this.io.in(player.socketId).socketsLeave(`${this.code}:dead`);
        this.io.in(player.socketId).socketsJoin(`${this.code}:alive`);
      }
    }
    this.roleDeck = [];
    this.lastNightResult = null;
    this.lastVoteResult = null;
    this.winner = null;
    this.voiceChannel.clear();
    this.aliveListeners.clear();
    this.phase = 'lobby';
    return this.startGame();
  }

  private livingPlayers(): InternalPlayer[] {
    return this.playerOrder.map((id) => this.players.get(id)!).filter((p) => p.alive);
  }

  private beginNight(): void {
    this.phase = 'night';
    this.lastVoteResult = null;
    this.nightActions = emptyNightActions();
    this.nightSequence = buildNightSequence(this.distribution).filter((step) =>
      step.roles.some((roleId) => this.livingPlayers().some((p) => p.roleId === roleId)),
    );
    this.nightStepIndex = -1;
    this.advanceNightStep();
  }

  private advanceNightStep(): void {
    this.nightStepIndex++;
    if (this.nightStepIndex >= this.nightSequence.length) {
      this.resolveNight();
      return;
    }
    const step = this.nightSequence[this.nightStepIndex];
    const blocked = this.nightActions.seductressBlockId;
    // The detective is a special case: being blocked doesn't stop them from
    // acting, it makes their result a lie instead (handled in
    // recordNightAction). Every other blocked role is excluded outright.
    const wouldAct = this.livingPlayers().filter((p) => p.roleId && step.roles.includes(p.roleId));
    const actors = wouldAct.filter((p) => p.id !== blocked || p.roleId === 'detective');
    const blockedActor = wouldAct.find((p) => p.id === blocked && p.roleId !== 'detective');
    if (blockedActor?.socketId) {
      this.io.to(blockedActor.socketId).emit('night:blocked');
    }
    if (actors.length === 0) {
      this.advanceNightStep();
      return;
    }
    this.currentActors = new Set(actors.map((p) => p.id));

    const mafiaTeammates = step.roles.includes('mafia')
      ? actors.filter((p) => p.roleId === 'mafia').map((p) => ({ id: p.id, name: p.name }))
      : [];

    for (const actor of actors) {
      if (!actor.socketId) continue;
      const candidates = this.livingPlayers()
        .filter((p) => p.id !== actor.id)
        .map((p) => ({ id: p.id, name: p.name }));
      const filteredCandidates =
        actor.roleId === 'doctor'
          ? candidates.filter((c) => c.id !== actor.lastProtectedId)
          : candidates;
      this.io.to(actor.socketId).emit('night:yourTurn', {
        actingRole: actor.roleId!,
        candidates: filteredCandidates,
        mafiaTargetId: actor.roleId === 'witch' ? this.nightActions.mafiaFinalTargetId : undefined,
        hasHeal: actor.roleId === 'witch' ? !actor.witchHealUsed : undefined,
        hasPoison: actor.roleId === 'witch' ? !actor.witchPoisonUsed : undefined,
        mafiaTeammates: actor.roleId === 'mafia' ? mafiaTeammates.filter((m) => m.id !== actor.id) : undefined,
      });
    }
    // Everyone not acting this step (and not the just-notified blocked player) sees a waiting/black overlay.
    for (const player of this.livingPlayers()) {
      if (!this.currentActors.has(player.id) && player.id !== blockedActor?.id && player.socketId) {
        this.io.to(player.socketId).emit('night:waiting');
      }
    }
    this.broadcastState();
  }

  recordNightAction(playerId: string, payload: NightActionPayload): void {
    if (this.phase !== 'night') return;
    if (!this.currentActors.has(playerId)) return;
    const player = this.players.get(playerId);
    if (!player || !player.roleId) return;
    const isMafia = player.roleId === 'mafia';
    // Mafia can change their pick until the whole team agrees; every other
    // role gets one shot.
    if (!isMafia && this.nightActions.submitted.has(playerId)) return;

    switch (player.roleId) {
      case 'seductress':
        this.nightActions.seductressBlockId = payload.targetId;
        break;
      case 'mafia':
        this.nightActions.mafiaVotes.set(playerId, payload.targetId);
        this.broadcastMafiaPicks();
        break;
      case 'detective': {
        this.nightActions.detectiveTargetId = payload.targetId;
        if (payload.targetId && player.socketId) {
          const target = this.players.get(payload.targetId);
          const trueIsEvil = !!target?.roleId && ROLES_BY_ID[target.roleId].team === 'evil';
          // The seductress visited the detective tonight: her block doesn't
          // stop the investigation, it poisons the result with a lie.
          const wasBlocked = this.nightActions.seductressBlockId === playerId;
          const isEvil = wasBlocked ? !trueIsEvil : trueIsEvil;
          this.io.to(player.socketId).emit('investigation:result', { targetId: payload.targetId, isEvil });
        }
        break;
      }
      case 'doctor':
        this.nightActions.doctorProtectId = payload.targetId;
        player.lastProtectedId = payload.targetId;
        break;
      case 'bodyguard':
        if (!player.bodyguardUsed) this.nightActions.bodyguardProtectId = payload.targetId;
        break;
      case 'witch':
        this.nightActions.witchChoice = payload.witchChoice ?? 'none';
        if (payload.witchChoice === 'poison') this.nightActions.witchPoisonTargetId = payload.targetId;
        break;
      default:
        break;
    }

    this.nightActions.submitted.add(playerId);

    const stepComplete = isMafia ? this.mafiaReachedConsensus() : this.allActorsSubmitted();

    if (isMafia && stepComplete) {
      this.nightActions.mafiaFinalTargetId = this.nightActions.mafiaVotes.get(playerId) ?? null;
    }

    if (stepComplete) {
      this.advanceNightStep();
    }
  }

  private allActorsSubmitted(): boolean {
    return [...this.currentActors].every((id) => this.nightActions.submitted.has(id));
  }

  /** The mafia step never auto-resolves by majority — every living mafia member must pick the same target. */
  private mafiaReachedConsensus(): boolean {
    const picks = [...this.currentActors].map((id) => this.nightActions.mafiaVotes.get(id));
    if (picks.some((p) => p === undefined || p === null)) return false;
    return new Set(picks).size === 1;
  }

  private broadcastMafiaPicks(): void {
    const picks = [...this.currentActors].map((id) => ({
      playerId: id,
      targetId: this.nightActions.mafiaVotes.get(id) ?? null,
    }));
    for (const id of this.currentActors) {
      const socketId = this.players.get(id)?.socketId;
      if (socketId) this.io.to(socketId).emit('night:mafiaPicks', { picks });
    }
  }

  private resolveNight(): void {
    const victims = new Set<string>();
    const { mafiaFinalTargetId, doctorProtectId, bodyguardProtectId, witchChoice, witchPoisonTargetId } =
      this.nightActions;

    if (mafiaFinalTargetId) {
      let saved = false;
      if (doctorProtectId === mafiaFinalTargetId) saved = true;
      if (bodyguardProtectId === mafiaFinalTargetId) {
        saved = true;
        const bodyguard = this.livingPlayers().find((p) => p.roleId === 'bodyguard');
        if (bodyguard) {
          bodyguard.bodyguardUsed = true;
          victims.add(bodyguard.id);
        }
      }
      if (witchChoice === 'save') {
        saved = true;
        const witch = this.livingPlayers().find((p) => p.roleId === 'witch');
        if (witch) witch.witchHealUsed = true;
      }
      if (!saved) victims.add(mafiaFinalTargetId);
    }
    if (witchChoice === 'poison' && witchPoisonTargetId) {
      victims.add(witchPoisonTargetId);
      const witch = this.livingPlayers().find((p) => p.roleId === 'witch');
      if (witch) witch.witchPoisonUsed = true;
    }

    // Wrong place, wrong time: the seductress was visiting whoever the
    // mafia ended up killing, so she's caught in it too — regardless of
    // whether the intended victim itself got saved.
    if (mafiaFinalTargetId && this.nightActions.seductressBlockId === mafiaFinalTargetId) {
      const seductress = this.livingPlayers().find((p) => p.roleId === 'seductress');
      if (seductress) victims.add(seductress.id);
    }

    for (const victimId of victims) {
      const victim = this.players.get(victimId);
      if (victim) {
        victim.alive = false;
        if (victim.socketId) {
          this.io.in(victim.socketId).socketsLeave(`${this.code}:alive`);
          this.io.in(victim.socketId).socketsJoin(`${this.code}:dead`);
        }
        this.removeFromVoice(victimId);
      }
    }

    this.lastNightResult = { diedPlayerIds: [...victims] };
    this.phase = 'day_reveal';
    this.broadcastState();

    const win = checkWinConditions(this.playerOrder.map((id) => this.toWinCheckPlayer(id)));
    if (win) {
      this.winner = win;
      this.phase = 'game_over';
      this.broadcastState();
      return;
    }

    setTimeout(() => {
      this.phase = 'day_discussion';
      this.dayVotes = new Map();
      this.broadcastState();
    }, DAY_REVEAL_MS);
  }

  private toWinCheckPlayer(id: string) {
    const p = this.players.get(id)!;
    return { id: p.id, roleId: p.roleId, alive: p.alive };
  }

  beginVoting(): void {
    if (this.phase !== 'day_discussion') return;
    this.phase = 'voting';
    this.dayVotes = new Map();
    this.broadcastState();
  }

  recordVote(playerId: string, targetId: string | null): void {
    if (this.phase !== 'voting') return;
    const voter = this.players.get(playerId);
    if (!voter || !voter.alive) return;
    this.dayVotes.set(playerId, targetId);
    this.broadcastState();

    const aliveCount = this.livingPlayers().length;
    if (this.dayVotes.size >= aliveCount) {
      this.resolveVote();
    }
  }

  private resolveVote(): void {
    const weights = new Map<string, number>();
    for (const [voterId, targetId] of this.dayVotes) {
      if (!targetId) continue;
      const voter = this.players.get(voterId);
      const weight = voter?.isMayorRevealed ? 2 : 1;
      weights.set(targetId, (weights.get(targetId) ?? 0) + weight);
    }
    let lynchedId: string | null = null;
    let best = 0;
    let tie = false;
    for (const [targetId, weight] of weights) {
      if (weight > best) {
        best = weight;
        lynchedId = targetId;
        tie = false;
      } else if (weight === best) {
        tie = true;
      }
    }
    if (tie) lynchedId = null;

    this.lastVoteResult = { lynchedPlayerId: lynchedId };
    this.lastNightResult = null;

    if (lynchedId) {
      const lynched = this.players.get(lynchedId);
      if (lynched) {
        lynched.alive = false;
        if (lynched.socketId) {
          this.io.in(lynched.socketId).socketsLeave(`${this.code}:alive`);
          this.io.in(lynched.socketId).socketsJoin(`${this.code}:dead`);
        }
        this.removeFromVoice(lynched.id);
        if (lynched.roleId === 'jester') {
          this.winner = { team: 'jester', playerIds: [lynched.id] };
          this.phase = 'game_over';
          this.broadcastState();
          return;
        }
      }
    }

    const win = checkWinConditions(this.playerOrder.map((id) => this.toWinCheckPlayer(id)));
    this.phase = 'day_reveal';
    this.broadcastState();
    if (win) {
      this.winner = win;
      this.phase = 'game_over';
      this.broadcastState();
      return;
    }
    this.round++;
    setTimeout(() => this.beginNight(), DAY_REVEAL_MS);
  }

  revealMayor(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player || player.roleId !== 'mayor') return;
    player.isMayorRevealed = true;
    this.broadcastState();
  }

  recordChatMessage(playerId: string, text: string, requestedChannel?: 'mafia'): void {
    const player = this.players.get(playerId);
    if (!player) return;
    const wantsMafia = requestedChannel === 'mafia' && player.roleId === 'mafia' && player.alive;
    const channel = wantsMafia ? 'mafia' : player.alive ? 'alive' : 'dead';
    this.io.to(`${this.code}:${channel}`).emit('chat:message', {
      channel,
      senderId: playerId,
      senderName: player.name,
      text,
      ts: Date.now(),
    });
  }

  private toPublicPlayer(p: InternalPlayer): PublicPlayer {
    return {
      id: p.id,
      name: p.name,
      avatarSeed: p.avatarSeed,
      alive: p.alive,
      isHost: p.isHost,
      connected: p.connected,
      isMayorRevealed: p.isMayorRevealed,
    };
  }

  toSummary(): RoomStateSummary {
    return {
      code: this.code,
      phase: this.phase,
      round: this.round,
      players: this.playerOrder.map((id) => this.toPublicPlayer(this.players.get(id)!)),
      hostId: this.hostId,
      config: { distribution: this.distribution },
      roleDeck: this.roleDeck,
      night: this.phase === 'night' ? { actingRoles: this.nightSequence[this.nightStepIndex]?.roles ?? [] } : null,
      day:
        this.phase === 'voting'
          ? { votes: Object.fromEntries([...this.dayVotes].filter(([, t]) => !!t) as [string, string][]) }
          : null,
      lastNightResult: this.lastNightResult,
      lastVoteResult: this.lastVoteResult,
      winner: this.winner,
      revealedRoles:
        this.phase === 'game_over'
          ? Object.fromEntries(this.playerOrder.map((id) => [id, this.players.get(id)!.roleId!]))
          : null,
    };
  }

  broadcastState(): void {
    this.io.to(this.code).emit('room:update', this.toSummary());
  }
}
