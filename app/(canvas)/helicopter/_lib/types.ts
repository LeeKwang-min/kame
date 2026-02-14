export type TCaveSegment = {
  x: number;
  topY: number;
  bottomY: number;
  width: number;
};

export type TPlayer = {
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
