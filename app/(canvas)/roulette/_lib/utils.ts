import { BET_PAYOUTS, BLACK_NUMBERS, RED_NUMBERS, WHEEL_NUMBERS } from './config';
import { Bet, BetType } from './types';

export const getNumberColor = (num: number): 'red' | 'black' | 'green' => {
  if (num === 0) return 'green';
  if (RED_NUMBERS.includes(num)) return 'red';
  return 'black';
};

export const spinWheel = (): number => {
  return Math.floor(Math.random() * 37);
};

export const getWheelIndex = (num: number): number => {
  return WHEEL_NUMBERS.indexOf(num);
};

export const evaluateBet = (bet: Bet, result: number): number => {
  let won = false;

  switch (bet.type) {
    case 'single':
      won = bet.number === result;
      break;
    case 'red':
      won = RED_NUMBERS.includes(result);
      break;
    case 'black':
      won = BLACK_NUMBERS.includes(result);
      break;
    case 'odd':
      won = result > 0 && result % 2 === 1;
      break;
    case 'even':
      won = result > 0 && result % 2 === 0;
      break;
    case 'low':
      won = result >= 1 && result <= 18;
      break;
    case 'high':
      won = result >= 19 && result <= 36;
      break;
    case 'dozen1':
      won = result >= 1 && result <= 12;
      break;
    case 'dozen2':
      won = result >= 13 && result <= 24;
      break;
    case 'dozen3':
      won = result >= 25 && result <= 36;
      break;
  }

  if (won) {
    return bet.amount + bet.amount * BET_PAYOUTS[bet.type];
  }
  return 0;
};

export const calculateTotalBets = (bets: Bet[]): number => {
  return bets.reduce((sum, bet) => sum + bet.amount, 0);
};

export const calculateTotalWin = (bets: Bet[], result: number): number => {
  return bets.reduce((sum, bet) => sum + evaluateBet(bet, result), 0);
};
