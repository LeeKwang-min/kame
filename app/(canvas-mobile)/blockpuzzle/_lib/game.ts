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
  GRID_PADDING,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  GRID_WIDTH,
  GRID_HEIGHT,
  BLOCK_AREA_Y,
  BLOCK_PREVIEW_SCALE,
  BLOCK_AREA_HEIGHT,
  CLEAR_ANIMATION_DURATION,
  PLACE_ANIMATION_DURATION,
  SCORE_PER_CELL,
  SCORE_PER_LINE,
  COMBO_BONUS,
  BLOCK_COLORS,
  BLOCK_SHAPES,
  DRAG_SNAP_OFFSET_Y,
} from './config';
import {
  TBlock,
  TBlockShape,
  TDragging,
  TCellAnimation,
  TPlaceAnimation,
} from './types';

export type TBlockPuzzleCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupBlockPuzzle = (
  canvas: HTMLCanvasElement,
  callbacks?: TBlockPuzzleCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // --- Grid State ---
  let grid: (string | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    new Array<string | null>(GRID_SIZE).fill(null),
  );

  // --- Block State ---
  let availableBlocks: (TBlock | null)[] = [];
  let dragging: TDragging | null = null;

  // --- Animation State ---
  let clearAnimations: TCellAnimation[] = [];
  let placeAnimations: TPlaceAnimation[] = [];

  // --- Game State ---
  let score = 0;
  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  let animationId = 0;

  // --- Game Over HUD ---
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
    'blockpuzzle',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Helpers ---
  const initGrid = (): (string | null)[][] => {
    const g: (string | null)[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      g.push(new Array(GRID_SIZE).fill(null));
    }
    return g;
  };

  const generateBlocks = (): (TBlock | null)[] => {
    const colorIndices = [...Array(BLOCK_COLORS.length).keys()];
    for (let i = colorIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colorIndices[i], colorIndices[j]] = [colorIndices[j], colorIndices[i]];
    }
    return [0, 1, 2].map((i) => ({
      shape: BLOCK_SHAPES[Math.floor(Math.random() * BLOCK_SHAPES.length)],
      color: BLOCK_COLORS[colorIndices[i]],
    }));
  };

  const canPlace = (shape: TBlockShape, row: number, col: number): boolean => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          const gr = row + r;
          const gc = col + c;
          if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) {
            return false;
          }
          if (grid[gr][gc] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const canPlaceAnywhere = (shape: TBlockShape): boolean => {
    for (let r = 0; r <= GRID_SIZE - shape.length; r++) {
      for (let c = 0; c <= GRID_SIZE - (shape[0]?.length ?? 0); c++) {
        if (canPlace(shape, r, c)) {
          return true;
        }
      }
    }
    return false;
  };

  const canAnyBlockBePlaced = (): boolean => {
    for (const block of availableBlocks) {
      if (block !== null && canPlaceAnywhere(block.shape)) {
        return true;
      }
    }
    return false;
  };

  const placeBlock = (shape: TBlockShape, color: string, row: number, col: number) => {
    let cellsPlaced = 0;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          grid[row + r][col + c] = color;
          cellsPlaced++;
          placeAnimations.push({
            row: row + r,
            col: col + c,
            progress: 0,
            color,
          });
        }
      }
    }
    score += cellsPlaced * SCORE_PER_CELL;
  };

  const checkAndClearLines = (): number => {
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      let full = true;
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === null) {
          full = false;
          break;
        }
      }
      if (full) rowsToClear.push(r);
    }

    for (let c = 0; c < GRID_SIZE; c++) {
      let full = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r][c] === null) {
          full = false;
          break;
        }
      }
      if (full) colsToClear.push(c);
    }

    const totalLines = rowsToClear.length + colsToClear.length;
    if (totalLines === 0) return 0;

    for (const r of rowsToClear) {
      for (let c = 0; c < GRID_SIZE; c++) {
        clearAnimations.push({
          row: r,
          col: c,
          progress: 0,
          color: grid[r][c] ?? '#ffffff',
        });
        grid[r][c] = null;
      }
    }

    for (const c of colsToClear) {
      for (let r = 0; r < GRID_SIZE; r++) {
        if (rowsToClear.includes(r)) continue;
        clearAnimations.push({
          row: r,
          col: c,
          progress: 0,
          color: grid[r][c] ?? '#ffffff',
        });
        grid[r][c] = null;
      }
    }

    score += totalLines * SCORE_PER_LINE;
    const comboIndex = Math.min(totalLines, COMBO_BONUS.length - 1);
    score += COMBO_BONUS[comboIndex];

    return totalLines;
  };

  const canvasToGrid = (cx: number, cy: number): { row: number; col: number } | null => {
    const gridStartX = GRID_OFFSET_X + GRID_PADDING;
    const gridStartY = GRID_OFFSET_Y + GRID_PADDING;
    const col = Math.floor((cx - gridStartX) / CELL_SIZE);
    const row = Math.floor((cy - gridStartY) / CELL_SIZE);
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      return { row, col };
    }
    return null;
  };

  const getDragGridPos = (): { row: number; col: number } | null => {
    if (!dragging) return null;
    const block = availableBlocks[dragging.blockIndex];
    if (!block) return null;

    const drawX = dragging.currentX;
    const drawY = dragging.currentY - DRAG_SNAP_OFFSET_Y;

    const blockW = block.shape[0].length * CELL_SIZE;
    const blockH = block.shape.length * CELL_SIZE;
    const topLeftX = drawX - blockW / 2;
    const topLeftY = drawY - blockH / 2;

    const gridStartX = GRID_OFFSET_X + GRID_PADDING;
    const gridStartY = GRID_OFFSET_Y + GRID_PADDING;

    const col = Math.round((topLeftX - gridStartX) / CELL_SIZE);
    const row = Math.round((topLeftY - gridStartY) / CELL_SIZE);

    return { row, col };
  };

  const getBlockPreviewBounds = (index: number) => {
    const slotWidth = CANVAS_WIDTH / 3;
    const centerX = slotWidth * index + slotWidth / 2;
    const centerY = BLOCK_AREA_Y + BLOCK_AREA_HEIGHT / 2;
    return { centerX, centerY };
  };

  const hitTestBlockPreview = (cx: number, cy: number): number => {
    if (cy < BLOCK_AREA_Y || cy > CANVAS_HEIGHT) return -1;

    const slotWidth = CANVAS_WIDTH / 3;
    const index = Math.max(0, Math.min(2, Math.floor(cx / slotWidth)));

    if (index < availableBlocks.length && availableBlocks[index] !== null) {
      return index;
    }
    return -1;
  };

  // --- Reset ---
  const resetGame = () => {
    grid = initGrid();
    availableBlocks = [];
    dragging = null;
    clearAnimations = [];
    placeAnimations = [];
    score = 0;
    isStarted = false;
    isLoading = false;
    isGameOver = false;
    isPaused = false;
    gameOverHud.reset();
  };

  // --- Start ---
  const startGame = async () => {
    if (isStarted || isLoading) return;
    isLoading = true;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isLoading = false;
    isStarted = true;
    isGameOver = false;
    isPaused = false;
    score = 0;
    grid = initGrid();
    availableBlocks = generateBlocks();
    dragging = null;
    clearAnimations = [];
    placeAnimations = [];
  };

  const triggerGameOver = () => {
    isGameOver = true;
    isStarted = false;
  };

  // --- Update ---
  const update = (dt: number) => {
    if (!isStarted || isPaused) return;

    for (let i = clearAnimations.length - 1; i >= 0; i--) {
      clearAnimations[i].progress += dt / CLEAR_ANIMATION_DURATION;
      if (clearAnimations[i].progress >= 1) {
        clearAnimations.splice(i, 1);
      }
    }

    for (let i = placeAnimations.length - 1; i >= 0; i--) {
      placeAnimations[i].progress += dt / PLACE_ANIMATION_DURATION;
      if (placeAnimations[i].progress >= 1) {
        placeAnimations.splice(i, 1);
      }
    }
  };

  // --- Render ---
  const render = () => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawBackground();
    drawGrid();
    drawPlaceAnimations();
    drawClearAnimations();

    if (dragging) {
      drawDragPreview();
    }

    drawBlockArea();

    if (dragging) {
      drawDraggingBlock();
    }

    drawScore();

    if (isLoading) {
      gameLoadingHud(canvas, ctx);
    } else if (!isStarted && !isGameOver) {
      gameStartHud(canvas, ctx);
    } else if (isPaused) {
      gamePauseHud(canvas, ctx);
    } else if (isGameOver) {
      gameOverHud.render(score);
    }
  };

  const drawBackground = () => {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const drawRoundedRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const drawGrid = () => {
    ctx.save();
    drawRoundedRect(GRID_OFFSET_X, GRID_OFFSET_Y, GRID_WIDTH, GRID_HEIGHT, 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    const gridStartX = GRID_OFFSET_X + GRID_PADDING;
    const gridStartY = GRID_OFFSET_Y + GRID_PADDING;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = gridStartX + c * CELL_SIZE;
        const y = gridStartY + r * CELL_SIZE;
        const cellColor = grid[r][c];

        if (cellColor) {
          drawFilledCell(x, y, CELL_SIZE, cellColor);
        } else {
          ctx.save();
          drawRoundedRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  };

  const drawFilledCell = (
    x: number,
    y: number,
    size: number,
    color: string,
  ) => {
    ctx.save();

    drawRoundedRect(x + 2, y + 2, size - 4, size - 4, 6);
    ctx.fillStyle = color;
    ctx.fill();

    const hlGrad = ctx.createLinearGradient(x, y, x + size, y + size);
    hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    hlGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    hlGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    drawRoundedRect(x + 2, y + 2, size - 4, size - 4, 6);
    ctx.fillStyle = hlGrad;
    ctx.fill();

    ctx.restore();
  };

  const drawPlaceAnimations = () => {
    const gridStartX = GRID_OFFSET_X + GRID_PADDING;
    const gridStartY = GRID_OFFSET_Y + GRID_PADDING;

    for (const anim of placeAnimations) {
      const x = gridStartX + anim.col * CELL_SIZE;
      const y = gridStartY + anim.row * CELL_SIZE;
      const t = anim.progress;

      const scale = 1 + 0.15 * (1 - t);

      ctx.save();
      const cx = x + CELL_SIZE / 2;
      const cy = y + CELL_SIZE / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);

      ctx.globalAlpha = 1;
      drawFilledCell(x, y, CELL_SIZE, anim.color);

      drawRoundedRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * (1 - t)})`;
      ctx.fill();

      ctx.restore();
    }
  };

  const drawClearAnimations = () => {
    const gridStartX = GRID_OFFSET_X + GRID_PADDING;
    const gridStartY = GRID_OFFSET_Y + GRID_PADDING;

    for (const anim of clearAnimations) {
      const x = gridStartX + anim.col * CELL_SIZE;
      const y = gridStartY + anim.row * CELL_SIZE;
      const t = anim.progress;

      ctx.save();
      ctx.globalAlpha = 1 - t;

      drawRoundedRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    }
  };

  const drawDragPreview = () => {
    if (!dragging) return;
    const block = availableBlocks[dragging.blockIndex];
    if (!block) return;

    const gridPos = getDragGridPos();
    if (!gridPos) return;

    const gridStartX = GRID_OFFSET_X + GRID_PADDING;
    const gridStartY = GRID_OFFSET_Y + GRID_PADDING;
    const valid = canPlace(block.shape, gridPos.row, gridPos.col);

    ctx.save();
    for (let r = 0; r < block.shape.length; r++) {
      for (let c = 0; c < block.shape[r].length; c++) {
        if (block.shape[r][c] === 1) {
          const gr = gridPos.row + r;
          const gc = gridPos.col + c;
          if (gr >= 0 && gr < GRID_SIZE && gc >= 0 && gc < GRID_SIZE) {
            const x = gridStartX + gc * CELL_SIZE;
            const y = gridStartY + gr * CELL_SIZE;
            drawRoundedRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
            if (valid) {
              ctx.fillStyle = 'rgba(46, 204, 113, 0.35)';
            } else {
              ctx.fillStyle = 'rgba(231, 76, 60, 0.35)';
            }
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();
  };

  const drawBlockArea = () => {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(GRID_OFFSET_X, BLOCK_AREA_Y - 10);
    ctx.lineTo(GRID_OFFSET_X + GRID_WIDTH, BLOCK_AREA_Y - 10);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < availableBlocks.length; i++) {
      const block = availableBlocks[i];
      if (!block) continue;
      if (dragging && dragging.blockIndex === i) continue;

      const { centerX, centerY } = getBlockPreviewBounds(i);
      const canBePlaced = canPlaceAnywhere(block.shape);

      drawBlockPreview(block, centerX, centerY, BLOCK_PREVIEW_SCALE, canBePlaced);
    }
  };

  const drawBlockPreview = (
    block: TBlock,
    centerX: number,
    centerY: number,
    scale: number,
    canBePlaced: boolean,
  ) => {
    const bw = block.shape[0].length * CELL_SIZE * scale;
    const bh = block.shape.length * CELL_SIZE * scale;
    const startX = centerX - bw / 2;
    const startY = centerY - bh / 2;

    ctx.save();
    if (!canBePlaced) {
      ctx.globalAlpha = 0.3;
    }

    for (let r = 0; r < block.shape.length; r++) {
      for (let c = 0; c < block.shape[r].length; c++) {
        if (block.shape[r][c] === 1) {
          const x = startX + c * CELL_SIZE * scale;
          const y = startY + r * CELL_SIZE * scale;
          const size = CELL_SIZE * scale;
          drawFilledCell(x, y, size, block.color);
        }
      }
    }

    ctx.restore();
  };

  const drawDraggingBlock = () => {
    if (!dragging) return;
    const block = availableBlocks[dragging.blockIndex];
    if (!block) return;

    const drawX = dragging.currentX;
    const drawY = dragging.currentY - DRAG_SNAP_OFFSET_Y;

    const bw = block.shape[0].length * CELL_SIZE;
    const bh = block.shape.length * CELL_SIZE;
    const startX = drawX - bw / 2;
    const startY = drawY - bh / 2;

    ctx.save();
    ctx.globalAlpha = 0.85;

    for (let r = 0; r < block.shape.length; r++) {
      for (let c = 0; c < block.shape[r].length; c++) {
        if (block.shape[r][c] === 1) {
          const x = startX + c * CELL_SIZE;
          const y = startY + r * CELL_SIZE;
          drawFilledCell(x, y, CELL_SIZE, block.color);
        }
      }
    }

    ctx.restore();
  };

  const drawScore = () => {
    if (!isStarted && !isGameOver) return;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeText(`${score}`, CANVAS_WIDTH / 2, 20);
    ctx.fillText(`${score}`, CANVAS_WIDTH / 2, 20);
    ctx.restore();
  };

  // --- Game Loop ---
  const gameLoop = (timestamp: number) => {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render();

    animationId = requestAnimationFrame(gameLoop);
  };

  // --- Mouse / Touch position helpers ---
  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  // --- Handle block drop ---
  const handleBlockDrop = () => {
    if (!dragging) return;
    const block = availableBlocks[dragging.blockIndex];
    if (!block) {
      dragging = null;
      return;
    }

    const gridPos = getDragGridPos();
    if (gridPos && canPlace(block.shape, gridPos.row, gridPos.col)) {
      placeBlock(block.shape, block.color, gridPos.row, gridPos.col);
      availableBlocks[dragging.blockIndex] = null;
      checkAndClearLines();

      const allPlaced = availableBlocks.every((b) => b === null);
      if (allPlaced) {
        availableBlocks = generateBlocks();
      }

      if (!canAnyBlockBePlaced()) {
        triggerGameOver();
      }
    }

    dragging = null;
  };

  // --- Input Handlers ---
  const handleMouseDown = (e: MouseEvent) => {
    if (isGameOver || !isStarted || isPaused) return;
    const pos = getCanvasPos(e.clientX, e.clientY);

    const blockIndex = hitTestBlockPreview(pos.x, pos.y);
    if (blockIndex >= 0) {
      dragging = {
        blockIndex,
        offsetX: 0,
        offsetY: 0,
        currentX: pos.x,
        currentY: pos.y,
      };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging || isGameOver || !isStarted || isPaused) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    dragging.currentX = pos.x;
    dragging.currentY = pos.y;
  };

  const handleMouseUp = () => {
    if (!dragging) return;
    handleBlockDrop();
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const pos = getCanvasPos(touch.clientX, touch.clientY);

    // 게임 오버: 터치로 SAVE/SKIP/재시작 처리
    if (isGameOver) {
      gameOverHud.onTouchStart(pos.x, pos.y, score);
      return;
    }

    // 게임 시작 전: 터치로 시작
    if (!isStarted && !isLoading) {
      startGame();
      return;
    }

    // 일시정지: 터치로 재개
    if (isPaused) {
      isPaused = false;
      return;
    }

    // 플레이 중: 블록 드래그
    const blockIndex = hitTestBlockPreview(pos.x, pos.y);
    if (blockIndex >= 0) {
      dragging = {
        blockIndex,
        offsetX: 0,
        offsetY: 0,
        currentX: pos.x,
        currentY: pos.y,
      };
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!dragging || isGameOver || !isStarted || isPaused) return;
    const touch = e.touches[0];
    if (!touch) return;
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    dragging.currentX = pos.x;
    dragging.currentY = pos.y;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    if (!dragging) return;
    handleBlockDrop();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    switch (e.code) {
      case 'KeyS':
        if (!isStarted && !isGameOver) {
          startGame();
        } else if (isPaused) {
          isPaused = false;
        }
        break;
      case 'KeyP':
        if (isStarted && !isGameOver) {
          isPaused = !isPaused;
        }
        break;
      case 'KeyR':
        if (!isGameOver) {
          resetGame();
        }
        break;
    }
  };

  // --- Setup ---
  resize();
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', resize);

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', resize);
  };
};
