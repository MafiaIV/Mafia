'use client';

import { create } from 'zustand';
import type {
  ChatMessagePayload,
  InvestigationResultPayload,
  MafiaPicksPayload,
  NightYourTurnPayload,
  RoleId,
  RoomStateSummary,
} from '@mafia/shared';
import { getSocket } from './socket';

interface GameStore {
  playerId: string | null;
  playerName: string | null;
  roomState: RoomStateSummary | null;
  myRole: RoleId | null;
  nightTurn: NightYourTurnPayload | null;
  isNightWaiting: boolean;
  isNightBlocked: boolean;
  investigations: InvestigationResultPayload[];
  chatMessages: ChatMessagePayload[];
  mafiaPicks: MafiaPicksPayload['picks'];
  error: string | null;

  setSession: (playerId: string, playerName: string) => void;
  setError: (error: string | null) => void;
  bindListeners: () => () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  playerId: null,
  playerName: null,
  roomState: null,
  myRole: null,
  nightTurn: null,
  isNightWaiting: false,
  isNightBlocked: false,
  investigations: [],
  chatMessages: [],
  mafiaPicks: [],
  error: null,

  setSession: (playerId, playerName) => set({ playerId, playerName }),
  setError: (error) => set({ error }),

  bindListeners: () => {
    const socket = getSocket();

    const onRoomUpdate = (state: RoomStateSummary) => {
      set({ roomState: state });
      if (state.phase !== 'night') set({ nightTurn: null, isNightWaiting: false, isNightBlocked: false });
    };
    const onRoleAssigned = ({ roleId }: { roleId: RoleId }) => set({ myRole: roleId });
    const onNightYourTurn = (payload: NightYourTurnPayload) =>
      set({ nightTurn: payload, isNightWaiting: false, isNightBlocked: false });
    const onNightWaiting = () => set({ nightTurn: null, isNightWaiting: true, isNightBlocked: false });
    const onNightBlocked = () => set({ nightTurn: null, isNightWaiting: false, isNightBlocked: true });
    const onInvestigation = (payload: InvestigationResultPayload) =>
      set({ investigations: [...get().investigations, payload] });
    const onChatMessage = (payload: ChatMessagePayload) =>
      set({ chatMessages: [...get().chatMessages, payload] });
    const onMafiaPicks = (payload: MafiaPicksPayload) => set({ mafiaPicks: payload.picks });
    const onRoomError = ({ error }: { error: string }) => set({ error });

    socket.on('room:update', onRoomUpdate);
    socket.on('role:assigned', onRoleAssigned);
    socket.on('night:yourTurn', onNightYourTurn);
    socket.on('night:waiting', onNightWaiting);
    socket.on('night:blocked', onNightBlocked);
    socket.on('investigation:result', onInvestigation);
    socket.on('chat:message', onChatMessage);
    socket.on('night:mafiaPicks', onMafiaPicks);
    socket.on('room:error', onRoomError);

    return () => {
      socket.off('room:update', onRoomUpdate);
      socket.off('role:assigned', onRoleAssigned);
      socket.off('night:yourTurn', onNightYourTurn);
      socket.off('night:waiting', onNightWaiting);
      socket.off('night:blocked', onNightBlocked);
      socket.off('investigation:result', onInvestigation);
      socket.off('chat:message', onChatMessage);
      socket.off('night:mafiaPicks', onMafiaPicks);
      socket.off('room:error', onRoomError);
    };
  },
}));
