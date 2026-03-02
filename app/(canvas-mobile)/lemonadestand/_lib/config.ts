import { TGameMeta } from '@/@types/game-meta';
import { TIngredientDef, TWeatherDef, TUpgradeDef } from './types';

export const GAME_META: TGameMeta = {
  id: 'lemonadestand',
  title: '레모네이드 가판대',
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
  lemon: '#FFE135',
  lemonDark: '#CDB200',
  weatherSunny: '#FFD700',
  weatherHot: '#FF4500',
  weatherRainy: '#4682B4',
  weatherCold: '#87CEEB',
  weatherCloudy: '#B0BEC5',
  repGood: '#2ecc71',
  repBad: '#e74c3c',
  tabActive: '#2a4a6a',
  tabInactive: '#1a2a3a',
};

export const STARTING_GOLD = 100;

export const INGREDIENTS: TIngredientDef[] = [
  { id: 'lemon', name: '레몬', icon: '\u{1F34B}', buyCost: 20, buyAmount: 10, maxStock: 200 },
  { id: 'sugar', name: '설탕', icon: '\u{1F36C}', buyCost: 10, buyAmount: 10, maxStock: 200 },
  { id: 'ice', name: '얼음', icon: '\u{1F9CA}', buyCost: 15, buyAmount: 10, maxStock: 200 },
];

export const WEATHERS: TWeatherDef[] = [
  { id: 'sunny', name: 'Sunny', icon: '\u{2600}\u{FE0F}', demandMultiplier: 1.0 },
  { id: 'hot', name: 'Hot', icon: '\u{1F525}', demandMultiplier: 1.5 },
  { id: 'rainy', name: 'Rainy', icon: '\u{1F327}\u{FE0F}', demandMultiplier: 0.5 },
  { id: 'cold', name: 'Cold', icon: '\u{2744}\u{FE0F}', demandMultiplier: 0.3 },
  { id: 'cloudy', name: 'Cloudy', icon: '\u{2601}\u{FE0F}', demandMultiplier: 0.8 },
];

export const UPGRADES: TUpgradeDef[] = [
  { id: 'stand', name: '큰 가판대', icon: '\u{1F3EA}', cost: 500, description: '고객 도착률 x1.5' },
  { id: 'fridge', name: '냉장고', icon: '\u{2744}\u{FE0F}', cost: 1000, description: '얼음 녹는 속도 50% 감소' },
  { id: 'sign', name: '간판', icon: '\u{1F4E2}', cost: 2000, description: '고객 도착률 x2' },
  { id: 'mixer', name: '믹서기', icon: '\u{1FAD9}', cost: 5000, description: '자동 재료 소모' },
  { id: 'franchise', name: '프랜차이즈', icon: '\u{1F3E2}', cost: 20000, description: '수동 수입 10G/s' },
];

export const WEATHER_CHANGE_INTERVAL = 45;
export const BASE_CUSTOMER_INTERVAL = 2.5;
export const ICE_MELT_INTERVAL = 10;
export const ICE_MELT_INTERVAL_FRIDGE = 20;

export const CUSTOMER_ICONS = [
  '\u{1F468}', '\u{1F469}', '\u{1F466}', '\u{1F467}',
  '\u{1F474}', '\u{1F475}', '\u{1F468}\u{200D}\u{1F9B0}', '\u{1F469}\u{200D}\u{1F9B1}',
];

export const LAYOUT = {
  headerHeight: 50,
  weatherBarTop: 55,
  weatherBarHeight: 35,
  standAreaTop: 95,
  standAreaHeight: 150,
  reputationBarTop: 250,
  reputationBarHeight: 20,
  recipeAreaTop: 275,
  recipeAreaHeight: 80,
  statsBarTop: 360,
  statsBarHeight: 25,
  tabAreaTop: 390,
  tabAreaHeight: 35,
  listAreaTop: 430,
  listAreaHeight: 185,
};
