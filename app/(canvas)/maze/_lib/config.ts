import { TDifficulty, TDifficultyConfig } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const HUD_HEIGHT = 40;

export const DIFFICULTIES: Record<TDifficulty, TDifficultyConfig> = {
  easy: { rows: 15, cols: 15, vision: 5, label: 'Easy', multiplier: 1 },
  normal: { rows: 25, cols: 25, vision: 4, label: 'Normal', multiplier: 2 },
  hard: { rows: 35, cols: 35, vision: 3, label: 'Hard', multiplier: 4 },
};

export const DIFFICULTY_ORDER: TDifficulty[] = ['easy', 'normal', 'hard'];

export const MAX_HINTS = 3;
export const REVEAL_DURATION = 5000;

export const WALL_COLOR = '#4a5568';
export const PATH_COLOR = '#1a1a2e';
export const PLAYER_COLOR = '#22d3d3';
export const EXIT_COLOR = '#d946ef';
export const BACKGROUND_COLOR = '#1a1a2e';
export const HUD_TEXT_COLOR = '#FFFFFF';
export const TORCH_DARK_ALPHA = 0.92;

export const TRAIL_COLOR = 'rgba(34, 211, 211, 0.08)';
export const PLAYER_LERP_SPEED = 15;
export const OPTIMAL_PATH_COLOR = 'rgba(74, 222, 128, 0.6)';
export const REPLAY_SPEED = 25;
