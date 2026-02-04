export const DIR = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
} as const;

export const SPEED = 320;
export const CELL = 32;
export const STEP = CELL / SPEED;

// 스프라이트 시트 설정 (1280x1280 이미지, 4x4 그리드)
export const SPRITE_SIZE = 320; // 원본 스프라이트 셀 크기 (1280/4)
