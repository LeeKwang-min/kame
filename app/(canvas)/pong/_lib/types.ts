export type TGameMode = 'single' | 'multi';
export type TDifficulty = 'easy' | 'normal' | 'hard';

export type TBall = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

export type TPaddle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TGameState = {
  mode: TGameMode;
  difficulty: TDifficulty;
  score: { p1: number; p2: number };
};

// menu: 싱글/멀티 선택 화면
// difficulty: 난이도 선택 화면
// ready: 게임 대기 (Space로 시작 전)
// playing: 게임 중
// gameover: 게임 종료 - 승자 표시
export type TGamePhase =
  | 'menu'
  | 'difficulty'
  | 'ready'
  | 'playing'
  | 'gameover';
