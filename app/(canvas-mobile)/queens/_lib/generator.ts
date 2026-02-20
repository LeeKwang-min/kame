import { TPuzzle } from './types';

function generateQueenPlacement(n: number): [number, number][] | null {
  const cols = new Array(n).fill(-1);

  function isValid(row: number, col: number): boolean {
    for (let r = 0; r < row; r++) {
      const c = cols[r];
      if (c === col) return false;
      if (Math.abs(r - row) === Math.abs(c - col)) return false;
      if (row - r === 1 && Math.abs(c - col) <= 1) return false;
    }
    return true;
  }

  function solve(row: number): boolean {
    if (row === n) return true;
    const order = shuffle([...Array(n)].map((_, i) => i));
    for (const col of order) {
      if (isValid(row, col)) {
        cols[row] = col;
        if (solve(row + 1)) return true;
        cols[row] = -1;
      }
    }
    return false;
  }

  if (!solve(0)) return null;
  return cols.map((col, row) => [row, col] as [number, number]);
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateRegions(n: number, queens: [number, number][]): number[][] {
  const regions: number[][] = Array.from({ length: n }, () => new Array(n).fill(-1));

  queens.forEach(([r, c], idx) => {
    regions[r][c] = idx;
  });

  const queues: [number, number][][] = queens.map(([r, c]) => [[r, c]]);
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  let hasUnfilled = true;
  while (hasUnfilled) {
    hasUnfilled = false;
    const order = shuffle([...Array(n)].map((_, i) => i));
    for (const idx of order) {
      if (queues[idx].length === 0) continue;
      const nextQueue: [number, number][] = [];
      const shuffledQueue = shuffle([...queues[idx]]);
      for (const [r, c] of shuffledQueue) {
        const shuffledDirs = shuffle([...dirs]);
        for (const [dr, dc] of shuffledDirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr][nc] === -1) {
            regions[nr][nc] = idx;
            nextQueue.push([nr, nc]);
          }
        }
      }
      queues[idx] = nextQueue;
      if (nextQueue.length > 0) hasUnfilled = true;
    }
    if (!hasUnfilled) {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (regions[r][c] === -1) {
            hasUnfilled = true;
            break;
          }
        }
        if (hasUnfilled) break;
      }
      if (hasUnfilled) {
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            if (regions[r][c] === -1) {
              for (const [dr, dc] of dirs) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr][nc] !== -1) {
                  regions[r][c] = regions[nr][nc];
                  queues[regions[nr][nc]].push([r, c]);
                  break;
                }
              }
            }
          }
        }
      }
    }
  }

  return regions;
}

function hasUniqueSolution(n: number, regions: number[][]): boolean {
  let solutionCount = 0;
  const cols = new Array(n).fill(-1);
  const usedCols = new Set<number>();
  const usedRegions = new Set<number>();

  function isValid(row: number, col: number): boolean {
    if (usedCols.has(col)) return false;
    if (usedRegions.has(regions[row][col])) return false;
    if (row > 0) {
      const prevCol = cols[row - 1];
      if (Math.abs(prevCol - col) <= 1) return false;
    }
    return true;
  }

  function solve(row: number): boolean {
    if (row === n) {
      solutionCount++;
      return solutionCount > 1;
    }
    for (let col = 0; col < n; col++) {
      if (isValid(row, col)) {
        cols[row] = col;
        usedCols.add(col);
        usedRegions.add(regions[row][col]);
        if (solve(row + 1)) return true;
        usedCols.delete(col);
        usedRegions.delete(regions[row][col]);
        cols[row] = -1;
      }
    }
    return false;
  }

  solve(0);
  return solutionCount === 1;
}

export function generatePuzzle(size: number): TPuzzle {
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const queens = generateQueenPlacement(size);
    if (!queens) continue;

    for (let regionAttempt = 0; regionAttempt < 5; regionAttempt++) {
      const regions = generateRegions(size, queens);

      let allFilled = true;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (regions[r][c] === -1) { allFilled = false; break; }
        }
        if (!allFilled) break;
      }
      if (!allFilled) continue;

      if (hasUniqueSolution(size, regions)) {
        const solution: boolean[][] = Array.from({ length: size }, () =>
          new Array(size).fill(false)
        );
        queens.forEach(([r, c]) => { solution[r][c] = true; });
        return { size, regions, solution };
      }
    }
  }

  return generatePuzzle(size);
}
