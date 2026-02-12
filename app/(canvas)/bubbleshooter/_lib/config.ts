// Canvas
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 640;

// Bubble
export const BUBBLE_RADIUS = 16;
export const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2;
export const BUBBLE_SPEED = 600;

// Grid
export const GRID_COLS = 15;
export const INITIAL_ROWS = 7;
export const ROW_HEIGHT = BUBBLE_RADIUS * Math.sqrt(3); // ~27.7px (hex row spacing)
export const GRID_LEFT = BUBBLE_RADIUS; // first bubble center x offset

// Colors (6 bubble colors)
export const BUBBLE_COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f1c40f', // yellow
  '#9b59b6', // purple
  '#e67e22', // orange
];

// Scoring
export const SCORE_PER_POP = 10;
export const SCORE_PER_DROP = 30;
export const COMBO_MULTIPLIER = 1.5;
export const CLEAR_BONUS = 500;

// Gameplay
export const MISS_LIMIT = 3; // misses before ceiling drops
export const DEADLINE_Y = CANVAS_HEIGHT - 100; // game over line
export const LAUNCHER_Y = CANVAS_HEIGHT - 50; // launcher position
export const LAUNCHER_X = CANVAS_WIDTH / 2;

// Animation
export const POP_ANIMATION_DURATION = 300; // ms
export const DROP_GRAVITY = 800; // px/s^2

// Aim
export const AIM_LINE_LENGTH = 120;
export const MIN_ANGLE = Math.PI * 0.05; // minimum angle from horizontal
export const MAX_ANGLE = Math.PI * 0.95; // maximum angle from horizontal
