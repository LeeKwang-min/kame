export type TObstacleType = 'spike' | 'block' | 'pit';

export type TObstacle = {
  x: number;
  y: number;
  width: number;
  height: number;
  type: TObstacleType;
};

export type TPlayer = {
  x: number;
  y: number;
  size: number;
  vy: number;
  rotation: number;
  isGrounded: boolean;
};

export type TParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

export type TGroundSegment = {
  x: number;
  width: number;
  hasPit: boolean;
};
