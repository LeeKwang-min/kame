import { BetType } from './types';

export const INITIAL_CHIPS = 1000;

export const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const RED_NUMBERS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
];

export const BLACK_NUMBERS = [
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35
];

export const BET_TYPES: BetType[] = [
  'single',
  'red',
  'black',
  'odd',
  'even',
  'low',
  'high',
  'dozen1',
  'dozen2',
  'dozen3',
];

export const BET_TYPE_LABELS: Record<BetType, string> = {
  single: 'Single Number',
  red: 'Red',
  black: 'Black',
  odd: 'Odd',
  even: 'Even',
  low: 'Low (1-18)',
  high: 'High (19-36)',
  dozen1: '1st 12',
  dozen2: '2nd 12',
  dozen3: '3rd 12',
};

export const BET_PAYOUTS: Record<BetType, number> = {
  single: 35,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  low: 1,
  high: 1,
  dozen1: 2,
  dozen2: 2,
  dozen3: 2,
};

export const CHIP_AMOUNTS = [10, 25, 50, 100, 250];
