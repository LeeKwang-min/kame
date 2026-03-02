export type TIngredientId = 'lemon' | 'sugar' | 'ice';

export type TIngredientDef = {
  id: TIngredientId;
  name: string;
  icon: string;
  buyCost: number;
  buyAmount: number;
  maxStock: number;
};

export type TWeatherId = 'sunny' | 'hot' | 'rainy' | 'cold' | 'cloudy';

export type TWeatherDef = {
  id: TWeatherId;
  name: string;
  icon: string;
  demandMultiplier: number;
};

export type TUpgradeDef = {
  id: string;
  name: string;
  icon: string;
  cost: number;
  description: string;
};

export type TFloatingText = {
  x: number;
  y: number;
  text: string;
  opacity: number;
  vy: number;
};

export type TCustomer = {
  x: number;
  y: number;
  targetX: number;
  speed: number;
  state: 'approaching' | 'buying' | 'leaving' | 'angry';
  timer: number;
  icon: string;
};
