export type TStockDef = {
  id: string;
  name: string;
  icon: string;
  startPrice: number;
  volatility: number;
  dividend: number;
  trend: number;
  unlockNetWorth: number;
};

export type TStockState = {
  currentPrice: number;
  priceHistory: number[];
  holdings: number;
  avgBuyPrice: number;
  totalInvested: number;
};

export type TNewsEvent = {
  text: string;
  stockId: string; // stock id, 'all', or 'dividend'
  effect: number;
};

export type TActiveNews = {
  text: string;
  timer: number;
};

export type TFloatingText = {
  x: number;
  y: number;
  text: string;
  opacity: number;
  vy: number;
  color: string;
};
