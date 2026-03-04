import { TBoard, TStone } from './types';
import { BOARD_SIZE, DIRECTIONS } from './constants';
import { isInBounds } from './board';

// Pattern scores
const SCORE = {
  FIVE: 1_000_000,
  OPEN_FOUR: 100_000,
  FOUR: 10_000,
  OPEN_THREE: 5_000,
  THREE: 500,
  OPEN_TWO: 200,
  TWO: 50,
  ONE: 10,
} as const;

/**
 * Evaluate the board from the perspective of the given AI stone.
 * Positive scores favor the AI, negative scores favor the opponent.
 */
export function evaluateBoard(board: TBoard, aiStone: TStone): number {
  if (aiStone === 0) return 0;

  const opponent: TStone = aiStone === 1 ? 2 : 1;
  let score = 0;

  // Evaluate each direction from each cell
  // To avoid double-counting, we only scan in the "positive" direction
  // from each starting point.
  for (const [dx, dy] of DIRECTIONS) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        // Only start scanning from positions where the "previous" cell
        // in this direction is out of bounds or not the same stone,
        // so we capture each consecutive group exactly once.
        const prevX = x - dx;
        const prevY = y - dy;

        // Evaluate for AI
        if (board[y][x] === aiStone) {
          if (
            !isInBounds(prevX, prevY) ||
            board[prevY][prevX] !== aiStone
          ) {
            score += evaluateLine(board, x, y, dx, dy, aiStone);
          }
        }

        // Evaluate for opponent (subtract)
        if (board[y][x] === opponent) {
          if (
            !isInBounds(prevX, prevY) ||
            board[prevY][prevX] !== opponent
          ) {
            score -= evaluateLine(board, x, y, dx, dy, opponent);
          }
        }
      }
    }
  }

  return score;
}

/**
 * Evaluate a single line (consecutive group) starting at (x, y)
 * going in direction (dx, dy) for the given stone.
 *
 * Returns a score based on the pattern length and openness.
 */
function evaluateLine(
  board: TBoard,
  x: number,
  y: number,
  dx: number,
  dy: number,
  stone: TStone
): number {
  // Count consecutive stones
  let count = 0;
  let cx = x;
  let cy = y;
  while (isInBounds(cx, cy) && board[cy][cx] === stone) {
    count++;
    cx += dx;
    cy += dy;
  }

  if (count >= 5) {
    return SCORE.FIVE;
  }

  // Check openness (how many ends are open)
  const endX = x + dx * count;
  const endY = y + dy * count;
  const beforeX = x - dx;
  const beforeY = y - dy;

  const openEnd = isInBounds(endX, endY) && board[endY][endX] === 0;
  const openStart =
    isInBounds(beforeX, beforeY) && board[beforeY][beforeX] === 0;

  const openEnds = (openEnd ? 1 : 0) + (openStart ? 1 : 0);

  if (openEnds === 0) {
    // Completely blocked - no value
    return 0;
  }

  switch (count) {
    case 4:
      return openEnds === 2 ? SCORE.OPEN_FOUR : SCORE.FOUR;
    case 3:
      return openEnds === 2 ? SCORE.OPEN_THREE : SCORE.THREE;
    case 2:
      return openEnds === 2 ? SCORE.OPEN_TWO : SCORE.TWO;
    case 1:
      return openEnds === 2 ? SCORE.ONE : SCORE.ONE / 2;
    default:
      return 0;
  }
}
