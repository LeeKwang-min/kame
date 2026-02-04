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

// T-Spin 판정: T 블록의 4개 코너를 체크
// T 블록의 중심은 회전 상태에 따라 (x+1, y+1) 위치
export const checkTSpin = (
  board: TBoard,
  piece: TTetromino,
  wasRotation: boolean,
): TTSpinType => {
  // T 블록이 아니면 T-Spin 아님
  if (piece.type !== 'T') return 'NONE';

  // 회전으로 착지하지 않았으면 T-Spin 아님
  if (!wasRotation) return 'NONE';

  // T 블록의 중심 위치 (3x3 매트릭스에서 중심은 (1,1))
  const centerX = piece.x + 1;
  const centerY = piece.y + 1;

  // 4개 코너 위치
  const corners = [
    { x: centerX - 1, y: centerY - 1 }, // 왼쪽 위
    { x: centerX + 1, y: centerY - 1 }, // 오른쪽 위
    { x: centerX - 1, y: centerY + 1 }, // 왼쪽 아래
    { x: centerX + 1, y: centerY + 1 }, // 오른쪽 아래
  ];

  // 각 코너가 막혀있는지 체크 (벽, 바닥, 또는 블록)
  const isBlocked = (x: number, y: number): boolean => {
    if (x < 0 || x >= COLS) return true; // 좌우 벽
    if (y >= ROWS) return true; // 바닥
    if (y < 0) return false; // 위쪽은 막힌 것으로 치지 않음
    return board[y][x] !== null; // 블록이 있으면 막힌 것
  };

  const blockedCorners = corners.filter((c) => isBlocked(c.x, c.y)).length;

  // 3개 이상의 코너가 막혀있으면 T-Spin
  if (blockedCorners >= 3) {
    // T-Spin Full vs Mini 판정
    // T의 "앞쪽" 2개 코너가 막혀있으면 Full, 아니면 Mini
    // 회전 상태에 따른 앞쪽 코너 인덱스
    const frontCornersByRotation: Record<number, [number, number]> = {
      0: [0, 1], // 0° - 위쪽 2개가 앞
      1: [1, 3], // 90° - 오른쪽 2개가 앞
      2: [2, 3], // 180° - 아래쪽 2개가 앞
      3: [0, 2], // 270° - 왼쪽 2개가 앞
    };

    const [front1, front2] = frontCornersByRotation[piece.rotation];
    const frontBlocked =
      isBlocked(corners[front1].x, corners[front1].y) &&
      isBlocked(corners[front2].x, corners[front2].y);

    return frontBlocked ? 'FULL' : 'MINI';
  }

  return 'NONE';
};
