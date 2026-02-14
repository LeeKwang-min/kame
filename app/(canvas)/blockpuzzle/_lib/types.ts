export type TBlockShape = number[][];

export type TBlock = {
  shape: TBlockShape;
  color: string;
};

export type TDragging = {
  blockIndex: number;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
};

export type TCellAnimation = {
  row: number;
  col: number;
  progress: number;
  color: string;
};

export type TPlaceAnimation = {
  row: number;
  col: number;
  progress: number;
  color: string;
};
