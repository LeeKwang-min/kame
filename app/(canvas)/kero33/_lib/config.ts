export const GAME_CONFIG = {
  MAP_SIZE: 3,
  INITIAL_LIVES: 3,
  TICK_INTERVAL: 1000, // 시작 틱 간격 (ms)
  MIN_TICK_INTERVAL: 400, // 최소 틱 간격 (ms)
  TICK_SPEEDUP: 50, // 레벨당 틱 감소량 (ms)
  LEVEL_UP_SCORE: 10, // 레벨업에 필요한 점수
  MIN_DANGER_CELLS: 4, // 최소 위험 셀 개수
  MAX_DANGER_CELLS: 6, // 최대 위험 셀 개수
  INVINCIBLE_DURATION: 2000, // 무적 시간 (ms)
} as const;

// 스프라이트 설정
export const SPRITE_CONFIG = {
  PLAYER: {
    PATH: '/_assets/player_sheet.png',
    FRAME_COUNT: 5, // 왼쪽1, 왼쪽2, 대기, 오른쪽1, 오른쪽2
    FRAME_WIDTH: 47, // 235 / 5
    FRAME_HEIGHT: 120,
    ANIMATION_SPEED: 150, // ms per frame
  },
  TILES: {
    SAFE: '/_assets/tile_safe.png',
    WARN: '/_assets/tile_warn.png',
    DANGER: '/_assets/tile_danger.png',
    SIZE: 128,
  },
} as const;

// 플레이어 스프라이트 프레임 인덱스
export const PLAYER_FRAMES = {
  WALK_LEFT_1: 0,
  WALK_LEFT_2: 1,
  IDLE: 2,
  WALK_RIGHT_1: 3,
  WALK_RIGHT_2: 4,
} as const;

export const COLORS = {
  safe: '#ffffff',
  warn: '#fbbf24', // amber-400
  danger: '#ef4444', // red-500
  player: '#1f2937', // gray-800
  grid: '#d1d5db', // gray-300
} as const;
