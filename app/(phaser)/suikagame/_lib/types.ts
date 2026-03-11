import { TSaveResult } from '@/lib/game';

export type TSuikaCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn: boolean;
  onGameOver?: (score: number) => void;
};

export type TFruitBody = {
  level: number;
  isFruit: true;
};
