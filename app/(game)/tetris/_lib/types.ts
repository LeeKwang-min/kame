export type TTetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type TTetromino = {
  type: TTetrominoType;
  shape: number[][]; // 4x4 회전 매트릭스
  x: number; // 보드 위치
  y: number;
  rotation: number; // 0, 1, 2, 3 (90도씩)
};

export type TBoard = (TTetrominoType | null)[][]; // ROWS x COLS
