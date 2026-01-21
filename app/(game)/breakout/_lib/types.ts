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

export type TBrick = {
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  color: string;
};
