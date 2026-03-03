import { Server, Socket } from 'socket.io';
import { RoomManager } from '../../game/RoomManager';
import { TStroke, TWhiteboardState } from '../../../../shared/types';

export function registerWhiteboardHandlers(
  io: Server,
  socket: Socket,
  roomManager: RoomManager
): void {
  socket.on('draw:stroke', (stroke: TStroke) => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'whiteboard') return;

    if (!room.gameState) {
      room.gameState = { strokes: [] } as TWhiteboardState;
    }
    (room.gameState as TWhiteboardState).strokes.push({
      ...stroke,
      playerId: socket.id,
    });

    socket.to(room.id).emit('draw:stroke', {
      ...stroke,
      playerId: socket.id,
    });
  });

  socket.on('draw:clear', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room || room.gameType !== 'whiteboard') return;

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
