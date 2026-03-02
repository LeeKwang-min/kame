import { TGameMeta } from '@/@types/game-meta';
import { TProducerDef, TRecipeDef } from './types';

export const GAME_META: TGameMeta = {
  id: 'cookiebakery',
  title: '쿠키 공장',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'idle',
  difficulty: 'progressive',
};

export const CANVAS_SIZE = 620;
export const GAME_DURATION = 600;

export const COLORS = {
  bg: '#0f1923',
  gold: '#FFD700',
  goldDark: '#B8860B',
  text: '#ffffff',
  textDim: '#8899aa',
  panelBg: '#1a2a3a',
  panelBorder: '#2a3a4a',
  buyable: '#2ecc71',
  locked: '#555555',
  tapArea: '#162636',
  tapAreaBorder: '#2a4a6a',
  upgradeBtn: '#8b5cf6',
  upgradeBtnDim: '#4a3a6a',
  cookie: '#D2691E',
  cookieDark: '#8B4513',
  recipeBar: '#e67e22',
  recipeBarBg: '#1a2a3a',
  prestigeBtn: '#e74c3c',
  prestigeBtnDim: '#6a2a2a',
};

export const PRODUCERS: TProducerDef[] = [
  { id: 'cursor', name: '커서', icon: '\u{1F446}', baseCost: 15, baseProduction: 0.1 },
  { id: 'grandma', name: '할머니', icon: '\u{1F475}', baseCost: 100, baseProduction: 1 },
  { id: 'oven', name: '오븐', icon: '\u{1F525}', baseCost: 500, baseProduction: 8 },
  { id: 'factory', name: '공장', icon: '\u{1F3ED}', baseCost: 3000, baseProduction: 47 },
  { id: 'bank', name: '은행', icon: '\u{1F3E6}', baseCost: 20000, baseProduction: 260 },
  { id: 'franchise', name: '프랜차이즈', icon: '\u{1F30D}', baseCost: 150000, baseProduction: 1400 },
];

export const RECIPES: TRecipeDef[] = [
  { milestone: 100, name: '초코칩', multiplier: 1.2 },
  { milestone: 1000, name: '바닐라', multiplier: 1.4 },
  { milestone: 10000, name: '마카롱', multiplier: 1.6 },
  { milestone: 50000, name: '크루아상', multiplier: 1.8 },
  { milestone: 200000, name: '티라미수', multiplier: 2.0 },
  { milestone: 1000000, name: '도넛', multiplier: 2.5 },
  { milestone: 5000000, name: '웨딩케이크', multiplier: 3.0 },
  { milestone: 20000000, name: '황금쿠키', multiplier: 4.0 },
];

export const PRICE_MULTIPLIER = 1.15;
export const TAP_UPGRADE_BASE_COST = 50;
export const TAP_UPGRADE_COST_MULTIPLIER = 3;

export const LAYOUT = {
  headerHeight: 50,
  tapAreaTop: 55,
  tapAreaHeight: 200,
  recipeBarTop: 260,
  recipeBarHeight: 25,
  statsBarTop: 290,
  statsBarHeight: 25,
  producerListTop: 320,
  producerRowHeight: 45,
  upgradeBarTop: 565,
  upgradeBarHeight: 50,
};
