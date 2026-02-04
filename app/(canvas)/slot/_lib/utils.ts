import { PAYOUTS, SYMBOL_WEIGHTS, SYMBOLS, TWO_MATCH_MULTIPLIER } from './config';
import { ReelSymbol } from './types';

export const getRandomSymbol = (): ReelSymbol => {
  const totalWeight = Object.values(SYMBOL_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const symbol of SYMBOLS) {
    random -= SYMBOL_WEIGHTS[symbol];
    if (random <= 0) {
      return symbol;
    }
  }

  return SYMBOLS[SYMBOLS.length - 1];
};

export const generateReelResult = (): ReelSymbol[] => {
  return [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
};

export const calculateWin = (reels: ReelSymbol[], betAmount: number): number => {
  const [a, b, c] = reels;

  if (a === b && b === c) {
    return betAmount * PAYOUTS[a];
  }

  if (a === b || b === c || a === c) {
    const matchedSymbol = a === b ? a : (b === c ? b : a);
    return betAmount * TWO_MATCH_MULTIPLIER;
  }

  return 0;
};

export const getWinMessage = (reels: ReelSymbol[], winAmount: number): string => {
  if (winAmount === 0) return '';

  const [a, b, c] = reels;
  if (a === b && b === c) {
    return `JACKPOT! ${a}x3 = ${winAmount} coins!`;
  }

  return `WIN! ${winAmount} coins!`;
};
