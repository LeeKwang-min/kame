import { RANKS, RANK_LABELS, SUITS, SUIT_SYMBOLS } from './config';
import { Card, Guess, Rank } from './types';

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const drawCard = (deck: Card[]): { card: Card; remainingDeck: Card[] } | null => {
  if (deck.length === 0) return null;
  const [card, ...remainingDeck] = deck;
  return { card, remainingDeck };
};

export const getRankLabel = (rank: Rank): string => {
  return RANK_LABELS[rank];
};

export const getSuitSymbol = (suit: Card['suit']): string => {
  return SUIT_SYMBOLS[suit];
};

export const compareCards = (current: Card, next: Card): 'high' | 'low' | 'tie' => {
  if (next.rank > current.rank) return 'high';
  if (next.rank < current.rank) return 'low';
  return 'tie';
};

export const checkGuess = (current: Card, next: Card, guess: Guess): 'win' | 'lose' | 'tie' => {
  if (!guess) return 'lose';

  const result = compareCards(current, next);
  if (result === 'tie') return 'tie';
  if (result === guess) return 'win';
  return 'lose';
};
