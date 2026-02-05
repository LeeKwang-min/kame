export type LadderPhase = 'setup' | 'ready' | 'running' | 'result';

export type PresetType = 'custom' | 'number' | 'alphabet' | 'team';
export type ResultPresetType = 'custom' | 'winlose' | 'rank';

export interface LadderLine {
  fromColumn: number;
  toColumn: number;
  row: number;
}

export interface LadderPath {
  points: { x: number; y: number }[];
  startIndex: number;
  endIndex: number;
}
