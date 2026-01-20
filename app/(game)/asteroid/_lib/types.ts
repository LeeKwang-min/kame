export type TShip = {
  x: number;
  y: number;
  vx: number; // x 속도 (관성)
  vy: number; // y 속도 (관성)
  angle: number; // 바라보는 방향 (라디안)
  radius: number;
}

export type TBullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 생명 시간 (초)
}

export type TAsteroid = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  vertices: number[]; // 불규칙한 모양용
}