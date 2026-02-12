import {
  BUBBLE_RADIUS,
  ROW_HEIGHT,
  GRID_LEFT,
  GRID_COLS,
} from './config';

/**
 * Convert grid (row, col) to world (x, y) coordinates.
 * Uses (row + gridParity) % 2 to determine offset for hex layout.
 */
export function hexToWorld(
  row: number,
  col: number,
  gridParity: number = 0,
): { x: number; y: number } {
  const offset = (row + gridParity) % 2 === 1 ? BUBBLE_RADIUS : 0;
  const x = GRID_LEFT + col * BUBBLE_RADIUS * 2 + offset;
  const y = BUBBLE_RADIUS + row * ROW_HEIGHT;
  return { x, y };
}

/**
 * Convert world (x, y) to nearest grid (row, col).
 * Tries both floor and ceil row candidates and picks the closest valid cell.
 */
export function worldToHex(
  wx: number,
  wy: number,
  gridParity: number = 0,
): { row: number; col: number } {
  const rawRow = (wy - BUBBLE_RADIUS) / ROW_HEIGHT;
  const rowFloor = Math.max(0, Math.floor(rawRow));
  const rowCeil = Math.max(0, Math.ceil(rawRow));

  // If floor and ceil are the same, only one candidate
  const candidates = rowFloor === rowCeil ? [rowFloor] : [rowFloor, rowCeil];

  let bestRow = 0;
  let bestCol = 0;
  let bestDist = Infinity;

  for (const row of candidates) {
    const maxCol = getMaxCol(row, gridParity);
    const offset = (row + gridParity) % 2 === 1 ? BUBBLE_RADIUS : 0;
    const rawCol = (wx - GRID_LEFT - offset) / (BUBBLE_RADIUS * 2);
    const col = Math.max(0, Math.min(Math.round(rawCol), maxCol));

    const pos = hexToWorld(row, col, gridParity);
    const dist = Math.hypot(wx - pos.x, wy - pos.y);

    if (dist < bestDist) {
      bestDist = dist;
      bestRow = row;
      bestCol = col;
    }
  }

  return { row: bestRow, col: bestCol };
}

/** Max column index for a given row */
export function getMaxCol(row: number, gridParity: number = 0): number {
  return (row + gridParity) % 2 === 1 ? GRID_COLS - 2 : GRID_COLS - 1;
}

/** 6-directional neighbor offsets for hex grid (odd-row offset) */
const EVEN_ROW_NEIGHBORS = [
  [-1, -1], [-1, 0],
  [0, -1], [0, 1],
  [1, -1], [1, 0],
];

const ODD_ROW_NEIGHBORS = [
  [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, 0], [1, 1],
];

export function getNeighborOffsets(
  row: number,
  gridParity: number = 0,
): number[][] {
  return (row + gridParity) % 2 === 0 ? EVEN_ROW_NEIGHBORS : ODD_ROW_NEIGHBORS;
}

/**
 * BFS to find connected same-color bubbles from a starting position.
 */
export function bfsSameColor(
  startRow: number,
  startCol: number,
  color: string,
  grid: Map<string, string>,
  gridParity: number = 0,
): string[] {
  const key = `${startRow},${startCol}`;
  if (grid.get(key) !== color) return [];

  const visited = new Set<string>();
  const queue: [number, number][] = [[startRow, startCol]];
  visited.add(key);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const neighbors = getNeighborOffsets(r, gridParity);

    for (const [dr, dc] of neighbors) {
      const nr = r + dr;
      const nc = c + dc;
      const nk = `${nr},${nc}`;

      if (nr < 0 || nc < 0 || nc > getMaxCol(nr, gridParity)) continue;
      if (visited.has(nk)) continue;
      if (grid.get(nk) !== color) continue;

      visited.add(nk);
      queue.push([nr, nc]);
    }
  }

  return Array.from(visited);
}

/**
 * BFS from ceiling (row 0) to find all connected bubbles.
 * Returns the set of keys that are connected to the ceiling.
 */
export function bfsFromCeiling(
  grid: Map<string, string>,
  gridParity: number = 0,
): Set<string> {
  const connected = new Set<string>();
  const queue: [number, number][] = [];

  // Start from all bubbles in row 0
  for (const [key] of grid) {
    const [r, c] = key.split(',').map(Number);
    if (r === 0) {
      connected.add(key);
      queue.push([r, c]);
    }
  }

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const neighbors = getNeighborOffsets(r, gridParity);

    for (const [dr, dc] of neighbors) {
      const nr = r + dr;
      const nc = c + dc;
      const nk = `${nr},${nc}`;

      if (nr < 0 || nc < 0 || nc > getMaxCol(nr, gridParity)) continue;
      if (connected.has(nk)) continue;
      if (!grid.has(nk)) continue;

      connected.add(nk);
      queue.push([nr, nc]);
    }
  }

  return connected;
}
