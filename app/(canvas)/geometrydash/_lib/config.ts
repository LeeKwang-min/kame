import { TPattern } from './types';

// Canvas
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 400;

// Player
export const PLAYER_SIZE = 28;
export const PLAYER_X = 120;
export const PLAYER_GROUND_Y = CANVAS_HEIGHT - 78;
export const JUMP_VELOCITY = -520;
export const JUMPPAD_VELOCITY = -720;
export const GRAVITY = 1600;

// Ground
export const GROUND_Y = CANVAS_HEIGHT - 50;
export const GROUND_HEIGHT = 50;

// Scrolling
export const BASE_SPEED = 220;
export const MAX_SPEED = 500;
export const SPEED_INCREASE_RATE = 3;

// Obstacles
export const SPIKE_WIDTH = 28;
export const SPIKE_HEIGHT = 28;

// Platform blocks
export const PLATFORM_WIDTH = 80;
export const PLATFORM_HEIGHT = 28;
export const PLATFORM_ELEVATION = 70;

// Jump pads
export const JUMPPAD_WIDTH = 30;
export const JUMPPAD_HEIGHT = 12;

// Pits
export const PIT_WIDTH = 70;

// Spawning
export const PATTERN_GAP_MIN = 250;
export const PATTERN_GAP_MAX = 400;
export const PATTERN_GAP_DECREASE_RATE = 2;
export const PATTERN_GAP_FLOOR = 200;

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
  platform: '#2a5298',
  platformBorder: '#4a7ac7',
  platformTop: '#5a8ad7',
  jumppad: '#ffd700',
  jumppadGlow: 'rgba(255, 215, 0, 0.4)',
  jumppadTriggered: '#ffaa00',
  pit: '#0a0a15',
  grid: 'rgba(15, 52, 96, 0.3)',
  particle: '#e94560',
  scoreText: '#ffffff',
  neon: '#00d2ff',
};

// ---- PATTERNS ----
// difficulty 1 = easy, 2 = medium, 3 = hard
// offsetX is relative to pattern start

export const PATTERNS: TPattern[] = [
  // === DIFFICULTY 1: Easy patterns ===
  // Single spike
  {
    difficulty: 1,
    totalWidth: 60,
    elements: [{ type: 'spike', offsetX: 0 }],
  },
  // Double spike with gap
  {
    difficulty: 1,
    totalWidth: 120,
    elements: [
      { type: 'spike', offsetX: 0 },
      { type: 'spike', offsetX: 60 },
    ],
  },
  // Single platform (step up)
  {
    difficulty: 1,
    totalWidth: 100,
    elements: [{ type: 'platform', offsetX: 0, width: 100 }],
  },
  // Single jump pad
  {
    difficulty: 1,
    totalWidth: 60,
    elements: [{ type: 'jumppad', offsetX: 0 }],
  },
  // Small pit
  {
    difficulty: 1,
    totalWidth: 70,
    elements: [{ type: 'pit', offsetX: 0, width: 70 }],
  },

  // === DIFFICULTY 2: Medium patterns ===
  // Triple spike
  {
    difficulty: 2,
    totalWidth: 160,
    elements: [
      { type: 'spike', offsetX: 0 },
      { type: 'spike', offsetX: 40 },
      { type: 'spike', offsetX: 80 },
    ],
  },
  // Platform with spike on top
  {
    difficulty: 2,
    totalWidth: 120,
    elements: [
      { type: 'platform', offsetX: 0, width: 120 },
      { type: 'spike-on-platform', offsetX: 45 },
    ],
  },
  // Jump pad then high spike (need the pad to clear it)
  {
    difficulty: 2,
    totalWidth: 180,
    elements: [
      { type: 'jumppad', offsetX: 0 },
      { type: 'spike', offsetX: 100 },
      { type: 'spike', offsetX: 140 },
    ],
  },
  // Pit with spike after
  {
    difficulty: 2,
    totalWidth: 150,
    elements: [
      { type: 'pit', offsetX: 0, width: 70 },
      { type: 'spike', offsetX: 100 },
    ],
  },
  // Platform step then spike
  {
    difficulty: 2,
    totalWidth: 200,
    elements: [
      { type: 'platform', offsetX: 0, width: 80 },
      { type: 'spike', offsetX: 130 },
      { type: 'spike', offsetX: 170 },
    ],
  },

  // === DIFFICULTY 3: Hard patterns ===
  // Jump pad to platform with spike
  {
    difficulty: 3,
    totalWidth: 250,
    elements: [
      { type: 'jumppad', offsetX: 0 },
      { type: 'platform', offsetX: 100, width: 100 },
      { type: 'spike-on-platform', offsetX: 130 },
    ],
  },
  // Pit + spike + pit combo
  {
    difficulty: 3,
    totalWidth: 250,
    elements: [
      { type: 'pit', offsetX: 0, width: 70 },
      { type: 'spike', offsetX: 100 },
      { type: 'pit', offsetX: 160, width: 70 },
    ],
  },
  // Triple spike then platform
  {
    difficulty: 3,
    totalWidth: 280,
    elements: [
      { type: 'spike', offsetX: 0 },
      { type: 'spike', offsetX: 35 },
      { type: 'spike', offsetX: 70 },
      { type: 'platform', offsetX: 150, width: 100 },
    ],
  },
  // Jump pad to high platform
  {
    difficulty: 3,
    totalWidth: 200,
    elements: [
      { type: 'jumppad', offsetX: 0 },
      { type: 'platform', offsetX: 80, width: 100, height: 28, offsetY: -140 },
    ],
  },
  // Spike gauntlet
  {
    difficulty: 3,
    totalWidth: 220,
    elements: [
      { type: 'spike', offsetX: 0 },
      { type: 'spike', offsetX: 50 },
      { type: 'spike', offsetX: 100 },
      { type: 'spike', offsetX: 150 },
    ],
  },
];
