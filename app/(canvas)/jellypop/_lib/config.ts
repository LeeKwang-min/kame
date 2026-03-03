import { TPuyoColor } from './types';

// 그리드 설정
export const COLS = 6;
export const ROWS = 12;
export const HIDDEN_ROWS = 1;
export const TOTAL_ROWS = ROWS + HIDDEN_ROWS;

// 셀 크기
export const CELL_SIZE = 50;
export const CELL_GAP = 1;

// 캔버스 설정
export const BOARD_WIDTH = COLS * CELL_SIZE;
export const BOARD_HEIGHT = ROWS * CELL_SIZE;
export const SIDE_PANEL_WIDTH = 150;
export const CANVAS_WIDTH = BOARD_WIDTH + SIDE_PANEL_WIDTH;
export const CANVAS_HEIGHT = BOARD_HEIGHT;

// 낙하 속도 (초 단위)
export const BASE_DROP_INTERVAL = 1.0;
export const MIN_DROP_INTERVAL = 0.15;
export const SPEED_INCREASE_PER_PUYO = 0.002;
export const SOFT_DROP_INTERVAL = 0.05;

// 게임 오버 열 (3번째 = index 2)
export const DEATH_COL = 2;

// 매칭
export const MIN_MATCH = 4;

// 점수
export const SCORE_PER_PUYO = 10;
export const CHAIN_MULTIPLIER = [0, 1, 4, 8, 16, 32, 64, 128, 256, 512];

// 애니메이션 타이밍
export const POP_ANIMATION_DURATION = 0.4;

// 낙하 애니메이션
export const GRAVITY_ACCELERATION = 2800; // px/s^2
export const MAX_FALL_SPEED = 1200; // px/s
export const BOUNCE_FACTOR = 0.2; // 바운스 강도
export const BOUNCE_THRESHOLD = 30; // 이 속도 이하면 바운스 없이 착지 (px/s)

// 파티클
export const PARTICLE_COUNT = 6;
export const PARTICLE_LIFE = 0.5;

// 플로팅 텍스트
export const FLOATING_TEXT_LIFE = 1.5;

// 뿌요 색상
export const PUYO_COLORS: Record<
  TPuyoColor,
  { body: string; highlight: string; shadow: string; eye: string }
> = {
  red: {
    body: '#FF4444',
    highlight: '#FF8888',
    shadow: '#CC2222',
    eye: '#FFFFFF',
  },
  green: {
    body: '#44BB44',
    highlight: '#88DD88',
    shadow: '#228822',
    eye: '#FFFFFF',
  },
  blue: {
    body: '#4488FF',
    highlight: '#88BBFF',
    shadow: '#2266CC',
    eye: '#FFFFFF',
  },
  yellow: {
    body: '#FFCC00',
    highlight: '#FFEE66',
    shadow: '#CC9900',
    eye: '#FFFFFF',
  },
};

export const PUYO_COLOR_LIST: TPuyoColor[] = ['red', 'green', 'blue', 'yellow'];

// 다음 뿌요 미리보기 수
export const NEXT_PREVIEW_COUNT = 2;
