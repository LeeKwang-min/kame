import { ReelSymbol } from './types';

export const INITIAL_COINS = 1000;

export const SYMBOLS: ReelSymbol[] = ['7', 'BAR', 'CHERRY', 'BELL', 'LEMON', 'ORANGE', 'GRAPE'];

export const SYMBOL_DISPLAY: Record<ReelSymbol, string> = {
  '7': '7️⃣',
  'BAR': '🎰',
  'CHERRY': '🍒',
  'BELL': '🔔',
  'LEMON': '🍋',
  'ORANGE': '🍊',
  'GRAPE': '🍇',
};

export const PAYOUTS: Record<ReelSymbol, number> = {
  '7': 100,
  'BAR': 50,
  'CHERRY': 25,
  'BELL': 15,
  'LEMON': 10,
  'ORANGE': 8,
  'GRAPE': 5,
};

export const TWO_MATCH_MULTIPLIER = 2;

export const BET_AMOUNTS = [10, 25, 50, 100, 250];

export const REEL_COUNT = 3;

export const SYMBOL_WEIGHTS: Record<ReelSymbol, number> = {
  '7': 1,
  'BAR': 2,
  'CHERRY': 4,
  'BELL': 6,
  'LEMON': 8,
  'ORANGE': 10,
  'GRAPE': 12,
};
