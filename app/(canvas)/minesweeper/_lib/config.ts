import { TDifficulty, TDifficultyConfig } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const HUD_HEIGHT = 50;
export const PADDING = 10;

export const DIFFICULTIES: Record<TDifficulty, TDifficultyConfig> = {
  beginner: { rows: 9, cols: 9, mines: 10, label: 'Easy', multiplier: 1 },
  intermediate: {
    rows: 16,
    cols: 16,
    mines: 40,
    label: 'Normal',
    multiplier: 2,
  },
  expert: { rows: 16, cols: 30, mines: 99, label: 'Hard', multiplier: 4 },
};

export const DIFFICULTY_ORDER: TDifficulty[] = [
  'beginner',
  'intermediate',
  'expert',
];

export const NUMBER_COLORS: Record<number, string> = {
  1: '#0000FF',
  2: '#008000',
  3: '#FF0000',
  4: '#000080',
  5: '#800000',
  6: '#008080',
  7: '#000000',
  8: '#808080',
};

export const CELL_HIDDEN_COLOR = '#C0C0C0';
export const CELL_HIDDEN_LIGHT = '#FFFFFF';
export const CELL_HIDDEN_DARK = '#808080';
export const CELL_REVEALED_COLOR = '#BDBDBD';
export const CELL_REVEALED_BORDER = '#7B7B7B';
export const BACKGROUND_COLOR = '#1a1a2e';
export const HUD_TEXT_COLOR = '#FFFFFF';
export const MINE_COLOR = '#000000';
export const FLAG_COLOR = '#FF0000';
export const MINE_HIT_BG = '#FF0000';
