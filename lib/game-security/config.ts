import { TGameType } from '@/@types/scores';

export const GAME_SECURITY_CONFIG: Record<
  TGameType,
  { maxScore: number; minPlayTimeSeconds: number }
> = {
  // 아케이드
  dodge: { maxScore: 100000, minPlayTimeSeconds: 5 },
  snake: { maxScore: 10000, minPlayTimeSeconds: 5 },
  tetris: { maxScore: 999999, minPlayTimeSeconds: 10 },
  asteroid: { maxScore: 100000, minPlayTimeSeconds: 5 },
  breakout: { maxScore: 50000, minPlayTimeSeconds: 5 },
  flappybird: { maxScore: 1000, minPlayTimeSeconds: 3 },
  pong: { maxScore: 100, minPlayTimeSeconds: 10 },
  dino: { maxScore: 50000, minPlayTimeSeconds: 5 },
  doodle: { maxScore: 100000, minPlayTimeSeconds: 5 },
  '2048': { maxScore: 500000, minPlayTimeSeconds: 30 },
  spaceinvaders: { maxScore: 100000, minPlayTimeSeconds: 10 },
  missilecommand: { maxScore: 100000, minPlayTimeSeconds: 10 },
  platformer: { maxScore: 100000, minPlayTimeSeconds: 10 },
  kero33: { maxScore: 50000, minPlayTimeSeconds: 5 },
  pacman: { maxScore: 500000, minPlayTimeSeconds: 10 },
  burger: { maxScore: 10000, minPlayTimeSeconds: 5 },
  stairs: { maxScore: 100000, minPlayTimeSeconds: 5 },
  crossyroad: { maxScore: 10000, minPlayTimeSeconds: 5 },
  towerblocks: { maxScore: 5000, minPlayTimeSeconds: 5 },
  fruitninja: { maxScore: 10000, minPlayTimeSeconds: 5 },
  // 운 기반
  enhance: { maxScore: 25, minPlayTimeSeconds: 3 },
  slot: { maxScore: 1000000, minPlayTimeSeconds: 2 },
  highlow: { maxScore: 1000000, minPlayTimeSeconds: 2 },
  roulette: { maxScore: 1000000, minPlayTimeSeconds: 2 },
  rps: { maxScore: 100, minPlayTimeSeconds: 2 },
};

export const RATE_LIMIT = {
  session: { maxRequests: 10, windowSeconds: 60 },
  score: { maxRequests: 5, windowSeconds: 60 },
};
