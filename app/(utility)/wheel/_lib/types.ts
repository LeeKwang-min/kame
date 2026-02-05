export type WheelPhase = 'setup' | 'ready' | 'spinning' | 'result';

export type ItemPresetType = 'custom' | 'winlose' | 'number' | 'alphabet' | 'yesno';

export interface WheelItem {
  label: string;
  color: string;
}
