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
 * Generate a puzzle for the given level.
 * Uses Fisher-Yates shuffle to randomly distribute colors across bottles.
 * With n colors + 2 empty bottles (4 slots each), virtually all random
 * configurations are solvable.
 */
export function generatePuzzle(level: number): TBottle[] {
  const numColors = getColorsForLevel(level);
  const totalBottles = getBottleCountForLevel(level);

  // Create flat array: each color appears SLOTS_PER_BOTTLE times
  const allColors: number[] = [];
  for (let c = 0; c < numColors; c++) {
    for (let s = 0; s < SLOTS_PER_BOTTLE; s++) {
      allColors.push(c);
    }
  }

  // Fisher-Yates shuffle
  for (let i = allColors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allColors[i], allColors[j]] = [allColors[j], allColors[i]];
  }

  // Distribute into bottles
  const bottles: TBottle[] = [];
  for (let b = 0; b < numColors; b++) {
    bottles.push({
      colors: allColors.slice(b * SLOTS_PER_BOTTLE, (b + 1) * SLOTS_PER_BOTTLE),
    });
  }

  // Add empty bottles
  for (let b = 0; b < totalBottles - numColors; b++) {
    bottles.push({
      colors: Array(SLOTS_PER_BOTTLE).fill(null),
    });
  }

  // Extremely unlikely but re-shuffle if already solved
  if (isSolved(bottles)) {
    return generatePuzzle(level);
  }

  return bottles;
}
