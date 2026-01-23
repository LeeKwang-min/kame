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
} from './config';
import {
  createEmptyGrid,
  addRandomTile,
  moveGrid,
  canMove,
  hasWon,
} from './utils';

export const setup2048 = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ==================== State ====================

  let grid: TGrid = createEmptyGrid();
  let score = 0;
  let bestScore = 0;
  let gameState: TGameState = 'playing';
  let keepPlaying = false;

  // 애니메이션 상태
  let animatedTiles: TAnimatedTile[] = [];
  let newTile: TNewTile | null = null;
  let isAnimating = false;
  let animationStartTime = 0;

  // 입력 큐 (애니메이션 중 입력 저장)
  let inputQueue: ('left' | 'right' | 'up' | 'down')[] = [];

  // ==================== Game State ====================

  const initGame = () => {
    grid = createEmptyGrid();
    score = 0;
    gameState = 'playing';
    keepPlaying = false;
    animatedTiles = [];
    newTile = null;
    isAnimating = false;
    inputQueue = [];

    for (let i = 0; i < INITIAL_TILES; i++) {
      addRandomTile(grid);
    }
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const size = GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * CELL_GAP;

    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // ==================== Input Handlers ====================

  const handleMove = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameState === 'gameover') return;
    if (gameState === 'won' && !keepPlaying) return;

    // 애니메이션 중이면 큐에 저장
    if (isAnimating) {
      if (inputQueue.length < 2) {
        // 최대 2개까지만 저장
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
      // 애니메이션 시작
      animatedTiles = tiles;
      isAnimating = true;
      animationStartTime = performance.now();

      // 점수 업데이트 (애니메이션 전에)
      score += addedScore;
      if (score > bestScore) {
        bestScore = score;
      }

      // 그리드는 아직 업데이트하지 않음 (애니메이션 끝나면 업데이트)
      // 대신 newGrid를 저장
      setTimeout(() => {
        grid = newGrid;

        // 새 타일 추가
        const added = addRandomTile(grid);
        if (added) {
          newTile = {
            row: added.row,
            col: added.col,
            value: grid[added.row][added.col],
            scale: 0,
          };
        }

        // 승리/게임오버 체크
        if (!keepPlaying && hasWon(grid)) {
          gameState = 'won';
        } else if (!canMove(grid)) {
          gameState = 'gameover';
        }

        animatedTiles = [];
        isAnimating = false;

        // 큐에 저장된 입력 처리
        if (inputQueue.length > 0) {
          const nextDirection = inputQueue.shift()!;
          setTimeout(() => handleMove(nextDirection), 10);
        }
      }, ANIMATION_DURATION);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'KeyR') {
      initGame();
      return;
    }

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

  // ==================== Render Functions ====================

  const getCellPosition = (row: number, col: number) => {
    return {
      x: CELL_GAP + col * (CELL_SIZE + CELL_GAP),
      y: CELL_GAP + row * (CELL_SIZE + CELL_GAP),
    };
  };

  const renderBackground = () => {
    const size = GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * CELL_GAP;

    ctx.fillStyle = BG_COLOR;
    roundRect(ctx, 0, 0, size, size, 6);
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

    // 스케일 적용 (중심 기준)
    const centerX = x + CELL_SIZE / 2;
    const centerY = y + CELL_SIZE / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    // 타일 배경
    ctx.fillStyle = colors.bg;
    roundRect(ctx, x, y, CELL_SIZE, CELL_SIZE, CELL_RADIUS);
    ctx.fill();

    // 숫자
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

    // easeOut 함수 (부드러운 감속)
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const easedProgress = easeOut(progress);

    if (isAnimating && animatedTiles.length > 0) {
      // 애니메이션 중: 이동 중인 타일만 그리기
      for (const tile of animatedTiles) {
        const from = getCellPosition(tile.fromRow, tile.fromCol);
        const to = getCellPosition(tile.toRow, tile.toCol);

        const x = from.x + (to.x - from.x) * easedProgress;
        const y = from.y + (to.y - from.y) * easedProgress;

        // 병합될 타일은 마지막에 그리기 (위에 표시)
        if (!tile.merged) {
          renderTile(tile.value, x, y);
        }
      }

      // 병합되는 타일 (나중에 그려서 위에 표시)
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
      // 일반 렌더링
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          const value = grid[row][col];
          if (value === 0) continue;

          const { x, y } = getCellPosition(row, col);
          renderTile(value, x, y);
        }
      }
    }

    // 새 타일 팝업 애니메이션
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
    if (gameState === 'playing') return;

    const size = GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * CELL_GAP;

    ctx.fillStyle =
      gameState === 'won'
        ? 'rgba(237, 194, 46, 0.5)'
        : 'rgba(238, 228, 218, 0.73)';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = gameState === 'won' ? '#f9f6f2' : '#776e65';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = gameState === 'won' ? 'You Win!' : 'Game Over!';
    ctx.fillText(text, size / 2, size / 2 - 30);

    ctx.font = '18px sans-serif';
    if (gameState === 'won') {
      ctx.fillText('Press SPACE to continue', size / 2, size / 2 + 20);
    }
    ctx.fillText('Press R to restart', size / 2, size / 2 + 50);
  };

  const render = () => {
    const size = GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * CELL_GAP;
    ctx.clearRect(0, 0, size, size);

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
    if (value < 100) return 45;
    if (value < 1000) return 40;
    if (value < 10000) return 32;
    return 26;
  };

  // ==================== Game Loop ====================

  let raf = 0;
  const gameLoop = () => {
    render();
    raf = requestAnimationFrame(gameLoop);
  };

  // ==================== Init ====================

  initGame();
  resize();
  raf = requestAnimationFrame(gameLoop);
  window.addEventListener('keydown', onKeyDown);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
  };
};
