import { TDirection } from './types';

export const BOARD_SIZE = 15;

export const WIN_COUNT = 5;

/** [dx, dy] pairs for horizontal, vertical, diagonal-down, diagonal-up */
export const DIRECTIONS: TDirection[] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

/** Standard star points (intersections with dots) on a 15x15 board */
export const STAR_POINTS: [number, number][] = [
  [3, 3],
  [3, 11],
  [7, 7],
  [11, 3],
  [11, 11],
];
