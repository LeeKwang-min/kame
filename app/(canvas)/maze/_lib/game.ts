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
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  MAX_HINTS,
  REVEAL_DURATION,
  WALL_COLOR,
  PATH_COLOR,
  PLAYER_COLOR,
  EXIT_COLOR,
  BACKGROUND_COLOR,
  HUD_TEXT_COLOR,
  TORCH_DARK_ALPHA,
  TRAIL_COLOR,
  PLAYER_LERP_SPEED,
  OPTIMAL_PATH_COLOR,
  REPLAY_SPEED,
} from './config';
import { TDifficulty, TMazeCell, TPlayer } from './types';

export type TMazeCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export type TMazeCleanup = {
  cleanup: () => void;
  setLoggedIn: (value: boolean) => void;
};

type TDifficultyButton = {
  x: number;
  y: number;
  w: number;
  h: number;
  difficulty: TDifficulty;
};

export function setupMaze(
  canvas: HTMLCanvasElement,
  callbacks?: TMazeCallbacks,
): TMazeCleanup {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  let state: 'start' | 'loading' | 'reveal' | 'playing' | 'paused' | 'gameover' = 'start';
  let difficulty: TDifficulty = 'normal';
  let grid: TMazeCell[][] = [];
  let player: TPlayer = { row: 0, col: 0 };
  let exitRow = 0;
  let exitCol = 0;
  let score = 0;
  let moves = 0;
  let hintsUsed = 0;
  let optimalPath = 0;
  let animationId = 0;
  let lastTime = 0;
  let hoveredDifficulty: TDifficulty | null = null;
  let revealStartTime = 0;
  let isHintReveal = false;

  // Trail (발자취)
  const visitedCells = new Set<string>();

  // Smooth movement (부드러운 이동)
  let displayRow = 0;
  let displayCol = 0;

  // Optimal path replay (최적 경로 리플레이)
  let optimalPathCells: [number, number][] = [];
  let replayProgress = 0;

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
    'maze',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Maze Generation (Iterative DFS / Recursive Backtracking) ---
  function generateMaze(rows: number, cols: number): TMazeCell[][] {
    const maze: TMazeCell[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        top: true,
        right: true,
        bottom: true,
        left: true,
        visited: false,
      })),
    );

    const stack: [number, number][] = [];
    const startRow = rows - 1;
    const startCol = 0;
    maze[startRow][startCol].visited = true;
    stack.push([startRow, startCol]);

    const directions: [number, number, 'top' | 'right' | 'bottom' | 'left', 'top' | 'right' | 'bottom' | 'left'][] = [
      [-1, 0, 'top', 'bottom'],
      [0, 1, 'right', 'left'],
      [1, 0, 'bottom', 'top'],
      [0, -1, 'left', 'right'],
    ];

    while (stack.length > 0) {
      const [cr, cc] = stack[stack.length - 1];

      const unvisited = directions.filter(([dr, dc]) => {
        const nr = cr + dr;
        const nc = cc + dc;
        return nr >= 0 && nr < rows && nc >= 0 && nc < cols && !maze[nr][nc].visited;
      });

      if (unvisited.length === 0) {
        stack.pop();
        continue;
      }

      const [dr, dc, wall, opposite] = unvisited[Math.floor(Math.random() * unvisited.length)];
      const nr = cr + dr;
      const nc = cc + dc;

      maze[cr][cc][wall] = false;
      maze[nr][nc][opposite] = false;
      maze[nr][nc].visited = true;
      stack.push([nr, nc]);
    }

    return maze;
  }

  // --- BFS for optimal path length ---
  function bfs(
    maze: TMazeCell[][],
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
  ): number {
    const rows = maze.length;
    const cols = maze[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue: [number, number, number][] = [[startRow, startCol, 0]];
    visited[startRow][startCol] = true;

    const dirs: [number, number, 'top' | 'right' | 'bottom' | 'left'][] = [
      [-1, 0, 'top'],
      [0, 1, 'right'],
      [1, 0, 'bottom'],
      [0, -1, 'left'],
    ];

    while (queue.length > 0) {
      const [r, c, dist] = queue.shift()!;
      if (r === endRow && c === endCol) return dist;

      for (const [dr, dc, wall] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
          !visited[nr][nc] &&
          !maze[r][c][wall]
        ) {
          visited[nr][nc] = true;
          queue.push([nr, nc, dist + 1]);
        }
      }
    }

    return -1;
  }

  // --- BFS for optimal path cells ---
  function bfsPath(
    maze: TMazeCell[][],
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
  ): [number, number][] {
    const rows = maze.length;
    const cols = maze[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const parent: [number, number][][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => [-1, -1] as [number, number]),
    );
    const queue: [number, number][] = [[startRow, startCol]];
    visited[startRow][startCol] = true;

    const dirs: [number, number, 'top' | 'right' | 'bottom' | 'left'][] = [
      [-1, 0, 'top'],
      [0, 1, 'right'],
      [1, 0, 'bottom'],
      [0, -1, 'left'],
    ];

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      if (r === endRow && c === endCol) break;

      for (const [dr, dc, wall] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
          !visited[nr][nc] &&
          !maze[r][c][wall]
        ) {
          visited[nr][nc] = true;
          parent[nr][nc] = [r, c];
          queue.push([nr, nc]);
        }
      }
    }

    // Reconstruct path
    const path: [number, number][] = [];
    let cur: [number, number] = [endRow, endCol];
    while (cur[0] !== startRow || cur[1] !== startCol) {
      path.push(cur);
      cur = parent[cur[0]][cur[1]];
      if (cur[0] === -1) return [];
    }
    path.push([startRow, startCol]);
    path.reverse();
    return path;
  }

  // --- Cell layout ---
  function getCellLayout() {
    const config = DIFFICULTIES[difficulty];
    const gridAreaW = CANVAS_WIDTH;
    const gridAreaH = CANVAS_HEIGHT - HUD_HEIGHT;
    const cellW = gridAreaW / config.cols;
    const cellH = gridAreaH / config.rows;
    const cellSize = Math.min(cellW, cellH);

    const totalW = cellSize * config.cols;
    const totalH = cellSize * config.rows;
    const offsetX = (CANVAS_WIDTH - totalW) / 2;
    const offsetY = HUD_HEIGHT + (gridAreaH - totalH) / 2;

    return { cellSize, offsetX, offsetY };
  }

  // --- Score calculation ---
  function calculateScore(): number {
    if (moves === 0) return 0;
    const config = DIFFICULTIES[difficulty];
    const efficiency = optimalPath / moves;
    const baseScore = optimalPath * config.multiplier * 100 * efficiency;
    const hintPenalty = Math.pow(0.95, hintsUsed);
    return Math.floor(baseScore * hintPenalty);
  }

  // --- Start game ---
  async function startGame() {
    if (state === 'loading') return;
    state = 'loading';
    canvas.style.cursor = 'default';
    hoveredDifficulty = null;

    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }

    const config = DIFFICULTIES[difficulty];
    grid = generateMaze(config.rows, config.cols);
    player = { row: config.rows - 1, col: 0 };
    exitRow = 0;
    exitCol = config.cols - 1;
    moves = 0;
    hintsUsed = 0;
    score = 0;
    optimalPath = bfs(grid, player.row, player.col, exitRow, exitCol);

    // Trail init
    visitedCells.clear();
    visitedCells.add(`${player.row},${player.col}`);

    // Smooth movement init
    displayRow = player.row;
    displayCol = player.col;

    // Optimal path replay init
    optimalPathCells = bfsPath(grid, player.row, player.col, exitRow, exitCol);
    replayProgress = 0;

    // Enter reveal state
    revealStartTime = performance.now();
    isHintReveal = false;
    state = 'reveal';
  }

  function resetGame() {
    state = 'start';
    score = 0;
    moves = 0;
    hintsUsed = 0;
    visitedCells.clear();
    replayProgress = 0;
    gameOverHud.reset();
  }

  // --- Movement ---
  function movePlayer(dr: number, dc: number) {
    const nr = player.row + dr;
    const nc = player.col + dc;
    const config = DIFFICULTIES[difficulty];

    if (nr < 0 || nr >= config.rows || nc < 0 || nc >= config.cols) return;

    // Check wall
    let wall: 'top' | 'right' | 'bottom' | 'left';
    if (dr === -1) wall = 'top';
    else if (dr === 1) wall = 'bottom';
    else if (dc === 1) wall = 'right';
    else wall = 'left';

    if (grid[player.row][player.col][wall]) return;

    player.row = nr;
    player.col = nc;
    moves++;
    visitedCells.add(`${nr},${nc}`);

    // Check exit
    if (player.row === exitRow && player.col === exitCol) {
      score = calculateScore();
      state = 'gameover';
    }
  }

  // --- Input ---
  const handleKeyDown = (e: KeyboardEvent) => {
    if (state === 'gameover') {
      if (e.repeat) return;
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    // Arrow keys: allow repeat for continuous movement
    if (state === 'playing') {
      switch (e.code) {
        case 'ArrowUp':
          e.preventDefault();
          movePlayer(-1, 0);
          return;
        case 'ArrowDown':
          e.preventDefault();
          movePlayer(1, 0);
          return;
        case 'ArrowLeft':
          e.preventDefault();
          movePlayer(0, -1);
          return;
        case 'ArrowRight':
          e.preventDefault();
          movePlayer(0, 1);
          return;
      }
    }

    if (e.repeat) return;

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
      case 'KeyH':
        if (state === 'playing' && hintsUsed < MAX_HINTS) {
          hintsUsed++;
          revealStartTime = performance.now();
          isHintReveal = true;
          state = 'reveal';
        }
        break;
    }
  };

  // --- Mouse for difficulty selection ---
  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  function getDifficultyAt(canvasX: number, canvasY: number): TDifficulty | null {
    for (const btn of difficultyButtons) {
      if (
        canvasX >= btn.x && canvasX <= btn.x + btn.w &&
        canvasY >= btn.y && canvasY <= btn.y + btn.h
      ) {
        return btn.difficulty;
      }
    }
    return null;
  }

  function handleClick(e: MouseEvent) {
    if (state !== 'start') return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    const clicked = getDifficultyAt(pos.x, pos.y);
    if (clicked) {
      difficulty = clicked;
      startGame();
    }
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

  // --- Render: Difficulty Select ---
  function renderMiniMaze(x: number, y: number, rows: number, cols: number, cellSize: number) {
    const totalW = cols * cellSize;
    const totalH = rows * cellSize;
    const startX = x - totalW / 2;
    const startY = y - totalH / 2;

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = startX + c * cellSize;
        const cy = startY + r * cellSize;

        // Random walls for preview
        if (Math.random() > 0.5) {
          ctx.beginPath();
          ctx.moveTo(cx + cellSize, cy);
          ctx.lineTo(cx + cellSize, cy + cellSize);
          ctx.stroke();
        }
        if (Math.random() > 0.5) {
          ctx.beginPath();
          ctx.moveTo(cx, cy + cellSize);
          ctx.lineTo(cx + cellSize, cy + cellSize);
          ctx.stroke();
        }
      }
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, totalW, totalH);
  }

  function renderDifficultySelect() {
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MAZE ESCAPE', CANVAS_WIDTH / 2, 80);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '15px sans-serif';
    ctx.fillText('Select difficulty to start', CANVAS_WIDTH / 2, 120);

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

      const borderColor = isHovered ? '#22d3d3' : 'rgba(255,255,255,0.15)';
      const bgColor = isHovered ? 'rgba(34,211,211,0.08)' : 'rgba(255,255,255,0.03)';

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 12);
      ctx.fill();

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 12);
      ctx.stroke();

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

      // Mini maze
      const maxGridW = cardW - 40;
      const maxGridH = 140;
      const miniCellW = Math.floor(maxGridW / config.cols);
      const miniCellH = Math.floor(maxGridH / config.rows);
      const miniCell = Math.max(2, Math.min(miniCellW, miniCellH));
      renderMiniMaze(x + cardW / 2, y + 130, config.rows, config.cols, miniCell);

      // Info
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${config.cols} x ${config.rows}`, x + cardW / 2, y + cardH - 75);
      ctx.fillText(`Vision: ${config.vision} cells`, x + cardW / 2, y + cardH - 52);

      // Score multiplier badge
      ctx.fillStyle = isHovered ? 'rgba(34,211,211,0.2)' : 'rgba(255,255,255,0.08)';
      const badgeW = 50;
      const badgeH = 22;
      const badgeX = x + cardW / 2 - badgeW / 2;
      const badgeY = y + cardH - 28;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();

      ctx.fillStyle = isHovered ? '#22d3d3' : 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`x${config.multiplier}`, x + cardW / 2, badgeY + badgeH / 2);
    });

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      "Press 'S' to start with Normal difficulty",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT - 30,
    );
  }

  // --- Render: Maze ---
  function renderMaze(showAll: boolean) {
    const config = DIFFICULTIES[difficulty];
    const { cellSize, offsetX, offsetY } = getCellLayout();

    // Background
    ctx.fillStyle = PATH_COLOR;
    ctx.fillRect(0, HUD_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - HUD_HEIGHT);

    // Draw cells and walls
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const cell = grid[r][c];

        // Cell background
        ctx.fillStyle = PATH_COLOR;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Visited trail overlay
        if (visitedCells.has(`${r},${c}`)) {
          ctx.fillStyle = TRAIL_COLOR;
          ctx.fillRect(x, y, cellSize, cellSize);
        }

        // Walls
        ctx.strokeStyle = WALL_COLOR;
        ctx.lineWidth = Math.max(1, cellSize * 0.08);
        ctx.lineCap = 'round';

        if (cell.top) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + cellSize, y);
          ctx.stroke();
        }
        if (cell.right) {
          ctx.beginPath();
          ctx.moveTo(x + cellSize, y);
          ctx.lineTo(x + cellSize, y + cellSize);
          ctx.stroke();
        }
        if (cell.bottom) {
          ctx.beginPath();
          ctx.moveTo(x, y + cellSize);
          ctx.lineTo(x + cellSize, y + cellSize);
          ctx.stroke();
        }
        if (cell.left) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + cellSize);
          ctx.stroke();
        }
      }
    }

    // Exit marker
    const ex = offsetX + exitCol * cellSize;
    const ey = offsetY + exitRow * cellSize;
    ctx.fillStyle = EXIT_COLOR;
    ctx.beginPath();
    ctx.arc(
      ex + cellSize / 2,
      ey + cellSize / 2,
      cellSize * 0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Exit glow
    ctx.shadowColor = EXIT_COLOR;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(
      ex + cellSize / 2,
      ey + cellSize / 2,
      cellSize * 0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Optimal path replay (gameover only, rendered behind player)
    if (state === 'gameover' && optimalPathCells.length > 0 && replayProgress > 0) {
      const drawCount = Math.floor(replayProgress) + 1;
      ctx.strokeStyle = OPTIMAL_PATH_COLOR;
      ctx.lineWidth = Math.max(2, cellSize * 0.15);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < drawCount && i < optimalPathCells.length; i++) {
        const [pr, pc] = optimalPathCells[i];
        const cx = offsetX + pc * cellSize + cellSize / 2;
        const cy = offsetY + pr * cellSize + cellSize / 2;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      // Leading marker
      const headIdx = Math.min(Math.floor(replayProgress), optimalPathCells.length - 1);
      const [hr, hc] = optimalPathCells[headIdx];
      const hx = offsetX + hc * cellSize + cellSize / 2;
      const hy = offsetY + hr * cellSize + cellSize / 2;
      ctx.fillStyle = OPTIMAL_PATH_COLOR;
      ctx.beginPath();
      ctx.arc(hx, hy, cellSize * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player
    const px = offsetX + displayCol * cellSize;
    const py = offsetY + displayRow * cellSize;
    ctx.fillStyle = PLAYER_COLOR;
    ctx.beginPath();
    ctx.arc(
      px + cellSize / 2,
      py + cellSize / 2,
      cellSize * 0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Player glow
    ctx.shadowColor = PLAYER_COLOR;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(
      px + cellSize / 2,
      py + cellSize / 2,
      cellSize * 0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Torch/darkness effect (even-odd fill)
    if (!showAll) {
      const playerCenterX = offsetX + displayCol * cellSize + cellSize / 2;
      const playerCenterY = offsetY + displayRow * cellSize + cellSize / 2;
      const visionRadius = config.vision * cellSize;

      // Create darkness overlay with even-odd rule
      ctx.beginPath();
      // Outer rect (clockwise)
      ctx.rect(0, HUD_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - HUD_HEIGHT);
      // Inner circle (counter-clockwise)
      ctx.arc(playerCenterX, playerCenterY, visionRadius, 0, Math.PI * 2, true);
      ctx.fillStyle = `rgba(0, 0, 0, ${TORCH_DARK_ALPHA})`;
      ctx.fill('evenodd');

      // Soft edge gradient
      const gradient = ctx.createRadialGradient(
        playerCenterX, playerCenterY, visionRadius * 0.7,
        playerCenterX, playerCenterY, visionRadius,
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
      ctx.beginPath();
      ctx.arc(playerCenterX, playerCenterY, visionRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Warm torch tint
      const torchGradient = ctx.createRadialGradient(
        playerCenterX, playerCenterY, 0,
        playerCenterX, playerCenterY, visionRadius * 0.5,
      );
      torchGradient.addColorStop(0, 'rgba(255, 180, 50, 0.08)');
      torchGradient.addColorStop(1, 'rgba(255, 180, 50, 0)');
      ctx.beginPath();
      ctx.arc(playerCenterX, playerCenterY, visionRadius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = torchGradient;
      ctx.fill();
    }
  }

  // --- Render: HUD ---
  function renderHud() {
    // HUD background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);

    ctx.fillStyle = HUD_TEXT_COLOR;
    ctx.font = 'bold 16px sans-serif';
    ctx.textBaseline = 'middle';

    // Left: difficulty + moves
    ctx.textAlign = 'left';
    ctx.fillText(
      `${DIFFICULTIES[difficulty].label} | Moves: ${moves}`,
      15,
      HUD_HEIGHT / 2,
    );

    // Center: hints
    ctx.textAlign = 'center';
    const hintsLeft = MAX_HINTS - hintsUsed;
    ctx.fillText(
      `Hints: ${hintsLeft}/${MAX_HINTS}`,
      CANVAS_WIDTH / 2,
      HUD_HEIGHT / 2,
    );

    // Right: optimal path info
    ctx.textAlign = 'right';
    ctx.fillText(
      `Optimal: ${optimalPath}`,
      CANVAS_WIDTH - 15,
      HUD_HEIGHT / 2,
    );
  }

  // --- Render: Reveal countdown ---
  function renderRevealOverlay() {
    const elapsed = performance.now() - revealStartTime;
    const remaining = Math.max(0, REVEAL_DURATION - elapsed);
    const seconds = Math.ceil(remaining / 1000);

    // Countdown overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, HUD_HEIGHT, CANVAS_WIDTH, 40);

    ctx.fillStyle = '#22d3d3';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const label = isHintReveal ? `HINT - Map revealed for ${seconds}s` : `Memorize the maze! ${seconds}s`;
    ctx.fillText(label, CANVAS_WIDTH / 2, HUD_HEIGHT + 20);

    // Progress bar
    const barY = HUD_HEIGHT + 38;
    const barW = CANVAS_WIDTH * 0.6;
    const barX = (CANVAS_WIDTH - barW) / 2;
    const progress = elapsed / REVEAL_DURATION;

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(barX, barY, barW, 4);
    ctx.fillStyle = '#22d3d3';
    ctx.fillRect(barX, barY, barW * (1 - progress), 4);
  }

  // --- Main render ---
  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (state === 'start') {
      renderDifficultySelect();
      return;
    }

    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
      return;
    }

    if (state === 'reveal') {
      renderMaze(true);
      renderHud();
      renderRevealOverlay();

      // Check if reveal time is over
      if (performance.now() - revealStartTime >= REVEAL_DURATION) {
        state = 'playing';
      }
      return;
    }

    if (state === 'playing' || state === 'paused' || state === 'gameover') {
      renderMaze(state === 'gameover');
      renderHud();
    }

    if (state === 'paused') {
      gamePauseHud(canvas, ctx);
    } else if (state === 'gameover') {
      gameOverHud.render(score);
    }
  }

  // --- Update ---
  function update(dt: number) {
    // Smooth player movement (lerp)
    if (state === 'playing' || state === 'paused' || state === 'gameover') {
      const factor = Math.min(1, PLAYER_LERP_SPEED * dt);
      displayRow += (player.row - displayRow) * factor;
      displayCol += (player.col - displayCol) * factor;
      if (Math.abs(player.row - displayRow) < 0.01) displayRow = player.row;
      if (Math.abs(player.col - displayCol) < 0.01) displayCol = player.col;
    }

    // Optimal path replay progress
    if (state === 'gameover' && optimalPathCells.length > 0) {
      replayProgress = Math.min(
        replayProgress + REPLAY_SPEED * dt,
        optimalPathCells.length - 1,
      );
    }
  }

  // --- Game loop ---
  function gameLoop(timestamp: number) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    update(dt);
    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  // --- Setup ---
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('keydown', handleKeyDown);
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  return {
    cleanup: () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.style.cursor = 'default';
    },
    setLoggedIn: (value: boolean) => {
      gameOverHud.setLoggedIn(value);
    },
  };
}
