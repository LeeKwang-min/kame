import { TGameMeta } from '@/@types/game-meta';
import { TBuildingDef, TResourceDef, TTechDef, TRandomEvent } from './types';

export const GAME_META: TGameMeta = {
  id: 'spacecolony',
  title: '우주 식민지',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'idle',
  difficulty: 'progressive',
};

export const CANVAS_SIZE = 620;
export const GAME_DURATION = 600;
export const STARTING_GOLD = 500;

export const COLORS = {
  bg: '#0a0e1a',
  headerBg: '#111828',
  panelBg: '#1a2235',
  panelBorder: '#2a3a50',
  text: '#ffffff',
  textDim: '#7888a0',
  gold: '#FFD700',
  goldDark: '#B8860B',
  oxygen: '#3498db',
  energy: '#f1c40f',
  food: '#2ecc71',
  warning: '#e67e22',
  critical: '#e74c3c',
  buyable: '#2ecc71',
  locked: '#555555',
  tabActive: '#3498db',
  tabInactive: '#1a2a3a',
  techUnlocked: '#8b5cf6',
  techLocked: '#2a3a4a',
  eventBg: '#1a1a2e',
  positive: '#2ecc71',
  negative: '#e74c3c',
};

export const RESOURCES: TResourceDef[] = [
  { id: 'oxygen', name: '산소', icon: 'O\u2082', starting: 50, max: 100, decayPerPerson: 0.5, color: COLORS.oxygen },
  { id: 'energy', name: '에너지', icon: '\u26A1', starting: 50, max: 100, decayPerPerson: 0.3, color: COLORS.energy },
  { id: 'food', name: '식량', icon: '\uD83C\uDF3E', starting: 50, max: 100, decayPerPerson: 0.4, color: COLORS.food },
];

export const BUILDINGS: TBuildingDef[] = [
  { id: 'solar', name: '태양광', icon: '\u2600\uFE0F', baseCost: 100, workersNeeded: 1, effectPerLevel: 2, effectType: 'energy', maxLevel: 5, workerPerLevel: true },
  { id: 'o2gen', name: '산소발생기', icon: '\uD83D\uDCA8', baseCost: 100, workersNeeded: 1, effectPerLevel: 2, effectType: 'oxygen', maxLevel: 5, workerPerLevel: true },
  { id: 'farm', name: '농장', icon: '\uD83C\uDF3E', baseCost: 100, workersNeeded: 1, effectPerLevel: 2, effectType: 'food', maxLevel: 5, workerPerLevel: true },
  { id: 'dome', name: '거주돔', icon: '\uD83C\uDFE0', baseCost: 500, workersNeeded: 0, effectPerLevel: 10, effectType: 'popcap', maxLevel: 3, workerPerLevel: false },
  { id: 'lab', name: '연구소', icon: '\uD83D\uDD2C', baseCost: 1000, workersNeeded: 2, effectPerLevel: 1, effectType: 'research', maxLevel: 3, workerPerLevel: true },
  { id: 'miner', name: '광물채굴', icon: '\u26CF', baseCost: 300, workersNeeded: 1, effectPerLevel: 5, effectType: 'gold', maxLevel: 5, workerPerLevel: true },
  { id: 'shield', name: '방어막', icon: '\uD83D\uDEE1', baseCost: 2000, workersNeeded: 0, effectPerLevel: 1, effectType: 'shield', maxLevel: 1, workerPerLevel: false },
  { id: 'port', name: '우주항구', icon: '\uD83D\uDE80', baseCost: 5000, workersNeeded: 3, effectPerLevel: 20, effectType: 'allboost', maxLevel: 1, workerPerLevel: false },
];

export const TECHS: TTechDef[] = [
  { id: 'efficiency1', name: '효율 I', rpCost: 50, description: '모든 건물 생산 +20%' },
  { id: 'automation', name: '자동화', rpCost: 100, description: '건물 필요 인력 -1 (최소 0)' },
  { id: 'efficiency2', name: '효율 II', rpCost: 200, description: '모든 건물 생산 +40%' },
  { id: 'terraforming', name: '테라포밍', rpCost: 300, description: '자원 소모 -50%' },
  { id: 'quantum', name: '양자 컴퓨터', rpCost: 500, description: '연구 속도 x2' },
];

export const RANDOM_EVENTS: TRandomEvent[] = [
  { id: 'meteor', name: '운석 충돌', type: 'negative' },
  { id: 'trade', name: '무역선 도착', type: 'positive' },
  { id: 'immigrants', name: '이민선 도착', type: 'positive' },
  { id: 'solarstorm', name: '태양 폭풍', type: 'negative' },
  { id: 'harvest', name: '풍작', type: 'positive' },
];

export const EVENT_INTERVAL_MIN = 40;
export const EVENT_INTERVAL_MAX = 60;

export const POP_GROWTH_INTERVAL = 15;
export const POP_SHRINK_INTERVAL = 10;
export const STARTING_POPULATION = 5;
export const BASE_POP_CAP = 10;

export const LAYOUT = {
  headerHeight: 50,
  resourceBarsTop: 55,
  resourceBarsHeight: 80,
  colonyViewTop: 140,
  colonyViewHeight: 130,
  eventLogTop: 275,
  eventLogHeight: 25,
  tabAreaTop: 305,
  tabAreaHeight: 35,
  listAreaTop: 345,
  listAreaHeight: 270,
};
