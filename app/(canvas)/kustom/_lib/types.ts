export type TVector2 = {
  x: number;
  y: number;
};

export type TPlayer = {
  x: number;
  y: number;
  hp: number;
  isDashing: boolean;
  dashTimer: number;
  dashCooldown: number;
  isInvincible: boolean;
  invincibleTimer: number;
  dashDirX: number;
  dashDirY: number;
  trails: TTrail[];
};

export type TTrail = {
  x: number;
  y: number;
  alpha: number;
};

export type TProjectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
};

export type TLaser = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  warningTimer: number;
  activeTimer: number;
  isActive: boolean;
};

export type TAreaHazard = {
  x: number;
  y: number;
  radius: number;
  warningTimer: number;
  activeTimer: number;
  isActive: boolean;
};

export type TPatternTier = 'basic' | 'mid' | 'advanced';

export type TPatternState = {
  elapsed: number;
  finished: boolean;
  projectiles: TProjectile[];
  lasers: TLaser[];
  areas: TAreaHazard[];
  custom: Record<string, unknown>;
};

export type TPattern = {
  name: string;
  tier: TPatternTier;
  duration: number;
  init: (bossPos: TVector2, playerPos: TVector2) => TPatternState;
  update: (state: TPatternState, dt: number, playerPos: TVector2, bossPos: TVector2) => void;
  render: (state: TPatternState, ctx: CanvasRenderingContext2D) => void;
  isFinished: (state: TPatternState) => boolean;
};

export type TGameState = 'start' | 'loading' | 'playing' | 'paused' | 'gameover';
