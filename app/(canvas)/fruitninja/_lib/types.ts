export type TFruitType =
  | 'watermelon'
  | 'orange'
  | 'apple'
  | 'banana'
  | 'kiwi'
  | 'dragonfruit';

export type TFruit = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: TFruitType;
  color: string;
  innerColor: string;
  seedColor: string;
  highlightColor: string;
  rotation: number;
  rotationSpeed: number;
  isSliced: boolean;
  isCritical: boolean;
};

export type TFruitHalf = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  type: TFruitType;
  color: string;
  innerColor: string;
  seedColor: string;
  radius: number;
  angle: number;
};

export type TBomb = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
};

export type TSliceTrail = {
  x: number;
  y: number;
  time: number;
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

export type TFloatingText = {
  x: number;
  y: number;
  text: string;
  alpha: number;
  color: string;
  life: number;
};
