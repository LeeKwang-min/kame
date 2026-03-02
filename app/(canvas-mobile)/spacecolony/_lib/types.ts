export type TResourceId = 'oxygen' | 'energy' | 'food';

export type TResourceDef = {
  id: TResourceId;
  name: string;
  icon: string;
  starting: number;
  max: number;
  decayPerPerson: number;
  color: string;
};

export type TBuildingId = 'solar' | 'o2gen' | 'farm' | 'dome' | 'lab' | 'miner' | 'shield' | 'port';

export type TBuildingDef = {
  id: TBuildingId;
  name: string;
  icon: string;
  baseCost: number;
  workersNeeded: number;
  effectPerLevel: number;
  effectType: string;
  maxLevel: number;
  workerPerLevel: boolean;
};

export type TTechId = 'efficiency1' | 'automation' | 'efficiency2' | 'terraforming' | 'quantum';

export type TTechDef = {
  id: TTechId;
  name: string;
  rpCost: number;
  description: string;
};

export type TRandomEvent = {
  id: string;
  name: string;
  type: 'positive' | 'negative';
};

export type TTab = 'build' | 'research' | 'info';

export type TEventLog = {
  message: string;
  type: 'positive' | 'negative' | 'neutral';
  time: number;
};
