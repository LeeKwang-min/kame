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
  HINT_AREA_SIZE,
  CELL_GAP,
} from './config';
import { TCellState, THint } from './types';

export type TNonogramCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export function setupNonogram(
  canvas: HTMLCanvasElement,
  callbacks?: TNonogramCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' = 'start';
  let gridSize = INITIAL_GRID_SIZE;
  let solution: boolean[][] = [];
  let playerGrid: TCellState[][] = [];
  let rowHints: THint[] = [];
  let colHints: THint[] = [];
  let score = 0;
  let level = 1;
  let streak = 0;
  let startTime = 0;
  let history: { grid: TCellState[][] }[] = [];
  let animationId = 0;
  let lastTime = 0;
  let isShiftHeld = false;

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
    'nonogram',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  function generateSolution(size: number): boolean[][] {
    const fillRate = 0.4 + Math.random() * 0.2;
    return Array.from({ length: size }, () =>
      Array.from({ length: size }, () => Math.random() < fillRate),
    );
  }

  function computeHints(line: boolean[]): THint {
    const hints: number[] = [];
    let count = 0;
    for (const cell of line) {
      if (cell) {
        count++;
      } else if (count > 0) {
        hints.push(count);
        count = 0;
      }
    }
    if (count > 0) hints.push(count);
    return hints.length === 0 ? [0] : hints;
  }

  function createEmptyGrid(size: number): TCellState[][] {
    return Array.from({ length: size }, () =>
      Array.from({ length: size }, () => 'empty' as TCellState),
    );
  }

  function clonePlayerGrid(): TCellState[][] {
    return playerGrid.map((row) => [...row]);
  }

  function getCellSize(): number {
    const gridArea = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) - HINT_AREA_SIZE - 40;
    return Math.floor((gridArea - (gridSize - 1) * CELL_GAP) / gridSize);
  }

  function getGridOffset(): { x: number; y: number } {
    return { x: HINT_AREA_SIZE, y: HINT_AREA_SIZE };
  }

  function checkSolution(): boolean {
    // 힌트 기반 검증: 플레이어 그리드에서 계산한 힌트가 원래 힌트와 일치하는지 확인
    // (정답이 여러 개 있을 수 있으므로 solution 배열과 직접 비교하지 않음)
    for (let r = 0; r < gridSize; r++) {
      const playerRow = playerGrid[r].map((cell) => cell === 'filled');
      const playerRowHint = computeHints(playerRow);
      if (playerRowHint.length !== rowHints[r].length) return false;
      for (let i = 0; i < playerRowHint.length; i++) {
        if (playerRowHint[i] !== rowHints[r][i]) return false;
      }
    }
    for (let c = 0; c < gridSize; c++) {
      const playerCol = playerGrid.map((row) => row[c] === 'filled');
      const playerColHint = computeHints(playerCol);
      if (playerColHint.length !== colHints[c].length) return false;
      for (let i = 0; i < playerColHint.length; i++) {
        if (playerColHint[i] !== colHints[c][i]) return false;
      }
    }
    return true;
  }

  function initLevel() {
    solution = generateSolution(gridSize);
    playerGrid = createEmptyGrid(gridSize);
    rowHints = solution.map((row) => computeHints(row));
    colHints = [];
    for (let c = 0; c < gridSize; c++) {
      const col = solution.map((row) => row[c]);
      colHints.push(computeHints(col));
    }
    history = [];
    startTime = performance.now();
  }

  function handleCellClick(row: number, col: number, markX: boolean) {
    if (state !== 'playing') return;
    history.push({ grid: clonePlayerGrid() });

    if (markX) {
      playerGrid[row][col] =
        playerGrid[row][col] === 'marked' ? 'empty' : 'marked';
    } else {
      playerGrid[row][col] =
        playerGrid[row][col] === 'filled' ? 'empty' : 'filled';
    }

    if (checkSolution()) {
      streak++;
      const timeBonus = Math.max(
        0,
        Math.floor(300 - ((performance.now() - startTime) / 1000) * 5),
      );
      const streakBonus = streak > 1 ? streak * 50 : 0;
      score += gridSize * gridSize * 10 + timeBonus + streakBonus;
      level++;
      if (level === 3) gridSize = 8;
      else if (level === 6) gridSize = 10;
      initLevel();
    }
  }

  function undo() {
    if (history.length === 0) return;
    playerGrid = history.pop()!.grid;
  }

  async function startGame() {
    if (state === 'loading') return;
    state = 'loading';
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    state = 'playing';
    gridSize = INITIAL_GRID_SIZE;
    score = 0;
    level = 1;
    streak = 0;
    initLevel();
  }

  function resetGame() {
    state = 'start';
    score = 0;
    level = 1;
    streak = 0;
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
      handleCellClick(row, col, e.shiftKey || isShiftHeld);
    }
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    if (state !== 'playing') return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    const cellSize = getCellSize();
    const offset = getGridOffset();

    const col = Math.floor((pos.x - offset.x) / (cellSize + CELL_GAP));
    const row = Math.floor((pos.y - offset.y) / (cellSize + CELL_GAP));
    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
      handleCellClick(row, col, true);
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      isShiftHeld = true;
      return;
    }

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
      case 'Escape':
        if (state === 'playing' && score > 0) {
          state = 'gameover';
        }
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      isShiftHeld = false;
    }
  };

  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (
      (state === 'playing' || state === 'paused' || state === 'gameover') &&
      solution.length > 0
    ) {
      const cellSize = getCellSize();
      const offset = getGridOffset();

      // Draw column hints
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.min(14, cellSize * 0.35)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      for (let c = 0; c < gridSize; c++) {
        const x = offset.x + c * (cellSize + CELL_GAP) + cellSize / 2;
        const hints = colHints[c];
        for (let i = 0; i < hints.length; i++) {
          const y = offset.y - 5 - (hints.length - 1 - i) * 16;
          ctx.fillText(`${hints[i]}`, x, y);
        }
      }

      // Draw row hints
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let r = 0; r < gridSize; r++) {
        const y = offset.y + r * (cellSize + CELL_GAP) + cellSize / 2;
        const hints = rowHints[r];
        for (let i = 0; i < hints.length; i++) {
          const x = offset.x - 8 - (hints.length - 1 - i) * 20;
          ctx.fillText(`${hints[i]}`, x, y);
        }
      }

      // Draw grid
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = offset.x + c * (cellSize + CELL_GAP);
          const y = offset.y + r * (cellSize + CELL_GAP);

          if (playerGrid[r][c] === 'filled') {
            ctx.fillStyle = '#3498db';
          } else {
            ctx.fillStyle = '#2a2a3a';
          }
          ctx.beginPath();
          ctx.roundRect(x, y, cellSize, cellSize, 3);
          ctx.fill();

          // Draw X for marked cells
          if (playerGrid[r][c] === 'marked') {
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            const pad = cellSize * 0.25;
            ctx.beginPath();
            ctx.moveTo(x + pad, y + pad);
            ctx.lineTo(x + cellSize - pad, y + cellSize - pad);
            ctx.moveTo(x + cellSize - pad, y + pad);
            ctx.lineTo(x + pad, y + cellSize - pad);
            ctx.stroke();
          }

          // Grid lines for 5-cell groups
          if ((c + 1) % 5 === 0 && c < gridSize - 1) {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + cellSize + CELL_GAP / 2, offset.y);
            ctx.lineTo(
              x + cellSize + CELL_GAP / 2,
              offset.y + gridSize * (cellSize + CELL_GAP),
            );
            ctx.stroke();
          }
          if ((r + 1) % 5 === 0 && r < gridSize - 1) {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(offset.x, y + cellSize + CELL_GAP / 2);
            ctx.lineTo(
              offset.x + gridSize * (cellSize + CELL_GAP),
              y + cellSize + CELL_GAP / 2,
            );
            ctx.stroke();
          }
        }
      }

      // HUD
      ctx.fillStyle = 'white';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Level ${level} (${gridSize}x${gridSize})`, 15, 15);
      ctx.textAlign = 'right';
      ctx.fillText(`Score: ${score}`, CANVAS_WIDTH - 15, 15);

      // Bottom hints
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Click: Fill | Shift+Click/Right-click: Mark X | Z: Undo | ESC: End',
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT - 20,
      );
    }

    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
    } else if (state === 'start') {
      gameStartHud(canvas, ctx);
    } else if (state === 'paused') {
      gamePauseHud(canvas, ctx);
    } else if (state === 'gameover') {
      gameOverHud.render(score);
    }
  }

  function gameLoop(timestamp: number) {
    lastTime = timestamp;
    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('contextmenu', handleContextMenu);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}
