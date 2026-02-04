import { Rank, Suit } from './types';

export const SUITS: Suit[] = ['spade', 'heart', 'diamond', 'club'];

export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export const RANK_LABELS: Record<Rank, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣',
};

export const SUIT_COLORS: Record<Suit, string> = {
  spade: '#000000',
  heart: '#E53935',
  diamond: '#E53935',
  club: '#000000',
};
