// Create a pool of pre-allocated objects
export function createPool<T extends { active: boolean }>(
  size: number,
  factory: () => T,
): T[] {
  return Array.from({ length: size }, factory);
}

// Find first inactive object in pool, mark active, return it (or null if full)
export function acquire<T extends { active: boolean }>(pool: T[]): T | null {
  for (const obj of pool) {
    if (!obj.active) {
      obj.active = true;
      return obj;
    }
  }
  return null;
}

// Mark object as inactive (return to pool)
export function deactivate<T extends { active: boolean }>(obj: T): void {
  obj.active = false;
}

// Iterate over active objects only
export function forEachActive<T extends { active: boolean }>(
  pool: T[],
  fn: (obj: T) => void,
): void {
  for (const obj of pool) {
    if (obj.active) fn(obj);
  }
}

// Count active objects
export function countActive<T extends { active: boolean }>(pool: T[]): number {
  let count = 0;
  for (const obj of pool) {
    if (obj.active) count++;
  }
  return count;
}
