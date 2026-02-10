export type TFallingWord = {
  x: number;
  y: number;
  speed: number;
  word: string;
  width: number;
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

export type TSplash = {
  x: number;
  y: number;
  particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
  }[];
};

export type TFloatingText = {
  x: number;
  y: number;
  text: string;
  alpha: number;
  color: string;
  life: number;
};

export type TCloud = {
  x: number;
  y: number;
  width: number;
  speed: number;
  opacity: number;
};

export type TBoat = {
  x: number;
  direction: number;
  speed: number;
  bobPhase: number;
};
