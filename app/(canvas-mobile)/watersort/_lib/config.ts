import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'watersort',
  title: '워터 소트',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'puzzle',
  difficulty: 'progressive',
};

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 700;

export const SLOTS_PER_BOTTLE = 4;
export const EXTRA_BOTTLES = 2;

// 레벨별 색상 수: 레벨 1=2색, 2=3색, ... 최대 10색
export const getColorsForLevel = (level: number): number =>
  Math.min(level + 1, 10);

// 레벨별 비커 수 = 색상 수 + 빈 비커 2개
export const getBottleCountForLevel = (level: number): number =>
  getColorsForLevel(level) + EXTRA_BOTTLES;

// 색상 팔레트 (최대 10색)
export const COLORS = [
  '#FF6B6B', // 빨강
  '#4ECDC4', // 청록
  '#45B7D1', // 하늘
  '#96CEB4', // 민트
  '#FFEAA7', // 노랑
  '#DDA0DD', // 자주
  '#98D8C8', // 연두
  '#F7DC6F', // 금색
  '#BB8FCE', // 보라
  '#85C1E9', // 파랑
];

// 비커 렌더링 상수
export const BOTTLE_WIDTH = 50;
export const BOTTLE_HEIGHT = 140;
export const BOTTLE_GAP = 16;
export const BOTTLE_INNER_PADDING = 6;
export const SLOT_HEIGHT = 28;
export const BOTTLE_RADIUS = 8;
export const MAX_COLS = 5;
