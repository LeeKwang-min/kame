export const INITIALS_KEY_COLS = 7;
export const INITIALS_KEY_ROWS = 4;
export const INITIALS_KEY_GRID: string[] = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'DEL',
  'SPC',
];
export const INITIALS_MOVE_DIR = {
  ArrowLeft: { dr: 0, dc: -1 },
  ArrowRight: { dr: 0, dc: 1 },
  ArrowUp: { dr: -1, dc: 0 },
  ArrowDown: { dr: 1, dc: 0 },
} as const;
