// ==================== 캔버스 설정 ====================
export const CELL_SIZE = 48;
export const GRID_COLS = 13;
export const CANVAS_WIDTH = CELL_SIZE * GRID_COLS; // 624
export const CANVAS_HEIGHT = 600;

// ==================== 플레이어 설정 ====================
export const HOP_DURATION = 0.12; // seconds
export const HOP_ARC_HEIGHT = 10; // px
export const PLAYER_HITBOX_SHRINK = 4; // px per side

// ==================== 카메라 설정 ====================
export const CAMERA_SMOOTH_SPEED = 6;
export const CAMERA_TARGET_Y_RATIO = 0.65; // player at 65% screen height
export const CAMERA_PUSH_SPEED_BASE = 8; // px/s deadline push

// ==================== 지형 생성 설정 ====================
export const ROWS_AHEAD = 20;
export const ROWS_BEHIND = 5;
export const INITIAL_SAFE_ROWS = 5;

// ==================== 도로 설정 ====================
export const CAR_MIN_SPEED = 60;
export const CAR_MAX_SPEED = 180;
export const CAR_SPAWN_MIN = 1.0; // seconds
export const CAR_SPAWN_MAX = 3.0;
export const CAR_WIDTH = 40;
export const CAR_HEIGHT = 36;
export const TRUCK_WIDTH = 72;
export const TRUCK_HEIGHT = 36;

// ==================== 철길 설정 ====================
export const TRAIN_SPEED = 800;
export const TRAIN_WIDTH = CANVAS_WIDTH + 200;
export const TRAIN_HEIGHT = 40;
export const WARNING_DURATION = 1.5; // seconds
export const TRAIN_COOLDOWN_MIN = 3;
export const TRAIN_COOLDOWN_MAX = 7;

// ==================== 강 설정 ====================
export const LOG_MIN_SPEED = 40;
export const LOG_MAX_SPEED = 100;
export const LOG_SPAWN_MIN = 1.5;
export const LOG_SPAWN_MAX = 3.5;
export const LOG_WIDTH = 96;
export const LOG_HEIGHT = 36;
export const LILYPAD_WIDTH = 44;
export const LILYPAD_HEIGHT = 36;

// ==================== 잔디 장애물 설정 ====================
export const GRASS_OBSTACLE_CHANCE = 0.3; // per cell
export const GRASS_MIN_PASSABLE = 3; // minimum passable cells per row

// ==================== 난이도 설정 ====================
export const DIFFICULTY_SCALE = 0.015; // per score point
export const MAX_DIFFICULTY = 3.0;

// ==================== 사망 애니메이션 설정 ====================
export const DEATH_ANIM_DURATION = 1.0; // seconds
export const TRAIN_WARNING_SHAKE = 3; // px
export const PARTICLE_GRAVITY = 300; // px/s²

// ==================== 차량 색상 ====================
export const CAR_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#e67e22', '#9b59b6'];
export const TRUCK_COLORS = ['#c0392b', '#2980b9', '#27ae60', '#d35400'];
