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
  TILE_GAP,
  GRID_PADDING,
  GRID_TOP,
  SHUFFLE_MOVES,
  TILE_ANIM_DURATION,
} from './config';

export type TSlidingPuzzleCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export function setupSlidingPuzzle(
  canvas: HTMLCanvasElement,
  callbacks?: TSlidingPuzzleCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const TILE_SIZE = Math.floor(
    (CANVAS_WIDTH - 2 * GRID_PADDING - (GRID_SIZE - 1) * TILE_GAP) / GRID_SIZE,
  );
  const GRID_OFFSET_X =
    (CANVAS_WIDTH - (GRID_SIZE * TILE_SIZE + (GRID_SIZE - 1) * TILE_GAP)) / 2;

  let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' = 'start';
  let board: number[][] = [];
  let emptyRow = 0;
  let emptyCol = 0;
  let moves = 0;
  let score = 0;
  let level = 1;
  let startTime = 0;
  let animationId = 0;
  let lastTime = 0;

  // Tile animation state
  let animTile = -1; // value of tile being animated
  let animFromX = 0;
  let animFromY = 0;
  let animToX = 0;
  let animToY = 0;
  let animStartTime = 0;
  let isAnimating = false;

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
    'slidingpuzzle',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  function createSolvedBoard(): number[][] {
    const b: number[][] = [];
    let n = 1;
    for (let r = 0; r < GRID_SIZE; r++) {
      b[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        b[r][c] = n;
        n++;
      }
    }
    b[GRID_SIZE - 1][GRID_SIZE - 1] = 0;
    return b;
  }

  function shuffleBoard(): number[][] {
    const b = createSolvedBoard();
    let er = GRID_SIZE - 1;
    let ec = GRID_SIZE - 1;
    const dirs: [number, number][] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    let lastDir = -1;

    for (let i = 0; i < SHUFFLE_MOVES; i++) {
      const validDirs = dirs.filter((d, idx) => {
        const nr = er + d[0];
        const nc = ec + d[1];
        // Don't reverse last move
        if (idx === (lastDir ^ 1) && lastDir >= 0) return false;
        return nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE;
      });
      const dirIdx = Math.floor(Math.random() * validDirs.length);
      const [dr, dc] = validDirs[dirIdx];
      const nr = er + dr;
      const nc = ec + dc;
      b[er][ec] = b[nr][nc];
      b[nr][nc] = 0;
      lastDir = dirs.findIndex((d) => d[0] === dr && d[1] === dc);
      er = nr;
      ec = nc;
    }
    return b;
  }

  function findEmpty(): [number, number] {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (board[r][c] === 0) return [r, c];
      }
    }
    return [GRID_SIZE - 1, GRID_SIZE - 1];
  }

  function isSolved(): boolean {
    let n = 1;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (r === GRID_SIZE - 1 && c === GRID_SIZE - 1) return board[r][c] === 0;
        if (board[r][c] !== n) return false;
        n++;
      }
    }
    return true;
  }

  function tryMove(dr: number, dc: number) {
    if (state !== 'playing' || isAnimating) return;
    // The tile that moves INTO the empty space
    const tileRow = emptyRow - dr;
    const tileCol = emptyCol - dc;
    if (tileRow < 0 || tileRow >= GRID_SIZE || tileCol < 0 || tileCol >= GRID_SIZE)
      return;

    // Start animation
    animTile = board[tileRow][tileCol];
    animFromX = GRID_OFFSET_X + tileCol * (TILE_SIZE + TILE_GAP);
    animFromY = GRID_TOP + tileRow * (TILE_SIZE + TILE_GAP);
    animToX = GRID_OFFSET_X + emptyCol * (TILE_SIZE + TILE_GAP);
    animToY = GRID_TOP + emptyRow * (TILE_SIZE + TILE_GAP);
    animStartTime = performance.now();
    isAnimating = true;

    // Update board immediately for logic
    board[emptyRow][emptyCol] = board[tileRow][tileCol];
    board[tileRow][tileCol] = 0;
    emptyRow = tileRow;
    emptyCol = tileCol;
    moves++;
  }

  function checkWinAfterAnim() {
    if (isSolved()) {
      const moveEfficiency = Math.max(
        0,
        500 - (moves - GRID_SIZE * GRID_SIZE) * 5,
      );
      const timeBonus = Math.max(
        0,
        Math.floor(500 - ((performance.now() - startTime) / 1000) * 3),
      );
      score += 1000 + moveEfficiency + timeBonus;
      level++;
      // Start new puzzle
      board = shuffleBoard();
      [emptyRow, emptyCol] = findEmpty();
      moves = 0;
      startTime = performance.now();
    }
  }

  async function startGame() {
    if (state === 'loading') return;
    state = 'loading';
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    state = 'playing';
    board = shuffleBoard();
    [emptyRow, emptyCol] = findEmpty();
    moves = 0;
    score = 0;
    level = 1;
    startTime = performance.now();
    isAnimating = false;
  }

  function resetGame() {
    state = 'start';
    board = [];
    moves = 0;
    score = 0;
    level = 1;
    isAnimating = false;
    gameOverHud.reset();
  }

  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  function handleClick(e: MouseEvent) {
    if (state !== 'playing' || isAnimating) return;
    const pos = getCanvasPos(e.clientX, e.clientY);

    const col = Math.floor((pos.x - GRID_OFFSET_X) / (TILE_SIZE + TILE_GAP));
    const row = Math.floor((pos.y - GRID_TOP) / (TILE_SIZE + TILE_GAP));
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;

    // Check if adjacent to empty
    const dr = emptyRow - row;
    const dc = emptyCol - col;
    if (
      (Math.abs(dr) === 1 && dc === 0) ||
      (dr === 0 && Math.abs(dc) === 1)
    ) {
      tryMove(dr, dc);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
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
      case 'Escape':
        if (state === 'playing' && score > 0) {
          state = 'gameover';
        }
        break;
      // Arrow moves the empty space (pushes tile into empty)
      case 'ArrowUp':
        tryMove(-1, 0);
        break;
      case 'ArrowDown':
        tryMove(1, 0);
        break;
      case 'ArrowLeft':
        tryMove(0, -1);
        break;
      case 'ArrowRight':
        tryMove(0, 1);
        break;
    }
  }

  function update(_dt: number) {
    if (isAnimating) {
      const elapsed = performance.now() - animStartTime;
      if (elapsed >= TILE_ANIM_DURATION) {
        isAnimating = false;
        animTile = -1;
        checkWinAfterAnim();
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (state === 'playing' || state === 'paused' || state === 'gameover') {
      // Draw board background
      const totalW = GRID_SIZE * TILE_SIZE + (GRID_SIZE - 1) * TILE_GAP;
      ctx.fillStyle = '#0d0d1a';
      ctx.beginPath();
      ctx.roundRect(GRID_OFFSET_X - 8, GRID_TOP - 8, totalW + 16, totalW + 16, 12);
      ctx.fill();

      // Draw tiles
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const val = board[r][c];
          if (val === 0) continue;

          // If this tile is animating, use animated position
          let x: number;
          let y: number;
          if (isAnimating && val === animTile) {
            const progress = Math.min(
              1,
              (performance.now() - animStartTime) / TILE_ANIM_DURATION,
            );
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            x = animFromX + (animToX - animFromX) * eased;
            y = animFromY + (animToY - animFromY) * eased;
          } else {
            x = GRID_OFFSET_X + c * (TILE_SIZE + TILE_GAP);
            y = GRID_TOP + r * (TILE_SIZE + TILE_GAP);
          }

          // Tile background
          const hue = (val * 25) % 360;
          ctx.fillStyle = `hsl(${hue}, 50%, 45%)`;
          ctx.beginPath();
          ctx.roundRect(x, y, TILE_SIZE, TILE_SIZE, 8);
          ctx.fill();

          // Tile highlight
          const hlGrad = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
          hlGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
          hlGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
          ctx.fillStyle = hlGrad;
          ctx.beginPath();
          ctx.roundRect(x, y, TILE_SIZE, TILE_SIZE, 8);
          ctx.fill();

          // Number
          ctx.fillStyle = 'white';
          ctx.font = `bold ${TILE_SIZE * 0.4}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${val}`, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        }
      }

      // HUD
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Moves: ${moves}`, 15, 15);
      ctx.textAlign = 'center';
      ctx.fillText(`Level ${level}`, CANVAS_WIDTH / 2, 15);
      ctx.textAlign = 'right';
      ctx.fillText(`Score: ${score}`, CANVAS_WIDTH - 15, 15);

      // Bottom hint
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'ESC: End game & save score',
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT - 25,
      );
    }

    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
    } else if (state === 'start') {
      gameStartHud(canvas, ctx);
    } else if (state === 'paused') {
      gamePauseHud(canvas, ctx);
    } else if (state === 'gameover') {
      gameOverHud.render(score);
    }
  }

  function gameLoop(timestamp: number) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render();

    animationId = requestAnimationFrame(gameLoop);
  }

  canvas.addEventListener('click', handleClick);
  window.addEventListener('keydown', handleKeyDown);
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('click', handleClick);
    window.removeEventListener('keydown', handleKeyDown);
  };
}
