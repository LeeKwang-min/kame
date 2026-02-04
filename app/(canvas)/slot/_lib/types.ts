export type GamePhase = 'playing' | 'spinning' | 'gameover';

export type ReelSymbol = '7' | 'BAR' | 'CHERRY' | 'BELL' | 'LEMON' | 'ORANGE' | 'GRAPE';

export type SlotState = {
  phase: GamePhase;
  coins: number;
  maxCoins: number;
  betAmount: number;
  reels: ReelSymbol[];
  lastWin: number;
};
