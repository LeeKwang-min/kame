import { TGameMeta } from '@/@types/game-meta';
import { TBpmPhase } from './types';

export const GAME_META: TGameMeta = {
  id: 'rhythmbeat',
  title: '리듬 비트',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'reflex',
  difficulty: 'progressive',
};

export const CANVAS_WIDTH = 400;
export const MIN_CANVAS_HEIGHT = 600;
export const MAX_CANVAS_HEIGHT = 900;

export const LANE_COUNT = 4;
export const LANE_COLORS = ['#00f5ff', '#ff00ff', '#ffff00', '#00ff88'] as const;
export const LANE_KEYS = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'] as const;
export const LANE_LABELS = ['D', 'F', 'J', 'K'] as const;

export const NOTE_HEIGHT = 20;
export const NOTE_SPEED = 400;

export const JUDGE_PERFECT = 30;
export const JUDGE_GREAT = 60;
export const JUDGE_GOOD = 100;

export const JUDGE_LINE_OFFSET = 80;

export const SCORE_PERFECT = 300;
export const SCORE_GREAT = 200;
export const SCORE_GOOD = 100;

export const HP_MAX = 100;
export const HP_PERFECT = 3;
export const HP_GREAT = 1;
export const HP_GOOD = -2;
export const HP_MISS = -10;

export const BPM_PHASES: TBpmPhase[] = [
  { startTime: 0, endTime: 30, bpm: 100, maxDifficulty: 1, name: 'Warm Up' },
  { startTime: 30, endTime: 60, bpm: 115, maxDifficulty: 2, name: 'Build Up' },
  { startTime: 60, endTime: 90, bpm: 100, maxDifficulty: 1, name: 'Rest' },
  { startTime: 90, endTime: 130, bpm: 130, maxDifficulty: 3, name: 'Intensity' },
  { startTime: 130, endTime: 150, bpm: 115, maxDifficulty: 1, name: 'Rest' },
  { startTime: 150, endTime: 200, bpm: 145, maxDifficulty: 3, name: 'Peak' },
  { startTime: 200, endTime: 220, bpm: 130, maxDifficulty: 1, name: 'Rest' },
  { startTime: 220, endTime: Infinity, bpm: 160, maxDifficulty: 3, name: 'Endless' },
];

export const BPM_MAX = 200;
export const BPM_ENDLESS_INCREASE_PER_SEC = 0.2;

export const HIT_AREA_HEIGHT = 60;
export const TOUCH_AREA_RATIO = 0.25;
