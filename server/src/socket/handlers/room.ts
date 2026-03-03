import { Server, Socket } from 'socket.io';
import { RoomManager } from '../../game/RoomManager';
import { TMultiGameType } from '../../../../shared/types';

type TCreateRoomPayload = {
  gameType: TMultiGameType;
  playerName: string;
  maxPlayers?: number;
};

type TJoinRoomPayload = {
  roomId: string;
  playerName: string;
};

const DEFAULT_MAX_PLAYERS: Record<TMultiGameType, number> = {
  whiteboard: 8,
  tetris: 4,
  racing: 6,
};

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  roomManager: RoomManager
): void {
  socket.on('room:create', (payload: TCreateRoomPayload) => {
    const { gameType, playerName, maxPlayers } = payload;
    const max = maxPlayers || DEFAULT_MAX_PLAYERS[gameType] || 8;

    const existing = roomManager.findRoomByPlayer(socket.id);
    if (existing) {
      socket.emit('room:error', { message: '이미 다른 방에 참가 중입니다.' });
      return;
    }

    const room = roomManager.createRoom(gameType, socket.id, playerName, max);
    socket.join(room.id);
    socket.emit('room:created', { room: room.toDetail() });
  });

  socket.on('room:join', (payload: TJoinRoomPayload) => {
    const { roomId, playerName } = payload;
    const room = roomManager.getRoom(roomId);

    if (!room) {
      socket.emit('room:error', { message: '방을 찾을 수 없습니다.' });
      return;
    }

    // Rejoin: player already in this room (e.g., page refresh with singleton socket)
    if (room.players.has(socket.id)) {
      socket.join(room.id);
      socket.emit('room:joined', { room: room.toDetail() });
      return;
    }

    if (room.state !== 'waiting') {
      socket.emit('room:error', { message: '이미 게임이 진행 중입니다.' });
      return;
    }

    const added = room.addPlayer(socket.id, playerName);
    if (!added) {
      socket.emit('room:error', { message: '방이 가득 찼습니다.' });
      return;
    }

    socket.join(room.id);
    socket.emit('room:joined', { room: room.toDetail() });
    socket.to(room.id).emit('room:player-joined', {
      player: room.players.get(socket.id),
      room: room.toDetail(),
    });
  });

  socket.on('room:leave', () => {
    const room = roomManager.findRoomByPlayer(socket.id);
    if (!room) return;

    room.removePlayer(socket.id);
    socket.leave(room.id);
    socket.emit('room:left');

    if (room.isEmpty()) {
      roomManager.removeRoom(room.id);
    } else {
      io.to(room.id).emit('room:player-left', {
        playerId: socket.id,
        room: room.toDetail(),
      });
    }
  });
}
