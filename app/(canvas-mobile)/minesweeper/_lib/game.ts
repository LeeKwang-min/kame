import {
  createGameOverHud,
  gameLoadingHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HUD_HEIGHT,
  PADDING,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  NUMBER_COLORS,
  CELL_HIDDEN_COLOR,
  CELL_HIDDEN_LIGHT,
  CELL_HIDDEN_DARK,
  CELL_REVEALED_COLOR,
  CELL_REVEALED_BORDER,
  BACKGROUND_COLOR,
  HUD_TEXT_COLOR,
  MINE_COLOR,
  FLAG_COLOR,
  MINE_HIT_BG,
  LONG_PRESS_DURATION,
  LONG_PRESS_MOVE_THRESHOLD,
  MIN_ZOOM,
  MAX_ZOOM,
} from './config';
import { TCell, TDifficulty } from './types';

export type TMinesweeperCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

type TDifficultyButton = {
  x: number;
  y: number;
  w: number;
  h: number;
  difficulty: TDifficulty;
};

export function setupMinesweeper(
  canvas: HTMLCanvasElement,
  callbacks?: TMinesweeperCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;

  // DPR resize
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' =
    'start';
  let difficulty: TDifficulty = 'intermediate';
  let grid: TCell[][] = [];
  let firstClick = true;
  let score = 0;
  let startTime = 0;
  let elapsedBeforePause = 0;
  let hitMineRow = -1;
  let hitMineCol = -1;
  let won = false;
  let animationId = 0;
  let lastTime = 0;
  let hoveredDifficulty: TDifficulty | null = null;

  // Touch state
  let touchActive = false;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressTriggered = false;
  let touchStartPos = { x: 0, y: 0 };
  let longPressCell: { row: number; col: number } | null = null;
  let longPressProgress = 0;
  let longPressStartTime = 0;

  // Zoom/pan state
  let zoomScale = 1;
  let panX = 0;
  let panY = 0;

  // Pinch state
  let isPinching = false;
  let wasPinching = false;
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let pinchMidX = 0;
  let pinchMidY = 0;

  // Pan state
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let touchStartCanvasPos = { x: 0, y: 0 };

  const difficultyButtons: TDifficultyButton[] = [];

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
    'minesweeper',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Zoom/pan helpers ---
  function getGamePos(canvasX: number, canvasY: number) {
    return {
      x: (canvasX - panX) / zoomScale,
      y: (canvasY - panY) / zoomScale,
    };
  }

  function clampPan() {
    if (zoomScale <= 1) {
      panX = 0;
      panY = 0;
      return;
    }

    if (grid.length === 0) return;

    const { cellSize, offsetX, offsetY } = getCellLayout();
    const config = DIFFICULTIES[difficulty];
    const gridW = config.cols * cellSize;
    const gridH = config.rows * cellSize;

    const margin = 50;

    // Horizontal clamp
    const minPanX = margin - (offsetX + gridW) * zoomScale;
    const maxPanX = CANVAS_WIDTH - margin - offsetX * zoomScale;
    panX = Math.max(minPanX, Math.min(maxPanX, panX));

    // Vertical clamp (respect HUD area)
    const minPanY = HUD_HEIGHT + margin - (offsetY + gridH) * zoomScale;
    const maxPanY = CANVAS_HEIGHT - margin - offsetY * zoomScale;
    panY = Math.max(minPanY, Math.min(maxPanY, panY));
  }

  function resetZoom() {
    zoomScale = 1;
    panX = 0;
    panY = 0;
  }

  // --- Grid/cell helpers ---
  function createEmptyGrid(rows: number, cols: number): TCell[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        isMine: false,
        state: 'hidden' as const,
        adjacentMines: 0,
      })),
    );
  }

  function placeMines(
    rows: number,
    cols: number,
    mineCount: number,
    safeRow: number,
    safeCol: number,
  ) {
    let placed = 0;
    while (placed < mineCount) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (grid[r][c].isMine) continue;
      if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
      grid[r][c].isMine = true;
      placed++;
    }
  }

  function computeAdjacent(rows: number, cols: number) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c].isMine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (grid[nr][nc].isMine) count++;
            }
          }
        }
        grid[r][c].adjacentMines = count;
      }
    }
  }

  function revealCell(row: number, col: number) {
    const config = DIFFICULTIES[difficulty];
    const cell = grid[row][col];
    if (cell.state !== 'hidden') return;

    cell.state = 'revealed';

    if (cell.adjacentMines === 0 && !cell.isMine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (
            nr >= 0 &&
            nr < config.rows &&
            nc >= 0 &&
            nc < config.cols
          ) {
            revealCell(nr, nc);
          }
        }
      }
    }
  }

  function chordReveal(row: number, col: number) {
    const config = DIFFICULTIES[difficulty];
    const cell = grid[row][col];
    if (cell.state !== 'revealed' || cell.adjacentMines === 0) return;

    let flagCount = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
          if (grid[nr][nc].state === 'flagged') flagCount++;
        }
      }
    }

    if (flagCount !== cell.adjacentMines) return;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
          const neighbor = grid[nr][nc];
          if (neighbor.state === 'hidden') {
            if (neighbor.isMine) {
              gameOver(false, nr, nc);
              return;
            }
            revealCell(nr, nc);
          }
        }
      }
    }

    checkWin();
  }

  function countRevealed(): number {
    let count = 0;
    const config = DIFFICULTIES[difficulty];
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (grid[r][c].state === 'revealed') count++;
      }
    }
    return count;
  }

  function checkWin() {
    const config = DIFFICULTIES[difficulty];
    const totalSafe = config.rows * config.cols - config.mines;
    if (countRevealed() === totalSafe) {
      gameOver(true, -1, -1);
    }
  }

  function getElapsedSeconds(): number {
    if (state === 'paused') return elapsedBeforePause;
    if (state === 'playing' && startTime > 0) {
      return elapsedBeforePause + (performance.now() - startTime) / 1000;
    }
    return 0;
  }

  function calculateScore(isWin: boolean): number {
    const config = DIFFICULTIES[difficulty];
    const elapsed = getElapsedSeconds();

    if (isWin) {
      const cellScore =
        (config.rows * config.cols - config.mines) * config.multiplier * 10;
      const timeBonus =
        Math.max(0, 300 - Math.floor(elapsed)) * config.multiplier;
      return cellScore + timeBonus;
    }
    return countRevealed() * config.multiplier;
  }

  function gameOver(isWin: boolean, mineRow: number, mineCol: number) {
    won = isWin;
    hitMineRow = mineRow;
    hitMineCol = mineCol;
    score = calculateScore(isWin);

    if (!isWin) {
      const config = DIFFICULTIES[difficulty];
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          if (grid[r][c].isMine) {
            grid[r][c].state = 'revealed';
          }
        }
      }
    }

    cancelLongPress();
    state = 'gameover';
  }

  function getCellLayout() {
    const config = DIFFICULTIES[difficulty];
    const gridAreaW = CANVAS_WIDTH - PADDING * 2;
    const gridAreaH = CANVAS_HEIGHT - HUD_HEIGHT - PADDING * 2;
    const cellW = Math.floor(gridAreaW / config.cols);
    const cellH = Math.floor(gridAreaH / config.rows);
    const cellSize = Math.min(cellW, cellH);

    const totalW = cellSize * config.cols;
    const totalH = cellSize * config.rows;
    const offsetX = (CANVAS_WIDTH - totalW) / 2;
    const offsetY = HUD_HEIGHT + (gridAreaH - totalH) / 2 + PADDING;

    return { cellSize, offsetX, offsetY };
  }

  function getCellFromPos(
    gameX: number,
    gameY: number,
  ): { row: number; col: number } | null {
    const config = DIFFICULTIES[difficulty];
    const { cellSize, offsetX, offsetY } = getCellLayout();

    const col = Math.floor((gameX - offsetX) / cellSize);
    const row = Math.floor((gameY - offsetY) / cellSize);

    if (row >= 0 && row < config.rows && col >= 0 && col < config.cols) {
      return { row, col };
    }
    return null;
  }

  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  const getTouchPos = (touch: Touch) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((touch.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((touch.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  function getDifficultyAt(
    canvasX: number,
    canvasY: number,
  ): TDifficulty | null {
    for (const btn of difficultyButtons) {
      if (
        canvasX >= btn.x &&
        canvasX <= btn.x + btn.w &&
        canvasY >= btn.y &&
        canvasY <= btn.y + btn.h
      ) {
        return btn.difficulty;
      }
    }
    return null;
  }

  // --- Long press helpers ---
  function cancelLongPress() {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    longPressTriggered = false;
    longPressCell = null;
    longPressProgress = 0;
    longPressStartTime = 0;
  }

  // --- Cell action helper (shared by mouse click and touch tap) ---
  function handleCellAction(gameX: number, gameY: number) {
    const cell = getCellFromPos(gameX, gameY);
    if (!cell) return;

    const config = DIFFICULTIES[difficulty];
    const target = grid[cell.row][cell.col];

    if (firstClick) {
      firstClick = false;
      placeMines(config.rows, config.cols, config.mines, cell.row, cell.col);
      computeAdjacent(config.rows, config.cols);
    }

    if (target.state === 'flagged') return;

    if (target.state === 'revealed') {
      chordReveal(cell.row, cell.col);
      return;
    }

    if (target.isMine) {
      gameOver(false, cell.row, cell.col);
      return;
    }

    revealCell(cell.row, cell.col);
    checkWin();
  }

  // --- Mouse handlers (desktop, no zoom) ---
  function handleClick(e: MouseEvent) {
    if (touchActive) {
      touchActive = false;
      return;
    }

    const pos = getCanvasPos(e.clientX, e.clientY);

    if (state === 'start') {
      const clicked = getDifficultyAt(pos.x, pos.y);
      if (clicked) {
        difficulty = clicked;
        startGame();
      }
      return;
    }

    if (state !== 'playing') return;
    handleCellAction(pos.x, pos.y);
  }

  function handleMouseMove(e: MouseEvent) {
    if (state !== 'start') {
      if (hoveredDifficulty !== null) {
        hoveredDifficulty = null;
        canvas.style.cursor = 'default';
      }
      return;
    }
    const pos = getCanvasPos(e.clientX, e.clientY);
    const hovered = getDifficultyAt(pos.x, pos.y);
    hoveredDifficulty = hovered;
    canvas.style.cursor = hovered ? 'pointer' : 'default';
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    if (state !== 'playing') return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    const cell = getCellFromPos(pos.x, pos.y);
    if (!cell) return;

    const target = grid[cell.row][cell.col];
    if (target.state === 'revealed') return;

    target.state = target.state === 'flagged' ? 'hidden' : 'flagged';
  }

  // --- Touch handlers (with zoom/pan support) ---
  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    touchActive = true;

    // Two-finger pinch start
    if (e.touches.length >= 2 && (state === 'playing' || state === 'paused' || state === 'gameover')) {
      cancelLongPress();
      isPanning = false;
      isPinching = true;
      wasPinching = true;

      const t1 = getTouchPos(e.touches[0]);
      const t2 = getTouchPos(e.touches[1]);
      pinchStartDist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      pinchStartScale = zoomScale;
      pinchMidX = (t1.x + t2.x) / 2;
      pinchMidY = (t1.y + t2.y) / 2;
      return;
    }

    // Single touch
    if (isPinching) return;

    const touch = e.touches[0];
    const pos = getTouchPos(touch);

    if (state === 'gameover') {
      gameOverHud.onTouchStart(pos.x, pos.y, score);
      return;
    }

    if (state === 'start') {
      const clicked = getDifficultyAt(pos.x, pos.y);
      if (clicked) {
        difficulty = clicked;
        startGame();
      }
      return;
    }

    if (state === 'loading') return;

    if (state === 'paused') {
      startTime = performance.now();
      state = 'playing';
      return;
    }

    // Playing state
    touchStartPos = { x: touch.clientX, y: touch.clientY };
    touchStartCanvasPos = { x: pos.x, y: pos.y };
    longPressTriggered = false;
    isPanning = false;

    const gamePos = getGamePos(pos.x, pos.y);
    const cell = getCellFromPos(gamePos.x, gamePos.y);
    longPressCell = cell;
    longPressStartTime = performance.now();

    if (cell) {
      longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        const target = grid[cell.row][cell.col];
        if (target.state === 'revealed') return;
        target.state = target.state === 'flagged' ? 'hidden' : 'flagged';
        longPressCell = null;
        longPressProgress = 0;
        longPressStartTime = 0;
      }, LONG_PRESS_DURATION);
    }
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();

    // Pinch zoom
    if (isPinching && e.touches.length >= 2) {
      const t1 = getTouchPos(e.touches[0]);
      const t2 = getTouchPos(e.touches[1]);
      const dist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      const newScale = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, pinchStartScale * (dist / pinchStartDist)),
      );

      const midX = (t1.x + t2.x) / 2;
      const midY = (t1.y + t2.y) / 2;

      // Zoom toward pinch center: keep game point under center stable
      const gameX = (pinchMidX - panX) / zoomScale;
      const gameY = (pinchMidY - panY) / zoomScale;

      zoomScale = newScale;
      panX = midX - gameX * zoomScale;
      panY = midY - gameY * zoomScale;

      pinchMidX = midX;
      pinchMidY = midY;

      clampPan();
      return;
    }

    if (state !== 'playing' || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.x;
    const dy = touch.clientY - touchStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > LONG_PRESS_MOVE_THRESHOLD) {
      cancelLongPress();

      // If zoomed in, start panning
      if (zoomScale > 1 && !isPanning) {
        isPanning = true;
        panStartX = panX;
        panStartY = panY;
      }
    }

    if (isPanning) {
      const pos = getTouchPos(touch);
      panX = panStartX + (pos.x - touchStartCanvasPos.x);
      panY = panStartY + (pos.y - touchStartCanvasPos.y);
      clampPan();
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    e.preventDefault();

    // Pinch end
    if (isPinching) {
      if (e.touches.length < 2) {
        isPinching = false;
        // Snap to 1x if nearly unzoomed
        if (zoomScale <= 1.05) {
          resetZoom();
        }
      }
      return;
    }

    // Pan end
    if (isPanning) {
      isPanning = false;
      return;
    }

    // Skip if just finished pinching (second finger lift)
    if (wasPinching && e.touches.length === 0) {
      wasPinching = false;
      return;
    }

    // Long press already handled
    if (longPressTriggered) {
      cancelLongPress();
      return;
    }

    cancelLongPress();

    // Short tap = reveal cell
    if (state !== 'playing') return;

    const touch = e.changedTouches[0];
    const pos = getTouchPos(touch);
    const gamePos = getGamePos(pos.x, pos.y);
    handleCellAction(gamePos.x, gamePos.y);
  }

  // --- Game state management ---
  async function startGame() {
    if (state === 'loading') return;
    state = 'loading';
    canvas.style.cursor = 'default';
    hoveredDifficulty = null;
    resetZoom();
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    const config = DIFFICULTIES[difficulty];
    grid = createEmptyGrid(config.rows, config.cols);
    firstClick = true;
    score = 0;
    won = false;
    hitMineRow = -1;
    hitMineCol = -1;
    elapsedBeforePause = 0;
    startTime = performance.now();
    state = 'playing';
  }

  function resetGame() {
    state = 'start';
    score = 0;
    firstClick = true;
    won = false;
    hitMineRow = -1;
    hitMineCol = -1;
    elapsedBeforePause = 0;
    startTime = 0;
    cancelLongPress();
    resetZoom();
    gameOverHud.reset();
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (state === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    switch (e.code) {
      case 'KeyS':
        if (state === 'start') {
          startGame();
        } else if (state === 'paused') {
          startTime = performance.now();
          state = 'playing';
        }
        break;
      case 'KeyP':
        if (state === 'playing') {
          elapsedBeforePause += (performance.now() - startTime) / 1000;
          state = 'paused';
        } else if (state === 'paused') {
          startTime = performance.now();
          state = 'playing';
        }
        break;
      case 'KeyR':
        if (state !== 'gameover') {
          resetGame();
        }
        break;
    }
  };

  // --- Rendering ---
  function renderCell(
    x: number,
    y: number,
    size: number,
    cell: TCell,
    row: number,
    col: number,
  ) {
    if (cell.state === 'hidden' || cell.state === 'flagged') {
      // 3D raised cell
      ctx.fillStyle = CELL_HIDDEN_COLOR;
      ctx.fillRect(x, y, size, size);

      // Light edge (top, left)
      ctx.fillStyle = CELL_HIDDEN_LIGHT;
      ctx.fillRect(x, y, size, 2);
      ctx.fillRect(x, y, 2, size);

      // Dark edge (bottom, right)
      ctx.fillStyle = CELL_HIDDEN_DARK;
      ctx.fillRect(x, y + size - 2, size, 2);
      ctx.fillRect(x + size - 2, y, 2, size);

      // Flag
      if (cell.state === 'flagged') {
        const cx = x + size / 2;
        const cy = y + size / 2;
        const flagSize = size * 0.3;

        // Pole
        ctx.strokeStyle = MINE_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - flagSize);
        ctx.lineTo(cx, cy + flagSize);
        ctx.stroke();

        // Flag triangle
        ctx.fillStyle = FLAG_COLOR;
        ctx.beginPath();
        ctx.moveTo(cx, cy - flagSize);
        ctx.lineTo(cx + flagSize, cy - flagSize * 0.3);
        ctx.lineTo(cx, cy + flagSize * 0.3);
        ctx.closePath();
        ctx.fill();

        // Base
        ctx.fillStyle = MINE_COLOR;
        ctx.fillRect(cx - flagSize * 0.5, cy + flagSize, flagSize, 2);
      }
    } else {
      // Revealed cell
      const isHitMine = row === hitMineRow && col === hitMineCol;
      ctx.fillStyle = isHitMine ? MINE_HIT_BG : CELL_REVEALED_COLOR;
      ctx.fillRect(x, y, size, size);

      // Border
      ctx.strokeStyle = CELL_REVEALED_BORDER;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

      if (cell.isMine) {
        // Draw mine
        const cx = x + size / 2;
        const cy = y + size / 2;
        const r = size * 0.2;

        ctx.fillStyle = MINE_COLOR;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Spikes
        ctx.strokeStyle = MINE_COLOR;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(
            cx + Math.cos(angle) * r,
            cy + Math.sin(angle) * r,
          );
          ctx.lineTo(
            cx + Math.cos(angle) * (r + size * 0.12),
            cy + Math.sin(angle) * (r + size * 0.12),
          );
          ctx.stroke();
        }

        // Highlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else if (cell.adjacentMines > 0) {
        ctx.fillStyle = NUMBER_COLORS[cell.adjacentMines] || '#000000';
        ctx.font = `bold ${Math.floor(size * 0.55)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${cell.adjacentMines}`, x + size / 2, y + size / 2 + 1);
      }
    }
  }

  function renderLongPressIndicator() {
    if (!longPressCell || longPressStartTime === 0 || state !== 'playing')
      return;

    const elapsed = performance.now() - longPressStartTime;
    const progress = Math.min(elapsed / LONG_PRESS_DURATION, 1);
    longPressProgress = progress;

    const { cellSize, offsetX, offsetY } = getCellLayout();
    const cx = offsetX + longPressCell.col * cellSize + cellSize / 2;
    const cy = offsetY + longPressCell.row * cellSize + cellSize / 2;
    const radius = cellSize * 0.4;

    // Semi-transparent highlight
    ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
    ctx.fillRect(
      offsetX + longPressCell.col * cellSize,
      offsetY + longPressCell.row * cellSize,
      cellSize,
      cellSize,
    );

    // Progress ring
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
  }

  function renderMiniGrid(
    x: number,
    y: number,
    rows: number,
    cols: number,
    cellSize: number,
  ) {
    const totalW = cols * cellSize;
    const totalH = rows * cellSize;
    const startX = x - totalW / 2;
    const startY = y - totalH / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = startX + c * cellSize;
        const cy = startY + r * cellSize;

        ctx.fillStyle = CELL_HIDDEN_COLOR;
        ctx.fillRect(cx, cy, cellSize - 1, cellSize - 1);

        ctx.fillStyle = CELL_HIDDEN_LIGHT;
        ctx.fillRect(cx, cy, cellSize - 1, 1);
        ctx.fillRect(cx, cy, 1, cellSize - 1);

        ctx.fillStyle = CELL_HIDDEN_DARK;
        ctx.fillRect(cx, cy + cellSize - 2, cellSize - 1, 1);
        ctx.fillRect(cx + cellSize - 2, cy, 1, cellSize - 1);
      }
    }
  }

  function renderDifficultySelect() {
    // Background overlay
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MINESWEEPER', CANVAS_WIDTH / 2, 80);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '15px sans-serif';
    ctx.fillText(
      'Select difficulty to start',
      CANVAS_WIDTH / 2,
      120,
    );

    // Difficulty cards
    const cardW = 210;
    const cardH = 310;
    const gap = 30;
    const totalW = cardW * 3 + gap * 2;
    const baseX = (CANVAS_WIDTH - totalW) / 2;
    const baseY = 160;

    difficultyButtons.length = 0;

    DIFFICULTY_ORDER.forEach((diff, i) => {
      const config = DIFFICULTIES[diff];
      const x = baseX + i * (cardW + gap);
      const y = baseY;
      const isHovered = hoveredDifficulty === diff;

      difficultyButtons.push({ x, y, w: cardW, h: cardH, difficulty: diff });

      // Card background
      const borderColor = isHovered ? '#22d3d3' : 'rgba(255,255,255,0.15)';
      const bgColor = isHovered
        ? 'rgba(34,211,211,0.08)'
        : 'rgba(255,255,255,0.03)';

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 12);
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 12);
      ctx.stroke();

      // Glow on hover
      if (isHovered) {
        ctx.shadowColor = '#22d3d3';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#22d3d3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 12);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Label
      ctx.fillStyle = isHovered ? '#22d3d3' : '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(config.label, x + cardW / 2, y + 35);

      // Mini grid
      const maxGridW = cardW - 40;
      const maxGridH = 140;
      const miniCellW = Math.floor(maxGridW / config.cols);
      const miniCellH = Math.floor(maxGridH / config.rows);
      const miniCell = Math.max(2, Math.min(miniCellW, miniCellH));
      renderMiniGrid(
        x + cardW / 2,
        y + 130,
        config.rows,
        config.cols,
        miniCell,
      );

      // Info
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${config.cols} x ${config.rows}`,
        x + cardW / 2,
        y + cardH - 65,
      );
      ctx.fillText(
        `${config.mines} mines`,
        x + cardW / 2,
        y + cardH - 42,
      );

      // Score multiplier badge
      ctx.fillStyle = isHovered
        ? 'rgba(34,211,211,0.2)'
        : 'rgba(255,255,255,0.08)';
      const badgeW = 50;
      const badgeH = 22;
      const badgeX = x + cardW / 2 - badgeW / 2;
      const badgeY = y + cardH - 28;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();

      ctx.fillStyle = isHovered ? '#22d3d3' : 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(
        `x${config.multiplier}`,
        x + cardW / 2,
        badgeY + badgeH / 2,
      );
    });

    // Bottom hint
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      "Press 'S' or tap a card to start",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT - 30,
    );
  }

  function renderZoomIndicator() {
    if (zoomScale <= 1.05) return;

    const text = `${zoomScale.toFixed(1)}x`;
    const px = CANVAS_WIDTH - 15;
    const py = HUD_HEIGHT / 2 + 22;

    // Badge background
    ctx.fillStyle = 'rgba(34, 211, 211, 0.2)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    ctx.beginPath();
    ctx.roundRect(px - tw - 8, py - 10, tw + 16, 20, 6);
    ctx.fill();

    // Text
    ctx.fillStyle = '#22d3d3';
    ctx.fillText(text, px, py);
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (
      state === 'playing' ||
      state === 'paused' ||
      state === 'gameover'
    ) {
      const config = DIFFICULTIES[difficulty];
      const { cellSize, offsetX, offsetY } = getCellLayout();

      // Grid rendering with zoom/pan (clipped below HUD)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, HUD_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - HUD_HEIGHT);
      ctx.clip();

      ctx.translate(panX, panY);
      ctx.scale(zoomScale, zoomScale);

      // Render grid
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          const x = offsetX + c * cellSize;
          const y = offsetY + r * cellSize;
          renderCell(x, y, cellSize, grid[r][c], r, c);
        }
      }

      // Long press indicator (in game coordinates, affected by zoom)
      renderLongPressIndicator();

      ctx.restore();

      // HUD bar (outside zoom, always fixed)
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);

      const elapsed = Math.floor(getElapsedSeconds());
      let flagCount = 0;
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          if (grid[r][c].state === 'flagged') flagCount++;
        }
      }
      const minesLeft = config.mines - flagCount;

      ctx.fillStyle = HUD_TEXT_COLOR;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Mines: ${minesLeft}`, 15, HUD_HEIGHT / 2);

      ctx.textAlign = 'center';
      ctx.fillText(
        `${config.label} (${config.cols}x${config.rows})`,
        CANVAS_WIDTH / 2,
        HUD_HEIGHT / 2,
      );

      ctx.textAlign = 'right';
      ctx.fillText(`Time: ${elapsed}s`, CANVAS_WIDTH - 15, HUD_HEIGHT / 2);

      // Zoom indicator
      renderZoomIndicator();
    }

    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
    } else if (state === 'start') {
      renderDifficultySelect();
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

  // Event listeners
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('contextmenu', handleContextMenu);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', resize);
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  return () => {
    cancelLongPress();
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('contextmenu', handleContextMenu);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', resize);
    canvas.style.cursor = 'default';
  };
}
