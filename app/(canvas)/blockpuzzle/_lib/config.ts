import { TBlockShape } from './types';

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 700;

export const GRID_SIZE = 8;
export const CELL_SIZE = 56;
export const GRID_PADDING = 16;
export const GRID_OFFSET_X = (CANVAS_WIDTH - GRID_SIZE * CELL_SIZE - GRID_PADDING * 2) / 2;
export const GRID_OFFSET_Y = 70;
export const GRID_WIDTH = GRID_SIZE * CELL_SIZE + GRID_PADDING * 2;
export const GRID_HEIGHT = GRID_SIZE * CELL_SIZE + GRID_PADDING * 2;

export const BLOCK_AREA_Y = GRID_OFFSET_Y + GRID_HEIGHT + 20;
export const BLOCK_PREVIEW_SCALE = 0.5;
export const BLOCK_AREA_HEIGHT = CANVAS_HEIGHT - BLOCK_AREA_Y;

export const CLEAR_ANIMATION_DURATION = 0.3;
export const PLACE_ANIMATION_DURATION = 0.15;

export const SCORE_PER_CELL = 1;
export const SCORE_PER_LINE = 10;
export const COMBO_BONUS = [0, 0, 5, 15, 30, 50, 70, 100];

export const BLOCK_COLORS = [
  '#e74c3c',
  '#e67e22',
  '#f1c40f',
  '#2ecc71',
  '#3498db',
  '#2c3e7a',
  '#9b59b6',
];

export const BLOCK_SHAPES: TBlockShape[] = [
  [[1]],
  [[1, 1]],
  [[1, 1, 1]],
  [[1, 1, 1, 1]],
  [[1, 1, 1, 1, 1]],
  [[1], [1]],
  [[1], [1], [1]],
  [[1], [1], [1], [1]],
  [[1], [1], [1], [1], [1]],
  [[1, 1], [1, 1]],
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
  [[1, 0], [1, 0], [1, 1]],
  [[0, 1], [0, 1], [1, 1]],
  [[1, 1, 1], [0, 1, 0]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
  [[1, 1], [1, 0], [1, 0]],
  [[1, 1], [0, 1], [0, 1]],
  [[0, 1, 0], [1, 1, 1]],
];
