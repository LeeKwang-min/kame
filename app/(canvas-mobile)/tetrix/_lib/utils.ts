import { COLS, ROWS, TETROMINO_TYPES, TETROMINOES } from './config';
import { TBoard, TTetromino, TTetrominoType, TTSpinType } from './types';

export const createEmptyBoard = (): TBoard => {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
};

// 7-bag 시스템: 7개 도형을 섞어서 순서대로 사용
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const createBag = () => {
  let bag: TTetrominoType[] = [];

  const getNext = (): TTetrominoType => {
    if (bag.length === 0) {
      bag = shuffleArray([...TETROMINO_TYPES]);
    }
    return bag.pop()!;
  };

  const reset = () => {
    bag = [];
  };

  return { getNext, reset };
};

export const createTetromino = (type: TTetrominoType): TTetromino => {
  const shape = TETROMINOES[type][0];
  const shapeWidth = shape[0].length;

  return {
    type,
    shape,
    x: Math.floor((COLS - shapeWidth) / 2),
    y: 0,
    rotation: 0,
  };
};

export const getShape = (piece: TTetromino): number[][] => {
  return TETROMINOES[piece.type][piece.rotation];
};

export const isValidPosition = (
  board: TBoard,
  piece: TTetromino,
  offsetX = 0,
  offsetY = 0,
  newRotation?: number,
): boolean => {
  const rotation = newRotation ?? piece.rotation;
  const shape = TETROMINOES[piece.type][rotation];

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue;

      const newX = piece.x + col + offsetX;
      const newY = piece.y + row + offsetY;

      if (newX < 0 || newX >= COLS) return false;
      if (newY >= ROWS) return false;
      if (newY >= 0 && board[newY][newX] !== null) return false;
    }
  }
  return true;
};

// T-Spin 판정: T 블록의 4개 코너를 체크
export const checkTSpin = (
  board: TBoard,
  piece: TTetromino,
  wasRotation: boolean,
): TTSpinType => {
  if (piece.type !== 'T') return 'NONE';
  if (!wasRotation) return 'NONE';

  const centerX = piece.x + 1;
  const centerY = piece.y + 1;

  const corners = [
    { x: centerX - 1, y: centerY - 1 },
    { x: centerX + 1, y: centerY - 1 },
    { x: centerX - 1, y: centerY + 1 },
    { x: centerX + 1, y: centerY + 1 },
  ];

  const isBlocked = (x: number, y: number): boolean => {
    if (x < 0 || x >= COLS) return true;
    if (y >= ROWS) return true;
    if (y < 0) return false;
    return board[y][x] !== null;
  };

  const blockedCorners = corners.filter((c) => isBlocked(c.x, c.y)).length;

  if (blockedCorners >= 3) {
    const frontCornersByRotation: Record<number, [number, number]> = {
      0: [0, 1],
      1: [1, 3],
      2: [2, 3],
      3: [0, 2],
    };

    const [front1, front2] = frontCornersByRotation[piece.rotation];
    const frontBlocked =
      isBlocked(corners[front1].x, corners[front1].y) &&
      isBlocked(corners[front2].x, corners[front2].y);

    return frontBlocked ? 'FULL' : 'MINI';
  }

  return 'NONE';
};
