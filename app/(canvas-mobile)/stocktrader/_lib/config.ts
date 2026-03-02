import { TGameMeta } from '@/@types/game-meta';
import { TStockDef, TNewsEvent } from './types';

export const GAME_META: TGameMeta = {
  id: 'stocktrader',
  title: '주식왕',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'idle',
  difficulty: 'progressive',
};

export const CANVAS_SIZE = 620;
export const GAME_DURATION = 600;
export const STARTING_CAPITAL = 10000;
export const PRICE_UPDATE_INTERVAL = 2;
export const PRICE_HISTORY_LENGTH = 30;

export const COLORS = {
  bg: '#0f1923',
  text: '#ffffff',
  textDim: '#8899aa',
  panelBg: '#1a2a3a',
  panelBorder: '#2a3a4a',
  gold: '#FFD700',
  goldDark: '#B8860B',
  green: '#2ecc71',
  red: '#e74c3c',
  blue: '#3498db',
  purple: '#8b5cf6',
  newsBar: '#1c2c3c',
  newsBorder: '#2a4a6a',
  chartBg: '#111e2e',
  selectedBorder: '#00fff5',
  locked: '#555555',
  buyBtn: '#2ecc71',
  sellBtn: '#e74c3c',
  quantityBg: '#162636',
  quantityActive: '#3498db',
};

export const STOCKS: TStockDef[] = [
  {
    id: 'tech',
    name: '테크',
    icon: '\uD83D\uDCBB',
    startPrice: 100,
    volatility: 0.08,
    dividend: 0,
    trend: 0,
    unlockNetWorth: 0,
  },
  {
    id: 'energy',
    name: '에너지',
    icon: '\u26A1',
    startPrice: 80,
    volatility: 0.02,
    dividend: 0.5,
    trend: 0.002,
    unlockNetWorth: 0,
  },
  {
    id: 'bio',
    name: '바이오',
    icon: '\uD83E\uDDEC',
    startPrice: 50,
    volatility: 0.15,
    dividend: 0,
    trend: 0,
    unlockNetWorth: 15000,
  },
  {
    id: 'land',
    name: '부동산',
    icon: '\uD83C\uDFE0',
    startPrice: 200,
    volatility: 0.01,
    dividend: 1.0,
    trend: 0.003,
    unlockNetWorth: 25000,
  },
  {
    id: 'coin',
    name: '코인',
    icon: '\uD83E\uDE99',
    startPrice: 30,
    volatility: 0.25,
    dividend: 0,
    trend: 0,
    unlockNetWorth: 50000,
  },
];

export const QUANTITIES = [1, 5, 10, -1]; // -1 = All
export const QUANTITY_LABELS = ['1', '5', '10', 'All'];

export const NEWS_EVENTS: TNewsEvent[] = [
  { text: '테크 혁신 발표!', stockId: 'tech', effect: 0.3 },
  { text: '에너지 위기!', stockId: 'energy', effect: -0.2 },
  { text: '바이오 임상 성공!', stockId: 'bio', effect: 0.5 },
  { text: '부동산 버블 경고!', stockId: 'land', effect: -0.1 },
  { text: '코인 규제 발표!', stockId: 'coin', effect: -0.4 },
  { text: '경기 호황!', stockId: 'all', effect: 0.1 },
  { text: '시장 폭락!', stockId: 'all', effect: -0.15 },
  { text: '배당금 인상!', stockId: 'dividend', effect: 2 },
];

export const NEWS_MIN_INTERVAL = 30;
export const NEWS_MAX_INTERVAL = 45;
export const NEWS_DISPLAY_DURATION = 5;
export const DIVIDEND_BOOST_DURATION = 30;

export const LAYOUT = {
  headerHeight: 50,
  newsBarTop: 55,
  newsBarHeight: 30,
  chartAreaTop: 90,
  chartAreaHeight: 160,
  stockListTop: 255,
  stockListHeight: 70,
  tradeAreaTop: 330,
  tradeAreaHeight: 80,
  portfolioTop: 415,
  portfolioHeight: 155,
  statusBarTop: 575,
  statusBarHeight: 40,
};
