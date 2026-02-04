export type GamePhase = 'playing' | 'revealing' | 'gameover';

export type Suit = 'spade' | 'heart' | 'diamond' | 'club';

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export type Card = {
  suit: Suit;
  rank: Rank;
};

export type Guess = 'high' | 'low' | null;

export type HighLowState = {
  phase: GamePhase;
  currentCard: Card | null;
  nextCard: Card | null;
  guess: Guess;
  streak: number;
  maxStreak: number;
  deck: Card[];
};
