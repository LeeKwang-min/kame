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
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

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
    canvasX: number,
    canvasY: number,
  ): { row: number; col: number } | null {
    const config = DIFFICULTIES[difficulty];
    const { cellSize, offsetX, offsetY } = getCellLayout();

    const col = Math.floor((canvasX - offsetX) / cellSize);
    const row = Math.floor((canvasY - offsetY) / cellSize);

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

  function handleClick(e: MouseEvent) {
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
    const cell = getCellFromPos(pos.x, pos.y);
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

  async function startGame() {
    if (state === 'loading') return;
    state = 'loading';
    canvas.style.cursor = 'default';
    hoveredDifficulty = null;
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
      "Press 'S' to start with Normal difficulty",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT - 30,
    );
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

      // Render grid
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          const x = offsetX + c * cellSize;
          const y = offsetY + r * cellSize;
          renderCell(x, y, cellSize, grid[r][c], r, c);
        }
      }

      // HUD bar
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

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('keydown', handleKeyDown);
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('contextmenu', handleContextMenu);
    window.removeEventListener('keydown', handleKeyDown);
    canvas.style.cursor = 'default';
  };
}
