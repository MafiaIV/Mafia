import type { Server, Socket } from 'socket.io';
import { nanoid } from 'nanoid';
import type { ClientToServerEvents, ServerToClientEvents } from '@mafia/shared';
import { RoomManager } from '../rooms/RoomManager.js';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface SocketData {
  roomCode?: string;
  playerId?: string;
}

export function registerHandlers(io: IoServer, roomManager: RoomManager): void {
  io.on('connection', (socket: IoSocket) => {
    const data = socket.data as SocketData;

    socket.on('room:create', ({ playerName }, ack) => {
      const name = playerName.trim().slice(0, 24) || 'Играч';
      const room = roomManager.createRoom();
      const playerId = nanoid(10);
      room.addPlayer(playerId, socket.id, name);
      data.roomCode = room.code;
      data.playerId = playerId;
      ack({ ok: true, code: room.code, playerId });
    });

    socket.on('room:join', ({ code, playerName }, ack) => {
      const room = roomManager.getRoom(code);
      if (!room) return ack({ ok: false, error: 'Няма такава стая.' });
      const name = playerName.trim().slice(0, 24) || 'Играч';
      const playerId = nanoid(10);
      room.addPlayer(playerId, socket.id, name);
      data.roomCode = room.code;
      data.playerId = playerId;
      ack({ ok: true, playerId });
    });

    socket.on('room:rejoin', ({ code, playerId }, ack) => {
      const room = roomManager.getRoom(code);
      if (!room) return ack({ ok: false, error: 'Няма такава стая.' });
      const ok = room.reconnectPlayer(playerId, socket.id);
      if (!ok) return ack({ ok: false, error: 'Играчът не е намерен в тази стая.' });
      data.roomCode = room.code;
      data.playerId = playerId;
      ack({ ok: true });
    });

    socket.on('room:updateConfig', ({ distribution }) => {
      const room = getCurrentRoom();
      room?.updateConfig(distribution);
    });

    socket.on('room:start', () => {
      getCurrentRoom()?.startGame();
    });

    socket.on('day:startVoting', () => {
      getCurrentRoom()?.beginVoting();
    });

    socket.on('night:action', (payload) => {
      if (!data.playerId) return;
      getCurrentRoom()?.recordNightAction(data.playerId, payload);
    });

    socket.on('day:vote', ({ targetId }) => {
      if (!data.playerId) return;
      getCurrentRoom()?.recordVote(data.playerId, targetId);
    });

    socket.on('day:revealMayor', () => {
      if (!data.playerId) return;
      getCurrentRoom()?.revealMayor(data.playerId);
    });

    socket.on('chat:message', ({ text }) => {
      if (!data.playerId || !text.trim()) return;
      getCurrentRoom()?.recordChatMessage(data.playerId, text.trim().slice(0, 500));
    });

    socket.on('voice:join', () => {
      if (!data.playerId) return;
      getCurrentRoom()?.joinVoice(data.playerId);
    });

    socket.on('voice:leave', () => {
      if (!data.playerId) return;
      getCurrentRoom()?.leaveVoice(data.playerId);
    });

    socket.on('voice:signal', ({ toPlayerId, data: signalData }) => {
      if (!data.playerId) return;
      getCurrentRoom()?.relayVoiceSignal(data.playerId, toPlayerId, signalData);
    });

    socket.on('voice:mute', ({ muted }) => {
      if (!data.playerId) return;
      getCurrentRoom()?.setVoiceMute(data.playerId, muted);
    });

    socket.on('disconnect', () => {
      const room = getCurrentRoom();
      room?.markDisconnected(socket.id);
      if (room) roomManager.removeRoomIfEmpty(room.code);
    });

    function getCurrentRoom() {
      return data.roomCode ? roomManager.getRoom(data.roomCode) : undefined;
    }
  });
}
