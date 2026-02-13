// Canvas
export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 600;

// Player
export const PLAYER_RADIUS = 12;
export const PLAYER_SPEED = 200;
export const PLAYER_COLOR = '#00d4ff';
export const PLAYER_MAX_HP = 3;
export const DASH_SPEED_MULTIPLIER = 3;
export const DASH_DURATION = 0.2;
export const DASH_COOLDOWN = 1.5;
export const HIT_INVINCIBLE_DURATION = 1.0;

// Boss
export const BOSS_X = CANVAS_WIDTH / 2;
export const BOSS_Y = 80;
export const BOSS_RADIUS = 40;
export const BOSS_COLOR = '#8b0000';
export const BOSS_ROTATION_SPEED = 0.3;
export const BOSS_MOVE_SPEED = 35;

// Attack scheduling
export const BASE_ATTACK_INTERVAL = 3.0;
export const MIN_ATTACK_INTERVAL = 1.5;
export const ATTACK_INTERVAL_DECREASE_RATE = 0.02;

// Pattern tiers (unlock time in seconds)
export const TIER_BASIC_TIME = 0;
export const TIER_MID_TIME = 15;
export const TIER_ADVANCED_TIME = 30;
export const TIER_EXTREME_TIME = 60;

// Projectile defaults
export const BULLET_RADIUS = 5;
export const BULLET_COLOR = '#ff4444';

// Visual
export const BG_COLOR = '#111118';
export const GRID_COLOR = 'rgba(255,255,255,0.03)';
export const GRID_SPACING = 40;

// Sprites
export const PLAYER_SPRITE_SIZE = 16;
export const PLAYER_RENDER_SIZE = 48;
export const PLAYER_ANIM_SPEED = 8;

export const BOSS_FRAME_W = 82;
export const BOSS_FRAME_H = 82;
export const BOSS_FRAME_COUNT = 10;
export const BOSS_RENDER_SIZE = 96;
export const BOSS_ANIM_SPEED = 8;

export const SHURIKEN_RENDER_SIZE = 24;

export const GRASS_TILE_SIZE = 32;
export const GRASS_TILE_RENDER_SIZE = 64;

// HUD
export const HP_HEART_SIZE = 20;
export const HP_HEART_GAP = 6;
export const HP_HEART_Y = 20;
export const HP_HEART_X = 20;
