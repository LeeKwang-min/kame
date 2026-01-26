// ==================== 맵 설정 ====================
export const MAP_COLS = 15; // 맵 가로 타일 수
export const MAP_ROWS = 10; // 맵 세로 타일 수

// ==================== 기준 타일 설정 (40px 기준 설계) ====================
export const BASE_TILE_SIZE = 40;

// ==================== 플레이어 설정 (타일 크기 비율) ====================
export const PLAYER_WIDTH_RATIO = 0.75; // 타일의 75%
export const PLAYER_HEIGHT_RATIO = 1.0; // 타일의 100%
export const PLAYER_SPEED_RATIO = 5; // 타일/초 (5 타일/초)

// ==================== 물리 설정 (타일 크기 비율) ====================
export const GRAVITY_RATIO = 30; // 타일/초² (30 타일/초²)
export const JUMP_FORCE_RATIO = -12.5; // 타일/초 (음수 = 위로)
export const MAX_FALL_SPEED_RATIO = 15; // 타일/초

// ==================== 색상 ====================
export const COLORS = {
  background: '#87CEEB', // 하늘색
  tile: '#8B4513', // 갈색 (벽/바닥)
  player: '#FF6B6B', // 빨간색 (플레이어)
  goal: '#FFD700', // 금색 (탈출구)
};