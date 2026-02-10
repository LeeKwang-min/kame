export type TTile = {
  value: number; // 0 = empty
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  animating: boolean;
  animStart: number;
};

export type TBoard = (number | 0)[][]; // 0 = empty
