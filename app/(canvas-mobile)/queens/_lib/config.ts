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

// 캔디 파스텔 영역 색상 (최대 9개 영역)
export const REGION_COLORS = [
  '#FFB3D9', // 캔디 핑크
  '#B3E8FF', // 스카이 블루
  '#C8F7C5', // 민트 그린
  '#FFE0B2', // 피치 오렌지
  '#D4B3FF', // 라벤더
  '#FFF3B0', // 레몬 옐로우
  '#FFB3B3', // 코랄 핑크
  '#B3FFE0', // 아쿠아 민트
  '#E8C8FF', // 라일락
];

// UI 색상
export const COLORS = {
  canvasBg: '#FFF8F0',
  hudBg: '#FFF0E6',
  hudSeparator: 'rgba(180,140,200,0.3)',
  textPrimary: '#4A3B5C',
  textSecondary: 'rgba(74,59,92,0.5)',
  accent: '#FF6B9D',
  accentBg: 'rgba(255,107,157,0.15)',
  accentBorder: 'rgba(255,107,157,0.4)',
  error: '#FF4466',
  hint: '#6C5CE7',
  cellBorder: 'rgba(180,140,200,0.2)',
  regionBorder: 'rgba(120,80,160,0.4)',
  cardBg: '#FFFFFF',
  cardBorder: 'rgba(180,140,200,0.3)',
  cardHoverBorder: '#FF6B9D',
  cardShadow: 'rgba(180,140,200,0.15)',
  inactiveBg: 'rgba(180,140,200,0.08)',
  inactiveBorder: 'rgba(180,140,200,0.2)',
  inactiveText: 'rgba(74,59,92,0.3)',
} as const;
