export type GamePhase = 'playing' | 'gameover';

export type EnhanceResult = 'success' | 'maintain' | 'downgrade' | 'destroy';

export type EnhanceState = {
  level: number;
  phase: GamePhase;
  maxLevel: number;
  lastResult: EnhanceResult | null;
  attempts: number;
};
