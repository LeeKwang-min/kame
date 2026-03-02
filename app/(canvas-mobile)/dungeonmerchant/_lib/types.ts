export type TResourceType = 'iron' | 'wood' | 'gem';

export type TResourceBuildingDef = {
  id: string;
  name: string;
  icon: string;
  baseCost: number;
  baseProduction: number;
  costMult: number;
  resourceType: TResourceType;
  maxLevel: number;
};

export type TResourceBuildingState = {
  level: number;
};

export type TRecipeDef = {
  id: string;
  name: string;
  icon: string;
  materials: Partial<Record<TResourceType, number>>;
  sellPrice: number;
  craftTime: number;
};

export type TShopUpgradeDef = {
  id: string;
  name: string;
  icon: string;
  cost: number;
  description: string;
};

export type TCraftingState = {
  recipeId: string | null;
  progress: number;
  totalTime: number;
};

export type TDisplayItem = {
  recipeId: string;
  name: string;
  icon: string;
  sellPrice: number;
};

export type TAdventurer = {
  name: string;
  x: number;
  targetX: number;
  visible: boolean;
  speechBubble: string | null;
  speechTimer: number;
  leaving: boolean;
};

export type TFloatingText = {
  x: number;
  y: number;
  text: string;
  opacity: number;
  vy: number;
};

export type TTabType = 'resources' | 'crafting' | 'shop';
