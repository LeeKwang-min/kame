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
} from './config';
import { TBottle, TMove, TGameState } from './types';
import {
  generatePuzzle,
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
  let gameTime = 0; // total elapsed time for idle animations

  // Level clear overlay
  let levelClearTimer = 0;
  const LEVEL_CLEAR_DURATION = 1200;

  // === Animation state ===

  // Bounce animation for selected bottle
  let bounceTime = 0;

  // Particles for level clear
  type TParticle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    life: number;
    maxLife: number;
  };
  let particles: TParticle[] = [];

  // Button areas
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
    { isLoggedIn: callbacks.isLoggedIn },
  );

  // === Helpers ===

  function resetGame() {
    state = 'start';
    level = 1;
    bottles = [];
    moveHistory = [];
    selectedBottle = -1;
    lastTime = 0;
    gameTime = 0;
    levelClearTimer = 0;
    particles = [];
    bounceTime = 0;
    gameOverHud.reset();
  }

  function startLevel(lvl: number) {
    level = lvl;
    bottles = generatePuzzle(level);
    moveHistory = [];
    selectedBottle = -1;
    levelClearTimer = 0;
    particles = [];
  }

  async function startGame() {
    state = 'loading';
    try {
      if (callbacks.onGameStart) {
        await callbacks.onGameStart();
      }
    } catch (error) {
      console.error('Failed to create game session:', error);
    }
    startLevel(1);
    state = 'playing';
    lastTime = 0;
    gameTime = 0;
  }

  function getBottleLayout() {
    const count = bottles.length;
    const cols = Math.min(count, MAX_COLS);
    const rows = Math.ceil(count / cols);
    const totalGridWidth = cols * BOTTLE_WIDTH + (cols - 1) * BOTTLE_GAP;
    const totalGridHeight = rows * BOTTLE_HEIGHT + (rows - 1) * BOTTLE_GAP;
    const hudOffset = 56;
    const startX = (CANVAS_WIDTH - totalGridWidth) / 2;
    const startY = hudOffset + (CANVAS_HEIGHT - hudOffset - totalGridHeight) / 2;
    return { cols, rows, startX, startY };
  }

  function getBottleRect(index: number) {
    const { cols, startX, startY } = getBottleLayout();
    const row = Math.floor(index / cols);
    const col = index % cols;
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
      const padX = 8;
      const padY = 20;
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

  // === Helpers ===

  function topIndex(bottle: TBottle): number {
    for (let i = SLOTS_PER_BOTTLE - 1; i >= 0; i--) {
      if (bottle.colors[i] !== null) return i;
    }
    return -1;
  }

  // === Particles ===

  function spawnClearParticles() {
    particles = [];
    const colorSet = COLORS.slice(0, Math.min(level + 1, 10));
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 200;
      particles.push({
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        color: colorSet[Math.floor(Math.random() * colorSet.length)],
        size: 4 + Math.random() * 6,
        life: 1,
        maxLife: 0.8 + Math.random() * 0.6,
      });
    }
  }

  // === Game actions ===

  function handleBottleClick(index: number) {
    if (state !== 'playing') return;

    if (selectedBottle === -1) {
      const bottle = bottles[index];
      const hasContent = bottle.colors.some((c) => c !== null);
      if (hasContent) {
        selectedBottle = index;
        bounceTime = 0;
      }
    } else if (selectedBottle === index) {
      selectedBottle = -1;
    } else {
      if (isValidMove(bottles, selectedBottle, index)) {
        const move = executeMove(bottles, selectedBottle, index);
        if (move) {
          moveHistory.push(move);
          selectedBottle = -1;

          if (isSolved(bottles)) {
            state = 'levelclear';
            levelClearTimer = 0;
            spawnClearParticles();
          }
        }
      } else {
        const bottle = bottles[index];
        const hasContent = bottle.colors.some((c) => c !== null);
        if (hasContent) {
          selectedBottle = index;
          bounceTime = 0;
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

  // === Coordinate conversion ===

  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  const getTouchPos = (touch: Touch) => getCanvasPos(touch.clientX, touch.clientY);

  // === Input handlers ===

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
      if (isInButton(pos.x, pos.y, UNDO_BUTTON)) { handleUndo(); return; }
      if (isInButton(pos.x, pos.y, SKIP_BUTTON)) { handleSkip(); return; }
      const bottleIndex = getBottleAt(pos.x, pos.y);
      if (bottleIndex !== -1) handleBottleClick(bottleIndex);
      return;
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const pos = getTouchPos(e.touches[0]);

    if (state === 'gameover') {
      gameOverHud.onTouchStart(pos.x, pos.y, level - 1);
      return;
    }
    if (state === 'start') { void startGame(); return; }
    if (state === 'paused') { state = 'playing'; lastTime = 0; return; }
    if (state === 'playing') {
      if (isInButton(pos.x, pos.y, UNDO_BUTTON)) { handleUndo(); return; }
      if (isInButton(pos.x, pos.y, SKIP_BUTTON)) { handleSkip(); return; }
      const bottleIndex = getBottleAt(pos.x, pos.y);
      if (bottleIndex !== -1) handleBottleClick(bottleIndex);
    }
  };

  // === Rendering ===

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#FFF5E6');
    grad.addColorStop(0.5, '#FDEBD0');
    grad.addColorStop(1, '#F5CBA7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function drawHud() {
    ctx.save();
    ctx.fillStyle = '#5D4037';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Level ${level}`, CANVAS_WIDTH / 2, 28);

    const undoAlpha = moveHistory.length > 0 ? 1 : 0.35;
    ctx.fillStyle = `rgba(93, 64, 55, ${undoAlpha * 0.12})`;
    ctx.beginPath();
    ctx.roundRect(UNDO_BUTTON.x, UNDO_BUTTON.y, UNDO_BUTTON.w, UNDO_BUTTON.h, 8);
    ctx.fill();
    ctx.fillStyle = `rgba(93, 64, 55, ${undoAlpha})`;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u21A9 Undo (Z)', UNDO_BUTTON.x + UNDO_BUTTON.w / 2, UNDO_BUTTON.y + UNDO_BUTTON.h / 2);

    ctx.fillStyle = 'rgba(93, 64, 55, 0.12)';
    ctx.beginPath();
    ctx.roundRect(SKIP_BUTTON.x, SKIP_BUTTON.y, SKIP_BUTTON.w, SKIP_BUTTON.h, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(93, 64, 55, 1)';
    ctx.font = '14px sans-serif';
    ctx.fillText('Skip (N) \u2192', SKIP_BUTTON.x + SKIP_BUTTON.w / 2, SKIP_BUTTON.y + SKIP_BUTTON.h / 2);
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
    // Bounce animation for selected bottle
    let yOffset = 0;
    if (isSelected) {
      const bounce = Math.sin(bounceTime * 6) * Math.max(0, 1 - bounceTime * 2);
      yOffset = -15 + bounce * 8; // spring-like bounce up
    }
    const y = rect.y + yOffset;
    const w = rect.w;
    const h = rect.h;
    const r = BOTTLE_RADIUS;
    const pad = BOTTLE_INNER_PADDING;

    ctx.save();

    // Soft shadow
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

    // Glass fill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    drawBottlePath(x, y, w, h, r);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();

    // Draw water slots
    const innerW = w - pad * 2;
    const slotGap = 2;

    for (let i = 0; i < SLOTS_PER_BOTTLE; i++) {
      const colorIdx = bottle.colors[i];
      if (colorIdx === null) continue;

      const slotY = y + h - pad - (i + 1) * SLOT_HEIGHT - i * slotGap;
      const slotX = x + pad;

      // Idle water wobble
      const wobble = Math.sin(gameTime * 2 + index * 1.7 + i * 0.5) * 1.2;

      ctx.fillStyle = COLORS[colorIdx];

      if (i === 0) {
        const innerR = Math.max(r - pad, 2);
        ctx.beginPath();
        ctx.moveTo(slotX, slotY);
        ctx.lineTo(slotX + innerW, slotY);
        ctx.lineTo(slotX + innerW, slotY + SLOT_HEIGHT - innerR);
        ctx.arcTo(slotX + innerW, slotY + SLOT_HEIGHT, slotX + innerW - innerR, slotY + SLOT_HEIGHT, innerR);
        ctx.lineTo(slotX + innerR, slotY + SLOT_HEIGHT);
        ctx.arcTo(slotX, slotY + SLOT_HEIGHT, slotX, slotY + SLOT_HEIGHT - innerR, innerR);
        ctx.closePath();
        ctx.fill();
      } else {
        // Top-most filled slot gets wobble on its top edge
        const isTopSlot = i === topIndex(bottle);
        if (isTopSlot) {
          ctx.beginPath();
          // Wavy top edge
          ctx.moveTo(slotX, slotY + SLOT_HEIGHT);
          ctx.lineTo(slotX + innerW, slotY + SLOT_HEIGHT);
          ctx.lineTo(slotX + innerW, slotY + wobble);
          // Simple wave using quadratic curves
          ctx.quadraticCurveTo(slotX + innerW * 0.75, slotY - wobble, slotX + innerW * 0.5, slotY + wobble * 0.5);
          ctx.quadraticCurveTo(slotX + innerW * 0.25, slotY + wobble * 2, slotX, slotY + wobble);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(slotX, slotY, innerW, SLOT_HEIGHT);
        }
      }

      // Light highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(slotX, slotY, 4, SLOT_HEIGHT);
    }

    // Bottle outline
    ctx.strokeStyle = isSelected ? '#E67E22' : 'rgba(160, 130, 100, 0.5)';
    ctx.lineWidth = isSelected ? 3 : 1.5;
    drawBottlePath(x, y, w, h, r);
    ctx.stroke();

    // Glass highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 4);
    ctx.lineTo(x + 3, y + h - r - 4);
    ctx.stroke();

    // Selected glow
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

  // === Particles rendering ===

  function drawParticles() {
    ctx.save();
    for (const p of particles) {
      if (p.life <= 0) continue;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLevelClearOverlay(progress: number) {
    ctx.save();

    ctx.fillStyle = `rgba(255, 248, 230, ${0.7 * Math.min(progress * 2, 1)})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const scale = Math.min(progress * 3, 1);
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Level Clear!', 2, 2);

    ctx.fillStyle = '#E67E22';
    ctx.fillText('Level Clear!', 0, 0);

    ctx.restore();
  }

  // === Game loop ===

  function update(dt: number) {
    const dtSec = dt / 1000;
    gameTime += dtSec;

    // Bounce timer
    if (selectedBottle !== -1) {
      bounceTime += dtSec;
    }

    // Particle update
    for (const p of particles) {
      if (p.life <= 0) continue;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.vy += 200 * dtSec; // gravity
      p.life -= dtSec;
    }

    // Level clear
    if (state === 'levelclear') {
      levelClearTimer += dt;
      if (levelClearTimer >= LEVEL_CLEAR_DURATION) {
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
      drawParticles();
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

  // === Event listeners ===

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  animationId = requestAnimationFrame(gameLoop);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('touchstart', handleTouchStart);
    cancelAnimationFrame(animationId);
  };
}
