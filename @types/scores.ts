export type TGameType =
  | 'dodge'
  | 'snake'
  | 'tetris'
  | 'asteroid'
  | 'breakout'
  | 'flappybird'
  | 'pong'
  | 'dino'
  | 'doodle'
  | '2048'
  | 'spaceinvaders'
  | 'missilecommand'
  | 'platformer'
  | 'kero33'
  | 'enhance'
  | 'slot'
  | 'highlow'
  | 'roulette'
  | 'rps';

export type TScore = {
  id: string;
  gameType: TGameType;
  initials: string;
  score: number;
  country: string | null;
  createdAt: Date;
};

export type TScoreCreate = {
  gameType: TGameType;
  score: number;
};

export type TScoreCreateWithToken = TScoreCreate & {
  sessionToken: string;
};

export type TGameSession = {
  token: string;
  sessionId: string;
};

export type TScoreRank = {
  rank: number;
  initials: string;
  score: number;
  country: string | null;
};
