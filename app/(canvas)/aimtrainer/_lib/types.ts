export type TTarget = {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  spawnTime: number;
  lifetime: number;
  isHit: boolean;
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

export type TFloatingText = {
  x: number;
  y: number;
  text: string;
  alpha: number;
  color: string;
  life: number;
};

export type TGameStats = {
  totalClicks: number;
  successfulHits: number;
  missedTargets: number;
  combo: number;
  maxCombo: number;
  lastHitTime: number;
};
