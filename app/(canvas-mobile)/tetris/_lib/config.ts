import { TGameMeta } from '@/@types/game-meta';
import { TTetrominoType } from './types';

export const GAME_META: TGameMeta = {
  id: 'tetris',
  title: 'Tetris',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'swipe',
  orientation: 'portrait',
  category: 'arcade',
  difficulty: 'progressive',
};

export const COLS = 10;
export const ROWS = 20;
export const CELL = 30;
export const CELL_GAP = 0.5;

export const SIDE_PANEL_WIDTH = 120;
export const PREVIEW_CELL = 20;
export const PREVIEW_SIZE = 4;

export const CANVAS_WIDTH = COLS * CELL + SIDE_PANEL_WIDTH; // 420
export const CANVAS_HEIGHT = ROWS * CELL; // 600

export const BASE_STEP = 0.7; // 초기 낙하 간격 (초) - 초반 더 빠르게
export const MIN_STEP = 0.05; // 최소 낙하 간격 - 후반 속도 제한
export const SPEED_INCREASE = 0.03; // 레벨당 감소량 - 더 완만하게

export const SCORE_PER_LINE = [0, 100, 300, 800, 1000]; // 0 ~ 4줄 제거 시 점수
export const COMBO_MULTIPLIER = 0.5; // 콤보당 추가 배수 (1콤보 = 1.5x, 2콤보 = 2x, ...)

// Lock Delay 설정
export const LOCK_DELAY = 0.5; // 바닥에 닿은 후 확정까지 대기 시간 (초)
export const LOCK_MOVE_LIMIT = 15; // Lock delay 중 최대 이동/회전 횟수

// T-Spin 점수
export const TSPIN_SCORE = {
  MINI: 100,
  SINGLE: 800,
  DOUBLE: 1200,
  TRIPLE: 1600,
};

export const TETROMINO_TYPES: TTetrominoType[] = [
  'I',
  'O',
  'T',
  'S',
  'Z',
  'J',
  'L',
];
// 7가지 테트로미노 (4가지 회전 상태)
export const TETROMINOES: Record<TTetrominoType, number[][][]> = {
  // I - 막대 (4x4 매트릭스 필요)
  I: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  ],

  // O - 정사각형
  O: [
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  ],

  // T - T자 모양
  T: [
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],

  // S - S자 모양
  S: [
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],

  // Z - Z자 모양
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  ],

  // J - J자 모양
  J: [
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  ],

  // L - L자 모양
  L: [
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
    ],
    [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
  ],
} as const;

export const COLORS: Record<TTetrominoType, string> = {
  I: '#5B8A9A', // 청록
  O: '#C9A227', // 머스타드
  T: '#7B5D8E', // 자주
  S: '#5A8F5A', // 세이지 그린
  Z: '#A85454', // 버건디
  J: '#4A6A8A', // 스틸 블루
  L: '#B87333', // 코퍼 오렌지
};
