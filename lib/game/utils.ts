import { INITIALS_KEY_COLS, INITIALS_KEY_GRID } from './config';

export const initialLabelAt = (r: number, c: number): string => {
  return INITIALS_KEY_GRID[r * INITIALS_KEY_COLS + c];
};
