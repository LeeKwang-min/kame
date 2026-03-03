import { nanoid } from 'nanoid';
import {
  TMultiGameType,
  TPlayer,
  TRoomInfo,
  TRoomDetail,
  TRoomState,
} from '../../../shared/types';

export class Room {
  readonly id: string;
  readonly gameType: TMultiGameType;
  readonly maxPlayers: number;
  readonly createdAt: Date;
  readonly players: Map<string, TPlayer>;
  hostId: string;
  state: TRoomState;
  gameState: unknown;

  constructor(
    gameType: TMultiGameType,
    hostId: string,
    hostName: string,
    maxPlayers: number
  ) {
    this.id = nanoid(8);
    this.gameType = gameType;
    this.maxPlayers = maxPlayers;
    this.createdAt = new Date();
    this.players = new Map();
    this.hostId = hostId;
    this.state = 'waiting';
    this.gameState = null;

    this.players.set(hostId, {
      id: hostId,
      name: hostName,
      joinedAt: new Date().toISOString(),
    });
  }

  addPlayer(id: string, name: string): boolean {
    if (this.players.size >= this.maxPlayers) return false;
    if (this.players.has(id)) return false;
    this.players.set(id, { id, name, joinedAt: new Date().toISOString() });
    return true;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
    if (id === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value!;
    }
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  toInfo(): TRoomInfo {
    return {
      id: this.id,
      gameType: this.gameType,
      hostId: this.hostId,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      state: this.state,
      createdAt: this.createdAt.toISOString(),
    };
  }

  toDetail(): TRoomDetail {
    return {
      ...this.toInfo(),
      players: Array.from(this.players.values()),
    };
  }
}
