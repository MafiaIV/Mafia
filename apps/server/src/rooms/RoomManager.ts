import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@mafia/shared';
import { generateRoomCode } from '../utils/roomCode.js';
import { GameRoom } from '../game/GameRoom.js';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;

export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  private io: IoServer;

  constructor(io: IoServer) {
    this.io = io;
  }

  createRoom(): GameRoom {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();
    const room = new GameRoom(code, this.io);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): GameRoom | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  removeRoomIfEmpty(code: string): void {
    const room = this.rooms.get(code);
    if (room && room.isEmpty()) this.rooms.delete(code);
  }
}
