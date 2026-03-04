import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { TGameType } from '@/@types/scores';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
  BOTTLE_WIDTH,
  BOTTLE_HEIGHT,
  BOTTLE_GAP,
  BOTTLE_INNER_PADDING,
  SLOT_HEIGHT,
  BOTTLE_RADIUS,
  MAX_COLS,
  SLOTS_PER_BOTTLE,
  getBottleCountForLevel,
} from './config';
import { TBottle, TMove, TGameState } from './types';
import {
  generatePuzzle,
  cloneBottles,
  isValidMove,
  executeMove,
  undoMove,
  isSolved,
} from './puzzle';

export type TWaterSortCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn: boolean;
};

export function setupWaterSort(
  canvas: HTMLCanvasElement,
  callbacks: TWaterSortCallbacks,
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

  // Game state
  let state: TGameState = 'start';
  let level = 1;
  let bottles: TBottle[] = [];
  let moveHistory: TMove[] = [];
  let selectedBottle: number = -1;
  let animationId = 0;
  let lastTime = 0;

  // Level clear overlay
  let levelClearTimer = 0;
  const LEVEL_CLEAR_DURATION = 800;

  // Button areas for undo and skip
  const UNDO_BUTTON = { x: 10, y: 10, w: 110, h: 36 };
  const SKIP_BUTTON = { x: CANVAS_WIDTH - 120, y: 10, w: 110, h: 36 };

  // gameOverHud
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      return callbacks.onScoreSave(finalScore);
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'watersort' as TGameType,
    gameOverCallbacks,
    {
      isLoggedIn: callbacks.isLoggedIn,
    },
  );

  // --- Helpers ---

  function resetGame() {
    state = 'start';
    level = 1;
    bottles = [];
    moveHistory = [];
    selectedBottle = -1;
    lastTime = 0;
    levelClearTimer = 0;
    gameOverHud.reset();
  }

  function startLevel(lvl: number) {
    level = lvl;
    bottles = generatePuzzle(level);
    moveHistory = [];
    selectedBottle = -1;
    levelClearTimer = 0;
  }

  async function startGame() {
    state = 'loading';
    try {
      if (callbacks.onGameStart) {
        await callbacks.onGameStart();
      }
    } catch (error) {
      console.error('Failed to start game session:', error);
    }
    startLevel(1);
    state = 'playing';
    lastTime = 0;
  }

  function getBottleLayout() {
    const count = bottles.length;
    const cols = Math.min(count, MAX_COLS);
    const rows = Math.ceil(count / cols);

    const totalGridWidth = cols * BOTTLE_WIDTH + (cols - 1) * BOTTLE_GAP;
    const totalGridHeight = rows * BOTTLE_HEIGHT + (rows - 1) * BOTTLE_GAP;

    // Top offset: below HUD area
    const hudOffset = 56;
    const startX = (CANVAS_WIDTH - totalGridWidth) / 2;
    const startY = hudOffset + (CANVAS_HEIGHT - hudOffset - totalGridHeight) / 2;

    return { cols, rows, startX, startY };
  }

  function getBottleRect(index: number) {
    const { cols, startX, startY } = getBottleLayout();
    const row = Math.floor(index / cols);
    const col = index % cols;

    // Center the last row if it has fewer items
    const totalInRow =
      row < Math.floor(bottles.length / cols)
        ? cols
        : bottles.length % cols || cols;
    const rowOffset =
      totalInRow < cols
        ? ((cols - totalInRow) * (BOTTLE_WIDTH + BOTTLE_GAP)) / 2
        : 0;

    const x = startX + rowOffset + col * (BOTTLE_WIDTH + BOTTLE_GAP);
    const y = startY + row * (BOTTLE_HEIGHT + BOTTLE_GAP);

    return { x, y, w: BOTTLE_WIDTH, h: BOTTLE_HEIGHT };
  }

  function getBottleAt(px: number, py: number): number {
    for (let i = 0; i < bottles.length; i++) {
      const rect = getBottleRect(i);
      // Expand tap area slightly for easier touch
      const padX = 8;
      const padY = 20; // extra vertical pad for the raised bottle
      if (
        px >= rect.x - padX &&
        px <= rect.x + rect.w + padX &&
        py >= rect.y - padY &&
        py <= rect.y + rect.h + padY
      ) {
        return i;
      }
    }
    return -1;
  }

  function isInButton(
    px: number,
    py: number,
    btn: { x: number; y: number; w: number; h: number },
  ): boolean {
    return px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h;
  }

  function handleBottleClick(index: number) {
    if (state !== 'playing') return;

    if (selectedBottle === -1) {
      // Select a bottle (only if it's not empty)
      const bottle = bottles[index];
      const hasContent = bottle.colors.some((c) => c !== null);
      if (hasContent) {
        selectedBottle = index;
      }
    } else if (selectedBottle === index) {
      // Deselect
      selectedBottle = -1;
    } else {
      // Try to pour
      if (isValidMove(bottles, selectedBottle, index)) {
        const move = executeMove(bottles, selectedBottle, index);
        if (move) {
          moveHistory.push(move);
          selectedBottle = -1;

          // Check if solved
          if (isSolved(bottles)) {
            state = 'levelclear';
            levelClearTimer = 0;
          }
        }
      } else {
        // Invalid move: select the new bottle if it has content, otherwise deselect
        const bottle = bottles[index];
        const hasContent = bottle.colors.some((c) => c !== null);
        if (hasContent) {
          selectedBottle = index;
        } else {
          selectedBottle = -1;
        }
      }
    }
  }

  function handleUndo() {
    if (state !== 'playing') return;
    if (moveHistory.length === 0) return;
    const lastMove = moveHistory.pop()!;
    undoMove(bottles, lastMove);
    selectedBottle = -1;
  }

  function handleSkip() {
    if (state !== 'playing') return;
    startLevel(level);
  }

  // --- Coordinate conversion ---

  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  const getTouchPos = (touch: Touch) => getCanvasPos(touch.clientX, touch.clientY);

  // --- Input handlers ---

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (state === 'gameover') {
      gameOverHud.onKeyDown(e, level - 1);
      return;
    }

    if (e.code === 'KeyS') {
      if (state === 'start') {
        void startGame();
      } else if (state === 'paused') {
        state = 'playing';
        lastTime = 0;
      }
      return;
    }

    if (e.code === 'KeyP') {
      if (state === 'playing') {
        state = 'paused';
      }
      return;
    }

    if (e.code === 'KeyR') {
      if (state === 'playing' && level > 1) {
        // Save score first (completed levels)
        state = 'gameover';
      } else {
        resetGame();
      }
      return;
    }

    if (e.code === 'KeyZ') {
      handleUndo();
      return;
    }

    if (e.code === 'KeyN') {
      handleSkip();
      return;
    }
  };

  const handleClick = (e: MouseEvent) => {
    const pos = getCanvasPos(e.clientX, e.clientY);

    if (state === 'playing') {
      // Check undo button
      if (isInButton(pos.x, pos.y, UNDO_BUTTON)) {
        handleUndo();
        return;
      }

      // Check skip button
      if (isInButton(pos.x, pos.y, SKIP_BUTTON)) {
        handleSkip();
        return;
      }

      // Check bottle click
      const bottleIndex = getBottleAt(pos.x, pos.y);
      if (bottleIndex !== -1) {
        handleBottleClick(bottleIndex);
      }
      return;
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const pos = getTouchPos(e.touches[0]);

    // Game over state: delegate to gameOverHud
    if (state === 'gameover') {
      gameOverHud.onTouchStart(pos.x, pos.y, level - 1);
      return;
    }

    // Start screen: tap to start
    if (state === 'start') {
      void startGame();
      return;
    }

    // Paused: tap to resume
    if (state === 'paused') {
      state = 'playing';
      lastTime = 0;
      return;
    }

    // Playing state
    if (state === 'playing') {
      // Check undo button
      if (isInButton(pos.x, pos.y, UNDO_BUTTON)) {
        handleUndo();
        return;
      }

      // Check skip button
      if (isInButton(pos.x, pos.y, SKIP_BUTTON)) {
        handleSkip();
        return;
      }

      // Check bottle tap
      const bottleIndex = getBottleAt(pos.x, pos.y);
      if (bottleIndex !== -1) {
        handleBottleClick(bottleIndex);
      }
    }
  };

  // --- Rendering ---

  function drawBackground() {
    // 따뜻한 크림/베이지 그라데이션
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#FFF5E6');
    grad.addColorStop(0.5, '#FDEBD0');
    grad.addColorStop(1, '#F5CBA7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function drawHud() {
    ctx.save();

    // Level indicator (center top)
    ctx.fillStyle = '#5D4037';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Level ${level}`, CANVAS_WIDTH / 2, 28);

    // Undo button (left top)
    const undoAlpha = moveHistory.length > 0 ? 1 : 0.35;
    ctx.fillStyle = `rgba(93, 64, 55, ${undoAlpha * 0.12})`;
    ctx.beginPath();
    ctx.roundRect(UNDO_BUTTON.x, UNDO_BUTTON.y, UNDO_BUTTON.w, UNDO_BUTTON.h, 8);
    ctx.fill();

    ctx.fillStyle = `rgba(93, 64, 55, ${undoAlpha})`;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '\u21A9 Undo (Z)',
      UNDO_BUTTON.x + UNDO_BUTTON.w / 2,
      UNDO_BUTTON.y + UNDO_BUTTON.h / 2,
    );

    // Skip button (right top)
    ctx.fillStyle = 'rgba(93, 64, 55, 0.12)';
    ctx.beginPath();
    ctx.roundRect(SKIP_BUTTON.x, SKIP_BUTTON.y, SKIP_BUTTON.w, SKIP_BUTTON.h, 8);
    ctx.fill();

    ctx.fillStyle = 'rgba(93, 64, 55, 1)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'Skip (N) \u2192',
      SKIP_BUTTON.x + SKIP_BUTTON.w / 2,
      SKIP_BUTTON.y + SKIP_BUTTON.h / 2,
    );

    ctx.restore();
  }

  function drawBottlePath(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h - r);
    ctx.arcTo(x, y + h, x + r, y + h, r);
    ctx.lineTo(x + w - r, y + h);
    ctx.arcTo(x + w, y + h, x + w, y + h - r, r);
    ctx.lineTo(x + w, y);
  }

  function drawBottle(index: number) {
    const bottle = bottles[index];
    const rect = getBottleRect(index);
    const isSelected = selectedBottle === index;

    const x = rect.x;
    const y = isSelected ? rect.y - 15 : rect.y;
    const w = rect.w;
    const h = rect.h;
    const r = BOTTLE_RADIUS;
    const pad = BOTTLE_INNER_PADDING;

    ctx.save();

    // Soft shadow under bottle
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    drawBottlePath(x, y, w, h, r);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Glass-like bottle fill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    drawBottlePath(x, y, w, h, r);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();

    // Draw water slots (bottom-up: index 0 is bottom)
    const innerW = w - pad * 2;
    const slotGap = 2;

    for (let i = 0; i < SLOTS_PER_BOTTLE; i++) {
      const colorIdx = bottle.colors[i];
      if (colorIdx === null) continue;

      const slotY = y + h - pad - (i + 1) * SLOT_HEIGHT - i * slotGap;
      const slotX = x + pad;

      ctx.fillStyle = COLORS[colorIdx];

      if (i === 0) {
        // Bottom slot: rounded bottom corners
        const innerR = Math.max(r - pad, 2);
        ctx.beginPath();
        ctx.moveTo(slotX, slotY);
        ctx.lineTo(slotX + innerW, slotY);
        ctx.lineTo(slotX + innerW, slotY + SLOT_HEIGHT - innerR);
        ctx.arcTo(
          slotX + innerW,
          slotY + SLOT_HEIGHT,
          slotX + innerW - innerR,
          slotY + SLOT_HEIGHT,
          innerR,
        );
        ctx.lineTo(slotX + innerR, slotY + SLOT_HEIGHT);
        ctx.arcTo(slotX, slotY + SLOT_HEIGHT, slotX, slotY + SLOT_HEIGHT - innerR, innerR);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(slotX, slotY, innerW, SLOT_HEIGHT);
      }

      // Light highlight on left side of each water slot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(slotX, slotY, 4, SLOT_HEIGHT);
    }

    // Bottle outline (U-shape)
    ctx.strokeStyle = isSelected ? '#E67E22' : 'rgba(160, 130, 100, 0.5)';
    ctx.lineWidth = isSelected ? 3 : 1.5;
    drawBottlePath(x, y, w, h, r);
    ctx.stroke();

    // Glass highlight (thin white line on left)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 4);
    ctx.lineTo(x + 3, y + h - r - 4);
    ctx.stroke();

    // Selected glow effect
    if (isSelected) {
      ctx.shadowColor = '#E67E22';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#E67E22';
      ctx.lineWidth = 2.5;
      drawBottlePath(x, y, w, h, r);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  function drawBottles() {
    for (let i = 0; i < bottles.length; i++) {
      drawBottle(i);
    }
  }

  function drawLevelClearOverlay(progress: number) {
    ctx.save();

    // Warm semi-transparent overlay
    ctx.fillStyle = `rgba(255, 248, 230, ${0.7 * Math.min(progress * 2, 1)})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Scale-in animation
    const scale = Math.min(progress * 3, 1);
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Text shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Level Clear!', 2, 2);

    // Main text
    ctx.fillStyle = '#E67E22';
    ctx.fillText('Level Clear!', 0, 0);

    ctx.restore();
  }

  // --- Game loop ---

  function update(dt: number) {
    if (state === 'levelclear') {
      levelClearTimer += dt;
      if (levelClearTimer >= LEVEL_CLEAR_DURATION) {
        // Advance to next level
        startLevel(level + 1);
        state = 'playing';
      }
    }
  }

  function render() {
    drawBackground();

    if (state === 'start') {
      gameStartHud(canvas, ctx);
      return;
    }

    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
      return;
    }

    if (state === 'gameover') {
      // Draw bottles behind overlay
      drawHud();
      drawBottles();
      gameOverHud.render(level - 1);
      return;
    }

    if (state === 'paused') {
      drawHud();
      drawBottles();
      gamePauseHud(canvas, ctx);
      return;
    }

    // Playing or levelclear
    drawHud();
    drawBottles();

    if (state === 'levelclear') {
      const progress = levelClearTimer / LEVEL_CLEAR_DURATION;
      drawLevelClearOverlay(progress);
    }
  }

  function gameLoop(currentTime: number) {
    const dt = lastTime === 0 ? 16 : currentTime - lastTime;
    lastTime = currentTime;

    update(dt);
    render();

    animationId = requestAnimationFrame(gameLoop);
  }

  // --- Event listeners ---

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  // Start game loop
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('touchstart', handleTouchStart);
    cancelAnimationFrame(animationId);
  };
}
