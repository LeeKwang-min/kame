export const PLAYER_RADIUS = 5;
export const PLAYER_SPEED = 260; // px/sec

export const ENEMY_RADIUS = 6;
export const ENEMY_SPAWN_INTERVAL_MS = 700;
export const MIN_ENEMY_SPEED = 120; // px/frame
export const MAX_ENEMY_SPEED = 220; // px/frame

// 난이도 조절
// 시작부터 많이 나오게 -> BASE_ENEMY_SPAWN_INTERVAL 줄이기
// 후반만 빡세게 하기 -> MIN_ENEMY_SPAWN_INTERVAL 줄이기 or lerp의 2번째값 줄이기
export const BASE_ENEMY_SPAWN_INTERVAL = 0.2; // 줄이면 시작 난이도에서 스폰 간격 빨라짐
export const MIN_ENEMY_SPAWN_INTERVAL = 0.1; // 줄이면 후반 최대 스폰 속도 빨라짐

export const SCORE_PER_SEC = 100;

export const DIRS = [
  { vx: 1, vy: 0 },
  { vx: -1, vy: 0 },
  { vx: 0, vy: 1 },
  { vx: 0, vy: -1 },
  { vx: 1, vy: 1 },
  { vx: 1, vy: -1 },
  { vx: -1, vy: 1 },
  { vx: -1, vy: -1 },
] as const;

export const INITIALS_KEY_COLS = 7;
export const INITIALS_KEY_ROWS = 4;
export const INITIALS_KEY_GRID: string[] = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', // 26
  'DEL',
  'SPC',
];
export const INITIALS_MOVE_DIR = {
  ArrowLeft: { dr: 0, dc: -1 },
  ArrowRight: { dr: 0, dc: 1 },
  ArrowUp: { dr: -1, dc: 0 },
  ArrowDown: { dr: 1, dc: 0 },
} as const;
