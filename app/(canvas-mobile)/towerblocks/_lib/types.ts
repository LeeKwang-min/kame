export type TBlock = {
  x: number;
  y: number;
  width: number;
  height: number;
  colorIndex: number;
};

export type TMovingBlock = {
  x: number;
  y: number;
  width: number;
  height: number;
  colorIndex: number;
  direction: 1 | -1;
  speed: number;
};

export type TDebris = {
  x: number;
  y: number;
  width: number;
  height: number;
  colorIndex: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
};

export type TParticle = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  alpha: number;
  color: string;
  life: number;
};

export type TFloatingText = {
  x: number;
  y: number;
  text: string;
  alpha: number;
  scale: number;
  color: string;
  life: number;
};

export type TDroppingBlock = {
  x: number;
  y: number;
  width: number;
  height: number;
  colorIndex: number;
  targetY: number;
  velocityY: number;
};

export type TCloud = {
  x: number;
  y: number;
  width: number;
  alpha: number;
  speed: number;
};
