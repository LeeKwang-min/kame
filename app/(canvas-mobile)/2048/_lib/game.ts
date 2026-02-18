import { TGrid, TGameState, TAnimatedTile, TNewTile } from './types';
import {
  GRID_SIZE,
  CELL_SIZE,
  CELL_GAP,
  CELL_RADIUS,
  INITIAL_TILES,
  TILE_COLORS,
  BG_COLOR,
  ANIMATION_DURATION,
  POPUP_DURATION,
  CANVAS_SIZE,
  SWIPE_THRESHOLD,
} from './config';
import {
  createEmptyGrid,
  addRandomTile,
  moveGrid,
  canMove,
  hasWon,
} from './utils';
import {
  createGameOverHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';

export type T2048Callbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setup2048 = (
  canvas: HTMLCanvasElement,
  callbacks?: T2048Callbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ==================== State ====================

  let grid: TGrid = createEmptyGrid();
  let score = 0;
  let bestScore = 0;
  let gameState: TGameState = 'playing';
  let keepPlaying = false;
  let isPaused = false;

  // 애니메이션 상태
  let animatedTiles: TAnimatedTile[] = [];
  let newTile: TNewTile | null = null;
  let isAnimating = false;
  let animationStartTime = 0;

  // 입력 큐 (애니메이션 중 입력 저장)
  let inputQueue: ('left' | 'right' | 'up' | 'down')[] = [];

  // 터치 상태
  let touchStartX = 0;
  let touchStartY = 0;

  // 게임 오버 HUD
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

  const gameOverHud = createGameOverHud(canvas, ctx, '2048', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  // ==================== Game State ====================

  const resetGame = async () => {
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    grid = createEmptyGrid();
    score = 0;
    gameState = 'playing';
    keepPlaying = false;
    isPaused = false;
    animatedTiles = [];
    newTile = null;
    isAnimating = false;
    inputQueue = [];
    gameOverHud.reset();

    for (let i = 0; i < INITIAL_TILES; i++) {
      addRandomTile(grid);
    }
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(CANVAS_SIZE * dpr);
    canvas.height = Math.round(CANVAS_SIZE * dpr);
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // ==================== Input Handlers ====================

  const handleMove = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameState === 'gameover') return;
    if (gameState === 'won' && !keepPlaying) return;
    if (isPaused) return;

    // 애니메이션 중이면 큐에 저장
    if (isAnimating) {
      if (inputQueue.length < 2) {
        inputQueue.push(direction);
      }
      return;
    }

    const {
      newGrid,
      score: addedScore,
      moved,
      animatedTiles: tiles,
    } = moveGrid(grid, direction);

    if (moved) {
      animatedTiles = tiles;
      isAnimating = true;
      animationStartTime = performance.now();

      score += addedScore;
      if (score > bestScore) {
        bestScore = score;
      }

      setTimeout(() => {
        grid = newGrid;

        const added = addRandomTile(grid);
        if (added) {
          newTile = {
            row: added.row,
            col: added.col,
            value: grid[added.row][added.col],
            scale: 0,
          };
        }

        if (!keepPlaying && hasWon(grid)) {
          gameState = 'won';
        } else if (!canMove(grid)) {
          gameState = 'gameover';
        }

        animatedTiles = [];
        isAnimating = false;

        if (inputQueue.length > 0) {
          const nextDirection = inputQueue.shift()!;
          setTimeout(() => handleMove(nextDirection), 10);
        }
      }, ANIMATION_DURATION);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // 일시정지 해제 (S 키)
    if (e.code === 'KeyS' && isPaused) {
      isPaused = false;
      return;
    }

    // 일시정지 (P 키)
    if (e.code === 'KeyP' && gameState === 'playing' && !isPaused) {
      isPaused = true;
      return;
    }

    // 게임 오버 시 HUD 처리
    if (gameState === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    // 재시작 (게임 오버가 아닐 때만)
    if (e.code === 'KeyR' && gameState !== 'gameover' && !isPaused) {
      resetGame();
      return;
    }

    if (isPaused) return;

    if (gameState === 'won' && !keepPlaying) {
      if (e.code === 'Space') {
        keepPlaying = true;
        gameState = 'playing';
        return;
      }
    }

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        handleMove('left');
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'KeyD':
        handleMove('right');
        e.preventDefault();
        break;
      case 'ArrowUp':
      case 'KeyW':
        handleMove('up');
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 'KeyS':
        handleMove('down');
        e.preventDefault();
        break;
    }
  };

  // ==================== Touch Handlers ====================

  const getTouchPos = (touch: Touch) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    const pos = getTouchPos(touch);

    // 게임 오버: 터치로 SAVE/SKIP/재시작 처리
    if (gameState === 'gameover') {
      gameOverHud.onTouchStart(pos.x, pos.y, score);
      return;
    }

    // 승리 상태: 탭으로 계속하기
    if (gameState === 'won' && !keepPlaying) {
      keepPlaying = true;
      gameState = 'playing';
      return;
    }

    // 일시정지: 탭으로 재개
    if (isPaused) {
      isPaused = false;
      return;
    }

    touchStartX = pos.x;
    touchStartY = pos.y;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    if (gameState !== 'playing' || isPaused) return;

    const touch = e.changedTouches[0];
    if (!touch) return;
    const pos = getTouchPos(touch);

    const dx = pos.x - touchStartX;
    const dy = pos.y - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < SWIPE_THRESHOLD) return;

    if (absDx > absDy) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
  };

  // ==================== Render Functions ====================

  const getCellPosition = (row: number, col: number) => {
    return {
      x: CELL_GAP + col * (CELL_SIZE + CELL_GAP),
      y: CELL_GAP + row * (CELL_SIZE + CELL_GAP),
    };
  };

  const renderBackground = () => {
    ctx.fillStyle = BG_COLOR;
    roundRect(ctx, 0, 0, CANVAS_SIZE, CANVAS_SIZE, 6);
    ctx.fill();

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const { x, y } = getCellPosition(row, col);
        ctx.fillStyle = TILE_COLORS[0].bg;
        roundRect(ctx, x, y, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
        ctx.fill();
      }
    }
  };

  const renderTile = (
    value: number,
    x: number,
    y: number,
    scale: number = 1,
  ) => {
    if (value === 0) return;

    const colors = TILE_COLORS[value] || { bg: '#3c3a32', text: '#f9f6f2' };

    ctx.save();

    const centerX = x + CELL_SIZE / 2;
    const centerY = y + CELL_SIZE / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    ctx.fillStyle = colors.bg;
    roundRect(ctx, x, y, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
    ctx.fill();

    ctx.fillStyle = colors.text;
    ctx.font = `bold ${getFontSize(value)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), centerX, centerY);

    ctx.restore();
  };

  const renderTiles = () => {
    const now = performance.now();
    const elapsed = now - animationStartTime;
    const progress = Math.min(1, elapsed / ANIMATION_DURATION);

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const easedProgress = easeOut(progress);

    if (isAnimating && animatedTiles.length > 0) {
      for (const tile of animatedTiles) {
        const from = getCellPosition(tile.fromRow, tile.fromCol);
        const to = getCellPosition(tile.toRow, tile.toCol);

        const x = from.x + (to.x - from.x) * easedProgress;
        const y = from.y + (to.y - from.y) * easedProgress;

        if (!tile.merged) {
          renderTile(tile.value, x, y);
        }
      }

      for (const tile of animatedTiles) {
        if (tile.merged) {
          const from = getCellPosition(tile.fromRow, tile.fromCol);
          const to = getCellPosition(tile.toRow, tile.toCol);

          const x = from.x + (to.x - from.x) * easedProgress;
          const y = from.y + (to.y - from.y) * easedProgress;

          renderTile(tile.value, x, y);
        }
      }
    } else {
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          const value = grid[row][col];
          if (value === 0) continue;

          const { x, y } = getCellPosition(row, col);
          renderTile(value, x, y);
        }
      }
    }

    if (newTile && !isAnimating) {
      const popupProgress = Math.min(1, elapsed / POPUP_DURATION);
      const scale = easeOut(popupProgress);
      const { x, y } = getCellPosition(newTile.row, newTile.col);
      renderTile(newTile.value, x, y, scale);

      if (popupProgress >= 1) {
        newTile = null;
      }
    }
  };

  const renderOverlay = () => {
    if (gameState === 'playing' && !isPaused) return;

    if (isPaused) {
      gamePauseHud(canvas, ctx);
      return;
    }

    if (gameState === 'won') {
      ctx.fillStyle = 'rgba(237, 194, 46, 0.5)';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.fillStyle = '#f9f6f2';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('You Win!', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 40);

      ctx.font = '24px sans-serif';
      ctx.fillText('Tap or SPACE to continue', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 30);
      ctx.fillText('Press R to restart', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 65);
    } else if (gameState === 'gameover') {
      gameOverHud.render(score);
    }
  };

  const render = () => {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    renderBackground();
    renderTiles();
    renderOverlay();
  };

  // ==================== Helper Functions ====================

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const getFontSize = (value: number): number => {
    if (value < 100) return 60;
    if (value < 1000) return 52;
    if (value < 10000) return 44;
    return 36;
  };

  // ==================== Game Loop ====================

  let raf = 0;
  const draw = () => {
    render();
    raf = requestAnimationFrame(draw);
  };

  // ==================== Init ====================

  resetGame();
  resize();
  raf = requestAnimationFrame(draw);
  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchend', handleTouchEnd);
  };
};
