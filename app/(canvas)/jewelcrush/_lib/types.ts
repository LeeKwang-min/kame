export type TJewelColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export type TCell = {
  color: TJewelColor;
  x: number; // 현재 렌더링 X (px)
  y: number; // 현재 렌더링 Y (px)
  targetX: number;
  targetY: number;
  scale: number; // 터질 때 축소용
  opacity: number;
};

export type TBoard = (TCell | null)[][];

export type TCursor = {
  row: number;
  col: number;
};

export type TSelected = {
  row: number;
  col: number;
} | null;

export type TSwapAnim = {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
  progress: number; // 0 → 1
  reverting: boolean; // 매칭 실패 시 되돌리기
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

export type TFallingCell = {
  col: number;
  color: TJewelColor;
  currentY: number;
  targetY: number;
  velocity: number;
};
