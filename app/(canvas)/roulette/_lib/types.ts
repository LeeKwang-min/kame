export type GamePhase = 'betting' | 'spinning' | 'result' | 'gameover';

export type BetType =
  | 'single'
  | 'red'
  | 'black'
  | 'odd'
  | 'even'
  | 'low'
  | 'high'
  | 'dozen1'
  | 'dozen2'
  | 'dozen3';

export type Bet = {
  type: BetType;
  amount: number;
  number?: number;
};

export type RouletteState = {
  phase: GamePhase;
  chips: number;
  maxChips: number;
  currentBetType: BetType;
  currentBetAmount: number;
  selectedNumber: number;
  bets: Bet[];
  result: number | null;
  lastWin: number;
  wheelAngle: number;
  ballAngle: number;
};
