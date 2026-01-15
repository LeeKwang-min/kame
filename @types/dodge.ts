export type Point = { x: number; y: number };

export type Player = { x: number; y: number; r: number };

export type Enemy = {
  id: number;
  x: number;
  y: number;
  r: number;
  speed: number;
  vx: number;
  vy: number;
};
