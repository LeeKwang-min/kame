import { TGameMeta } from '@/@types/game-meta';
import { TProducerDef } from './types';

export const GAME_META: TGameMeta = {
  id: 'tapempire',
  title: '탭 제국',
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
};

export const PRODUCERS: TProducerDef[] = [
  { id: 'miner', name: '광부', icon: '⛏', baseCost: 15, baseProduction: 1 },
  { id: 'farm', name: '농장', icon: '🌾', baseCost: 100, baseProduction: 5 },
  { id: 'forge', name: '대장간', icon: '🔨', baseCost: 500, baseProduction: 20 },
  { id: 'market', name: '시장', icon: '🏪', baseCost: 2500, baseProduction: 100 },
  { id: 'castle', name: '성', icon: '🏰', baseCost: 15000, baseProduction: 500 },
  { id: 'dragon', name: '용', icon: '🐉', baseCost: 100000, baseProduction: 3000 },
];

export const PRICE_MULTIPLIER = 1.15;
export const UPGRADE_COST_MULTIPLIER = 10;
export const TAP_UPGRADE_BASE_COST = 50;
export const TAP_UPGRADE_COST_MULTIPLIER = 3;

export const LAYOUT = {
  headerHeight: 50,
  tapAreaTop: 55,
  tapAreaHeight: 200,
  statsBarTop: 260,
  statsBarHeight: 30,
  producerListTop: 295,
  producerRowHeight: 45,
  upgradeBarTop: 570,
  upgradeBarHeight: 45,
};
