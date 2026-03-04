import { TBoard, TStone, TPosition, TGameResult } from './types';
import { BOARD_SIZE, WIN_COUNT, DIRECTIONS } from './constants';

/** Create an empty 15x15 board filled with 0s */
export function createBoard(): TBoard {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0 as TStone)
  );
}

/** Check if coordinates are within board bounds */
export function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

/**
 * Place a stone on the board.
 * Returns a new board if valid, or null if the position is occupied or out of bounds.
 */
export function placeStone(
  board: TBoard,
  x: number,
  y: number,
  stone: TStone
): TBoard | null {
  if (!isInBounds(x, y) || board[y][x] !== 0) {
    return null;
  }

  const newBoard = board.map((row) => [...row]);
  newBoard[y][x] = stone;
  return newBoard;
}

/**
 * Count consecutive stones of the same type in one direction from (x, y).
 * Does NOT count the stone at (x, y) itself.
 */
export function countInDirection(
  board: TBoard,
  x: number,
  y: number,
  dx: number,
  dy: number,
  stone: TStone
): number {
  let count = 0;
  let cx = x + dx;
  let cy = y + dy;

  while (isInBounds(cx, cy) && board[cy][cx] === stone) {
    count++;
    cx += dx;
    cy += dy;
  }

  return count;
}

/**
 * Check for a win after placing a stone at (x, y).
 *
 * Renju rule: Black must get EXACTLY 5 in a row (overline = 6+ is forbidden/not a win).
 * White wins with 5 or more in a row.
 *
 * Returns the game result with winner and winning line positions.
 */
export function checkWin(board: TBoard, x: number, y: number): TGameResult {
  const stone = board[y][x];
  if (stone === 0) {
    return { winner: 0, winLine: null };
  }

  for (const [dx, dy] of DIRECTIONS) {
    const countPos = countInDirection(board, x, y, dx, dy, stone);
    const countNeg = countInDirection(board, x, y, -dx, -dy, stone);
    const total = countPos + countNeg + 1;

    if (stone === 1) {
      // Black: exactly 5 to win (overline is not a win)
      if (total === WIN_COUNT) {
        const winLine = buildWinLine(x, y, dx, dy, countPos, countNeg);
        return { winner: stone, winLine };
      }
    } else {
      // White: 5 or more to win
      if (total >= WIN_COUNT) {
        const winLine = buildWinLine(x, y, dx, dy, countPos, countNeg);
        return { winner: stone, winLine };
      }
    }
  }

  return { winner: 0, winLine: null };
}

/** Build an array of positions that form the winning line */
function buildWinLine(
  x: number,
  y: number,
  dx: number,
  dy: number,
  countPos: number,
  countNeg: number
): TPosition[] {
  const positions: TPosition[] = [];

  // Add stones in the negative direction
  for (let i = countNeg; i >= 1; i--) {
    positions.push({ x: x - dx * i, y: y - dy * i });
  }

  // Add the placed stone
  positions.push({ x, y });

  // Add stones in the positive direction
  for (let i = 1; i <= countPos; i++) {
    positions.push({ x: x + dx * i, y: y + dy * i });
  }

  return positions;
}

/** Check if the board is completely full (draw) */
export function isDraw(board: TBoard): boolean {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === 0) return false;
    }
  }
  return true;
}

/** Get all empty positions on the board */
export function getEmptyPositions(board: TBoard): TPosition[] {
  const positions: TPosition[] = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === 0) {
        positions.push({ x, y });
      }
    }
  }

  return positions;
}
