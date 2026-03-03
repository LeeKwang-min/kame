import { Room } from './Room';
import { TMultiGameType } from '../../../shared/types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(
    gameType: TMultiGameType,
    hostId: string,
    hostName: string,
    maxPlayers: number
  ): Room {
    const room = new Room(gameType, hostId, hostName, maxPlayers);
    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  removeRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  getRoomsByType(gameType: TMultiGameType): Room[] {
    return Array.from(this.rooms.values()).filter((r) => r.gameType === gameType);
  }

  findRoomByPlayer(playerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.has(playerId)) return room;
    }
    return undefined;
  }

  cleanupEmpty(): void {
    for (const [id, room] of this.rooms) {
      if (room.isEmpty()) {
        this.rooms.delete(id);
      }
    }
  }

  get size(): number {
    return this.rooms.size;
  }
}
