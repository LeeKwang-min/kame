export type TMultiGameType = 'whiteboard' | 'tetris' | 'racing';

export type TRoomState = 'waiting' | 'playing' | 'finished';

export type TPlayer = {
  id: string;
  name: string;
  joinedAt: string;
};

export type TRoomInfo = {
  id: string;
  gameType: TMultiGameType;
  hostId: string;
  playerCount: number;
  maxPlayers: number;
  state: TRoomState;
  createdAt: string;
};

export type TRoomDetail = TRoomInfo & {
  players: TPlayer[];
};
