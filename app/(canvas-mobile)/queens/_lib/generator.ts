import { TPuzzle } from './types';

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateRandomRegions(n: number): number[][] {
  const grid: number[][] = Array.from({ length: n }, () => new Array(n).fill(-1));
  const dirs: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  const allCells: [number, number][] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) allCells.push([r, c]);
  shuffle(allCells);

  const frontiers: [number, number][][] = [];
  for (let i = 0; i < n; i++) {
    const [r, c] = allCells[i];
    grid[r][c] = i;
    frontiers.push([[r, c]]);
  }

  let hasUnfilled = true;
  while (hasUnfilled) {
    hasUnfilled = false;
    const order = shuffle([...Array(n)].map((_, i) => i));
    for (const idx of order) {
      if (frontiers[idx].length === 0) continue;
      const nextFrontier: [number, number][] = [];
      for (const [r, c] of shuffle([...frontiers[idx]])) {
        for (const [dr, dc] of shuffle([...dirs])) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] === -1) {
            grid[nr][nc] = idx;
            nextFrontier.push([nr, nc]);
          }
        }
      }
      frontiers[idx] = nextFrontier;
      if (nextFrontier.length > 0) hasUnfilled = true;
    }

    if (!hasUnfilled) {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (grid[r][c] === -1) {
            hasUnfilled = true;
            break;
          }
        }
        if (hasUnfilled) break;
      }
      if (hasUnfilled) {
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            if (grid[r][c] === -1) {
              for (const [dr, dc] of dirs) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] !== -1) {
                  grid[r][c] = grid[nr][nc];
                  frontiers[grid[nr][nc]].push([r, c]);
                  break;
                }
              }
            }
          }
        }
      }
    }
  }

  return grid;
}

function findUniqueSolution(n: number, regions: number[][]): number[] | null {
  let solutionCount = 0;
  let foundSolution: number[] | null = null;
  const cols = new Array(n).fill(-1);
  const usedCols = new Set<number>();
  const usedRegions = new Set<number>();

  function isValid(row: number, col: number): boolean {
    if (usedCols.has(col)) return false;
    if (usedRegions.has(regions[row][col])) return false;
    if (row > 0 && Math.abs(cols[row - 1] - col) <= 1) return false;
    return true;
  }

  function solve(row: number): boolean {
    if (row === n) {
      solutionCount++;
      if (solutionCount === 1) foundSolution = [...cols];
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
  return solutionCount === 1 ? foundSolution : null;
}

export function generatePuzzle(size: number): Promise<TPuzzle> {
  const maxAttempts = size <= 5 ? 200 : size <= 7 ? 2000 : 10000;
  const batchSize = size <= 5 ? 200 : size <= 7 ? 100 : 50;

  return new Promise((resolve, reject) => {
    let attempt = 0;

    function processBatch() {
      const end = Math.min(attempt + batchSize, maxAttempts);
      while (attempt < end) {
        const regions = generateRandomRegions(size);
        const sol = findUniqueSolution(size, regions);
        if (sol) {
          const solution: boolean[][] = Array.from({ length: size }, () =>
            new Array(size).fill(false)
          );
          sol.forEach((col, row) => {
            solution[row][col] = true;
          });
          resolve({ size, regions, solution });
          return;
        }
        attempt++;
      }
      if (attempt < maxAttempts) {
        setTimeout(processBatch, 0);
      } else {
        reject(new Error(`Failed to generate puzzle of size ${size}`));
      }
    }

    processBatch();
  });
}
