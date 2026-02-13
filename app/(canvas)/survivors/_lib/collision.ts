import { HASH_CELL_SIZE } from './config';

// Spatial hash grid type
type TSpatialHash<T> = Map<string, T[]>;

// Create cell key from world position
function cellKey(x: number, y: number): string {
  const cx = Math.floor(x / HASH_CELL_SIZE);
  const cy = Math.floor(y / HASH_CELL_SIZE);
  return `${cx},${cy}`;
}

// Build spatial hash from pool of active objects
export function buildSpatialHash<T extends { active: boolean; x: number; y: number }>(
  objects: T[],
): TSpatialHash<T> {
  const hash: TSpatialHash<T> = new Map();
  for (const obj of objects) {
    if (!obj.active) continue;
    const key = cellKey(obj.x, obj.y);
    const cell = hash.get(key);
    if (cell) cell.push(obj);
    else hash.set(key, [obj]);
  }
  return hash;
}

// Query nearby objects within range
export function queryNearby<T extends { active: boolean; x: number; y: number }>(
  hash: TSpatialHash<T>,
  x: number,
  y: number,
  range: number,
): T[] {
  const results: T[] = [];
  const minCx = Math.floor((x - range) / HASH_CELL_SIZE);
  const maxCx = Math.floor((x + range) / HASH_CELL_SIZE);
  const minCy = Math.floor((y - range) / HASH_CELL_SIZE);
  const maxCy = Math.floor((y + range) / HASH_CELL_SIZE);
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const cell = hash.get(`${cx},${cy}`);
      if (cell) results.push(...cell);
    }
  }
  return results;
}

// Circle-circle collision (distance squared comparison for performance)
export function circleCollision(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const distSq = dx * dx + dy * dy;
  const radii = r1 + r2;
  return distSq < radii * radii;
}

// Distance squared between two points
export function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

// Find nearest active object from a pool
export function findNearest<T extends { active: boolean; x: number; y: number }>(
  pool: T[],
  x: number,
  y: number,
): T | null {
  let nearest: T | null = null;
  let minDist = Infinity;
  for (const obj of pool) {
    if (!obj.active) continue;
    const d = distSq(obj.x, obj.y, x, y);
    if (d < minDist) {
      minDist = d;
      nearest = obj;
    }
  }
  return nearest;
}
