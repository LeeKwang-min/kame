export type TBottle = {
  colors: (number | null)[]; // 인덱스 0 = 바닥, 3 = 꼭대기. null = 빈 칸
};

export type TMove = {
  from: number;
  to: number;
  count: number; // 이동한 칸 수
};

export type TGameState = 'start' | 'loading' | 'playing' | 'paused' | 'levelclear' | 'gameover';
