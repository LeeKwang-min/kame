import { RIPPLE_MAX_DISTANCE, RIPPLE_VALUES } from './config';
import { TBoard, TCell, TPuzzle } from './types';

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function computeRippleBoard(
  size: number,
  stonePositions: [number, number][],
): number[][] {
  const values: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  for (const [sr, sc] of stonePositions) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const dist = Math.max(Math.abs(r - sr), Math.abs(c - sc));
        if (dist <= RIPPLE_MAX_DISTANCE) {
          values[r][c] += RIPPLE_VALUES[dist];
        }
      }
    }
  }
  return values;
}

function hasUniqueSolution(
  size: number,
  revealedValues: Map<string, number>,
  stoneCount: number,
): boolean {
  const totalCells = size * size;
  let solutionCount = 0;

  // Pre-compute revealed cells list for fast iteration
  const revealedList: { r: number; c: number; target: number }[] = [];
  for (const [key, target] of revealedValues) {
    const [r, c] = key.split(',').map(Number);
    revealedList.push({ r, c, target });
  }

  // Current stone placement
  const stones: [number, number][] = [];

  // Running ripple contribution board for pruning
  const board: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

  function addStone(sr: number, sc: number) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const dist = Math.max(Math.abs(r - sr), Math.abs(c - sc));
        if (dist <= RIPPLE_MAX_DISTANCE) {
          board[r][c] += RIPPLE_VALUES[dist];
        }
      }
    }
  }

  function removeStone(sr: number, sc: number) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const dist = Math.max(Math.abs(r - sr), Math.abs(c - sc));
        if (dist <= RIPPLE_MAX_DISTANCE) {
          board[r][c] -= RIPPLE_VALUES[dist];
        }
      }
    }
  }

  function checkPruning(remaining: number): boolean {
    // Check if any revealed cell already exceeds its target
    // Also check if remaining stones can't possibly reach a target
    const maxContribution = RIPPLE_VALUES[0]; // max a single stone adds to a cell
    for (const { r, c, target } of revealedList) {
      if (board[r][c] > target) return false;
      // If even adding remaining stones at max contribution can't reach target
      if (board[r][c] + remaining * maxContribution < target) return false;
    }
    return true;
  }

  function checkAllRevealed(): boolean {
    for (const { r, c, target } of revealedList) {
      if (board[r][c] !== target) return false;
    }
    return true;
  }

  function solve(startIdx: number, remaining: number): boolean {
    if (remaining === 0) {
      if (checkAllRevealed()) {
        solutionCount++;
        if (solutionCount >= 2) return true; // found 2+, stop
      }
      return false;
    }

    // Not enough cells left to place remaining stones
    if (totalCells - startIdx < remaining) return false;

    if (!checkPruning(remaining)) return false;

    for (let idx = startIdx; idx <= totalCells - remaining; idx++) {
      const r = Math.floor(idx / size);
      const c = idx % size;

      addStone(r, c);
      stones.push([r, c]);

      if (checkPruning(remaining - 1)) {
        if (solve(idx + 1, remaining - 1)) return true;
      }

      stones.pop();
      removeStone(r, c);
    }

    return false;
  }

  solve(0, stoneCount);
  return solutionCount === 1;
}

export function generatePuzzle(
  size: number,
  stoneRange: [number, number],
  hintRatioRange: [number, number],
  maxAttempts: number,
): Promise<TPuzzle> {
  const batchSize = size <= 6 ? 100 : 50;

  return new Promise((resolve, reject) => {
    let attempt = 0;

    function processBatch() {
      const end = Math.min(attempt + batchSize, maxAttempts);

      while (attempt < end) {
        attempt++;

        // 1. Random stone count within range
        const stoneCount =
          stoneRange[0] +
          Math.floor(Math.random() * (stoneRange[1] - stoneRange[0] + 1));

        // 2. Random stone positions (shuffle all cells, take first K)
        const allCells: [number, number][] = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            allCells.push([r, c]);
          }
        }
        shuffle(allCells);
        const stonePositions = allCells.slice(0, stoneCount);

        // 3. Compute ripple board
        const values = computeRippleBoard(size, stonePositions);

        // 4. Start with all cells revealed
        const revealed: boolean[][] = Array.from({ length: size }, () =>
          Array(size).fill(true),
        );

        // 5. Shuffle cell order for hiding
        const cellOrder: [number, number][] = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            cellOrder.push([r, c]);
          }
        }
        shuffle(cellOrder);

        const totalCells = size * size;
        let revealedCount = totalCells;
        const targetMinRevealed = Math.ceil(hintRatioRange[0] * totalCells);
        const targetMaxRevealed = Math.floor(hintRatioRange[1] * totalCells);

        // 6. Try hiding each cell
        for (const [r, c] of cellOrder) {
          if (revealedCount <= targetMinRevealed) break;

          revealed[r][c] = false;
          revealedCount--;

          // Build revealed values map
          const revealedValues = new Map<string, number>();
          for (let rr = 0; rr < size; rr++) {
            for (let cc = 0; cc < size; cc++) {
              if (revealed[rr][cc]) {
                revealedValues.set(`${rr},${cc}`, values[rr][cc]);
              }
            }
          }

          // 7. Check if solution is still unique
          if (!hasUniqueSolution(size, revealedValues, stoneCount)) {
            // Re-reveal this cell
            revealed[r][c] = true;
            revealedCount++;
          }
        }

        // 8. Check if actual ratio is acceptable
        const actualRatio = revealedCount / totalCells;
        if (actualRatio > hintRatioRange[1] + 0.1) {
          // Too many revealed cells, reject and retry
          continue;
        }

        // 9. Build the board
        const board: TBoard = Array.from({ length: size }, (_, r) =>
          Array.from(
            { length: size },
            (_, c): TCell => ({
              value: values[r][c],
              revealed: revealed[r][c],
              hasStone: false,
              isError: false,
              isHinted: false,
            }),
          ),
        );

        return resolve({
          size,
          board,
          stonePositions,
          stoneCount,
        });
      }

      if (attempt < maxAttempts) {
        setTimeout(processBatch, 0);
      } else {
        reject(
          new Error(
            `Failed to generate ripple puzzle of size ${size} after ${maxAttempts} attempts`,
          ),
        );
      }
    }

    processBatch();
  });
}
