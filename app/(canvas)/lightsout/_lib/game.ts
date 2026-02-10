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
  MAX_GRID_SIZE,
  CELL_GAP,
} from './config';
import { TLightGrid, TMoveRecord } from './types';

export type TLightsOutCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export function setupLightsOut(
  canvas: HTMLCanvasElement,
  callbacks?: TLightsOutCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' = 'start';
  let grid: TLightGrid = [];
  let gridSize = INITIAL_GRID_SIZE;
  let moves = 0;
  let score = 0;
  let level = 1;
  let cursorRow = 0;
  let cursorCol = 0;
  let history: TMoveRecord[] = [];
  let startTime = 0;
  let animationId = 0;
  let lastTime = 0;

  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      if (callbacks?.onScoreSave) return callbacks.onScoreSave(finalScore);
      return { saved: false };
    },
    onRestart: () => resetGame(),
  };

  const gameOverHud = createGameOverHud(canvas, ctx, 'lightsout', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  function createGrid(size: number): TLightGrid {
    return Array.from({ length: size }, () => Array(size).fill(false));
  }

  function toggleCell(g: TLightGrid, row: number, col: number) {
    const size = g.length;
    const toggle = (r: number, c: number) => {
      if (r >= 0 && r < size && c >= 0 && c < size) g[r][c] = !g[r][c];
    };
    toggle(row, col);
    toggle(row - 1, col);
    toggle(row + 1, col);
    toggle(row, col - 1);
    toggle(row, col + 1);
  }

  function generatePuzzle(size: number): TLightGrid {
    const g = createGrid(size);
    // Random toggles from solved state (guarantees solvability)
    const numToggles = Math.floor(size * size * 0.4) + level * 2;
    for (let i = 0; i < numToggles; i++) {
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      toggleCell(g, r, c);
    }
    // Make sure it's not already solved
    if (isAllOff(g)) {
      toggleCell(g, 0, 0);
    }
    return g;
  }

  function isAllOff(g: TLightGrid): boolean {
    return g.every((row) => row.every((cell) => !cell));
  }

  function getCellSize(): number {
    const gridArea = Math.min(CANVAS_WIDTH - 60, CANVAS_HEIGHT - 160);
    return Math.floor((gridArea - (gridSize - 1) * CELL_GAP) / gridSize);
  }

  function getGridOffset(): { x: number; y: number } {
    const cellSize = getCellSize();
    const totalWidth = gridSize * cellSize + (gridSize - 1) * CELL_GAP;
    const totalHeight = gridSize * cellSize + (gridSize - 1) * CELL_GAP;
    return {
      x: (CANVAS_WIDTH - totalWidth) / 2,
      y: 70 + (CANVAS_HEIGHT - 160 - totalHeight) / 2,
    };
  }

  function handleCellClick(row: number, col: number) {
    if (state !== 'playing') return;
    toggleCell(grid, row, col);
    moves++;
    history.push({ row, col });

    if (isAllOff(grid)) {
      const moveEfficiency = Math.max(0, 200 - moves * 10);
      const timeBonus = Math.max(
        0,
        Math.floor(200 - ((performance.now() - startTime) / 1000) * 3),
      );
      score += level * 200 + moveEfficiency + timeBonus;
      level++;
      if (gridSize < MAX_GRID_SIZE && level % 3 === 1 && level > 1) {
        gridSize++;
      }
      grid = generatePuzzle(gridSize);
      moves = 0;
      history = [];
      cursorRow = 0;
      cursorCol = 0;
      startTime = performance.now();
    }
  }

  function undo() {
    if (history.length === 0) return;
    const last = history.pop()!;
    toggleCell(grid, last.row, last.col);
    moves--;
  }

  async function startGame() {
    if (state === 'loading') return;
    state = 'loading';
    if (callbacks?.onGameStart) await callbacks.onGameStart();
    state = 'playing';
    gridSize = INITIAL_GRID_SIZE;
    grid = generatePuzzle(gridSize);
    moves = 0;
    score = 0;
    level = 1;
    history = [];
    cursorRow = 0;
    cursorCol = 0;
    startTime = performance.now();
  }

  function resetGame() {
    state = 'start';
    grid = [];
    moves = 0;
    score = 0;
    level = 1;
    gridSize = INITIAL_GRID_SIZE;
    history = [];
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
      // Verify click is within cell bounds (not in gap)
      const cellX = offset.x + col * (cellSize + CELL_GAP);
      const cellY = offset.y + row * (cellSize + CELL_GAP);
      if (
        pos.x >= cellX &&
        pos.x <= cellX + cellSize &&
        pos.y >= cellY &&
        pos.y <= cellY + cellSize
      ) {
        cursorRow = row;
        cursorCol = col;
        handleCellClick(row, col);
      }
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
      case 'Escape':
        if (state === 'playing' && score > 0) {
          state = 'gameover';
        }
        break;
      case 'ArrowUp':
        if (state === 'playing') cursorRow = Math.max(0, cursorRow - 1);
        break;
      case 'ArrowDown':
        if (state === 'playing') cursorRow = Math.min(gridSize - 1, cursorRow + 1);
        break;
      case 'ArrowLeft':
        if (state === 'playing') cursorCol = Math.max(0, cursorCol - 1);
        break;
      case 'ArrowRight':
        if (state === 'playing') cursorCol = Math.min(gridSize - 1, cursorCol + 1);
        break;
      case 'Space':
        if (state === 'playing') handleCellClick(cursorRow, cursorCol);
        break;
    }
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (state === 'playing' || state === 'paused' || state === 'gameover') {
      const cellSize = getCellSize();
      const offset = getGridOffset();

      // Draw grid
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = offset.x + c * (cellSize + CELL_GAP);
          const y = offset.y + r * (cellSize + CELL_GAP);

          if (grid[r][c]) {
            // Light ON - bright yellow glow
            const grad = ctx.createRadialGradient(
              x + cellSize / 2,
              y + cellSize / 2,
              0,
              x + cellSize / 2,
              y + cellSize / 2,
              cellSize * 0.7,
            );
            grad.addColorStop(0, '#fff7a0');
            grad.addColorStop(0.7, '#f0d000');
            grad.addColorStop(1, '#c8a800');
            ctx.fillStyle = grad;
          } else {
            // Light OFF - dark
            ctx.fillStyle = '#2a2a3a';
          }
          ctx.beginPath();
          ctx.roundRect(x, y, cellSize, cellSize, 6);
          ctx.fill();

          // Cursor highlight
          if (r === cursorRow && c === cursorCol && state === 'playing') {
            ctx.strokeStyle = '#00fff5';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x - 2, y - 2, cellSize + 4, cellSize + 4, 8);
            ctx.stroke();
          }
        }
      }

      // HUD
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Moves: ${moves}`, 15, 15);
      ctx.textAlign = 'center';
      ctx.fillText(`Level ${level} (${gridSize}x${gridSize})`, CANVAS_WIDTH / 2, 15);
      ctx.textAlign = 'right';
      ctx.fillText(`Score: ${score}`, CANVAS_WIDTH - 15, 15);

      // Bottom hint
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ESC: End game & save score', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 25);
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
