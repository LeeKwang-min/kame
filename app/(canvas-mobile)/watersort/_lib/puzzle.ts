import { TBottle, TMove } from './types';
import { SLOTS_PER_BOTTLE, getColorsForLevel, getBottleCountForLevel } from './config';

/** Deep copy of bottles array */
export function cloneBottles(bottles: TBottle[]): TBottle[] {
  return bottles.map((b) => ({ colors: [...b.colors] }));
}

/** Get the index of the topmost non-null slot, or -1 if empty */
function topIndex(bottle: TBottle): number {
  for (let i = SLOTS_PER_BOTTLE - 1; i >= 0; i--) {
    if (bottle.colors[i] !== null) return i;
  }
  return -1;
}

/** Get the color of the topmost slot, or null if empty */
function topColor(bottle: TBottle): number | null {
  const idx = topIndex(bottle);
  return idx === -1 ? null : bottle.colors[idx];
}

/** Count how many empty slots a bottle has */
function emptySlots(bottle: TBottle): number {
  let count = 0;
  for (let i = 0; i < SLOTS_PER_BOTTLE; i++) {
    if (bottle.colors[i] === null) count++;
  }
  return count;
}

/** Count consecutive same-colored slots from the top */
function topConsecutiveCount(bottle: TBottle): number {
  const idx = topIndex(bottle);
  if (idx === -1) return 0;
  const color = bottle.colors[idx];
  let count = 1;
  for (let i = idx - 1; i >= 0; i--) {
    if (bottle.colors[i] === color) count++;
    else break;
  }
  return count;
}

/** Validate whether a move from source to target is allowed */
export function isValidMove(bottles: TBottle[], from: number, to: number): boolean {
  if (from === to) return false;

  const source = bottles[from];
  const target = bottles[to];

  // Source must not be empty
  if (topIndex(source) === -1) return false;

  // Target must not be full
  if (emptySlots(target) === 0) return false;

  // Target must be empty or top color must match
  const targetTop = topColor(target);
  if (targetTop === null) return true;
  return targetTop === topColor(source);
}

/**
 * Execute a move: transfer consecutive same-colored slots from
 * the top of source to target. Only moves as many as target has room for.
 * Returns the TMove record or null if invalid.
 */
export function executeMove(bottles: TBottle[], from: number, to: number): TMove | null {
  if (!isValidMove(bottles, from, to)) return null;

  const source = bottles[from];
  const target = bottles[to];

  const color = topColor(source)!;
  const consecutive = topConsecutiveCount(source);
  const space = emptySlots(target);
  const count = Math.min(consecutive, space);

  // Remove from source (top down)
  let removed = 0;
  for (let i = SLOTS_PER_BOTTLE - 1; i >= 0 && removed < count; i--) {
    if (source.colors[i] === color) {
      source.colors[i] = null;
      removed++;
    }
  }

  // Add to target (fill from bottom up into empty slots)
  let added = 0;
  for (let i = 0; i < SLOTS_PER_BOTTLE && added < count; i++) {
    if (target.colors[i] === null) {
      target.colors[i] = color;
      added++;
    }
  }

  return { from, to, count };
}

/** Reverse a move by transferring colors back from target to source */
export function undoMove(bottles: TBottle[], move: TMove): void {
  const { from, to, count } = move;
  const target = bottles[to];
  const source = bottles[from];

  // Identify the color at the top of target (the moved color)
  const color = topColor(target);
  if (color === null) return;

  // Remove `count` slots from top of target
  let removed = 0;
  for (let i = SLOTS_PER_BOTTLE - 1; i >= 0 && removed < count; i--) {
    if (target.colors[i] === color) {
      target.colors[i] = null;
      removed++;
    }
  }

  // Add `count` slots back to source (fill from bottom up)
  let added = 0;
  for (let i = 0; i < SLOTS_PER_BOTTLE && added < count; i++) {
    if (source.colors[i] === null) {
      source.colors[i] = color;
      added++;
    }
  }
}

/**
 * Check if puzzle is solved:
 * every bottle is either completely empty or has exactly 4 of the same color.
 */
export function isSolved(bottles: TBottle[]): boolean {
  for (const bottle of bottles) {
    const top = topIndex(bottle);
    // Empty bottle is fine
    if (top === -1) continue;
    // Must have exactly SLOTS_PER_BOTTLE filled
    if (top !== SLOTS_PER_BOTTLE - 1) return false;
    // All slots must be the same color
    const color = bottle.colors[0];
    for (let i = 1; i < SLOTS_PER_BOTTLE; i++) {
      if (bottle.colors[i] !== color) return false;
    }
  }
  return true;
}

/**
 * Generate a solvable puzzle for the given level.
 * Creates a solved state, then randomly shuffles by applying valid moves
 * in reverse. Guarantees solvability since every shuffle move is reversible.
 */
export function generatePuzzle(level: number): TBottle[] {
  const numColors = getColorsForLevel(level);
  const totalBottles = getBottleCountForLevel(level);

  function create(): TBottle[] {
    // Build solved state: each color fills one bottle, plus empty bottles
    const bottles: TBottle[] = [];
    for (let c = 0; c < numColors; c++) {
      bottles.push({
        colors: Array(SLOTS_PER_BOTTLE).fill(c),
      });
    }
    // Add empty bottles
    for (let i = 0; i < totalBottles - numColors; i++) {
      bottles.push({
        colors: Array(SLOTS_PER_BOTTLE).fill(null),
      });
    }

    // Shuffle by applying random valid moves
    const shuffleMoves = 20 + level * 10;
    let lastTo = -1;

    for (let m = 0; m < shuffleMoves; m++) {
      // Collect all valid moves
      const validMoves: { from: number; to: number }[] = [];
      for (let i = 0; i < totalBottles; i++) {
        for (let j = 0; j < totalBottles; j++) {
          if (i === j) continue;
          // Avoid immediately reversing the last move
          if (i === lastTo) continue;
          if (isValidMove(bottles, i, j)) {
            validMoves.push({ from: i, to: j });
          }
        }
      }

      if (validMoves.length === 0) break;

      const chosen = validMoves[Math.floor(Math.random() * validMoves.length)];
      executeMove(bottles, chosen.from, chosen.to);
      lastTo = chosen.to;
    }

    return bottles;
  }

  // Regenerate if result is still in solved state
  let bottles = create();
  let attempts = 0;
  while (isSolved(bottles) && attempts < 100) {
    bottles = create();
    attempts++;
  }

  return bottles;
}
