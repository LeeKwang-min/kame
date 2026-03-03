// Canvas
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;

// Player
export const PLAYER_WIDTH = 20;
export const PLAYER_HEIGHT = 24;
export const PLAYER_SPEED = 250;
export const PLAYER_MAX_HP = 3;
export const PLAYER_MAX_AMMO = 8;
export const JUMP_VELOCITY = -400;
export const STOMP_BOUNCE = -350;
export const GRAVITY = 800;
export const INVINCIBLE_DURATION = 1.5;

// Bullets
export const BULLET_WIDTH = 6;
export const BULLET_HEIGHT = 12;
export const BULLET_SPEED = 500;

// Platforms
export const PLATFORM_HEIGHT = 12;
export const PLATFORM_MIN_WIDTH = 60;
export const PLATFORM_MAX_WIDTH = 140;
export const PLATFORM_SPACING_Y = 80;
export const WALL_WIDTH = 20;

// Enemies
export const ENEMY_SIZE = 20;
export const ENEMY_SPEED = 60;
export const ENEMY_SPAWN_CHANCE = 0.4;
export const FLYER_CHANCE = 0.2;
export const ENEMY_KILL_SCORE = 50;

// Scrolling
export const BASE_SCROLL_SPEED = 60;
export const MAX_SCROLL_SPEED = 200;
export const SCROLL_SPEED_INCREASE = 1;

// Particles
export const PARTICLE_COUNT = 10;
export const PARTICLE_LIFE = 0.4;

// Scoring
export const DEPTH_SCORE_RATE = 10;

// Colors
export const COLORS = {
  bg: '#0a0a0a',
  wall: '#2a2a2a',
  wallBorder: '#3a3a3a',
  platform: '#f0f0f0',
  player: '#f0f0f0',
  playerDamaged: '#ff4444',
  bullet: '#ffdd00',
  bulletFlash: 'rgba(255, 221, 0, 0.3)',
  enemyWalker: '#e94560',
  enemyFlyer: '#d946ef',
  hp: '#e94560',
  hpEmpty: '#333333',
  ammo: '#ffdd00',
  ammoEmpty: '#333333',
  particle: '#f0f0f0',
  scoreText: '#ffffff',
  depthText: '#888888',
};
