import { TDifficulty } from '@/lib/gomoku/types';

export type TGomokuState = 'start' | 'loading' | 'diffselect' | 'playing' | 'paused' | 'gameover';

export type TGomokuStats = {
  blackCount: number;
  whiteCount: number;
  currentTurn: 1 | 2;
  difficulty: TDifficulty;
  moveCount: number;
};
