export type TProducerDef = {
  id: string;
  name: string;
  icon: string;
  baseCost: number;
  baseProduction: number;
};

export type TProducerState = {
  count: number;
  upgraded: boolean;
};

export type TFloatingText = {
  x: number;
  y: number;
  text: string;
  opacity: number;
  vy: number;
};
