import { TGameMeta } from '@/@types/game-meta';
import { TDifficulty, TDifficultyConfig } from './types';

export const GAME_META: TGameMeta = {
  id: 'queens',
  title: 'Queens',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'puzzle',
  difficulty: 'selectable',
};

export const CANVAS_WIDTH = 620;
export const CANVAS_HEIGHT = 700;

export const HUD_HEIGHT = 80;
export const GRID_PADDING = 20;
export const HINT_PENALTY_SECONDS = 30;

export const DIFFICULTY_CONFIG: Record<TDifficulty, TDifficultyConfig> = {
  easy: { size: 5, baseTime: 120, multiplier: 1, hints: 3 },
  normal: { size: 7, baseTime: 300, multiplier: 2, hints: 2 },
  hard: { size: 9, baseTime: 600, multiplier: 3, hints: 1 },
};

// 파스텔 톤 영역 색상 (최대 9개 영역)
export const REGION_COLORS = [
  '#A8D8EA', // 하늘
  '#FFB7B2', // 핑크
  '#B5EAD7', // 민트
  '#FFDAC1', // 살구
  '#E2B6CF', // 라벤더
  '#C7CEEA', // 퍼플블루
  '#F3E8A3', // 레몬
  '#D4A5A5', // 로즈
  '#A0E7E5', // 틸
];
