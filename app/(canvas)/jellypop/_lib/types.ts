export type TPuyoColor = 'red' | 'green' | 'blue' | 'yellow';

export type TCell = TPuyoColor | null;

export type TBoard = TCell[][];

export type TPuyoPair = {
  pivot: { row: number; col: number; color: TPuyoColor };
  child: { row: number; col: number; color: TPuyoColor };
  rotation: number; // 0=위, 1=오른쪽, 2=아래, 3=왼쪽
};

export type TParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
};

export type TFloatingText = {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
};

export type TFallingPuyo = {
  col: number;
  color: TPuyoColor;
  fromRow: number;
  toRow: number;
  currentY: number; // 현재 픽셀 Y 위치
  velocity: number; // 현재 낙하 속도 (px/s)
};
