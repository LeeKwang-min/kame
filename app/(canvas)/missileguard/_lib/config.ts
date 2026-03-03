// ==================== Canvas ====================
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// ==================== Player Missile (요격 미사일) ====================
export const PLAYER_MISSILE_SPEED = 400; // 픽셀/초
export const EXPLOSION_MAX_RADIUS = 50; // 최대 폭발 반경
export const EXPLOSION_DURATION = 0.5; // 폭발 지속 시간 (초)

// ==================== Enemy Missile (적 미사일) ====================
export const ENEMY_MISSILE_SPEED = 80; // 픽셀/초
export const ENEMY_MISSILE_RADIUS = 4;
export const ENEMY_SPAWN_INTERVAL = 2; // 초마다 스폰

// ==================== City (도시) ====================
export const CITY_WIDTH = 60;
export const CITY_HEIGHT = 30;
export const CITY_COUNT = 6;

// ==================== Turret (포탑) ====================
export const TURRET_Y = CANVAS_HEIGHT - 50; // 포탑 Y 위치

// ==================== Colors ====================
export const COLORS = {
  background: '#000022',
  city: '#00ff00',
  turret: '#ffffff',
  playerMissile: '#00ffff',
  playerTrail: '#004444',
  enemyMissile: '#ff0000',
  enemyTrail: '#440000',
  explosion: '#ffff00',
  crosshair: '#ffffff',
};
