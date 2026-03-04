/** 0: empty, 1: black, 2: white */
export type TStone = 0 | 1 | 2;

export type TBoard = TStone[][];

export type TPosition = { x: number; y: number };

export type TMove = TPosition & { stone: TStone };

export type TGameResult = {
  winner: TStone;
  winLine: TPosition[] | null;
};

export type TDifficulty = 'beginner' | 'easy' | 'medium' | 'hard';

export type TDirection = [number, number];
