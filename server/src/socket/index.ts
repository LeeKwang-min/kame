import { Server } from 'socket.io';
import { RoomManager } from '../game/RoomManager';
import { registerRoomHandlers } from './handlers/room';
import { registerWhiteboardHandlers } from './handlers/whiteboard';

export const roomManager = new RoomManager();

export function initializeSocket(io: Server): void {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    registerRoomHandlers(io, socket, roomManager);
    registerWhiteboardHandlers(io, socket, roomManager);

    socket.on('disconnect', () => {
      const room = roomManager.findRoomByPlayer(socket.id);
      if (room) {
        room.removePlayer(socket.id);
        io.to(room.id).emit('room:player-left', {
          playerId: socket.id,
          room: room.toDetail(),
        });
        if (room.isEmpty()) {
          roomManager.removeRoom(room.id);
        }
      }
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  setInterval(() => {
    roomManager.cleanupEmpty();
  }, 5 * 60 * 1000);
}
