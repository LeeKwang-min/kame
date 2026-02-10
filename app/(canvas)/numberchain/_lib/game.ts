import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  INITIAL_GRID_SIZE,
  CELL_GAP,
  GRID_PADDING,
  GRID_TOP,
  HINT_PENALTY,
} from './config';
import { TChainCell } from './types';

export type TNumberChainCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export function setupNumberChain(
  canvas: HTMLCanvasElement,
  callbacks?: TNumberChainCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' = 'start';
  let gridSize = INITIAL_GRID_SIZE;
  let grid: TChainCell[][] = [];
  let solution: number[][] = []; // solution[r][c] = number at that position
  let currentNumber = 0; // last placed number
  let score = 0;
  let level = 1;
  let hints = 0;
  let startTime = 0;
  let history: { grid: TChainCell[][]; currentNumber: number }[] = [];
  let animationId = 0;
  let lastTime = 0;

  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      if (callbacks?.onScoreSave) return callbacks.onScoreSave(finalScore);
      return { saved: false };
    },
    onRestart: () => resetGame(),
  };

  const gameOverHud = createGameOverHud(canvas, ctx, 'numberchain', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  // Generate Hamiltonian path using Warnsdorff's heuristic
  function generatePath(size: number): number[][] | null {
    const path: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    const visited: boolean[][] = Array.from({ length: size }, () =>
      Array(size).fill(false),
    );

    function getNeighbors(r: number, c: number): [number, number][] {
      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      const neighbors: [number, number][] = [];
      for (const [dr, dc] of dirs) {
        const nr = r + dr,
          nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
          neighbors.push([nr, nc]);
        }
      }
      return neighbors;
    }

    function countDegree(r: number, c: number): number {
      return getNeighbors(r, c).length;
    }

    // Try multiple starting positions
    for (let attempt = 0; attempt < 50; attempt++) {
      // Reset
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          path[r][c] = 0;
          visited[r][c] = false;
        }
      }

      const sr = Math.floor(Math.random() * size);
      const sc = Math.floor(Math.random() * size);
      visited[sr][sc] = true;
      path[sr][sc] = 1;
      let count = 1;
      let cr = sr,
        cc = sc;

      while (count < size * size) {
        const neighbors = getNeighbors(cr, cc);
        if (neighbors.length === 0) break;

        // Warnsdorff: pick neighbor with fewest onward moves
        // Add randomness for variety
        neighbors.sort((a, b) => {
          const da = countDegree(a[0], a[1]);
          const db = countDegree(b[0], b[1]);
          if (da !== db) return da - db;
          return Math.random() - 0.5;
        });

        const [nr, nc] = neighbors[0];
        visited[nr][nc] = true;
        count++;
        path[nr][nc] = count;
        cr = nr;
        cc = nc;
      }

      if (count === size * size) return path;
    }
    return null;
  }

  function initLevel() {
    let path = generatePath(gridSize);
    // Retry if path generation fails
    while (!path) {
      path = generatePath(gridSize);
    }
    solution = path;

    const total = gridSize * gridSize;
    grid = Array.from({ length: gridSize }, () =>
      Array.from(
        { length: gridSize },
        (): TChainCell => ({
          value: 0,
          isAnchor: false,
          isHinted: false,
        }),
      ),
    );

    // Place anchors: first (1), last (N), and some in between
    const numAnchors = Math.floor(total * 0.3);
    const anchorNumbers = new Set<number>([1, total]);

    while (anchorNumbers.size < numAnchors) {
      anchorNumbers.add(Math.floor(Math.random() * total) + 1);
    }

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (anchorNumbers.has(solution[r][c])) {
          grid[r][c].value = solution[r][c];
          grid[r][c].isAnchor = true;
        }
      }
    }

    // Player starts by placing after anchor 1
    currentNumber = 0;
    history = [];
    startTime = performance.now();
  }

  function getCellSize(): number {
    const gridArea = CANVAS_WIDTH - 2 * GRID_PADDING;
    return Math.floor((gridArea - (gridSize - 1) * CELL_GAP) / gridSize);
  }

  function getGridOffset(): { x: number; y: number } {
    const cellSize = getCellSize();
    const totalW = gridSize * cellSize + (gridSize - 1) * CELL_GAP;
    return {
      x: (CANVAS_WIDTH - totalW) / 2,
      y: GRID_TOP,
    };
  }

  function findCell(num: number): [number, number] | null {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c].value === num) return [r, c];
      }
    }
    return null;
  }

  function findSolutionCell(num: number): [number, number] | null {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (solution[r][c] === num) return [r, c];
      }
    }
    return null;
  }

  function isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  function handleCellClick(row: number, col: number) {
    if (state !== 'playing') return;
    if (grid[row][col].isAnchor && grid[row][col].value !== 0) {
      // Clicking an anchor - if it's the next number, advance
      if (currentNumber === 0 && grid[row][col].value === 1) {
        currentNumber = 1;
        return;
      }
      if (grid[row][col].value === currentNumber + 1) {
        // Check adjacency
        const prevCell = findCell(currentNumber);
        if (prevCell && isAdjacent(prevCell[0], prevCell[1], row, col)) {
          currentNumber = grid[row][col].value;
          // Skip ahead if consecutive anchors
          while (true) {
            const nextAnchor = findCell(currentNumber + 1);
            if (nextAnchor && grid[nextAnchor[0]][nextAnchor[1]].isAnchor) {
              if (isAdjacent(row, col, nextAnchor[0], nextAnchor[1])) {
                currentNumber++;
                row = nextAnchor[0];
                col = nextAnchor[1];
              } else break;
            } else break;
          }
        }
      }
      return;
    }

    // Empty cell - try to place next number
    const nextNum = currentNumber + 1;
    if (nextNum > gridSize * gridSize) return;

    // Check that this cell should be nextNum in solution
    if (solution[row][col] !== nextNum) return;

    // Check adjacency to current number
    if (currentNumber > 0) {
      const prevCell = findCell(currentNumber);
      if (!prevCell || !isAdjacent(prevCell[0], prevCell[1], row, col)) return;
    }

    // Save history
    history.push({
      grid: grid.map((r) => r.map((c) => ({ ...c }))),
      currentNumber,
    });

    grid[row][col].value = nextNum;
    currentNumber = nextNum;

    // Auto-advance through anchors
    while (currentNumber < gridSize * gridSize) {
      const nextCell = findCell(currentNumber + 1);
      if (nextCell && grid[nextCell[0]][nextCell[1]].isAnchor) {
        const curCell = findCell(currentNumber)!;
        if (isAdjacent(curCell[0], curCell[1], nextCell[0], nextCell[1])) {
          currentNumber++;
        } else break;
      } else break;
    }

    // Check win
    if (currentNumber === gridSize * gridSize) {
      const timeBonus = Math.max(
        0,
        Math.floor(500 - ((performance.now() - startTime) / 1000) * 5),
      );
      score += gridSize * gridSize * 50 + timeBonus - hints * HINT_PENALTY;
      score = Math.max(0, score);
      level++;
      if (level === 3 && gridSize < 6) gridSize = 6;
      else if (level === 6 && gridSize < 7) gridSize = 7;
      hints = 0;
      initLevel();
    }
  }

  function useHint() {
    if (state !== 'playing') return;
    const nextNum = currentNumber + 1;
    if (nextNum > gridSize * gridSize) return;
    const cell = findSolutionCell(nextNum);
    if (!cell) return;

    // Save history
    history.push({
      grid: grid.map((r) => r.map((c) => ({ ...c }))),
      currentNumber,
    });

    grid[cell[0]][cell[1]].value = nextNum;
    grid[cell[0]][cell[1]].isHinted = true;
    currentNumber = nextNum;
    hints++;

    // Auto-advance through anchors
    while (currentNumber < gridSize * gridSize) {
      const nextCell = findCell(currentNumber + 1);
      if (nextCell && grid[nextCell[0]][nextCell[1]].isAnchor) {
        const curCell = findCell(currentNumber)!;
        if (isAdjacent(curCell[0], curCell[1], nextCell[0], nextCell[1])) {
          currentNumber++;
        } else break;
      } else break;
    }

    if (currentNumber === gridSize * gridSize) {
      const timeBonus = Math.max(
        0,
        Math.floor(500 - ((performance.now() - startTime) / 1000) * 5),
      );
      score += gridSize * gridSize * 50 + timeBonus - hints * HINT_PENALTY;
      score = Math.max(0, score);
      level++;
      if (level === 3 && gridSize < 6) gridSize = 6;
      else if (level === 6 && gridSize < 7) gridSize = 7;
      hints = 0;
      initLevel();
    }
  }

  function undo() {
    if (history.length === 0) return;
    const last = history.pop()!;
    grid = last.grid;
    currentNumber = last.currentNumber;
  }

  async function startGame() {
    if (state === 'loading') return;
    state = 'loading';
    if (callbacks?.onGameStart) await callbacks.onGameStart();
    state = 'playing';
    gridSize = INITIAL_GRID_SIZE;
    score = 0;
    level = 1;
    hints = 0;
    initLevel();
  }

  function resetGame() {
    state = 'start';
    score = 0;
    level = 1;
    hints = 0;
    gridSize = INITIAL_GRID_SIZE;
    gameOverHud.reset();
  }

  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  function handleClick(e: MouseEvent) {
    if (state !== 'playing') return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    const cellSize = getCellSize();
    const offset = getGridOffset();

    const col = Math.floor((pos.x - offset.x) / (cellSize + CELL_GAP));
    const row = Math.floor((pos.y - offset.y) / (cellSize + CELL_GAP));
    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
      handleCellClick(row, col);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.repeat) return;

    if (state === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    switch (e.code) {
      case 'KeyS':
        if (state === 'start') startGame();
        else if (state === 'paused') state = 'playing';
        break;
      case 'KeyP':
        if (state === 'playing') state = 'paused';
        else if (state === 'paused') state = 'playing';
        break;
      case 'KeyR':
        if (state !== 'gameover') resetGame();
        break;
      case 'KeyZ':
        if (state === 'playing') undo();
        break;
      case 'KeyH':
        if (state === 'playing') useHint();
        break;
      case 'Escape':
        if (state === 'playing' && score > 0) state = 'gameover';
        break;
    }
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (
      (state === 'playing' || state === 'paused' || state === 'gameover') &&
      grid.length > 0
    ) {
      const cellSize = getCellSize();
      const offset = getGridOffset();

      // Draw grid
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = offset.x + c * (cellSize + CELL_GAP);
          const y = offset.y + r * (cellSize + CELL_GAP);
          const cell = grid[r][c];

          // Cell background
          if (cell.isAnchor) {
            ctx.fillStyle = '#2c3e50';
          } else if (cell.value > 0) {
            ctx.fillStyle = cell.isHinted ? '#8e44ad' : '#2980b9';
          } else {
            ctx.fillStyle = '#2a2a3a';
          }
          ctx.beginPath();
          ctx.roundRect(x, y, cellSize, cellSize, 6);
          ctx.fill();

          // Number text
          if (cell.value > 0) {
            ctx.fillStyle = cell.isAnchor ? '#f1c40f' : 'white';
            ctx.font = `bold ${cellSize * 0.4}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${cell.value}`, x + cellSize / 2, y + cellSize / 2);
          }

        }
      }

      // Draw connection lines between consecutive numbers
      ctx.strokeStyle = 'rgba(52, 152, 219, 0.4)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let num = 1; num < currentNumber; num++) {
        const c1 = findCell(num);
        const c2 = findCell(num + 1);
        if (c1 && c2) {
          const x1 = offset.x + c1[1] * (cellSize + CELL_GAP) + cellSize / 2;
          const y1 = offset.y + c1[0] * (cellSize + CELL_GAP) + cellSize / 2;
          const x2 = offset.x + c2[1] * (cellSize + CELL_GAP) + cellSize / 2;
          const y2 = offset.y + c2[0] * (cellSize + CELL_GAP) + cellSize / 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      // HUD
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Level ${level} (${gridSize}x${gridSize})`, 15, 15);
      ctx.textAlign = 'center';
      ctx.fillText(
        `${currentNumber}/${gridSize * gridSize}`,
        CANVAS_WIDTH / 2,
        15,
      );
      ctx.textAlign = 'right';
      ctx.fillText(`Score: ${score}`, CANVAS_WIDTH - 15, 15);

      // Bottom hint
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `H: Hint (-${HINT_PENALTY}pts) | Z: Undo | ESC: End`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT - 20,
      );
    }

    if (state === 'loading') gameLoadingHud(canvas, ctx);
    else if (state === 'start') gameStartHud(canvas, ctx);
    else if (state === 'paused') gamePauseHud(canvas, ctx);
    else if (state === 'gameover') gameOverHud.render(score);
  }

  function gameLoop(timestamp: number) {
    lastTime = timestamp;
    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  canvas.addEventListener('click', handleClick);
  window.addEventListener('keydown', handleKeyDown);
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('click', handleClick);
    window.removeEventListener('keydown', handleKeyDown);
  };
}
