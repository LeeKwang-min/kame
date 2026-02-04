import { COLS, ROWS, TETROMINO_TYPES, TETROMINOES } from './config';
import { TBoard, TTetromino, TTetrominoType } from './types';

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

// 레거시 함수 (호환성 유지용)
export const getRandomType = (): TTetrominoType => {
  const idx = Math.floor(Math.random() * TETROMINO_TYPES.length);
  return TETROMINO_TYPES[idx];
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
      if (!shape[row][col]) continue; // 빈 셀은 무시

      const newX = piece.x + col + offsetX;
      const newY = piece.y + row + offsetY;

      // 좌우 경계 체크
      if (newX < 0 || newX >= COLS) return false;

      // 바닥 체크
      if (newY >= ROWS) return false;

      // 다른 블록과 충돌 체크 (y가 0 이상일 때만)
      if (newY >= 0 && board[newY][newX] !== null) return false;
    }
  }
  return true;
};
