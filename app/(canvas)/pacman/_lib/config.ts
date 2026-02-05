// 방향 상수
export const DIR = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
} as const;

// 미로 크기
export const MAZE_COLS = 28;
export const MAZE_ROWS = 31;
export const CELL = 18; // 16 -> 18 (약 50px 증가)

// 캔버스 크기
export const CANVAS_WIDTH = MAZE_COLS * CELL; // 504
export const CANVAS_HEIGHT = MAZE_ROWS * CELL; // 558

// 속도 (초당 셀 수)
export const PACMAN_SPEED = 8;
export const GHOST_SPEED = 7.5;
export const GHOST_FRIGHTENED_SPEED = 5;
export const GHOST_TUNNEL_SPEED = 4;
export const GHOST_EATEN_SPEED = 15;

// 고정 타임스텝 (1/PACMAN_SPEED 초마다 한 칸 이동)
export const STEP = 1 / PACMAN_SPEED;

// 점수
export const SCORE_DOT = 10;
export const SCORE_POWER_PELLET = 50;
export const SCORE_GHOST = [200, 400, 800, 1600];

// 모드 지속 시간 (초)
export const SCATTER_DURATION = 7;
export const CHASE_DURATION = 20;
export const FRIGHTENED_DURATION = 6;
export const FRIGHTENED_BLINK_TIME = 2; // 깜빡임 시작 시간 (종료 전)

// 유령 집 탈출 타이밍 (초)
export const GHOST_RELEASE_TIMES = {
  blinky: 0,
  pinky: 2,
  inky: 5,
  clyde: 8,
};

// 시작 라이프
export const INITIAL_LIVES = 3;

// 입력 버퍼
export const INPUT_BUFFER_SIZE = 2;

// 유령 색상
export const GHOST_COLORS = {
  blinky: '#FF0000', // 빨강
  pinky: '#FFB8FF',  // 분홍
  inky: '#00FFFF',   // 청록
  clyde: '#FFB852',  // 주황
  frightened: '#2121FF', // 파랑 (겁먹은 상태)
  frightenedBlink: '#FFFFFF', // 흰색 (깜빡임)
  eaten: 'transparent', // 눈만 보임
};

// 팩맨 색상
export const PACMAN_COLOR = '#FFFF00';

// 미로 색상
export const WALL_COLOR = '#2121DE';
export const DOT_COLOR = '#FFB897';
export const POWER_PELLET_COLOR = '#FFB897';
