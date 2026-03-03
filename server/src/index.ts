import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config';
import { initializeSocket, roomManager } from './socket';
import { TMultiGameType } from '../../shared/types';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

const VALID_GAME_TYPES = new Set<TMultiGameType>(['whiteboard', 'tetris', 'racing']);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/rooms/:gameType', (req, res) => {
  const gameType = req.params.gameType;
  if (!VALID_GAME_TYPES.has(gameType as TMultiGameType)) {
    res.status(400).json({ error: 'Invalid game type' });
    return;
  }
  const rooms = roomManager.getRoomsByType(gameType as TMultiGameType);
  res.json(rooms.map((r) => r.toInfo()));
});

const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

initializeSocket(io);

httpServer.listen(config.port, () => {
  console.log(`[Server] Running on port ${config.port}`);
});
