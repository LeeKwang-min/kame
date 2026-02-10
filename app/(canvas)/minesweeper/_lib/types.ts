export type TCellState = 'hidden' | 'revealed' | 'flagged';

export type TCell = {
  isMine: boolean;
  state: TCellState;
  adjacentMines: number;
};

export type TDifficulty = 'beginner' | 'intermediate' | 'expert';

export type TDifficultyConfig = {
  rows: number;
  cols: number;
  mines: number;
  label: string;
  multiplier: number;
};
