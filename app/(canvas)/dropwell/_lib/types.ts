export type TPlayer = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  isGrounded: boolean;
  isFacingRight: boolean;
  invincibleTimer: number;
};

export type TPlatform = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TEnemy = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  hp: number;
  type: 'walker' | 'flyer';
};

export type TBullet = {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
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
