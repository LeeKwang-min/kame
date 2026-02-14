// Canvas
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 400;

// Player
export const PLAYER_SIZE = 30;
export const PLAYER_X = 120;
export const PLAYER_GROUND_Y = CANVAS_HEIGHT - 80;
export const JUMP_VELOCITY = -550;
export const GRAVITY = 1800;

// Ground
export const GROUND_Y = CANVAS_HEIGHT - 50;
export const GROUND_HEIGHT = 50;

// Scrolling
export const BASE_SPEED = 300;
export const MAX_SPEED = 700;
export const SPEED_INCREASE_RATE = 5;

// Obstacles
export const SPIKE_WIDTH = 30;
export const SPIKE_HEIGHT = 35;
export const BLOCK_WIDTH = 40;
export const BLOCK_HEIGHT = 40;
export const BLOCK_Y_OFFSET = 80;
export const PIT_WIDTH_MIN = 60;
export const PIT_WIDTH_MAX = 100;

// Spawning
export const MIN_OBSTACLE_GAP = 200;
export const MAX_OBSTACLE_GAP = 450;
export const OBSTACLE_GAP_DECREASE_RATE = 3;
export const MIN_GAP_FLOOR = 140;

// Particles
export const PARTICLE_COUNT = 15;
export const PARTICLE_LIFE = 0.6;

// Grid lines
export const GRID_SPACING = 50;

// Colors
export const COLORS = {
  bg: '#1a1a2e',
  ground: '#16213e',
  groundLine: '#0f3460',
  player: '#e94560',
  playerGlow: 'rgba(233, 69, 96, 0.3)',
  spike: '#e94560',
  block: '#533483',
  blockBorder: '#7b5ea7',
  pit: '#0a0a15',
  grid: 'rgba(15, 52, 96, 0.3)',
  particle: '#e94560',
  scoreText: '#ffffff',
  neon: '#00d2ff',
};
