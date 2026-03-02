import { TGameMeta } from '@/@types/game-meta';
import { TResourceBuildingDef, TRecipeDef, TShopUpgradeDef } from './types';

export const GAME_META: TGameMeta = {
  id: 'dungeonmerchant',
  title: '던전 상인',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'idle',
  difficulty: 'progressive',
};

export const CANVAS_SIZE = 620;
export const GAME_DURATION = 600;
export const STARTING_GOLD = 200;

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
  iron: '#b0c4de',
  wood: '#deb887',
  gem: '#e066ff',
  craftProgress: '#3b82f6',
  craftProgressBg: '#1e3a5f',
  tabActive: '#2a4a6a',
  tabInactive: '#162636',
  shopBg: '#1a2535',
  shopFloor: '#2a1a0a',
  adventurer: '#4ade80',
  speechBubble: '#ffffff',
};

export const RESOURCE_BUILDINGS: TResourceBuildingDef[] = [
  {
    id: 'mine',
    name: '광산',
    icon: '\u26CF',
    baseCost: 50,
    baseProduction: 1,
    costMult: 1.5,
    resourceType: 'iron',
    maxLevel: 5,
  },
  {
    id: 'lumber',
    name: '벌목장',
    icon: '\uD83E\uDE93',
    baseCost: 50,
    baseProduction: 1,
    costMult: 1.5,
    resourceType: 'wood',
    maxLevel: 5,
  },
  {
    id: 'gemmine',
    name: '보석광산',
    icon: '\uD83D\uDC8E',
    baseCost: 200,
    baseProduction: 0.3,
    costMult: 1.8,
    resourceType: 'gem',
    maxLevel: 5,
  },
];

export const RECIPES: TRecipeDef[] = [
  {
    id: 'dagger',
    name: '단검',
    icon: '\uD83D\uDDE1',
    materials: { iron: 5 },
    sellPrice: 50,
    craftTime: 3,
  },
  {
    id: 'shield',
    name: '방패',
    icon: '\uD83D\uDEE1',
    materials: { iron: 3, wood: 5 },
    sellPrice: 80,
    craftTime: 4,
  },
  {
    id: 'bow',
    name: '활',
    icon: '\uD83C\uDFF9',
    materials: { wood: 8 },
    sellPrice: 70,
    craftTime: 3,
  },
  {
    id: 'wand',
    name: '마법봉',
    icon: '\uD83E\uDE84',
    materials: { wood: 3, gem: 2 },
    sellPrice: 150,
    craftTime: 5,
  },
  {
    id: 'armor',
    name: '갑옷',
    icon: '\uD83D\uDEE1',
    materials: { iron: 10, gem: 1 },
    sellPrice: 200,
    craftTime: 6,
  },
  {
    id: 'legendary',
    name: '전설무기',
    icon: '\u2694\uFE0F',
    materials: { iron: 15, wood: 10, gem: 5 },
    sellPrice: 800,
    craftTime: 10,
  },
];

export const SHOP_UPGRADES: TShopUpgradeDef[] = [
  {
    id: 'display',
    name: '진열대',
    icon: '\uD83E\uDE9F',
    cost: 1000,
    description: '진열 공간 +1',
  },
  {
    id: 'sign',
    name: '간판',
    icon: '\uD83D\uDCE2',
    cost: 3000,
    description: '모험가 방문 x1.5',
  },
  {
    id: 'workshop',
    name: '공방 확장',
    icon: '\uD83D\uDD28',
    cost: 5000,
    description: '제작 속도 x1.5',
  },
  {
    id: 'autocraft',
    name: '자동제작',
    icon: '\u2699\uFE0F',
    cost: 15000,
    description: '자동 제작 활성화',
  },
];

export const ADVENTURER_NAMES = ['용사', '기사', '마법사', '궁수', '도적'];

export const ADVENTURER_VISIT_MIN = 5;
export const ADVENTURER_VISIT_MAX = 8;

export const LAYOUT = {
  headerHeight: 50,
  resourceBarTop: 55,
  resourceBarHeight: 30,
  shopAreaTop: 90,
  shopAreaHeight: 140,
  craftingBarTop: 235,
  craftingBarHeight: 30,
  tabAreaTop: 270,
  tabAreaHeight: 35,
  listAreaTop: 310,
  listAreaHeight: 260,
  upgradeBarTop: 575,
  upgradeBarHeight: 40,
};
