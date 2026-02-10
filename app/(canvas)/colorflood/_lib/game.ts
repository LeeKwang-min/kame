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
  GRID_SIZE,
  CELL_SIZE,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  MAX_MOVES,
  NUM_COLORS,
  COLORS,
  PALETTE_Y,
  PALETTE_SIZE,
  PALETTE_GAP,
} from './config';
import { TGrid, TMoveHistory } from './types';

export type TColorFloodCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export function setupColorFlood(
  canvas: HTMLCanvasElement,
  callbacks?: TColorFloodCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' = 'start';
  let grid: TGrid = [];
  let moves = 0;
  let score = 0;
  let level = 1;
  let history: TMoveHistory = [];
  let startTime = 0;
  let animationId = 0;
  let lastTime = 0;

  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      if (callbacks?.onScoreSave) {
        return callbacks.onScoreSave(finalScore);
      }
      return { saved: false };
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'colorflood',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  function generateGrid(): TGrid {
    const g: TGrid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      g[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        g[r][c] = Math.floor(Math.random() * NUM_COLORS);
      }
    }
    return g;
  }

  function cloneGrid(g: TGrid): TGrid {
    return g.map((row) => [...row]);
  }

  function getOwnedRegion(g: TGrid): Set<string> {
    const owned = new Set<string>();
    const targetColor = g[0][0];
    const queue: [number, number][] = [[0, 0]];
    owned.add('0,0');
    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nr = r + dr;
        const nc = c + dc;
        const key = `${nr},${nc}`;
        if (
          nr >= 0 &&
          nr < GRID_SIZE &&
          nc >= 0 &&
          nc < GRID_SIZE &&
          !owned.has(key) &&
          g[nr][nc] === targetColor
        ) {
          owned.add(key);
          queue.push([nr, nc]);
        }
      }
    }
    return owned;
  }

  function applyFlood(colorIndex: number): boolean {
    if (colorIndex === grid[0][0]) return false;
    history.push({ grid: cloneGrid(grid), colorIndex: grid[0][0] });
    const owned = getOwnedRegion(grid);
    for (const key of owned) {
      const [r, c] = key.split(',').map(Number);
      grid[r][c] = colorIndex;
    }
    moves++;
    return true;
  }

  function checkWin(): boolean {
    const color = grid[0][0];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] !== color) return false;
      }
    }
    return true;
  }

  function handleColorPick(colorIndex: number) {
    if (state !== 'playing') return;
    if (!applyFlood(colorIndex)) return;

    if (checkWin()) {
      const remaining = MAX_MOVES - moves;
      const timeBonus = Math.max(
        0,
        Math.floor(300 - ((performance.now() - startTime) / 1000) * 5),
      );
      score += 1000 + remaining * 100 + timeBonus;
      level++;
      grid = generateGrid();
      moves = 0;
      history = [];
      startTime = performance.now();
    } else if (moves >= MAX_MOVES) {
      state = 'gameover';
    }
  }

  function undo() {
    if (history.length === 0) return;
    const last = history.pop()!;
    grid = last.grid;
    moves--;
  }

  async function startGame() {
    if (state === 'loading') return;
    state = 'loading';
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    state = 'playing';
    grid = generateGrid();
    moves = 0;
    score = 0;
    level = 1;
    history = [];
    startTime = performance.now();
  }

  function resetGame() {
    state = 'start';
    grid = [];
    moves = 0;
    score = 0;
    level = 1;
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

    // Check palette click
    const paletteStartX =
      (CANVAS_WIDTH -
        (NUM_COLORS * PALETTE_SIZE + (NUM_COLORS - 1) * PALETTE_GAP)) /
      2;
    if (pos.y >= PALETTE_Y && pos.y <= PALETTE_Y + PALETTE_SIZE) {
      for (let i = 0; i < NUM_COLORS; i++) {
        const px = paletteStartX + i * (PALETTE_SIZE + PALETTE_GAP);
        if (pos.x >= px && pos.x <= px + PALETTE_SIZE) {
          handleColorPick(i);
          return;
        }
      }
    }

    // Check grid click
    const gx = Math.floor((pos.x - GRID_OFFSET_X) / CELL_SIZE);
    const gy = Math.floor((pos.y - GRID_OFFSET_Y) / CELL_SIZE);
    if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
      handleColorPick(grid[gy][gx]);
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    // Game over HUD handles keys first
    if (state === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    switch (e.code) {
      case 'KeyS':
        if (state === 'start') {
          startGame();
        } else if (state === 'paused') {
          state = 'playing';
        }
        break;
      case 'KeyP':
        if (state === 'playing') {
          state = 'paused';
        } else if (state === 'paused') {
          state = 'playing';
        }
        break;
      case 'KeyR':
        if (state !== 'gameover') {
          resetGame();
        }
        break;
      case 'KeyZ':
        if (state === 'playing') {
          undo();
        }
        break;
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
      case 'Digit6':
        if (state === 'playing') {
          const idx = parseInt(e.code.charAt(5)) - 1;
          handleColorPick(idx);
        }
        break;
    }
  };

  // --- Render ---
  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (state === 'playing' || state === 'paused' || state === 'gameover') {
      // Draw grid
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          ctx.fillStyle = COLORS[grid[r][c]];
          ctx.fillRect(
            GRID_OFFSET_X + c * CELL_SIZE + 1,
            GRID_OFFSET_Y + r * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2,
          );
        }
      }

      // Draw palette
      const paletteStartX =
        (CANVAS_WIDTH -
          (NUM_COLORS * PALETTE_SIZE + (NUM_COLORS - 1) * PALETTE_GAP)) /
        2;
      for (let i = 0; i < NUM_COLORS; i++) {
        const px = paletteStartX + i * (PALETTE_SIZE + PALETTE_GAP);
        ctx.fillStyle = COLORS[i];
        ctx.beginPath();
        ctx.roundRect(px, PALETTE_Y, PALETTE_SIZE, PALETTE_SIZE, 8);
        ctx.fill();

        // Number label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `${i + 1}`,
          px + PALETTE_SIZE / 2,
          PALETTE_Y + PALETTE_SIZE / 2,
        );

        // Highlight current color
        if (grid.length > 0 && grid[0][0] === i) {
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(
            px - 2,
            PALETTE_Y - 2,
            PALETTE_SIZE + 4,
            PALETTE_SIZE + 4,
            10,
          );
          ctx.stroke();
        }
      }

      // HUD - top
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Moves: ${moves}/${MAX_MOVES}`, 15, 15);
      ctx.textAlign = 'center';
      ctx.fillText(`Level ${level}`, CANVAS_WIDTH / 2, 15);
      ctx.textAlign = 'right';
      ctx.fillText(`Score: ${score}`, CANVAS_WIDTH - 15, 15);
    }

    // Overlays
    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
    } else if (state === 'start') {
      gameStartHud(canvas, ctx);

      // 게임 설명
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cx = CANVAS_WIDTH / 2;
      const cy = CANVAS_HEIGHT / 2;
      ctx.fillText(
        'Pick a color to flood from the top-left corner.',
        cx,
        cy + 70,
      );
      ctx.fillText(
        `Fill the entire grid within ${MAX_MOVES} moves!`,
        cx,
        cy + 95,
      );
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '13px sans-serif';
      ctx.fillText(
        'Click colors / Press 1-6 | Z: Undo',
        cx,
        cy + 125,
      );
      ctx.restore();
    } else if (state === 'paused') {
      gamePauseHud(canvas, ctx);
    } else if (state === 'gameover') {
      gameOverHud.render(score);
    }
  }

  // --- Game Loop ---
  function gameLoop(timestamp: number) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    render();

    animationId = requestAnimationFrame(gameLoop);
  }

  // --- Setup ---
  canvas.addEventListener('click', handleClick);
  window.addEventListener('keydown', handleKeyDown);

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('click', handleClick);
    window.removeEventListener('keydown', handleKeyDown);
  };
}
