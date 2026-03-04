import { TBoard, TPosition, TStone } from './types';
import { BOARD_SIZE, DIRECTIONS } from './constants';
import { isInBounds } from './board';

const BLACK: TStone = 1;
const WHITE: TStone = 2;
const EMPTY: TStone = 0;

/**
 * Renju forbidden move detection for Black stones.
 *
 * In Renju rules, Black is subject to three types of forbidden moves:
 * 1. Overline: 6 or more consecutive black stones
 * 2. Double-four: placing creates two or more "fours" simultaneously
 * 3. Double-three: placing creates two or more "open threes" simultaneously
 *
 * White has no restrictions.
 */

/**
 * Check if placing a black stone at (x, y) is forbidden.
 * Returns false for non-black stones or occupied positions.
 */
export function isForbidden(board: TBoard, x: number, y: number): boolean {
  if (!isInBounds(x, y) || board[y][x] !== EMPTY) {
    return false;
  }

  // Temporarily place the black stone
  const testBoard = board.map((row) => [...row]);
  testBoard[y][x] = BLACK;

  // Check overline first (simplest)
  if (isOverline(testBoard, x, y)) {
    return true;
  }

  // If placing here makes exactly 5 in a row, it is NOT forbidden
  // (a winning move cannot be forbidden by double-four or double-three)
  if (makesExactFive(testBoard, x, y)) {
    return false;
  }

  // Check double-four
  if (isDoubleFour(testBoard, x, y)) {
    return true;
  }

  // Check double-three
  if (isDoubleThree(testBoard, x, y, board)) {
    return true;
  }

  return false;
}

/**
 * Get all forbidden positions on the board for Black.
 * Useful for UI display of forbidden markers.
 */
export function getAllForbiddenPositions(board: TBoard): TPosition[] {
  const forbidden: TPosition[] = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === EMPTY && isForbidden(board, x, y)) {
        forbidden.push({ x, y });
      }
    }
  }

  return forbidden;
}

// ---------------------------------------------------------------------------
// Overline detection
// ---------------------------------------------------------------------------

/**
 * Check if placing at (x, y) creates a line of 6 or more consecutive black stones
 * in any direction.
 */
function isOverline(board: TBoard, x: number, y: number): boolean {
  for (const [dx, dy] of DIRECTIONS) {
    const count = countConsecutive(board, x, y, dx, dy, BLACK);
    if (count >= 6) {
      return true;
    }
  }
  return false;
}

/**
 * Check if placing at (x, y) creates exactly 5 in a row in any direction.
 */
function makesExactFive(board: TBoard, x: number, y: number): boolean {
  for (const [dx, dy] of DIRECTIONS) {
    const count = countConsecutive(board, x, y, dx, dy, BLACK);
    if (count === 5) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Double-four detection
// ---------------------------------------------------------------------------

/**
 * A "four" is a pattern where one more stone completes five in a row.
 * This includes:
 * - Straight four: 4 consecutive stones with one end open (e.g., _XXXX or XXXX_)
 * - Broken four: 4 stones with a gap (e.g., XX_XX, X_XXX, XXX_X)
 *
 * Double-four: placing at (x,y) creates fours in 2 or more directions.
 */
function isDoubleFour(board: TBoard, x: number, y: number): boolean {
  let fourCount = 0;

  for (const [dx, dy] of DIRECTIONS) {
    const fours = countFoursInDirection(board, x, y, dx, dy);
    fourCount += fours;
    if (fourCount >= 2) return true;
  }

  return false;
}

/**
 * Count how many distinct "fours" are formed in a given direction by the stone at (x, y).
 *
 * A "four" is identified by its group of 4 black stones that can be completed to
 * exactly 5 with one more stone. An open four (_XXXX_) has two completion points
 * but counts as ONE four.
 *
 * We deduplicate by the sorted set of black stone positions within each window.
 * Two windows that share the same 4 black positions are the same four.
 */
function countFoursInDirection(
  board: TBoard,
  x: number,
  y: number,
  dx: number,
  dy: number
): number {
  // Extract the line of cells centered at (x, y) in this direction.
  // We need up to 5 cells in each direction to detect all four patterns.
  const line = extractLine(board, x, y, dx, dy, 5);
  const center = line.centerIndex;

  // Track distinct four patterns by their black stone positions
  const foundFourKeys = new Set<string>();

  for (let start = 0; start <= line.cells.length - 5; start++) {
    const end = start + 5;
    // The placed stone must be in this window
    if (center < start || center >= end) continue;

    const window = line.cells.slice(start, end);
    let blackCount = 0;
    let emptyCount = 0;
    let whiteCount = 0;

    for (const cell of window) {
      if (cell === BLACK) blackCount++;
      else if (cell === EMPTY) emptyCount++;
      else whiteCount++;
    }

    if (blackCount === 4 && emptyCount === 1 && whiteCount === 0) {
      // This is a potential four: filling the empty cell would make 5 in a row.
      // The empty cell position in the window:
      const emptyIdx = window.indexOf(EMPTY);
      const absEmptyIdx = start + emptyIdx;

      // Simulate filling
      const simulated = [...line.cells];
      simulated[absEmptyIdx] = BLACK;

      // Count consecutive black through the filled position
      let runStart = absEmptyIdx;
      while (runStart > 0 && simulated[runStart - 1] === BLACK) runStart--;
      let runEnd = runStart;
      let consecutive = 0;
      while (runEnd < simulated.length && simulated[runEnd] === BLACK) {
        consecutive++;
        runEnd++;
      }

      if (consecutive === 5) {
        // Verify no overline: stones just outside the run of 5 must not be black
        const beforeRun = runStart - 1 >= 0 ? simulated[runStart - 1] : null;
        const afterRun =
          runEnd < simulated.length ? simulated[runEnd] : null;
        if (beforeRun !== BLACK && afterRun !== BLACK) {
          // Build a key from the positions of the 4 black stones in the original line
          // (i.e., all black positions in the window, excluding the empty we just filled)
          const blackPositions: number[] = [];
          for (let i = 0; i < 5; i++) {
            if (window[i] === BLACK) {
              blackPositions.push(start + i);
            }
          }
          const key = blackPositions.join(',');
          foundFourKeys.add(key);
        }
      }
    }
  }

  return foundFourKeys.size;
}

// ---------------------------------------------------------------------------
// Double-three detection
// ---------------------------------------------------------------------------

/**
 * An "open three" (live three) is a pattern of 3 black stones that can become
 * an "open four" (a four with both ends open, guaranteeing a win).
 *
 * Double-three: placing at (x,y) creates open threes in 2 or more directions.
 *
 * Key subtlety: a three that leads to a forbidden four is NOT counted as an
 * open three (because the resulting four move would itself be forbidden).
 */
function isDoubleThree(
  board: TBoard,
  x: number,
  y: number,
  originalBoard: TBoard
): boolean {
  let threeCount = 0;

  for (const [dx, dy] of DIRECTIONS) {
    if (isOpenThreeInDirection(board, x, y, dx, dy, originalBoard)) {
      threeCount++;
      if (threeCount >= 2) return true;
    }
  }

  return false;
}

/**
 * Check if placing at (x, y) creates an "open three" in the given direction.
 *
 * An open three is a line of exactly 3 black stones where at least one of
 * the empty cells adjacent to the three can be filled to create an open four
 * (four with both ends open).
 *
 * Patterns for open three include:
 * - _XXX_ (straight open three)
 * - _X_XX_ or _XX_X_ (broken open three with gap)
 */
function isOpenThreeInDirection(
  board: TBoard,
  x: number,
  y: number,
  dx: number,
  dy: number,
  originalBoard: TBoard
): boolean {
  const line = extractLine(board, x, y, dx, dy, 6);
  const center = line.centerIndex;

  // Look for windows of length 5 that contain exactly 3 black and 2 empty,
  // with center included. These are potential three patterns.
  // Then check if filling either empty creates an open four (not forbidden).
  for (let start = 0; start <= line.cells.length - 5; start++) {
    const end = start + 5;
    if (center < start || center >= end) continue;

    const window = line.cells.slice(start, end);
    let blackCount = 0;
    let emptyCount = 0;

    for (const cell of window) {
      if (cell === BLACK) blackCount++;
      else if (cell === EMPTY) emptyCount++;
    }

    if (blackCount !== 3 || emptyCount !== 2) continue;

    // This window has 3 blacks and 2 empties in 5 cells.
    // For each empty position in the window, check if filling it makes an open four
    for (let i = 0; i < 5; i++) {
      if (window[i] !== EMPTY) continue;

      const absIdx = start + i;
      const pos = getPositionFromLineIndex(line, absIdx);
      if (!pos) continue;

      // Check if filling this empty creates an open four
      // An open four = 4 consecutive black stones with both ends open
      if (
        wouldCreateOpenFour(board, pos.x, pos.y, dx, dy) &&
        !wouldBeForbidden(originalBoard, pos.x, pos.y)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if placing a black stone at (x, y) would create an open four
 * in the given direction.
 *
 * An open four: exactly 4 consecutive black stones with both ends empty.
 * Also includes broken patterns that complete to an open four.
 */
function wouldCreateOpenFour(
  board: TBoard,
  x: number,
  y: number,
  dx: number,
  dy: number
): boolean {
  // Simulate placing the stone
  const testBoard = board.map((row) => [...row]);
  testBoard[y][x] = BLACK;

  const line = extractLine(testBoard, x, y, dx, dy, 5);
  const center = line.centerIndex;

  // Look for a window of exactly 4 consecutive black stones with center included,
  // and both ends empty.
  for (let start = 0; start <= line.cells.length - 4; start++) {
    const end = start + 4;
    if (center < start || center >= end) continue;

    // All 4 cells must be black
    let allBlack = true;
    for (let i = start; i < end; i++) {
      if (line.cells[i] !== BLACK) {
        allBlack = false;
        break;
      }
    }
    if (!allBlack) continue;

    // Both ends must be empty (not out of bounds, not occupied)
    const before = start - 1;
    const after = end;
    const cellBefore = before >= 0 ? line.cells[before] : WHITE;
    const cellAfter = after < line.cells.length ? line.cells[after] : WHITE;

    if (cellBefore === EMPTY && cellAfter === EMPTY) {
      // Verify it's exactly 4 (not 5+)
      const beforeBefore = before - 1;
      const afterAfter = after + 1;
      const extBefore =
        beforeBefore >= 0 ? line.cells[beforeBefore] : null;
      const extAfter =
        afterAfter < line.cells.length ? line.cells[afterAfter] : null;

      // Make sure the stones beyond the empty ends are not also black
      // (which would mean filling either end creates 6+)
      if (extBefore !== BLACK && extAfter !== BLACK) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if placing a black stone at (x, y) would be forbidden.
 * Used to verify that a three's extension point is not itself forbidden.
 * This avoids counting threes whose four-extension would be forbidden.
 */
function wouldBeForbidden(board: TBoard, x: number, y: number): boolean {
  if (!isInBounds(x, y) || board[y][x] !== EMPTY) return false;

  const testBoard = board.map((row) => [...row]);
  testBoard[y][x] = BLACK;

  // Only check overline and double-four for the recursion guard
  // (to avoid infinite mutual recursion with double-three)
  if (isOverline(testBoard, x, y)) return true;
  if (makesExactFive(testBoard, x, y)) return false;
  if (isDoubleFour(testBoard, x, y)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Line extraction utility
// ---------------------------------------------------------------------------

type TLineInfo = {
  cells: TStone[];
  centerIndex: number;
  // Map from line index to board position
  positions: TPosition[];
};

/**
 * Extract a line of cells from the board centered at (x, y) in direction (dx, dy).
 * Extends `reach` cells in each direction.
 */
function extractLine(
  board: TBoard,
  x: number,
  y: number,
  dx: number,
  dy: number,
  reach: number
): TLineInfo {
  const cells: TStone[] = [];
  const positions: TPosition[] = [];

  // Go backwards from center
  const negCells: { cell: TStone; pos: TPosition }[] = [];
  for (let i = 1; i <= reach; i++) {
    const nx = x - dx * i;
    const ny = y - dy * i;
    if (!isInBounds(nx, ny)) break;
    negCells.push({ cell: board[ny][nx], pos: { x: nx, y: ny } });
  }
  negCells.reverse();

  for (const { cell, pos } of negCells) {
    cells.push(cell);
    positions.push(pos);
  }

  // Center
  const centerIndex = cells.length;
  cells.push(board[y][x]);
  positions.push({ x, y });

  // Go forward from center
  for (let i = 1; i <= reach; i++) {
    const nx = x + dx * i;
    const ny = y + dy * i;
    if (!isInBounds(nx, ny)) break;
    cells.push(board[ny][nx]);
    positions.push({ x: nx, y: ny });
  }

  return { cells, centerIndex, positions };
}

/**
 * Get the board position corresponding to a line index.
 */
function getPositionFromLineIndex(
  line: TLineInfo,
  index: number
): TPosition | null {
  if (index < 0 || index >= line.positions.length) return null;
  return line.positions[index];
}

/**
 * Count total consecutive stones of a given type through (x, y) in a direction.
 * Includes the stone at (x, y).
 */
function countConsecutive(
  board: TBoard,
  x: number,
  y: number,
  dx: number,
  dy: number,
  stone: TStone
): number {
  let count = 1;

  // Positive direction
  let cx = x + dx;
  let cy = y + dy;
  while (isInBounds(cx, cy) && board[cy][cx] === stone) {
    count++;
    cx += dx;
    cy += dy;
  }

  // Negative direction
  cx = x - dx;
  cy = y - dy;
  while (isInBounds(cx, cy) && board[cy][cx] === stone) {
    count++;
    cx -= dx;
    cy -= dy;
  }

  return count;
}
