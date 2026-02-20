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
  GRID_PADDING,
  DIFFICULTY_CONFIG,
  REGION_COLORS,
  HINT_PENALTY_SECONDS,
  COLORS,
} from './config';
import { TDifficulty, TCell, TBoard, TCellState, TCellAnim, TParticle, TCelebration } from './types';
import { generatePuzzle } from './generator';

export type TQueensCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export function setupQueens(
  canvas: HTMLCanvasElement,
  callbacks?: TQueensCallbacks,
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

  // Game state variables
  let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' = 'start';
  let difficulty: TDifficulty = 'normal';
  let board: TBoard = [];
  let regions: number[][] = [];
  let solution: boolean[][] = [];
  let boardSize = 7;
  let score = 0;
  let startTime = 0;
  let elapsedBeforePause = 0;
  let hintsRemaining = 0;
  let hintPenalty = 0; // accumulated hint time penalty in seconds
  let animationId = 0;
  let lastTime = 0;
  let cursorRow = -1;
  let cursorCol = -1;
  let hoveredDifficulty: TDifficulty | null = null;

  // Animation state
  let cellAnims: TCellAnim[][] = [];
  let particles: TParticle[] = [];
  let celebration: TCelebration = { active: false, time: 0, highlightIndex: -1 };

  function initCellAnims(size: number) {
    cellAnims = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({
        scale: 1,
        opacity: 1,
        shakeX: 0,
        shakeTime: 0,
        scaleTime: 0,
        scaleDir: 'in' as const,
        fadeTime: 0,
        fadeDir: 'in' as const,
      })),
    );
  }

  type TDifficultyButton = {
    x: number;
    y: number;
    w: number;
    h: number;
    difficulty: TDifficulty;
  };
  const difficultyButtons: TDifficultyButton[] = [];

  type THintButton = {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  let hintButton: THintButton = { x: 0, y: 0, w: 0, h: 0 };

  // gameOverHud
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      if (callbacks?.onScoreSave) return callbacks.onScoreSave(finalScore);
      return { saved: false };
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'queens',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Board initialization ---
  function initBoard(size: number): void {
    board = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => ({
        region: regions[r][c],
        state: 'empty' as TCellState,
        isError: false,
        isHinted: false,
      })),
    );
  }

  // --- Coordinate conversion helpers ---
  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  const getTouchPos = (touch: Touch) => getCanvasPos(touch.clientX, touch.clientY);

  // Color utilities
  function darkenColor(hex: string, amount: number): string {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
    return `rgb(${r},${g},${b})`;
  }

  function lightenColor(hex: string, amount: number): string {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `rgb(${r},${g},${b})`;
  }

  // Pixel art crown bitmap (7x7)
  const CROWN_BITMAP = [
    [0, 1, 0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1],
  ];
  const CROWN_JEWELS: [number, number][] = [[0, 1], [0, 3], [0, 5]];

  function drawPixelCrown(
    cx: number, cy: number, size: number, color: string,
  ) {
    const pixelSize = Math.floor(size / 7);
    if (pixelSize < 1) return;
    const totalW = pixelSize * 7;
    const totalH = pixelSize * 7;
    const startX = cx - totalW / 2;
    const startY = cy - totalH / 2;
    const mainColor = darkenColor(color, 60);
    const jewelColor = lightenColor(color, 40);

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (CROWN_BITMAP[r][c]) {
          const isJewel = CROWN_JEWELS.some(([jr, jc]) => jr === r && jc === c);
          ctx.fillStyle = isJewel ? jewelColor : mainColor;
          ctx.fillRect(
            startX + c * pixelSize,
            startY + r * pixelSize,
            pixelSize,
            pixelSize,
          );
        }
      }
    }
  }

  // --- Grid metrics calculation ---
  function getGridLayout() {
    const gridAreaW = CANVAS_WIDTH - GRID_PADDING * 2;
    const gridAreaH = CANVAS_HEIGHT - HUD_HEIGHT - GRID_PADDING * 2;
    const cellW = Math.floor(gridAreaW / boardSize);
    const cellH = Math.floor(gridAreaH / boardSize);
    const cellSize = Math.min(cellW, cellH);

    const totalW = cellSize * boardSize;
    const totalH = cellSize * boardSize;
    const offsetX = (CANVAS_WIDTH - totalW) / 2;
    const offsetY = HUD_HEIGHT + (gridAreaH - totalH) / 2 + GRID_PADDING;

    return { cellSize, offsetX, offsetY };
  }

  function getCellFromPos(
    canvasX: number,
    canvasY: number,
  ): { row: number; col: number } | null {
    const { cellSize, offsetX, offsetY } = getGridLayout();
    const col = Math.floor((canvasX - offsetX) / cellSize);
    const row = Math.floor((canvasY - offsetY) / cellSize);
    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
      return { row, col };
    }
    return null;
  }

  // --- Particle spawners ---
  function spawnSparkles(row: number, col: number) {
    const { cellSize, offsetX, offsetY } = getGridLayout();
    const cx = offsetX + col * cellSize + cellSize / 2;
    const cy = offsetY + row * cellSize + cellSize / 2;
    const regionColor = REGION_COLORS[board[row][col].region % REGION_COLORS.length];

    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.5;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * (60 + Math.random() * 40),
        vy: Math.sin(angle) * (60 + Math.random() * 40) - 30,
        life: 500,
        maxLife: 500,
        size: 3 + Math.random() * 2,
        color: lightenColor(regionColor, 30),
        type: 'sparkle',
      });
    }
  }

  function spawnCelebrationParticles() {
    for (let i = 0; i < 30; i++) {
      const color = REGION_COLORS[Math.floor(Math.random() * REGION_COLORS.length)];
      particles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: -10,
        vx: (Math.random() - 0.5) * 80,
        vy: 40 + Math.random() * 60,
        life: 1500,
        maxLife: 1500,
        size: 4 + Math.random() * 4,
        color,
        type: (['star', 'heart', 'sparkle'] as const)[Math.floor(Math.random() * 3)],
      });
    }
  }

  // --- Cell toggle logic ---
  function toggleCell(row: number, col: number): void {
    const cell = board[row][col];
    if (cell.isHinted) return;

    const prevState = cell.state;
    const cycle: TCellState[] = ['empty', 'cross', 'queen'];
    const idx = cycle.indexOf(cell.state);
    cell.state = cycle[(idx + 1) % cycle.length];

    // Trigger animations
    const anim = cellAnims[row]?.[col];
    if (anim) {
      if (cell.state === 'queen') {
        anim.scale = 0;
        anim.scaleTime = 300;
        anim.scaleDir = 'in';
        spawnSparkles(row, col);
      } else if (prevState === 'queen') {
        anim.scale = 1;
      }
      if (cell.state === 'cross') {
        anim.opacity = 0;
        anim.fadeTime = 150;
        anim.fadeDir = 'in';
      }
      if (cell.state === 'empty' && prevState === 'cross') {
        anim.opacity = 1;
      }
    }

    validateBoard();
    checkWin();
  }

  // --- Validation and win check ---
  function validateBoard(): void {
    // Clear all errors first
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        board[r][c].isError = false;
      }
    }

    // Find all queen positions
    const queens: { row: number; col: number }[] = [];
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c].state === 'queen') {
          queens.push({ row: r, col: c });
        }
      }
    }

    // Check each pair of queens for conflicts
    for (let i = 0; i < queens.length; i++) {
      for (let j = i + 1; j < queens.length; j++) {
        const a = queens[i];
        const b = queens[j];
        let conflict = false;

        // Same row
        if (a.row === b.row) conflict = true;
        // Same column
        if (a.col === b.col) conflict = true;
        // Same region
        if (board[a.row][a.col].region === board[b.row][b.col].region) conflict = true;
        // Adjacent (8-directional, including diagonal)
        if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1) conflict = true;

        if (conflict) {
          board[a.row][a.col].isError = true;
          board[b.row][b.col].isError = true;
        }
      }
    }

    // Trigger shake on error queens
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c].isError && board[r][c].state === 'queen') {
          const anim = cellAnims[r]?.[c];
          if (anim && anim.shakeTime <= 0) {
            anim.shakeTime = 400;
          }
        }
      }
    }
  }

  function checkWin(): void {
    // Count queens
    let queenCount = 0;
    let hasError = false;
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c].state === 'queen') {
          queenCount++;
          if (board[r][c].isError) hasError = true;
        }
      }
    }

    if (queenCount === boardSize && !hasError) {
      // Win!
      const config = DIFFICULTY_CONFIG[difficulty];
      const elapsed = getElapsedSeconds();
      const effectiveTime = elapsed + hintPenalty;
      score = Math.floor(config.multiplier * Math.max(0, config.baseTime - effectiveTime));
      celebration = { active: true, time: 0, highlightIndex: -1 };
      spawnCelebrationParticles();
      state = 'gameover';
    }
  }

  // --- Hint system ---
  function giveHint(): void {
    if (hintsRemaining <= 0) return;
    if (state !== 'playing') return;

    // Find cells that are not correctly filled
    const incorrectCells: { row: number; col: number }[] = [];
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c].isHinted) continue; // already hinted

        const shouldBeQueen = solution[r][c];
        const currentState = board[r][c].state;

        if (shouldBeQueen && currentState !== 'queen') {
          incorrectCells.push({ row: r, col: c });
        } else if (!shouldBeQueen && currentState !== 'cross' && currentState !== 'empty') {
          incorrectCells.push({ row: r, col: c });
        }
      }
    }

    // Also include empty cells that should have a queen or cross
    const emptyCells: { row: number; col: number }[] = [];
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c].isHinted) continue;
        if (board[r][c].state === 'empty') {
          emptyCells.push({ row: r, col: c });
        }
      }
    }

    // Prioritize incorrect cells, then empty cells
    const candidates = incorrectCells.length > 0 ? incorrectCells : emptyCells;
    if (candidates.length === 0) return;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const shouldBeQueen = solution[chosen.row][chosen.col];

    board[chosen.row][chosen.col].state = shouldBeQueen ? 'queen' : 'cross';
    board[chosen.row][chosen.col].isHinted = true;
    board[chosen.row][chosen.col].isError = false;

    hintsRemaining--;
    hintPenalty += HINT_PENALTY_SECONDS;

    validateBoard();
    checkWin();
  }

  // --- Time helpers ---
  function getElapsedSeconds(): number {
    if (state === 'paused') return elapsedBeforePause;
    if (state === 'playing' && startTime > 0) {
      return elapsedBeforePause + (performance.now() - startTime) / 1000;
    }
    return 0;
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // --- Start / reset game ---
  async function startGame() {
    if (state === 'loading') return;
    state = 'loading';
    canvas.style.cursor = 'default';
    hoveredDifficulty = null;

    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }

    const config = DIFFICULTY_CONFIG[difficulty];
    boardSize = config.size;
    hintsRemaining = config.hints;
    hintPenalty = 0;

    try {
      const puzzle = await generatePuzzle(boardSize);
      regions = puzzle.regions;
      solution = puzzle.solution;
    } catch {
      state = 'start';
      return;
    }

    initBoard(boardSize);
    initCellAnims(boardSize);
    score = 0;
    elapsedBeforePause = 0;
    cursorRow = 0;
    cursorCol = 0;
    startTime = performance.now();
    state = 'playing';
  }

  function resetGame() {
    state = 'start';
    score = 0;
    elapsedBeforePause = 0;
    startTime = 0;
    hintPenalty = 0;
    cursorRow = -1;
    cursorCol = -1;
    particles = [];
    celebration = { active: false, time: 0, highlightIndex: -1 };
    gameOverHud.reset();
  }

  // --- Difficulty button bounds ---
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

  function isHintButtonAt(canvasX: number, canvasY: number): boolean {
    return (
      canvasX >= hintButton.x &&
      canvasX <= hintButton.x + hintButton.w &&
      canvasY >= hintButton.y &&
      canvasY <= hintButton.y + hintButton.h
    );
  }

  // --- Event handlers ---
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
      case 'KeyH':
        if (state === 'playing') {
          giveHint();
        }
        break;
      case 'ArrowUp':
        if (state === 'playing' && cursorRow > 0) {
          cursorRow--;
          e.preventDefault();
        }
        break;
      case 'ArrowDown':
        if (state === 'playing' && cursorRow < boardSize - 1) {
          cursorRow++;
          e.preventDefault();
        }
        break;
      case 'ArrowLeft':
        if (state === 'playing' && cursorCol > 0) {
          cursorCol--;
          e.preventDefault();
        }
        break;
      case 'ArrowRight':
        if (state === 'playing' && cursorCol < boardSize - 1) {
          cursorCol++;
          e.preventDefault();
        }
        break;
      case 'Space':
      case 'Enter':
        if (state === 'playing' && cursorRow >= 0 && cursorCol >= 0) {
          toggleCell(cursorRow, cursorCol);
          e.preventDefault();
        }
        break;
      case 'Digit1':
        if (state === 'start') {
          difficulty = 'easy';
          startGame();
        }
        break;
      case 'Digit2':
        if (state === 'start') {
          difficulty = 'normal';
          startGame();
        }
        break;
      case 'Digit3':
        if (state === 'start') {
          difficulty = 'hard';
          startGame();
        }
        break;
    }
  };

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

    // Check hint button
    if (isHintButtonAt(pos.x, pos.y) && hintsRemaining > 0) {
      giveHint();
      return;
    }

    // Check cell click
    const cell = getCellFromPos(pos.x, pos.y);
    if (cell) {
      cursorRow = cell.row;
      cursorCol = cell.col;
      toggleCell(cell.row, cell.col);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (state === 'start') {
      const pos = getCanvasPos(e.clientX, e.clientY);
      const hovered = getDifficultyAt(pos.x, pos.y);
      hoveredDifficulty = hovered;
      canvas.style.cursor = hovered ? 'pointer' : 'default';
    } else if (state === 'playing') {
      const pos = getCanvasPos(e.clientX, e.clientY);
      const cell = getCellFromPos(pos.x, pos.y);
      if (cell) {
        cursorRow = cell.row;
        cursorCol = cell.col;
        canvas.style.cursor = 'pointer';
      } else if (isHintButtonAt(pos.x, pos.y) && hintsRemaining > 0) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    } else {
      if (hoveredDifficulty !== null) {
        hoveredDifficulty = null;
        canvas.style.cursor = 'default';
      }
    }
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();

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
    // Check hint button
    if (isHintButtonAt(pos.x, pos.y) && hintsRemaining > 0) {
      giveHint();
      return;
    }

    // Check cell tap
    const cell = getCellFromPos(pos.x, pos.y);
    if (cell) {
      cursorRow = cell.row;
      cursorCol = cell.col;
      toggleCell(cell.row, cell.col);
    }
  }

  // --- Animation update ---
  function updateAnimations(dt: number) {
    const dtMs = dt * 1000;

    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        const anim = cellAnims[r]?.[c];
        if (!anim) continue;

        // Scale animation (queen pop/shrink)
        if (anim.scaleTime > 0) {
          anim.scaleTime = Math.max(0, anim.scaleTime - dtMs);
          const progress = 1 - anim.scaleTime / 300;
          if (anim.scaleDir === 'in') {
            if (progress < 0.6) {
              anim.scale = (progress / 0.6) * 1.2;
            } else {
              anim.scale = 1.2 - ((progress - 0.6) / 0.4) * 0.2;
            }
          } else {
            anim.scale = 1 - progress;
          }
          if (anim.scaleTime <= 0) {
            anim.scale = anim.scaleDir === 'in' ? 1 : 0;
          }
        }

        // Fade animation (X mark)
        if (anim.fadeTime > 0) {
          anim.fadeTime = Math.max(0, anim.fadeTime - dtMs);
          const progress = 1 - anim.fadeTime / 150;
          anim.opacity = anim.fadeDir === 'in' ? progress : 1 - progress;
          if (anim.fadeTime <= 0) {
            anim.opacity = anim.fadeDir === 'in' ? 1 : 0;
          }
        }

        // Shake animation (error)
        if (anim.shakeTime > 0) {
          anim.shakeTime = Math.max(0, anim.shakeTime - dtMs);
          const intensity = (anim.shakeTime / 400) * 4;
          anim.shakeX = Math.sin(anim.shakeTime * 0.05) * intensity;
          if (anim.shakeTime <= 0) anim.shakeX = 0;
        }
      }
    }

    // Update particles
    particles = particles.filter(p => {
      p.life -= dtMs;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      return p.life > 0;
    });

    // Update celebration
    if (celebration.active) {
      celebration.time += dtMs;
      celebration.highlightIndex = Math.floor(
        celebration.time / (800 / (boardSize * boardSize)),
      );
      if (celebration.time > 2300) {
        celebration.active = false;
      }
    }
  }

  // --- Render functions ---
  function renderStartScreen() {
    // Light candy background
    ctx.fillStyle = COLORS.canvasBg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Pixel crown next to title
    drawPixelCrown(CANVAS_WIDTH / 2 - 75, 80, 24, COLORS.accent);

    // Title
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Queens', CANVAS_WIDTH / 2 + 12, 80);

    // Subtitle
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '15px sans-serif';
    ctx.fillText('Place N queens with no conflicts', CANVAS_WIDTH / 2, 120);

    // Difficulty buttons
    const btnW = 160;
    const btnH = 130;
    const gap = 20;
    const totalW = btnW * 3 + gap * 2;
    const baseX = (CANVAS_WIDTH - totalW) / 2;
    const baseY = 180;

    difficultyButtons.length = 0;

    const diffs: TDifficulty[] = ['easy', 'normal', 'hard'];
    const labels = ['Easy', 'Normal', 'Hard'];
    const sizeLabels = ['5x5', '7x7', '9x9'];

    diffs.forEach((diff, i) => {
      const config = DIFFICULTY_CONFIG[diff];
      const x = baseX + i * (btnW + gap);
      const y = baseY;
      const isHovered = hoveredDifficulty === diff;

      difficultyButtons.push({ x, y, w: btnW, h: btnH, difficulty: diff });

      // Button background
      const borderColor = isHovered ? COLORS.cardHoverBorder : COLORS.cardBorder;
      const bgColor = COLORS.cardBg;

      // Card shadow on hover
      if (isHovered) {
        ctx.shadowColor = 'rgba(255,107,157,0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 4;
      }

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(x, y, btnW, btnH, 12);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(x, y, btnW, btnH, 12);
      ctx.stroke();

      // Glow on hover
      if (isHovered) {
        ctx.shadowColor = COLORS.accent;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = COLORS.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, btnW, btnH, 12);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Label
      ctx.fillStyle = isHovered ? COLORS.accent : COLORS.textPrimary;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], x + btnW / 2, y + 30);

      // Size label
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = '16px sans-serif';
      ctx.fillText(sizeLabels[i], x + btnW / 2, y + 60);

      // Mini grid preview
      const miniSize = Math.min(6, config.size);
      const miniCellSize = Math.min(8, Math.floor(60 / miniSize));
      const miniTotalW = miniSize * miniCellSize;
      const miniStartX = x + btnW / 2 - miniTotalW / 2;
      const miniStartY = y + 72;
      for (let r = 0; r < miniSize; r++) {
        for (let c = 0; c < miniSize; c++) {
          const colorIdx = (r + c) % REGION_COLORS.length;
          ctx.fillStyle = REGION_COLORS[colorIdx];
          ctx.globalAlpha = 0.6;
          ctx.fillRect(
            miniStartX + c * miniCellSize,
            miniStartY + r * miniCellSize,
            miniCellSize - 1,
            miniCellSize - 1,
          );
          ctx.globalAlpha = 1;
        }
      }

      // Multiplier badge
      ctx.fillStyle = isHovered
        ? COLORS.accentBg
        : COLORS.inactiveBg;
      const badgeW = 50;
      const badgeH = 22;
      const badgeX = x + btnW / 2 - badgeW / 2;
      const badgeY = y + btnH - 30;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();

      ctx.fillStyle = isHovered ? COLORS.accent : COLORS.textSecondary;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`x${config.multiplier}`, x + btnW / 2, badgeY + badgeH / 2);
    });

    // Keyboard hint
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      '1: Easy   2: Normal   3: Hard',
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT - 50,
    );
    ctx.fillText(
      "or tap a card to start",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT - 30,
    );
  }

  function renderHud() {
    // HUD background
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);

    const elapsed = getElapsedSeconds();

    // Timer (left)
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatTime(elapsed), 15, HUD_HEIGHT / 2);

    // Difficulty label (center)
    const config = DIFFICULTY_CONFIG[difficulty];
    const diffLabels: Record<TDifficulty, string> = {
      easy: 'Easy',
      normal: 'Normal',
      hard: 'Hard',
    };
    ctx.textAlign = 'center';
    ctx.fillText(
      `${diffLabels[difficulty]} (${config.size}x${config.size})`,
      CANVAS_WIDTH / 2,
      HUD_HEIGHT / 2,
    );

    // Hint button (right)
    const hbW = 80;
    const hbH = 30;
    const hbX = CANVAS_WIDTH - hbW - 15;
    const hbY = HUD_HEIGHT / 2 - hbH / 2;
    hintButton = { x: hbX, y: hbY, w: hbW, h: hbH };

    const hasHints = hintsRemaining > 0;
    ctx.fillStyle = hasHints
      ? COLORS.accentBg
      : COLORS.inactiveBg;
    ctx.beginPath();
    ctx.roundRect(hbX, hbY, hbW, hbH, 6);
    ctx.fill();

    ctx.strokeStyle = hasHints
      ? COLORS.accentBorder
      : COLORS.inactiveBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(hbX, hbY, hbW, hbH, 6);
    ctx.stroke();

    ctx.fillStyle = hasHints ? COLORS.accent : COLORS.inactiveText;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Hint (${hintsRemaining})`, hbX + hbW / 2, hbY + hbH / 2);

    // Separator line
    ctx.strokeStyle = COLORS.hudSeparator;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HUD_HEIGHT - 0.5);
    ctx.lineTo(CANVAS_WIDTH, HUD_HEIGHT - 0.5);
    ctx.stroke();
  }

  function renderGrid() {
    const { cellSize, offsetX, offsetY } = getGridLayout();

    // Draw cells
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const cell = board[r][c];
        const regionColor = REGION_COLORS[cell.region % REGION_COLORS.length];

        // Cell background with region color
        ctx.fillStyle = regionColor;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Cell border (thin)
        ctx.strokeStyle = COLORS.cellBorder;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

        // Celebration highlight overlay
        if (celebration.active) {
          const cellIndex = r * boardSize + c;
          if (cellIndex <= celebration.highlightIndex) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        }

        // Draw cell content
        if (cell.state === 'cross') {
          const anim = cellAnims[r]?.[c];
          const opacity = anim?.opacity ?? 1;
          ctx.globalAlpha = opacity;
          const pad = cellSize * 0.3;
          ctx.strokeStyle = cell.isHinted
            ? COLORS.hint
            : cell.isError
              ? COLORS.error
              : darkenColor(regionColor, 40);
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x + pad, y + pad);
          ctx.lineTo(x + cellSize - pad, y + cellSize - pad);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + cellSize - pad, y + pad);
          ctx.lineTo(x + pad, y + cellSize - pad);
          ctx.stroke();
          ctx.lineCap = 'butt';
          ctx.globalAlpha = 1;
        } else if (cell.state === 'queen') {
          const anim = cellAnims[r]?.[c];
          const scale = anim?.scale ?? 1;
          if (scale > 0.01) {
            const qcx = x + cellSize / 2 + (anim?.shakeX ?? 0);
            const qcy = y + cellSize / 2;
            const crownSize = cellSize * 0.65 * scale;
            const crownColor = cell.isError
              ? COLORS.error
              : cell.isHinted
                ? COLORS.hint
                : regionColor;
            drawPixelCrown(qcx, qcy, crownSize, crownColor);
          }
        }

        // Cursor highlight (desktop)
        if (r === cursorRow && c === cursorCol && state === 'playing') {
          ctx.strokeStyle = COLORS.accent;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        }
      }
    }

    // Draw thick region boundary lines
    ctx.strokeStyle = COLORS.regionBorder;
    ctx.lineWidth = 2.5;

    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const currentRegion = board[r][c].region;

        // Right neighbor
        if (c < boardSize - 1 && board[r][c + 1].region !== currentRegion) {
          ctx.beginPath();
          ctx.moveTo(x + cellSize, y);
          ctx.lineTo(x + cellSize, y + cellSize);
          ctx.stroke();
        }
        // Bottom neighbor
        if (r < boardSize - 1 && board[r + 1][c].region !== currentRegion) {
          ctx.beginPath();
          ctx.moveTo(x, y + cellSize);
          ctx.lineTo(x + cellSize, y + cellSize);
          ctx.stroke();
        }
      }
    }

    // Outer border
    const totalW = boardSize * cellSize;
    const totalH = boardSize * cellSize;
    ctx.strokeStyle = COLORS.regionBorder;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(offsetX, offsetY, totalW, totalH);
  }

  function renderParticles() {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.type === 'sparkle') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else if (p.type === 'star') {
        ctx.fillRect(p.x - p.size / 2, p.y - 1, p.size, 2);
        ctx.fillRect(p.x - 1, p.y - p.size / 2, 2, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = COLORS.canvasBg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (state === 'playing' || state === 'paused' || state === 'gameover') {
      renderGrid();
      renderParticles();
      renderHud();
    }

    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
    } else if (state === 'start') {
      renderStartScreen();
    } else if (state === 'paused') {
      gamePauseHud(canvas, ctx);
    } else if (state === 'gameover') {
      gameOverHud.render(score);
    }
  }

  // --- Game loop ---
  function gameLoop(timestamp: number) {
    const dt = lastTime > 0 ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0;
    lastTime = timestamp;
    if (state === 'playing' || state === 'gameover') {
      updateAnimations(dt);
    }
    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  // --- Event listener registration ---
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', resize);
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // --- Return cleanup function ---
  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', resize);
    canvas.style.cursor = 'default';
  };
}
