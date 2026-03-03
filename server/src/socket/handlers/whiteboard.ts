import { Server, Socket } from 'socket.io';
import { RoomManager } from '../../game/RoomManager';
import { TStroke, TWhiteboardState } from '../../../../shared/types';

const MAX_POINTS_PER_STROKE = 10000;
const MAX_STROKES_PER_ROOM = 5000;
const MAX_BRUSH_WIDTH = 50;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function isValidStroke(data: unknown): data is TStroke {
  if (!data || typeof data !== 'object') return false;
  const s = data as Record<string, unknown>;
  if (!Array.isArray(s.points) || s.points.length < 2 || s.points.length > MAX_POINTS_PER_STROKE) return false;
  if (typeof s.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(s.color)) return false;
  if (typeof s.width !== 'number' || s.width < 1 || s.width > MAX_BRUSH_WIDTH) return false;
  for (const p of s.points) {
    if (!p || typeof p !== 'object') return false;
    if (typeof p.x !== 'number' || typeof p.y !== 'number') return false;
    if (p.x < 0 || p.x > CANVAS_WIDTH || p.y < 0 || p.y > CANVAS_HEIGHT) return false;
  }
  return true;
}

export function registerWhiteboardHandlers(
  io: Server,
  socket: Socket,
  roomManager: RoomManager
): void {
  socket.on('draw:stroke', (stroke: unknown) => {
    if (!isValidStroke(stroke)) return;

    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'whiteboard') return;

    if (!room.gameState) {
      room.gameState = { strokes: [] } as TWhiteboardState;
    }

    const state = room.gameState as TWhiteboardState;
    if (state.strokes.length >= MAX_STROKES_PER_ROOM) {
      state.strokes = state.strokes.slice(-Math.floor(MAX_STROKES_PER_ROOM * 0.8));
    }

    const validatedStroke: TStroke = {
      playerId: socket.id,
      points: stroke.points,
      color: stroke.color,
      width: stroke.width,
    };

    state.strokes.push(validatedStroke);
    socket.to(room.id).emit('draw:stroke', validatedStroke);
  });

  socket.on('draw:clear', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'whiteboard') return;
    if (room.hostId !== socket.id) return;

    room.gameState = { strokes: [] } as TWhiteboardState;
    io.to(room.id).emit('draw:clear');
  });

  socket.on('draw:undo', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'whiteboard') return;

    const state = room.gameState as TWhiteboardState;
    if (!state?.strokes) return;

    for (let i = state.strokes.length - 1; i >= 0; i--) {
      if (state.strokes[i].playerId === socket.id) {
        state.strokes.splice(i, 1);
        break;
      }
    }

    io.to(room.id).emit('draw:sync', { strokes: state.strokes });
  });

  socket.on('draw:request-sync', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'whiteboard') return;

    const state = (room.gameState as TWhiteboardState) || { strokes: [] };
    socket.emit('draw:sync', { strokes: state.strokes });
  });
}
