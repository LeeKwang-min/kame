export type TDifficulty = 'easy' | 'normal' | 'hard';

export type TCellState = 'empty' | 'cross' | 'queen';

export type TCell = {
  region: number;       // 색상 영역 인덱스 (0 ~ N-1)
  state: TCellState;    // 현재 셀 상태
  isError: boolean;     // 충돌 표시
  isHinted: boolean;    // 힌트로 채워진 셀
};

export type TBoard = TCell[][];

export type TSolution = boolean[][]; // true = 퀸 위치

export type TPuzzle = {
  size: number;
  regions: number[][];  // 영역 맵 (각 셀의 영역 인덱스)
  solution: TSolution;  // 정답
};

export type TDifficultyConfig = {
  size: number;
  baseTime: number;
  multiplier: number;
  hints: number;
};

export type TCellAnim = {
  scale: number;
  opacity: number;
  shakeX: number;
  shakeTime: number;
  scaleTime: number;
  scaleDir: 'in' | 'out';
  fadeTime: number;
  fadeDir: 'in' | 'out';
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
  type: 'star' | 'heart' | 'sparkle';
};

export type TCelebration = {
  active: boolean;
  time: number;
  highlightIndex: number;
};
