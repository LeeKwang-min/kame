// ==================== Game Types ====================
// TODO: 게임에 필요한 타입들을 정의하세요

export type Player = {
  x: number;
  y: number;
};

export type Enemy = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
};

// 방향 타입 예시
export type Direction = 'up' | 'down' | 'left' | 'right';
