export type TDifficulty = 'easy' | 'normal' | 'hard';

export type TDifficultyConfig = {
  rows: number;
  cols: number;
  vision: number;
  label: string;
  multiplier: number;
};

export type TMazeCell = {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
  visited: boolean;
};

export type TPlayer = {
  row: number;
  col: number;
};
