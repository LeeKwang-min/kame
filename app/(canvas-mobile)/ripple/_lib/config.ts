import { TGameMeta } from '@/@types/game-meta';
import { TDifficulty, TDifficultyConfig } from './types';

export const GAME_META: TGameMeta = {
  id: 'ripple',
  title: '리플',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'puzzle',
  difficulty: 'progressive',
};

export const CANVAS_WIDTH = 620;
export const CANVAS_HEIGHT = 700;

export const HUD_HEIGHT = 80;
export const GRID_PADDING = 20;
export const HINT_PENALTY_SECONDS = 30;

export const RIPPLE_VALUES = [3, 2, 1] as const;
export const RIPPLE_MAX_DISTANCE = RIPPLE_VALUES.length - 1;

export const DIFFICULTY_CONFIG: Record<TDifficulty, TDifficultyConfig> = {
  easy: {
    size: 5,
    stones: [2, 3],
    hintRatio: [0.6, 0.7],
    baseTime: 60,
    multiplier: 1,
    hints: 3,
    maxAttempts: 200,
  },
  normal: {
    size: 6,
    stones: [3, 4],
    hintRatio: [0.45, 0.55],
    baseTime: 120,
    multiplier: 2,
    hints: 2,
    maxAttempts: 500,
  },
  hard: {
    size: 7,
    stones: [4, 6],
    hintRatio: [0.3, 0.4],
    baseTime: 180,
    multiplier: 3,
    hints: 1,
    maxAttempts: 1000,
  },
  expert: {
    size: [8, 9],
    stones: [5, 8],
    hintRatio: [0.2, 0.3],
    baseTime: 300,
    multiplier: 5,
    hints: 1,
    maxAttempts: 2000,
  },
};

export function getStageDifficulty(stage: number): TDifficulty {
  if (stage <= 20) return 'easy';
  if (stage <= 50) return 'normal';
  if (stage <= 100) return 'hard';
  return 'expert';
}

export const COLORS = {
  canvasBg: '#F0F8FF',
  hudBg: '#E6F2FF',
  gridBg: '#FFFFFF',
  text: '#2C3E6B',
  textLight: '#6B85B0',
  textWhite: '#FFFFFF',
  accent: '#4A90D9',
  accentLight: '#7BB3E8',
  accentDark: '#2E6AB0',
  error: '#FF6B6B',
  errorLight: '#FFE0E0',
  success: '#4ECDC4',
  successLight: '#E0FFF8',
  hint: '#9B59B6',
  cellBorder: '#D0E0F0',
  cellHover: '#E8F4FD',
  cellRevealed: '#F5FAFF',
  cellEmpty: '#FAFEFF',
  stone: '#3A7BD5',
  stoneHighlight: '#5A9BE5',
  ripple1: 'rgba(74, 144, 217, 0.3)',
  ripple2: 'rgba(74, 144, 217, 0.15)',
  buttonBg: '#4A90D9',
  buttonText: '#FFFFFF',
  buttonDisabled: '#B0C4DE',
} as const;
