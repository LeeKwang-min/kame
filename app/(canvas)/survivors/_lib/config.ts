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
  expGem: '#ffcc00',
  hud: '#ffffff',
  hudBg: 'rgba(0,0,0,0.6)',
  levelUpBg: 'rgba(0,0,0,0.85)',
  cardBg: '#1e1e2e',
  cardBorder: '#00d4ff',
  cardHover: '#2e2e4e',
};

// ─── Enemy Definitions ───
export const ENEMY_DEFS: Record<TEnemyType, TEnemyDef> = {
  bat: { type: 'bat', hp: 1, speed: 60, damage: 1, exp: 1, radius: 8, color: '#8844aa' },
  zombie: { type: 'zombie', hp: 3, speed: 50, damage: 1, exp: 2, radius: 10, color: '#44aa44' },
  skeleton: {
    type: 'skeleton',
    hp: 5,
    speed: 80,
    damage: 1,
    exp: 3,
    radius: 10,
    color: '#cccccc',
  },
  mummy: { type: 'mummy', hp: 10, speed: 40, damage: 2, exp: 5, radius: 14, color: '#ccaa66' },
  witch: { type: 'witch', hp: 7, speed: 70, damage: 1, exp: 5, radius: 10, color: '#aa44cc' },
  boss: { type: 'boss', hp: 100, speed: 30, damage: 3, exp: 50, radius: 32, color: '#ff2244' },
};

// ─── Wave Schedule ───
// 0-60s: bats only (small numbers)
// 60-180s: bats + zombies (increasing)
// 180-300s: skeletons + mummies added
// 300s: Boss #1 + witches
// 300-480s: all enemies, multipliers increasing
// 480s: Boss #2 (hp x2, speed x1.2)
// 540-600s: final rush (massive numbers, high multipliers)
export const WAVE_SCHEDULE: TWaveEvent[] = [
  // Phase 1: Bats swarm (0-60s) — 시작부터 많이!
  { time: 0, enemyType: 'bat', count: 30, interval: 0.6, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 15, enemyType: 'bat', count: 40, interval: 0.4, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 30, enemyType: 'bat', count: 50, interval: 0.3, hpMultiplier: 1, speedMultiplier: 1.1 },
  { time: 45, enemyType: 'zombie', count: 15, interval: 0.8, hpMultiplier: 1, speedMultiplier: 1 },

  // Phase 2: Bats + Zombies flood (60-180s)
  { time: 60, enemyType: 'bat', count: 60, interval: 0.25, hpMultiplier: 1, speedMultiplier: 1.1 },
  { time: 60, enemyType: 'zombie', count: 30, interval: 0.5, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 90, enemyType: 'bat', count: 70, interval: 0.2, hpMultiplier: 1.1, speedMultiplier: 1.1 },
  { time: 90, enemyType: 'zombie', count: 40, interval: 0.4, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 120, enemyType: 'bat', count: 80, interval: 0.2, hpMultiplier: 1.2, speedMultiplier: 1.2 },
  { time: 120, enemyType: 'zombie', count: 50, interval: 0.3, hpMultiplier: 1.1, speedMultiplier: 1.1 },
  { time: 150, enemyType: 'skeleton', count: 20, interval: 0.6, hpMultiplier: 1, speedMultiplier: 1 },

  // Phase 3: Skeletons + Mummies join (180-300s)
  { time: 180, enemyType: 'skeleton', count: 50, interval: 0.3, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 180, enemyType: 'zombie', count: 60, interval: 0.25, hpMultiplier: 1.2, speedMultiplier: 1.1 },
  { time: 180, enemyType: 'bat', count: 80, interval: 0.15, hpMultiplier: 1.3, speedMultiplier: 1.2 },
  { time: 210, enemyType: 'mummy', count: 20, interval: 0.8, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 240, enemyType: 'mummy', count: 30, interval: 0.5, hpMultiplier: 1.2, speedMultiplier: 1.1 },
  { time: 240, enemyType: 'skeleton', count: 60, interval: 0.2, hpMultiplier: 1.3, speedMultiplier: 1.2 },
  { time: 270, enemyType: 'bat', count: 100, interval: 0.1, hpMultiplier: 1.5, speedMultiplier: 1.3 },

  // Phase 4: Boss #1 + Witches (300s)
  { time: 300, enemyType: 'boss', count: 1, interval: 0, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 300, enemyType: 'witch', count: 25, interval: 0.5, hpMultiplier: 1.5, speedMultiplier: 1.1 },
  { time: 300, enemyType: 'bat', count: 100, interval: 0.1, hpMultiplier: 1.5, speedMultiplier: 1.3 },
  { time: 300, enemyType: 'skeleton', count: 60, interval: 0.2, hpMultiplier: 1.5, speedMultiplier: 1.2 },

  // Phase 5: All enemies chaos (300-480s)
  { time: 360, enemyType: 'bat', count: 120, interval: 0.08, hpMultiplier: 1.8, speedMultiplier: 1.3 },
  { time: 360, enemyType: 'skeleton', count: 80, interval: 0.15, hpMultiplier: 1.8, speedMultiplier: 1.2 },
  { time: 360, enemyType: 'witch', count: 30, interval: 0.5, hpMultiplier: 1.5, speedMultiplier: 1.1 },
  { time: 420, enemyType: 'zombie', count: 100, interval: 0.1, hpMultiplier: 2, speedMultiplier: 1.3 },
  { time: 420, enemyType: 'mummy', count: 50, interval: 0.3, hpMultiplier: 2, speedMultiplier: 1.2 },
  { time: 420, enemyType: 'witch', count: 40, interval: 0.4, hpMultiplier: 2, speedMultiplier: 1.2 },

  // Phase 6: Boss #2 (480s)
  { time: 480, enemyType: 'boss', count: 1, interval: 0, hpMultiplier: 2, speedMultiplier: 1.2 },
  { time: 480, enemyType: 'skeleton', count: 120, interval: 0.08, hpMultiplier: 2.5, speedMultiplier: 1.4 },
  { time: 480, enemyType: 'mummy', count: 60, interval: 0.2, hpMultiplier: 2.5, speedMultiplier: 1.3 },

  // Phase 7: Final Rush (540-600s) — 지옥
  { time: 540, enemyType: 'bat', count: 200, interval: 0.05, hpMultiplier: 3, speedMultiplier: 1.5 },
  { time: 540, enemyType: 'witch', count: 60, interval: 0.2, hpMultiplier: 2.5,
    speedMultiplier: 1.2,
  },
  { time: 540, enemyType: 'mummy', count: 80, interval: 0.1, hpMultiplier: 3, speedMultiplier: 1.4 },
  { time: 540, enemyType: 'skeleton', count: 150, interval: 0.05, hpMultiplier: 3, speedMultiplier: 1.5 },
  { time: 570, enemyType: 'boss', count: 3, interval: 5, hpMultiplier: 3, speedMultiplier: 1.3 },
];
