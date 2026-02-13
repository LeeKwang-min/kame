import { TJewelColor } from './types';

// 그리드
export const COLS = 8;
export const ROWS = 8;

// 셀 크기
export const CELL_SIZE = 60;
export const CELL_GAP = 2;

// 캔버스
export const BOARD_WIDTH = COLS * CELL_SIZE;
export const BOARD_HEIGHT = ROWS * CELL_SIZE;
export const SIDE_PANEL_WIDTH = 150;
export const CANVAS_WIDTH = BOARD_WIDTH + SIDE_PANEL_WIDTH;
export const CANVAS_HEIGHT = BOARD_HEIGHT;
export const BOARD_OFFSET_X = 0;
export const BOARD_OFFSET_Y = 0;

// 게임
export const GAME_DURATION = 60; // 초

// 점수
export const SCORE_3_MATCH = 30;
export const SCORE_4_MATCH = 60;
export const SCORE_5_MATCH = 100;
export const CHAIN_BONUS_MULTIPLIER = 1.5;

// 애니메이션
export const SWAP_DURATION = 0.15; // 초
export const POP_DURATION = 0.25; // 초
export const GRAVITY_ACCELERATION = 3000; // px/s²
export const MAX_FALL_SPEED = 1400; // px/s
export const BOUNCE_FACTOR = 0.15;
export const BOUNCE_THRESHOLD = 40;
export const SETTLE_DELAY = 0.05; // 착지 후 잠깐 대기

// 파티클
export const PARTICLE_COUNT = 5;
export const PARTICLE_LIFE = 0.4;

// 플로팅 텍스트
export const FLOATING_TEXT_LIFE = 1.2;

// 보석 색상
export const JEWEL_COLORS: Record<
  TJewelColor,
  { body: string; highlight: string; shadow: string; sparkle: string }
> = {
  red: { body: '#E53E3E', highlight: '#FC8181', shadow: '#C53030', sparkle: '#FFF5F5' },
  orange: { body: '#ED8936', highlight: '#FBD38D', shadow: '#C05621', sparkle: '#FFFAF0' },
  yellow: { body: '#ECC94B', highlight: '#FAF089', shadow: '#B7791F', sparkle: '#FFFFF0' },
  green: { body: '#48BB78', highlight: '#9AE6B4', shadow: '#276749', sparkle: '#F0FFF4' },
  blue: { body: '#4299E1', highlight: '#90CDF4', shadow: '#2B6CB0', sparkle: '#EBF8FF' },
  purple: { body: '#9F7AEA', highlight: '#D6BCFA', shadow: '#6B46C1', sparkle: '#FAF5FF' },
};

export const JEWEL_COLOR_LIST: TJewelColor[] = [
  'red', 'orange', 'yellow', 'green', 'blue', 'purple',
];
