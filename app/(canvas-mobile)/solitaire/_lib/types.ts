export type TSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type TRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export type TCard = {
  suit: TSuit;
  rank: TRank;
  faceUp: boolean;
  id: number;
};

export type TPileType = 'stock' | 'waste' | 'foundation' | 'tableau';

export type TPile = {
  type: TPileType;
  index: number;
  cards: TCard[];
};

export type TAnimation = {
  card: TCard;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  duration: number;
  onComplete?: () => void;
};
