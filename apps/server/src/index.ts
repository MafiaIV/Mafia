import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@mafia/shared';
import { RoomManager } from './rooms/RoomManager.js';
import { registerHandlers } from './socket/handlers.js';

const PORT = Number(process.env.PORT ?? 4000);
// Comma-separated list of allowed origins, e.g. "https://mafia-web.onrender.com,http://localhost:3000".
// Falls back to "*" so a fresh deploy works before the exact frontend URL is wired in.
const WEB_ORIGIN = process.env.WEB_ORIGIN
  ? process.env.WEB_ORIGIN.split(',').map((o) => o.trim())
  : '*';

const app = express();
app.use(cors({ origin: WEB_ORIGIN }));
app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: WEB_ORIGIN },
});

const roomManager = new RoomManager(io);
registerHandlers(io, roomManager);

httpServer.listen(PORT, () => {
  console.log(`Mafia server listening on http://localhost:${PORT}`);
});
