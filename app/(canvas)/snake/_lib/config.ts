export const DIR = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
} as const;

export const SPEED = 280;
export const CELL = 32;
export const STEP = CELL / SPEED;

// 입력 버퍼 최대 크기 (빠른 연속 입력 처리용)
export const INPUT_BUFFER_SIZE = 2;
