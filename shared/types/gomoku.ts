export type TGomokuStone = 0 | 1 | 2;

export type TGomokuGameState = {
  board: TGomokuStone[][];
  turn: 1 | 2;
  moveHistory: { x: number; y: number; stone: 1 | 2 }[];
  winner: null | 1 | 2;
  winLine: { x: number; y: number }[] | null;
  /** Maps player index (0=black, 1=white) to socket id */
  playerOrder: [string, string];
  isDraw: boolean;
};

export type TGomokuPlacePayload = { x: number; y: number };

export type TGomokuPlacedPayload = {
  x: number;
  y: number;
  stone: 1 | 2;
  nextTurn: 1 | 2;
};

export type TGomokuGameOverPayload = {
  winner: 1 | 2 | null;
  winLine: { x: number; y: number }[] | null;
  winnerPlayerId: string | null;
  isDraw: boolean;
};

export type TGomokuSyncPayload = {
  board: TGomokuStone[][];
  turn: 1 | 2;
  moveHistory: { x: number; y: number; stone: 1 | 2 }[];
  winner: null | 1 | 2;
  winLine: { x: number; y: number }[] | null;
  playerOrder: [string, string];
  isDraw: boolean;
};

export type TGomokuRestartPayload = {
  board: TGomokuStone[][];
  turn: 1 | 2;
  playerOrder: [string, string];
};
