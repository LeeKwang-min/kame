// ── Difficulty ──
export type TDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type TDifficultyConfig = {
  size: number | [number, number];
  stones: [number, number];
  hintRatio: [number, number];
  baseTime: number;
  multiplier: number;
  hints: number;
  maxAttempts: number;
};

// ── Cell & Board ──
export type TCell = {
  value: number;
  revealed: boolean;
  hasStone: boolean;
  isError: boolean;
  isHinted: boolean;
};

export type TBoard = TCell[][];

// ── Puzzle ──
export type TPuzzle = {
  size: number;
  board: TBoard;
  stonePositions: [number, number][];
  stoneCount: number;
};

// ── Animation ──
export type TCellAnim = {
  rippleTime: number;
  rippleActive: boolean;
  scale: number;
  opacity: number;
  shakeX: number;
  shakeTime: number;
  glowTime: number;
};

export type TParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'drop' | 'ring' | 'sparkle';
};

export type TCelebration = {
  active: boolean;
  time: number;
  rippleIndex: number;
};
