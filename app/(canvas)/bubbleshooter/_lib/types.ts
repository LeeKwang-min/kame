export type TGridBubble = {
  row: number;
  col: number;
  color: string;
  x: number;
  y: number;
};

export type TShootingBubble = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
};

export type TDroppingBubble = {
  x: number;
  y: number;
  vy: number;
  color: string;
  alpha: number;
};

export type TPoppingBubble = {
  x: number;
  y: number;
  color: string;
  scale: number;
  alpha: number;
  life: number;
};

export type TFloatingText = {
  x: number;
  y: number;
  text: string;
  alpha: number;
  color: string;
  life: number;
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
