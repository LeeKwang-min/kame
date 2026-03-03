export type TRowType = 'grass' | 'road' | 'railway' | 'river';

export type TDirection = 'left' | 'right';

export type TDeathType = 'vehicle' | 'train' | 'drown' | 'offscreen';

export type TPlayer = {
  col: number;
  rowIndex: number;
  x: number;
  y: number;
  hopStartX: number;
  hopStartY: number;
  targetX: number;
  targetY: number;
  hopProgress: number;
  isHopping: boolean;
  highestRow: number;
  isDead: boolean;
  deathType: TDeathType | null;
  facing: TDirection;
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
  gravity: number;
};

export type TEntityType = 'car' | 'truck' | 'train' | 'log' | 'lilypad';

export type TMovingEntity = {
  x: number;
  width: number;
  height: number;
  speed: number;
  direction: TDirection;
  type: TEntityType;
  color: string;
};

export type TObstacle = {
  col: number;
  type: 'tree' | 'rock';
};

export type TRow = {
  type: TRowType;
  worldY: number;
  index: number;
  obstacles: TObstacle[];
  entities: TMovingEntity[];
  direction: TDirection;
  speed: number;
  spawnTimer: number;
  spawnInterval: number;
  // railway specific
  warningActive: boolean;
  warningTimer: number;
  trainCooldown: number;
  trainPassed: boolean;
  // river specific
  initialSpawned: boolean;
};
