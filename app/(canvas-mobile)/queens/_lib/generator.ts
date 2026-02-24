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

/**
 * 제약 전파 + 교차 제거 기법으로 논리적 풀이를 시도한다.
 * 성공 시 해답(각 행의 퀸 열 위치)을 반환, 실패 시 null.
 *
 * 사용 기법:
 * 1. Naked singles: 행/열/리전에 후보가 1개면 배치
 * 2. Region-Row/Col intersection: 리전의 후보가 한 행/열에만 있으면 해당 행/열의 다른 후보 제거
 * 3. Row/Col-Region intersection: 행/열의 후보가 한 리전에만 있으면 해당 리전의 다른 후보 제거
 *
 * 이 함수가 해답을 반환하면 유일 해가 보장된다.
 * (제약 전파로 모든 퀸을 배치 = 모든 단계가 강제 = 유일 해)
 */
function solveLogically(n: number, regions: number[][]): number[] | null {
  const candidates: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    candidates[r] = [];
    for (let c = 0; c < n; c++) {
      candidates[r][c] = true;
    }
  }

  const placed: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    placed[r] = [];
    for (let c = 0; c < n; c++) {
      placed[r][c] = false;
    }
  }

  let placedCount = 0;
  const rowDone = new Array(n).fill(false);
  const colDone = new Array(n).fill(false);
  const regDone = new Array(n).fill(false);

  function eliminate(pr: number, pc: number): void {
    for (let c = 0; c < n; c++) candidates[pr][c] = false;
    for (let r = 0; r < n; r++) candidates[r][pc] = false;
    const reg = regions[pr][pc];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (regions[r][c] === reg) candidates[r][c] = false;
      }
    }
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = pr + dr;
        const nc = pc + dc;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
          candidates[nr][nc] = false;
        }
      }
    }
  }

  function placeQueen(r: number, c: number): void {
    placed[r][c] = true;
    placedCount++;
    rowDone[r] = true;
    colDone[c] = true;
    regDone[regions[r][c]] = true;
    eliminate(r, c);
  }

  let progress = true;
  while (progress && placedCount < n) {
    progress = false;

    // Naked singles: 행에서 후보가 1개
    for (let r = 0; r < n; r++) {
      if (rowDone[r]) continue;
      let count = 0;
      let lastCol = -1;
      for (let c = 0; c < n; c++) {
        if (candidates[r][c]) { count++; lastCol = c; }
      }
      if (count === 1) { placeQueen(r, lastCol); progress = true; }
      else if (count === 0) return null;
    }

    // Naked singles: 열에서 후보가 1개
    for (let c = 0; c < n; c++) {
      if (colDone[c]) continue;
      let count = 0;
      let lastRow = -1;
      for (let r = 0; r < n; r++) {
        if (candidates[r][c]) { count++; lastRow = r; }
      }
      if (count === 1) { placeQueen(lastRow, c); progress = true; }
      else if (count === 0) return null;
    }

    // Naked singles: 리전에서 후보가 1개
    for (let reg = 0; reg < n; reg++) {
      if (regDone[reg]) continue;
      let count = 0;
      let lastR = -1;
      let lastC = -1;
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (regions[r][c] === reg && candidates[r][c]) {
            count++; lastR = r; lastC = c;
          }
        }
      }
      if (count === 1) { placeQueen(lastR, lastC); progress = true; }
      else if (count === 0) return null;
    }

    // naked singles로 진전이 있으면 다시 시도
    if (progress) continue;

    // Region-Row intersection: 리전의 후보가 한 행에만 존재하면
    // 해당 행의 다른 리전 후보를 제거
    for (let reg = 0; reg < n; reg++) {
      if (regDone[reg]) continue;
      let onlyRow = -1;
      let allInOneRow = true;
      for (let r = 0; r < n && allInOneRow; r++) {
        for (let c = 0; c < n; c++) {
          if (regions[r][c] === reg && candidates[r][c]) {
            if (onlyRow === -1) onlyRow = r;
            else if (onlyRow !== r) { allInOneRow = false; break; }
          }
        }
      }
      if (allInOneRow && onlyRow !== -1) {
        for (let c = 0; c < n; c++) {
          if (regions[onlyRow][c] !== reg && candidates[onlyRow][c]) {
            candidates[onlyRow][c] = false;
            progress = true;
          }
        }
      }
    }

    // Region-Column intersection: 리전의 후보가 한 열에만 존재하면
    // 해당 열의 다른 리전 후보를 제거
    for (let reg = 0; reg < n; reg++) {
      if (regDone[reg]) continue;
      let onlyCol = -1;
      let allInOneCol = true;
      for (let r = 0; r < n && allInOneCol; r++) {
        for (let c = 0; c < n; c++) {
          if (regions[r][c] === reg && candidates[r][c]) {
            if (onlyCol === -1) onlyCol = c;
            else if (onlyCol !== c) { allInOneCol = false; break; }
          }
        }
      }
      if (allInOneCol && onlyCol !== -1) {
        for (let r = 0; r < n; r++) {
          if (regions[r][onlyCol] !== reg && candidates[r][onlyCol]) {
            candidates[r][onlyCol] = false;
            progress = true;
          }
        }
      }
    }

    // Row-Region intersection: 행의 후보가 한 리전에만 존재하면
    // 해당 리전의 다른 행 후보를 제거
    for (let r = 0; r < n; r++) {
      if (rowDone[r]) continue;
      let onlyReg = -1;
      let allInOneReg = true;
      for (let c = 0; c < n; c++) {
        if (candidates[r][c]) {
          const reg = regions[r][c];
          if (onlyReg === -1) onlyReg = reg;
          else if (onlyReg !== reg) { allInOneReg = false; break; }
        }
      }
      if (allInOneReg && onlyReg !== -1) {
        for (let r2 = 0; r2 < n; r2++) {
          if (r2 === r) continue;
          for (let c = 0; c < n; c++) {
            if (regions[r2][c] === onlyReg && candidates[r2][c]) {
              candidates[r2][c] = false;
              progress = true;
            }
          }
        }
      }
    }

    // Column-Region intersection: 열의 후보가 한 리전에만 존재하면
    // 해당 리전의 다른 열 후보를 제거
    for (let c = 0; c < n; c++) {
      if (colDone[c]) continue;
      let onlyReg = -1;
      let allInOneReg = true;
      for (let r = 0; r < n; r++) {
        if (candidates[r][c]) {
          const reg = regions[r][c];
          if (onlyReg === -1) onlyReg = reg;
          else if (onlyReg !== reg) { allInOneReg = false; break; }
        }
      }
      if (allInOneReg && onlyReg !== -1) {
        for (let r = 0; r < n; r++) {
          for (let c2 = 0; c2 < n; c2++) {
            if (c2 === c) continue;
            if (regions[r][c2] === onlyReg && candidates[r][c2]) {
              candidates[r][c2] = false;
              progress = true;
            }
          }
        }
      }
    }
  }

  if (placedCount !== n) return null;

  const sol = new Array(n).fill(-1);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (placed[r][c]) sol[r] = c;
    }
  }
  return sol;
}

export function generatePuzzle(size: number): Promise<TPuzzle> {
  const maxAttempts = size <= 5 ? 500 : size <= 7 ? 5000 : 50000;
  const batchSize = size <= 5 ? 500 : size <= 7 ? 500 : 1000;

  return new Promise((resolve, reject) => {
    let attempt = 0;

    function processBatch() {
      const end = Math.min(attempt + batchSize, maxAttempts);
      while (attempt < end) {
        const regions = generateRandomRegions(size);
        const sol = solveLogically(size, regions);
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
