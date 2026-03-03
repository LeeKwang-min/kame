import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'kracing',
  title: 'K-Racing',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'arcade',
  difficulty: 'fixed',
};

// Canvas
export const CANVAS_SIZE = 620;

// Car physics
export const CAR_WIDTH = 12;
export const CAR_HEIGHT = 20;
export const MAX_SPEED = 200;
export const ACCELERATION = 120;
export const BRAKE_DECELERATION = 300;
export const NATURAL_DECELERATION = 30;
export const TURN_SPEED = 3.0;
export const MIN_TURN_SPEED_RATIO = 0.2;

// Drift
export const DRIFT_TURN_MULTIPLIER = 1.5;
export const DRIFT_BOOST_MULTIPLIER = 1.1;
export const DRIFT_BOOST_DURATION = 0.5;
export const DRIFT_TRAIL_MAX = 60;

// Track
export const TRACK_WIDTH = 70;
export const TRACK_CENTER_X = 310;
export const TRACK_CENTER_Y = 310;
export const TRACK_RADIUS_X = 220;
export const TRACK_RADIUS_Y = 170;
export const TRACK_SEGMENTS = 120;

// Wall collision
export const WALL_SPEED_REDUCTION = 0.3;
export const WALL_PUSH_DISTANCE = 3;

// Game
export const TOTAL_LAPS = 3;
export const COUNTDOWN_SECONDS = 3;

// Camera
export const CAMERA_ZOOM = 2.0;

// Minimap
export const MINIMAP_SIZE = 100;
export const MINIMAP_MARGIN = 10;

// Colors
export const COLORS = {
  background: '#1a1a2e',
  track: '#3a3a4a',
  trackBorder: '#ffffff',
  startLine: '#ffffff',
  curb: '#cc3333',
  curbWhite: '#ffffff',
  grass: '#2a5a2a',
  car: '#e74c3c',
  carWindshield: '#7ec8e3',
  carTire: '#222222',
  driftTrail: 'rgba(40, 40, 40, 0.4)',
  speedGauge: '#00ff99',
  speedGaugeBg: 'rgba(255, 255, 255, 0.15)',
  hudText: '#ffffff',
  minimap: 'rgba(0, 0, 0, 0.5)',
  minimapTrack: 'rgba(255, 255, 255, 0.4)',
  minimapCar: '#ff4444',
  countdown: '#ffffff',
};
