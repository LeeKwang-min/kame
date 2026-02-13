import type { TEnemyType, TEnemyDef, TWaveEvent } from './types';

// ─── Canvas ───
export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 720;

// ─── Game ───
export const GAME_DURATION = 600; // 10 minutes
export const MAX_ENEMIES = 300;
export const MAX_PROJECTILES = 500;
export const MAX_GEMS = 200;
export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;

// ─── Player ───
export const PLAYER_SPEED = 150;
export const PLAYER_HP = 3;
export const PLAYER_MAX_HP = 5;
export const PLAYER_PICKUP_RANGE = 30;
export const PLAYER_INVINCIBLE_TIME = 1.0;
export const PLAYER_SIZE = 12;
export const PLAYER_RENDER_SIZE = 32;

// ─── Tile Map ───
export const TILE_SIZE = 64;
export const CHUNK_SIZE = 256;

// ─── Spatial Hash ───
export const HASH_CELL_SIZE = 128;

// ─── Experience ───
export const BASE_EXP_TO_LEVEL = 5;
export const EXP_INCREMENT = 10;

// ─── Colors ───
export const COLORS = {
  bg: '#1a2a1a',
  tile1: '#1e3320',
  tile2: '#1a2e1c',
  player: '#00d4ff',
  playerDamaged: '#ff4444',
  expGem: '#4488ff',
  hud: '#ffffff',
  hudBg: 'rgba(0,0,0,0.6)',
  levelUpBg: 'rgba(0,0,0,0.85)',
  cardBg: '#1e1e2e',
  cardBorder: '#00d4ff',
  cardHover: '#2e2e4e',
};

// ─── Enemy Definitions ───
// HP는 무기 데미지 기준으로 조정 (마법지팡이 Lv.1 = 12 dmg)
export const ENEMY_DEFS: Record<TEnemyType, TEnemyDef> = {
  bat: { type: 'bat', hp: 10, speed: 60, damage: 1, exp: 1, radius: 12, color: '#8844aa' },
  zombie: { type: 'zombie', hp: 25, speed: 50, damage: 1, exp: 2, radius: 10, color: '#44aa44' },
  skeleton: { type: 'skeleton', hp: 35, speed: 80, damage: 1, exp: 3, radius: 10, color: '#cccccc' },
  mummy: { type: 'mummy', hp: 60, speed: 40, damage: 2, exp: 5, radius: 14, color: '#ccaa66' },
  witch: { type: 'witch', hp: 50, speed: 70, damage: 1, exp: 5, radius: 10, color: '#aa44cc' },
  boss: { type: 'boss', hp: 500, speed: 30, damage: 3, exp: 50, radius: 32, color: '#ff2244' },
};

// ─── Spawn Schedule (continuous time-based) ───
// 각 항목은 "이 시점부터 해당 적 타입의 스폰 설정을 교체"
// count가 없으면 무한 스폰 (다음 같은 타입 이벤트가 교체할 때까지)
// count가 있으면 해당 수만큼만 스폰 (보스 등 일회성)
export const WAVE_SCHEDULE: TWaveEvent[] = [
  // Phase 1: Bats (0-60s)
  { time: 0, enemyType: 'bat', interval: 0.6, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 15, enemyType: 'bat', interval: 0.4, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 30, enemyType: 'bat', interval: 0.3, hpMultiplier: 1, speedMultiplier: 1.1 },
  { time: 45, enemyType: 'zombie', interval: 0.8, hpMultiplier: 1, speedMultiplier: 1 },

  // Phase 2: Bats + Zombies (60-180s)
  { time: 60, enemyType: 'bat', interval: 0.25, hpMultiplier: 1, speedMultiplier: 1.1 },
  { time: 60, enemyType: 'zombie', interval: 0.5, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 90, enemyType: 'bat', interval: 0.2, hpMultiplier: 1.1, speedMultiplier: 1.1 },
  { time: 90, enemyType: 'zombie', interval: 0.4, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 120, enemyType: 'bat', interval: 0.2, hpMultiplier: 1.2, speedMultiplier: 1.2 },
  { time: 120, enemyType: 'zombie', interval: 0.3, hpMultiplier: 1.1, speedMultiplier: 1.1 },
  { time: 150, enemyType: 'skeleton', interval: 0.6, hpMultiplier: 1, speedMultiplier: 1 },

  // Phase 3: Skeletons + Mummies (180-300s)
  { time: 180, enemyType: 'skeleton', interval: 0.3, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 180, enemyType: 'zombie', interval: 0.25, hpMultiplier: 1.2, speedMultiplier: 1.1 },
  { time: 180, enemyType: 'bat', interval: 0.15, hpMultiplier: 1.3, speedMultiplier: 1.2 },
  { time: 210, enemyType: 'mummy', interval: 0.8, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 240, enemyType: 'mummy', interval: 0.5, hpMultiplier: 1.2, speedMultiplier: 1.1 },
  { time: 240, enemyType: 'skeleton', interval: 0.2, hpMultiplier: 1.3, speedMultiplier: 1.2 },
  { time: 270, enemyType: 'bat', interval: 0.1, hpMultiplier: 1.5, speedMultiplier: 1.3 },

  // Phase 4: Boss #1 + Witches (300s)
  { time: 300, enemyType: 'boss', count: 1, interval: 0, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 300, enemyType: 'witch', interval: 0.5, hpMultiplier: 1.5, speedMultiplier: 1.1 },
  { time: 300, enemyType: 'bat', interval: 0.1, hpMultiplier: 1.5, speedMultiplier: 1.3 },
  { time: 300, enemyType: 'skeleton', interval: 0.2, hpMultiplier: 1.5, speedMultiplier: 1.2 },

  // Phase 5: All enemies (360-480s)
  { time: 360, enemyType: 'bat', interval: 0.08, hpMultiplier: 1.8, speedMultiplier: 1.3 },
  { time: 360, enemyType: 'skeleton', interval: 0.15, hpMultiplier: 1.8, speedMultiplier: 1.2 },
  { time: 360, enemyType: 'witch', interval: 0.5, hpMultiplier: 1.5, speedMultiplier: 1.1 },
  { time: 420, enemyType: 'zombie', interval: 0.1, hpMultiplier: 2, speedMultiplier: 1.3 },
  { time: 420, enemyType: 'mummy', interval: 0.3, hpMultiplier: 2, speedMultiplier: 1.2 },
  { time: 420, enemyType: 'witch', interval: 0.4, hpMultiplier: 2, speedMultiplier: 1.2 },

  // Phase 6: Boss #2 (480s)
  { time: 480, enemyType: 'boss', count: 1, interval: 0, hpMultiplier: 2, speedMultiplier: 1.2 },
  { time: 480, enemyType: 'skeleton', interval: 0.08, hpMultiplier: 2.5, speedMultiplier: 1.4 },
  { time: 480, enemyType: 'mummy', interval: 0.2, hpMultiplier: 2.5, speedMultiplier: 1.3 },

  // Phase 7: Final Rush (540-600s)
  { time: 540, enemyType: 'bat', interval: 0.05, hpMultiplier: 3, speedMultiplier: 1.5 },
  { time: 540, enemyType: 'witch', interval: 0.2, hpMultiplier: 2.5, speedMultiplier: 1.2 },
  { time: 540, enemyType: 'mummy', interval: 0.1, hpMultiplier: 3, speedMultiplier: 1.4 },
  { time: 540, enemyType: 'skeleton', interval: 0.05, hpMultiplier: 3, speedMultiplier: 1.5 },
  { time: 570, enemyType: 'boss', count: 3, interval: 5, hpMultiplier: 3, speedMultiplier: 1.3 },
];
