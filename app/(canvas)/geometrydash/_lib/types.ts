export type TObstacleType = 'spike' | 'pit';

export type TObstacle = {
  x: number;
  y: number;
  width: number;
  height: number;
  type: TObstacleType;
};

export type TPlatformBlock = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TJumpPad = {
  x: number;
  y: number;
  width: number;
  height: number;
  onPlatformY?: number;
  triggered: boolean;
  animTimer: number;
};

export type TPatternElement = {
  type: 'spike' | 'platform' | 'jumppad' | 'pit' | 'spike-on-platform';
  offsetX: number;
  offsetY?: number;
  width?: number;
  height?: number;
};

export type TPattern = {
  elements: TPatternElement[];
  totalWidth: number;
  difficulty: number;
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
