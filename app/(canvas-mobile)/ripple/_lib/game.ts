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
  HINT_PENALTY_SECONDS,
  COLORS,
  RIPPLE_VALUES,
  RIPPLE_MAX_DISTANCE,
  getStageDifficulty,
} from './config';
import {
  TDifficulty,
  TCell,
  TBoard,
  TCellAnim,
  TParticle,
  TCelebration,
  TPuzzle,
} from './types';
import { generatePuzzle, computeRippleBoard } from './generator';

export type TRippleCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export function setupRipple(
  canvas: HTMLCanvasElement,
  callbacks?: TRippleCallbacks,
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
  let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' | 'tutorial' = 'start';
  let stage = 1;
  let difficulty: TDifficulty = 'easy';
  let gridSize = 5;
  let puzzle: TPuzzle | null = null;
  let board: TBoard = [];
  let score = 0;
  let totalScore = 0;
  let startTime = 0;
  let elapsedBeforePause = 0;
  let hintsRemaining = 0;
  let hintPenalty = 0;
  let animationId = 0;
  let lastTime = 0;
  let cursorRow = -1;
  let cursorCol = -1;
  let placedStones = 0;

  // Tutorial state
  const TUTORIAL_STORAGE_KEY = 'ripple_tutorial_done';
  let tutorialStep = 0;
  let tutorialBlinkTime = 0; // for pulsing target cell
  const TUTORIAL_GRID_SIZE = 3;
  const TUTORIAL_STONE_POS: [number, number] = [1, 1]; // center
  const TUTORIAL_MESSAGES = [
    '돌을 놓으면 8방향으로 파문이 퍼집니다',
    `파문 값: 돌=3, 주변 8칸=2, 바깥=1`,
    '가운데 셀(3)을 탭하여\n돌을 놓아보세요',
    '파문이 퍼져서 모든 숫자가\n맞았습니다!',
    '준비 완료!\n이제 진짜 퍼즐을 풀어봅시다 🎉',
  ];
  function isTutorialDone(): boolean {
    try { return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true'; } catch { return false; }
  }
  function markTutorialDone(): void {
    try { localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true'); } catch { /* noop */ }
  }

  // Animation state
  let cellAnims: TCellAnim[][] = [];
  let particles: TParticle[] = [];
  let celebration: TCelebration = { active: false, time: 0, rippleIndex: -1 };

  function initCellAnims(size: number) {
    cellAnims = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({
        rippleTime: 0,
        rippleActive: false,
        scale: 1,
        opacity: 1,
        shakeX: 0,
        shakeTime: 0,
        glowTime: 0,
      })),
    );
  }

  // Button bounds
  type TButtonRect = { x: number; y: number; w: number; h: number };
  let validateButton: TButtonRect = { x: 0, y: 0, w: 0, h: 0 };
  let resetButton: TButtonRect = { x: 0, y: 0, w: 0, h: 0 };
  let hintButton: TButtonRect = { x: 0, y: 0, w: 0, h: 0 };

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
    'ripple',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Coordinate conversion helpers ---
  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  const getTouchPos = (touch: Touch) => getCanvasPos(touch.clientX, touch.clientY);

  // --- Grid metrics ---
  function getGridMetrics() {
    const gridTop = HUD_HEIGHT + GRID_PADDING;
    const gridArea = Math.min(
      CANVAS_WIDTH - GRID_PADDING * 2,
      CANVAS_HEIGHT - HUD_HEIGHT - GRID_PADDING * 2 - 80,
    );
    const cellSize = gridArea / gridSize;
    const gridLeft = (CANVAS_WIDTH - cellSize * gridSize) / 2;
    return { gridTop, gridLeft, cellSize, gridArea };
  }

  function getCellFromPos(
    canvasX: number,
    canvasY: number,
  ): { row: number; col: number } | null {
    const { gridTop, gridLeft, cellSize } = getGridMetrics();
    const col = Math.floor((canvasX - gridLeft) / cellSize);
    const row = Math.floor((canvasY - gridTop) / cellSize);
    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
      return { row, col };
    }
    return null;
  }

  // --- Color utilities ---
  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

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

  // --- Particle spawners ---
  function spawnDropParticles(row: number, col: number) {
    const { gridTop, gridLeft, cellSize } = getGridMetrics();
    const cx = gridLeft + col * cellSize + cellSize / 2;
    const cy = gridTop + row * cellSize + cellSize / 2;

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * (50 + Math.random() * 40),
        vy: Math.sin(angle) * (50 + Math.random() * 40) - 20,
        life: 600,
        maxLife: 600,
        size: 3 + Math.random() * 2,
        color: COLORS.accentLight,
        type: 'drop',
      });
    }
  }

  function spawnRingParticle(row: number, col: number) {
    const { gridTop, gridLeft, cellSize } = getGridMetrics();
    const cx = gridLeft + col * cellSize + cellSize / 2;
    const cy = gridTop + row * cellSize + cellSize / 2;

    particles.push({
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      life: 800,
      maxLife: 800,
      size: cellSize * 0.3,
      color: COLORS.accent,
      type: 'ring',
    });
  }

  function spawnCelebrationParticles() {
    for (let i = 0; i < 30; i++) {
      const colors = [COLORS.accent, COLORS.accentLight, COLORS.success, '#FFD700', '#FF69B4'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: -10,
        vx: (Math.random() - 0.5) * 80,
        vy: 40 + Math.random() * 60,
        life: 1500,
        maxLife: 1500,
        size: 4 + Math.random() * 4,
        color,
        type: (['drop', 'sparkle'] as const)[Math.floor(Math.random() * 2)],
      });
    }
  }

  // --- Count placed stones ---
  function countPlacedStones(): number {
    let count = 0;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c]?.hasStone) count++;
      }
    }
    return count;
  }

  // --- Core game logic ---
  function toggleStone(row: number, col: number): void {
    const cell = board[row][col];
    if (cell.isHinted) return;

    const anim = cellAnims[row]?.[col];

    if (cell.hasStone) {
      // Remove stone
      cell.hasStone = false;
      placedStones--;
      if (anim) {
        anim.scale = 1;
        anim.glowTime = 0;
      }
    } else {
      // Place stone
      cell.hasStone = true;
      placedStones++;
      if (anim) {
        anim.scale = 0;
        anim.glowTime = 300;
        anim.rippleActive = true;
        anim.rippleTime = 600;
      }
      spawnDropParticles(row, col);
      spawnRingParticle(row, col);
    }

    // Clear errors after toggle
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        board[r][c].isError = false;
      }
    }

    // Auto-check win when placed stones equals target
    if (puzzle && placedStones === puzzle.stoneCount) {
      checkWin();
    }
  }

  function validateBoard(): void {
    if (!puzzle) return;

    // Compute ripple board for current stone positions
    const currentStones: [number, number][] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c].hasStone) {
          currentStones.push([r, c]);
        }
      }
    }

    const currentValues = computeRippleBoard(gridSize, currentStones);

    // Clear all errors first
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        board[r][c].isError = false;
      }
    }

    // Compare with revealed cells' target values
    let hasError = false;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c].revealed) {
          if (currentValues[r][c] !== board[r][c].value) {
            board[r][c].isError = true;
            hasError = true;
          }
        }
      }
    }

    // Trigger shake on error cells
    if (hasError) {
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (board[r][c].isError) {
            const anim = cellAnims[r]?.[c];
            if (anim && anim.shakeTime <= 0) {
              anim.shakeTime = 400;
            }
          }
        }
      }
    }
  }

  function checkWin(): void {
    if (!puzzle) return;

    // Compute ripple board for current positions
    const currentStones: [number, number][] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c].hasStone) {
          currentStones.push([r, c]);
        }
      }
    }

    if (currentStones.length !== puzzle.stoneCount) return;

    const currentValues = computeRippleBoard(gridSize, currentStones);

    // Compare ALL cells with puzzle values
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (currentValues[r][c] !== board[r][c].value) {
          return; // Not a win
        }
      }
    }

    // Win!
    const config = DIFFICULTY_CONFIG[difficulty];
    const elapsed = getElapsedSeconds();
    const effectiveTime = elapsed + hintPenalty;
    const stageScore = Math.floor(
      config.multiplier * Math.max(0, config.baseTime - effectiveTime),
    );
    score = stageScore;
    totalScore += stageScore;
    celebration = { active: true, time: 0, rippleIndex: -1 };
    spawnCelebrationParticles();
    state = 'gameover';
  }

  function useHint(): void {
    if (hintsRemaining <= 0) return;
    if (state !== 'playing') return;
    if (!puzzle) return;

    // Find unplaced correct stone positions
    const candidates: [number, number][] = [];
    for (const [r, c] of puzzle.stonePositions) {
      if (!board[r][c].hasStone && !board[r][c].isHinted) {
        candidates.push([r, c]);
      }
    }

    if (candidates.length === 0) return;

    // Place one randomly
    const [hr, hc] = candidates[Math.floor(Math.random() * candidates.length)];
    board[hr][hc].hasStone = true;
    board[hr][hc].isHinted = true;
    placedStones++;

    // Animation for hinted stone
    const anim = cellAnims[hr]?.[hc];
    if (anim) {
      anim.scale = 0;
      anim.glowTime = 300;
      anim.rippleActive = true;
      anim.rippleTime = 600;
    }
    spawnDropParticles(hr, hc);

    hintsRemaining--;
    hintPenalty += HINT_PENALTY_SECONDS;

    // Clear errors after hint
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        board[r][c].isError = false;
      }
    }

    // Auto-check win
    if (puzzle && placedStones === puzzle.stoneCount) {
      checkWin();
    }
  }

  function resetBoard(): void {
    if (state !== 'playing') return;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!board[r][c].isHinted) {
          board[r][c].hasStone = false;
          board[r][c].isError = false;
        }
      }
    }
    placedStones = countPlacedStones();
    particles = [];
    initCellAnims(gridSize);
    // Restore hinted stone anims
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c].isHinted) {
          const anim = cellAnims[r]?.[c];
          if (anim) {
            anim.scale = 1;
          }
        }
      }
    }
  }

  async function startStage(): Promise<void> {
    if (state === 'loading') return;
    state = 'loading';

    if (stage === 1 && callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }

    difficulty = getStageDifficulty(stage);
    const config = DIFFICULTY_CONFIG[difficulty];

    // Determine grid size
    const sizeConfig = config.size;
    if (Array.isArray(sizeConfig)) {
      gridSize = sizeConfig[0] + Math.floor(Math.random() * (sizeConfig[1] - sizeConfig[0] + 1));
    } else {
      gridSize = sizeConfig;
    }

    hintsRemaining = config.hints;
    hintPenalty = 0;

    try {
      puzzle = await generatePuzzle(
        gridSize,
        config.stones,
        config.hintRatio,
        config.maxAttempts,
      );
    } catch {
      // Fall back to easier difficulty
      const fallbackDiff: TDifficulty = difficulty === 'expert' ? 'hard' : difficulty === 'hard' ? 'normal' : 'easy';
      const fallbackConfig = DIFFICULTY_CONFIG[fallbackDiff];
      const fallbackSize = Array.isArray(fallbackConfig.size)
        ? fallbackConfig.size[0]
        : fallbackConfig.size;
      try {
        puzzle = await generatePuzzle(
          fallbackSize,
          fallbackConfig.stones,
          fallbackConfig.hintRatio,
          fallbackConfig.maxAttempts,
        );
        gridSize = fallbackSize;
        difficulty = fallbackDiff;
      } catch {
        state = 'start';
        return;
      }
    }

    // Copy board data with hasStone: false
    board = puzzle.board.map((row) =>
      row.map((cell) => ({
        ...cell,
        hasStone: false,
        isError: false,
        isHinted: false,
      })),
    );

    initCellAnims(gridSize);
    placedStones = 0;
    score = 0;
    elapsedBeforePause = 0;
    cursorRow = 0;
    cursorCol = 0;
    startTime = performance.now();
    particles = [];
    celebration = { active: false, time: 0, rippleIndex: -1 };
    state = 'playing';
  }

  function resetGame(): void {
    state = 'start';
    stage = 1;
    score = 0;
    totalScore = 0;
    elapsedBeforePause = 0;
    startTime = 0;
    hintPenalty = 0;
    cursorRow = -1;
    cursorCol = -1;
    placedStones = 0;
    particles = [];
    celebration = { active: false, time: 0, rippleIndex: -1 };
    gameOverHud.reset();
  }

  // --- Tutorial logic ---
  function startTutorial(): void {
    state = 'tutorial';
    tutorialStep = 0;
    tutorialBlinkTime = 0;
    gridSize = TUTORIAL_GRID_SIZE;

    // Build a fixed 3x3 board with stone at center (1,1)
    const stonePositions: [number, number][] = [TUTORIAL_STONE_POS];
    const values = computeRippleBoard(TUTORIAL_GRID_SIZE, stonePositions);

    board = values.map((row) =>
      row.map((val) => ({
        value: val,
        revealed: true,
        hasStone: false,
        isError: false,
        isHinted: false,
      })),
    );

    initCellAnims(TUTORIAL_GRID_SIZE);
    placedStones = 0;
    particles = [];
    celebration = { active: false, time: 0, rippleIndex: -1 };
  }

  function advanceTutorial(): void {
    tutorialStep++;
    if (tutorialStep >= TUTORIAL_MESSAGES.length) {
      // Tutorial complete
      markTutorialDone();
      state = 'start';
    }
  }

  function handleTutorialTap(row?: number, col?: number): void {
    if (tutorialStep === 2) {
      // Step 3: user must tap center cell
      if (row === TUTORIAL_STONE_POS[0] && col === TUTORIAL_STONE_POS[1]) {
        board[row][col].hasStone = true;
        placedStones = 1;
        const anim = cellAnims[row]?.[col];
        if (anim) {
          anim.scale = 0;
          anim.rippleActive = true;
          anim.rippleTime = 600;
        }
        spawnDropParticles(row, col);
        spawnRingParticle(row, col);
        advanceTutorial();
      }
      // Wrong cell: do nothing (message stays)
    } else {
      // Other steps: tap anywhere to advance
      advanceTutorial();
    }
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

  // --- Button hit testing ---
  function isButtonAt(btn: TButtonRect, x: number, y: number): boolean {
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }

  // --- Animation update ---
  function updateAnimations(dt: number) {
    const dtMs = dt * 1000;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const anim = cellAnims[r]?.[c];
        if (!anim) continue;

        // Scale animation (stone pop)
        if (anim.glowTime > 0) {
          anim.glowTime = Math.max(0, anim.glowTime - dtMs);
          const progress = 1 - anim.glowTime / 300;
          if (progress < 0.6) {
            anim.scale = (progress / 0.6) * 1.15;
          } else {
            anim.scale = 1.15 - ((progress - 0.6) / 0.4) * 0.15;
          }
          if (anim.glowTime <= 0) {
            anim.scale = 1;
          }
        }

        // Ripple ring animation
        if (anim.rippleActive) {
          anim.rippleTime = Math.max(0, anim.rippleTime - dtMs);
          if (anim.rippleTime <= 0) {
            anim.rippleActive = false;
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
    particles = particles.filter((p) => {
      p.life -= dtMs;
      if (p.type === 'ring') {
        // Ring expands
        p.size += dt * 80;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 120 * dt;
      }
      return p.life > 0;
    });

    // Update celebration
    if (celebration.active) {
      celebration.time += dtMs;
      celebration.rippleIndex = Math.floor(
        celebration.time / (800 / (gridSize * gridSize)),
      );
      if (celebration.time > 2300) {
        celebration.active = false;
      }
    }
  }

  // --- Render functions ---

  function renderTutorial() {
    ctx.fillStyle = COLORS.canvasBg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Title
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌊 튜토리얼', CANVAS_WIDTH / 2, 50);

    // Draw tutorial grid (centered, larger cells)
    const cellSize = 80;
    const gridW = TUTORIAL_GRID_SIZE * cellSize;
    const gridLeft = (CANVAS_WIDTH - gridW) / 2;
    const gridTop = 100;

    for (let r = 0; r < TUTORIAL_GRID_SIZE; r++) {
      for (let c = 0; c < TUTORIAL_GRID_SIZE; c++) {
        const x = gridLeft + c * cellSize;
        const y = gridTop + r * cellSize;
        const cell = board[r]?.[c];
        if (!cell) continue;

        const anim = cellAnims[r]?.[c];
        const isTarget = r === TUTORIAL_STONE_POS[0] && c === TUTORIAL_STONE_POS[1];

        // Cell background
        let bgColor: string = COLORS.cellRevealed;
        if (cell.hasStone) bgColor = COLORS.accentLight;

        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 6);
        ctx.fill();

        // Cell border
        ctx.strokeStyle = COLORS.cellBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 6);
        ctx.stroke();

        // Pulsing highlight on target cell at step 2
        if (isTarget && tutorialStep === 2 && !cell.hasStone) {
          const pulse = 0.4 + 0.6 * Math.abs(Math.sin(tutorialBlinkTime * 3));
          ctx.strokeStyle = `rgba(74, 144, 217, ${pulse})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(x + 4, y + 4, cellSize - 8, cellSize - 8, 5);
          ctx.stroke();
        }

        // Stone
        if (cell.hasStone) {
          const stoneScale = anim ? Math.min(Math.max(anim.scale, 0), 1.3) : 1;
          const stoneR = cellSize * 0.28 * stoneScale;
          const cx = x + cellSize / 2;
          const cy = y + cellSize / 2;

          ctx.fillStyle = COLORS.stone;
          ctx.beginPath();
          ctx.arc(cx, cy, stoneR, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.arc(cx - stoneR * 0.2, cy - stoneR * 0.2, stoneR * 0.4, 0, Math.PI * 2);
          ctx.fill();

          // Ripple ring animation
          if (anim?.rippleActive) {
            for (let ring = 0; ring < 3; ring++) {
              const t = (anim.rippleTime - ring * 150) / 600;
              if (t < 0 || t > 1) continue;
              const ringR = stoneR + t * cellSize * 0.6;
              const alpha = 1 - t;
              ctx.strokeStyle = `rgba(74, 144, 217, ${alpha * 0.5})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        } else {
          // Number
          ctx.fillStyle = COLORS.text;
          ctx.font = `bold ${cellSize * 0.4}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(cell.value), x + cellSize / 2, y + cellSize / 2);
        }
      }
    }

    // Ripple range overlay (after stone placed)
    if (tutorialStep >= 3) {
      const [sr, sc] = TUTORIAL_STONE_POS;
      for (let r = 0; r < TUTORIAL_GRID_SIZE; r++) {
        for (let c = 0; c < TUTORIAL_GRID_SIZE; c++) {
          if (r === sr && c === sc) continue;
          const dist = Math.max(Math.abs(r - sr), Math.abs(c - sc));
          const x = gridLeft + c * cellSize;
          const y = gridTop + r * cellSize;
          if (dist === 1) {
            ctx.fillStyle = COLORS.ripple1;
            ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          } else if (dist === 2) {
            ctx.fillStyle = COLORS.ripple2;
            ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          }
        }
      }
    }

    // Particles
    renderParticles();

    // Message bubble
    const msgY = gridTop + TUTORIAL_GRID_SIZE * cellSize + 40;
    const msgW = 400;
    const msgH = 100;
    const msgX = (CANVAS_WIDTH - msgW) / 2;

    // Bubble background
    ctx.fillStyle = COLORS.hudBg;
    ctx.beginPath();
    ctx.roundRect(msgX, msgY, msgW, msgH, 12);
    ctx.fill();
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(msgX, msgY, msgW, msgH, 12);
    ctx.stroke();

    // Message text (supports \n)
    const msg = TUTORIAL_MESSAGES[tutorialStep] ?? '';
    const lines = msg.split('\n');
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lineHeight = 24;
    const textStartY = msgY + msgH / 2 - ((lines.length - 1) * lineHeight) / 2 - 8;
    lines.forEach((line, i) => {
      ctx.fillText(line, CANVAS_WIDTH / 2, textStartY + i * lineHeight);
    });

    // "Tap to continue" prompt (except on step 2 which requires specific cell tap)
    const promptText = tutorialStep === 2 ? '반짝이는 셀을 탭하세요 ▶' : '탭하여 계속 ▶';
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '13px sans-serif';
    ctx.fillText(promptText, CANVAS_WIDTH / 2, msgY + msgH - 12);

    // Step indicator
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '12px sans-serif';
    ctx.fillText(
      `${tutorialStep + 1} / ${TUTORIAL_MESSAGES.length}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT - 30,
    );
  }

  function renderStartScreen() {
    ctx.fillStyle = COLORS.canvasBg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Title
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Ripple', CANVAS_WIDTH / 2, 80);

    // Water wave decoration
    ctx.fillStyle = COLORS.accentLight;
    ctx.font = '28px sans-serif';
    ctx.fillText('~ ~ ~', CANVAS_WIDTH / 2, 120);

    // Subtitle
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '15px sans-serif';
    ctx.fillText(
      '돌을 놓아 파문 숫자를 맞추는 퍼즐',
      CANVAS_WIDTH / 2,
      155,
    );

    // Stage info
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`스테이지 ${stage}`, CANVAS_WIDTH / 2, 200);

    if (totalScore > 0) {
      ctx.fillStyle = COLORS.textLight;
      ctx.font = '14px sans-serif';
      ctx.fillText(`총 점수: ${totalScore}`, CANVAS_WIDTH / 2, 225);
    }

    // Rules summary box
    const boxX = CANVAS_WIDTH / 2 - 220;
    const boxY = 255;
    const boxW = 440;
    const boxH = 280;

    ctx.fillStyle = COLORS.hudBg;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 12);
    ctx.fill();

    ctx.strokeStyle = COLORS.cellBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 12);
    ctx.stroke();

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('게임 방법', CANVAS_WIDTH / 2, boxY + 28);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = COLORS.textLight;
    ctx.textAlign = 'left';
    const rules = [
      '돌을 놓으면 주변 셀에 파문이 퍼집니다.',
      `돌=${RIPPLE_VALUES[0]}, 주변 8칸=${RIPPLE_VALUES[1]}, 그 바깥 8방향=${RIPPLE_VALUES[2]}`,
      '여러 돌의 파문이 겹치면 값이 합산됩니다.',
      '숫자는 해당 셀의 파문 합산값을 나타냅니다.',
      '모든 셀의 숫자가 맞도록 돌을 배치하세요.',
    ];
    rules.forEach((rule, i) => {
      ctx.fillText(`  ${rule}`, boxX + 20, boxY + 58 + i * 24);
    });

    // Ripple diagram
    const diagramY = boxY + boxH - 100;
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    const dv = RIPPLE_VALUES;
    const diagramLines = [
      `[${dv[2]}] [${dv[2]}] [${dv[2]}] [${dv[2]}] [${dv[2]}]`,
      `[${dv[2]}] [${dv[1]}] [${dv[1]}] [${dv[1]}] [${dv[2]}]`,
      `[${dv[2]}] [${dv[1]}] [${dv[0]}] [${dv[1]}] [${dv[2]}]`,
      `[${dv[2]}] [${dv[1]}] [${dv[1]}] [${dv[1]}] [${dv[2]}]`,
      `[${dv[2]}] [${dv[2]}] [${dv[2]}] [${dv[2]}] [${dv[2]}]`,
    ];
    diagramLines.forEach((line, i) => {
      ctx.fillText(line, CANVAS_WIDTH / 2, diagramY + i * 14);
    });
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '11px sans-serif';
    ctx.fillText('파문 패턴 (8방향 확산)', CANVAS_WIDTH / 2, diagramY + diagramLines.length * 14 + 4);

    // Start prompt
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      '탭 또는 S키를 눌러 시작',
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT - 80,
    );

    // Difficulty preview
    const diffLabel = getStageDifficulty(stage);
    const config = DIFFICULTY_CONFIG[diffLabel];
    const sizeLabel = Array.isArray(config.size)
      ? `${config.size[0]}-${config.size[1]}`
      : `${config.size}`;
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '13px sans-serif';
    const diffKor: Record<TDifficulty, string> = {
      easy: '쉬움',
      normal: '보통',
      hard: '어려움',
      expert: '전문가',
    };
    ctx.fillText(
      `난이도: ${diffKor[diffLabel]} | 그리드: ${sizeLabel}x${sizeLabel} | x${config.multiplier}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT - 50,
    );

    ctx.fillText(
      'S: 시작 | P: 일시정지 | R: 리셋 | H: 힌트 | V: 검증',
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT - 25,
    );
  }

  function renderHud() {
    // HUD background
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);

    const elapsed = getElapsedSeconds();

    // Stage & difficulty (left)
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const diffLabels: Record<TDifficulty, string> = {
      easy: '쉬움',
      normal: '보통',
      hard: '어려움',
      expert: '전문가',
    };
    ctx.fillText(
      `스테이지 ${stage} - ${diffLabels[difficulty]}`,
      15,
      HUD_HEIGHT / 2 - 12,
    );

    // Timer (left, second line)
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '14px sans-serif';
    ctx.fillText(formatTime(elapsed), 15, HUD_HEIGHT / 2 + 12);

    // Stone count (center)
    const stoneTotal = puzzle?.stoneCount ?? 0;
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `돌: ${placedStones}/${stoneTotal}`,
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
    ctx.fillStyle = hasHints ? hexToRgba(COLORS.accent, 0.15) : '#F0F4F8';
    ctx.beginPath();
    ctx.roundRect(hbX, hbY, hbW, hbH, 6);
    ctx.fill();

    ctx.strokeStyle = hasHints ? COLORS.accent : COLORS.cellBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(hbX, hbY, hbW, hbH, 6);
    ctx.stroke();

    ctx.fillStyle = hasHints ? COLORS.accent : COLORS.buttonDisabled;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`힌트 (${hintsRemaining})`, hbX + hbW / 2, hbY + hbH / 2);

    // Separator line
    ctx.strokeStyle = COLORS.cellBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HUD_HEIGHT - 0.5);
    ctx.lineTo(CANVAS_WIDTH, HUD_HEIGHT - 0.5);
    ctx.stroke();
  }

  function renderGrid() {
    const { gridTop, gridLeft, cellSize } = getGridMetrics();

    // Draw cells
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = gridLeft + c * cellSize;
        const y = gridTop + r * cellSize;
        const cell = board[r][c];
        const anim = cellAnims[r]?.[c];
        const shakeX = anim?.shakeX ?? 0;

        // Cell background
        let bgColor: string = COLORS.cellEmpty;
        if (cell.isError) {
          bgColor = COLORS.errorLight;
        } else if (cell.hasStone) {
          bgColor = hexToRgba(COLORS.accent, 0.1);
        } else if (cell.revealed) {
          bgColor = COLORS.cellRevealed;
        } else if (r === cursorRow && c === cursorCol && state === 'playing') {
          bgColor = COLORS.cellHover;
        }

        ctx.fillStyle = bgColor;
        ctx.fillRect(x + shakeX, y, cellSize, cellSize);

        // Cell border
        ctx.strokeStyle = cell.isError ? COLORS.error : COLORS.cellBorder;
        ctx.lineWidth = cell.isError ? 1.5 : 0.5;
        ctx.strokeRect(x + 0.5 + shakeX, y + 0.5, cellSize - 1, cellSize - 1);

        // Celebration highlight overlay
        if (celebration.active) {
          const cellIndex = r * gridSize + c;
          if (cellIndex <= celebration.rippleIndex) {
            ctx.fillStyle = 'rgba(74,144,217,0.25)';
            ctx.fillRect(x + shakeX, y, cellSize, cellSize);
          }
        }

        // Ripple ring animation
        if (anim?.rippleActive && anim.rippleTime > 0) {
          const progress = 1 - anim.rippleTime / 600;
          const ringRadius = cellSize * 0.3 + progress * cellSize * (RIPPLE_MAX_DISTANCE + 0.5);
          const ringAlpha = Math.max(0, 1 - progress);
          ctx.strokeStyle = hexToRgba(COLORS.accent, ringAlpha * 0.5);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            x + cellSize / 2 + shakeX,
            y + cellSize / 2,
            ringRadius,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }

        // Stone
        if (cell.hasStone) {
          const scale = anim?.scale ?? 1;
          if (scale > 0.01) {
            const stoneRadius = cellSize * 0.28 * scale;
            const stoneCx = x + cellSize / 2 + shakeX;
            const stoneCy = y + cellSize / 2;

            // Stone circle
            const stoneColor = cell.isHinted
              ? COLORS.hint
              : cell.isError
                ? COLORS.error
                : COLORS.stone;
            ctx.fillStyle = stoneColor;
            ctx.beginPath();
            ctx.arc(stoneCx, stoneCy, stoneRadius, 0, Math.PI * 2);
            ctx.fill();

            // Stone highlight
            const highlightColor = cell.isHinted
              ? lightenColor(COLORS.hint, 40)
              : cell.isError
                ? lightenColor(COLORS.error, 40)
                : COLORS.stoneHighlight;
            ctx.fillStyle = highlightColor;
            ctx.beginPath();
            ctx.arc(
              stoneCx - stoneRadius * 0.25,
              stoneCy - stoneRadius * 0.25,
              stoneRadius * 0.35,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }

        // Number text (for revealed cells)
        if (cell.revealed && cell.value > 0) {
          ctx.fillStyle = cell.isError
            ? COLORS.error
            : cell.hasStone
              ? COLORS.textWhite
              : COLORS.text;
          ctx.font = `bold ${Math.max(12, cellSize * 0.35)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            String(cell.value),
            x + cellSize / 2 + shakeX,
            y + cellSize / 2 + (cell.hasStone ? cellSize * 0.02 : 0),
          );
        } else if (cell.revealed && cell.value === 0 && !cell.hasStone) {
          // Show 0 for revealed cells with value 0
          ctx.fillStyle = COLORS.textLight;
          ctx.font = `bold ${Math.max(12, cellSize * 0.35)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('0', x + cellSize / 2 + shakeX, y + cellSize / 2);
        }

        // Dot for hidden empty cells (not a stone, not revealed)
        if (!cell.revealed && !cell.hasStone) {
          ctx.fillStyle = COLORS.cellBorder;
          ctx.beginPath();
          ctx.arc(
            x + cellSize / 2 + shakeX,
            y + cellSize / 2,
            2.5,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }

        // Cursor highlight (desktop)
        if (r === cursorRow && c === cursorCol && state === 'playing') {
          ctx.strokeStyle = COLORS.accent;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(x + 1 + shakeX, y + 1, cellSize - 2, cellSize - 2);
        }
      }
    }

    // Draw ripple range overlay for placed stones
    if (state === 'playing') {
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (board[r][c].hasStone) {
            // Highlight cells within ripple range
            for (let dr = -RIPPLE_MAX_DISTANCE; dr <= RIPPLE_MAX_DISTANCE; dr++) {
              for (let dc = -RIPPLE_MAX_DISTANCE; dc <= RIPPLE_MAX_DISTANCE; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
                if (nr === r && nc === c) continue;
                const dist = Math.abs(dr) + Math.abs(dc);
                if (dist > RIPPLE_MAX_DISTANCE) continue;

                const nx = gridLeft + nc * cellSize;
                const ny = gridTop + nr * cellSize;
                const alpha = dist === 1 ? 0.08 : 0.04;
                ctx.fillStyle = hexToRgba(COLORS.accent, alpha);
                ctx.fillRect(nx, ny, cellSize, cellSize);
              }
            }
          }
        }
      }
    }

    // Outer border
    const totalW = gridSize * cellSize;
    const totalH = gridSize * cellSize;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(gridLeft, gridTop, totalW, totalH);
  }

  function renderBottomButtons() {
    const { gridTop, cellSize } = getGridMetrics();
    const gridBottom = gridTop + gridSize * cellSize;
    const btnY = gridBottom + 15;
    const btnH = 36;
    const btnW = 120;
    const gap = 20;
    const totalBtnW = btnW * 2 + gap;
    const startX = (CANVAS_WIDTH - totalBtnW) / 2;

    // Validate button
    const vbX = startX;
    validateButton = { x: vbX, y: btnY, w: btnW, h: btnH };

    ctx.fillStyle = COLORS.buttonBg;
    ctx.beginPath();
    ctx.roundRect(vbX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.fillStyle = COLORS.buttonText;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('검증 (V)', vbX + btnW / 2, btnY + btnH / 2);

    // Reset button
    const rbX = startX + btnW + gap;
    resetButton = { x: rbX, y: btnY, w: btnW, h: btnH };

    ctx.fillStyle = '#F0F4F8';
    ctx.beginPath();
    ctx.roundRect(rbX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.strokeStyle = COLORS.cellBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(rbX, btnY, btnW, btnH, 8);
    ctx.stroke();

    ctx.fillStyle = COLORS.textLight;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('리셋 (R)', rbX + btnW / 2, btnY + btnH / 2);
  }

  function renderParticles() {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;

      if (p.type === 'ring') {
        // Expanding ring
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'sparkle') {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else {
        // Drop
        ctx.fillStyle = p.color;
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
      if (state === 'playing') {
        renderBottomButtons();
      }
    }

    if (state === 'tutorial') {
      renderTutorial();
      return;
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
          if (!isTutorialDone()) { startTutorial(); } else { startStage(); }
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
        if (state === 'playing') {
          resetBoard();
        }
        break;
      case 'KeyH':
        if (state === 'playing') {
          useHint();
        }
        break;
      case 'KeyV':
        if (state === 'playing') {
          validateBoard();
        }
        break;
      case 'ArrowUp':
        if (state === 'playing' && cursorRow > 0) {
          cursorRow--;
          e.preventDefault();
        }
        break;
      case 'ArrowDown':
        if (state === 'playing' && cursorRow < gridSize - 1) {
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
        if (state === 'playing' && cursorCol < gridSize - 1) {
          cursorCol++;
          e.preventDefault();
        }
        break;
      case 'Space':
      case 'Enter':
        if (state === 'tutorial') {
          if (tutorialStep === 2) {
            handleTutorialTap(TUTORIAL_STONE_POS[0], TUTORIAL_STONE_POS[1]);
          } else {
            handleTutorialTap();
          }
          e.preventDefault();
        } else if (state === 'playing' && cursorRow >= 0 && cursorCol >= 0) {
          toggleStone(cursorRow, cursorCol);
          e.preventDefault();
        }
        break;
    }
  };

  function handleClick(e: MouseEvent) {
    const pos = getCanvasPos(e.clientX, e.clientY);

    if (state === 'tutorial') {
      if (tutorialStep === 2) {
        // Check if user clicked the target cell
        const cellSize = 80;
        const gridW = TUTORIAL_GRID_SIZE * cellSize;
        const tGridLeft = (CANVAS_WIDTH - gridW) / 2;
        const tGridTop = 100;
        const col = Math.floor((pos.x - tGridLeft) / cellSize);
        const row = Math.floor((pos.y - tGridTop) / cellSize);
        if (row >= 0 && row < TUTORIAL_GRID_SIZE && col >= 0 && col < TUTORIAL_GRID_SIZE) {
          handleTutorialTap(row, col);
        }
      } else {
        handleTutorialTap();
      }
      return;
    }

    if (state === 'start') {
      if (!isTutorialDone()) { startTutorial(); } else { startStage(); }
      return;
    }

    if (state !== 'playing') return;

    // Check validate button
    if (isButtonAt(validateButton, pos.x, pos.y)) {
      validateBoard();
      return;
    }

    // Check reset button
    if (isButtonAt(resetButton, pos.x, pos.y)) {
      resetBoard();
      return;
    }

    // Check hint button
    if (isButtonAt(hintButton, pos.x, pos.y) && hintsRemaining > 0) {
      useHint();
      return;
    }

    // Check cell click
    const cell = getCellFromPos(pos.x, pos.y);
    if (cell) {
      cursorRow = cell.row;
      cursorCol = cell.col;
      toggleStone(cell.row, cell.col);
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

    if (state === 'tutorial') {
      if (tutorialStep === 2) {
        const cellSize = 80;
        const gridW = TUTORIAL_GRID_SIZE * cellSize;
        const tGridLeft = (CANVAS_WIDTH - gridW) / 2;
        const tGridTop = 100;
        const col = Math.floor((pos.x - tGridLeft) / cellSize);
        const row = Math.floor((pos.y - tGridTop) / cellSize);
        if (row >= 0 && row < TUTORIAL_GRID_SIZE && col >= 0 && col < TUTORIAL_GRID_SIZE) {
          handleTutorialTap(row, col);
        }
      } else {
        handleTutorialTap();
      }
      return;
    }

    if (state === 'start') {
      if (!isTutorialDone()) { startTutorial(); } else { startStage(); }
      return;
    }

    if (state === 'loading') return;

    if (state === 'paused') {
      startTime = performance.now();
      state = 'playing';
      return;
    }

    // Playing state
    // Check validate button
    if (isButtonAt(validateButton, pos.x, pos.y)) {
      validateBoard();
      return;
    }

    // Check reset button
    if (isButtonAt(resetButton, pos.x, pos.y)) {
      resetBoard();
      return;
    }

    // Check hint button
    if (isButtonAt(hintButton, pos.x, pos.y) && hintsRemaining > 0) {
      useHint();
      return;
    }

    // Check cell tap
    const cell = getCellFromPos(pos.x, pos.y);
    if (cell) {
      cursorRow = cell.row;
      cursorCol = cell.col;
      toggleStone(cell.row, cell.col);
    }
  }

  // --- Game loop ---
  function gameLoop(timestamp: number) {
    const dt = lastTime > 0 ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0;
    lastTime = timestamp;
    if (state === 'playing' || state === 'gameover') {
      updateAnimations(dt);
    }
    if (state === 'tutorial') {
      tutorialBlinkTime += dt;
      updateAnimations(dt);
    }
    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  // --- Event listener registration ---
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', resize);
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // --- Return cleanup function ---
  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', resize);
  };
}
