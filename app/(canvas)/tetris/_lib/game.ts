import {
  createGameOverHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
} from '@/lib/game';
import { TBoard, TTetromino, TTetrominoType } from './types';
import {
  BASE_STEP,
  CELL,
  CELL_GAP,
  COLORS,
  COLS,
  COMBO_MULTIPLIER,
  MIN_STEP,
  PREVIEW_CELL,
  ROWS,
  SCORE_PER_LINE,
  SIDE_PANEL_WIDTH,
  SPEED_INCREASE,
  TETROMINOES,
} from './config';
import {
  createBag,
  createEmptyBoard,
  createTetromino,
  getShape,
  isValidPosition,
} from './utils';

export type TTetrisCallbacks = {
  onScoreSave: (initials: string, score: number) => Promise<void>;
};

export const setupTetris = (
  canvas: HTMLCanvasElement,
  callbacks?: TTetrisCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bag = createBag();

  let board: TBoard = createEmptyBoard();
  let current: TTetromino = createTetromino(bag.getNext());
  let nextType: TTetrominoType = bag.getNext();

  let holdType: TTetrominoType | null = null;
  let canHold = true;

  let level = 1;
  let lines = 0;
  let step = BASE_STEP;

  let score = 0;
  let combo = 0; // 콤보 카운터
  let isStarted = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  let acc = 0;
  let sec = 0;

  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (initials, finalScore) => {
      if (callbacks?.onScoreSave) {
        await callbacks.onScoreSave(initials, finalScore);
      }
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(canvas, ctx, 'tetris', gameOverCallbacks);

  const startGame = () => {
    if (isStarted) return;
    isStarted = true;
    lastTime = 0;
    acc = 0;
    sec = 0;
  };

  const resetGame = () => {
    isStarted = false;
    isGameOver = false;
    isPaused = false;
    score = 0;
    combo = 0;
    lastTime = 0;
    acc = 0;
    sec = 0;
    gameOverHud.reset();

    bag.reset();
    board = createEmptyBoard();
    current = createTetromino(bag.getNext());
    nextType = bag.getNext();

    holdType = null;
    canHold = true;

    level = 1;
    lines = 0;
    step = BASE_STEP;
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    resetGame();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'KeyS') {
      if (isPaused) {
        isPaused = false;
        lastTime = 0;
        return;
      }
      startGame();
      return;
    }

    if (e.code === 'KeyP' && isStarted && !isGameOver) {
      isPaused = true;
      return;
    }

    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    if (e.code === 'KeyR' && !isGameOver) {
      resetGame();
      return;
    }

    if (!isStarted || isGameOver || isPaused) return;

    switch (e.code) {
      case 'ArrowLeft':
        if (isValidPosition(board, current, -1, 0)) {
          current.x--;
        }
        e.preventDefault();
        break;

      case 'ArrowRight':
        if (isValidPosition(board, current, 1, 0)) {
          current.x++;
        }
        e.preventDefault();
        break;

      case 'ArrowDown':
        if (isValidPosition(board, current, 0, 1)) {
          current.y++;
        }
        e.preventDefault();
        break;

      case 'ArrowUp':
      case 'KeyX':
        rotatePiece(1);
        e.preventDefault();
        break;

      case 'KeyZ':
        rotatePiece(-1);
        e.preventDefault();
        break;

      case 'Space':
        while (isValidPosition(board, current, 0, 1)) {
          current.y++;
        }
        lockPiece();
        e.preventDefault();
        break;
      case 'KeyC':
      case 'ShiftLeft':
        holdPiece();
        e.preventDefault();
        break;
    }
  };

  const rotatePiece = (dir: 1 | -1) => {
    const newRotation = (current.rotation + dir + 4) % 4;

    if (isValidPosition(board, current, 0, 0, newRotation)) {
      current.rotation = newRotation;
      return;
    }

    const kicks = [1, -1, 2, -2];
    for (const kick of kicks) {
      if (isValidPosition(board, current, kick, 0, newRotation)) {
        current.rotation = newRotation;
        current.x += kick;
        return;
      }
    }
  };

  const lockPiece = () => {
    const shape = getShape(current);

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue;

        const boardY = current.y + row;
        const boardX = current.x + col;

        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
          board[boardY][boardX] = current.type;
        }
      }
    }

    clearLines();
    spawnPiece();
  };

  const holdPiece = () => {
    if (!canHold) return;

    if (holdType === null) {
      holdType = current.type;
      spawnPiece();
    } else {
      const temp = holdType;
      holdType = current.type;
      current = createTetromino(temp);
    }

    canHold = false;
  };

  const clearLines = () => {
    let cleared = 0;

    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row].every((cell) => cell !== null)) {
        board.splice(row, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        row++;
      }
    }

    if (cleared > 0) {
      lines += cleared;

      // 콤보 배수 적용: 기본 점수 × (1 + combo × COMBO_MULTIPLIER)
      const baseScore = SCORE_PER_LINE[cleared] || 0;
      const comboMultiplier = 1 + combo * COMBO_MULTIPLIER;
      score += Math.floor(baseScore * comboMultiplier);

      combo++; // 콤보 증가

      const newLevel = Math.floor(lines / 10) + 1;
      if (newLevel > level) {
        level = newLevel;
        step = Math.max(MIN_STEP, BASE_STEP - (level - 1) * SPEED_INCREASE);
      }
    } else {
      // 줄을 제거하지 못하면 콤보 리셋
      combo = 0;
    }
  };

  const spawnPiece = () => {
    current = createTetromino(nextType);
    nextType = bag.getNext();
    canHold = true;

    if (!isValidPosition(board, current)) {
      isGameOver = true;
    }
  };

  const update = (t: number) => {
    if (isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    acc += dt;
    sec += dt;

    if (isStarted && !isGameOver) {
      while (acc >= step) {
        acc -= step;

        if (isValidPosition(board, current, 0, 1)) {
          current.y++;
        } else {
          lockPiece();
          if (isGameOver) break;
        }
      }
    }
  };

  const renderGrid = () => {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        ctx.strokeRect(col * CELL, row * CELL, CELL, CELL);
      }
    }
  };

  const renderBoard = () => {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = board[row][col];
        if (cell) {
          ctx.fillStyle = COLORS[cell];
          ctx.fillRect(
            col * CELL + 1,
            row * CELL + 1,
            CELL - CELL_GAP,
            CELL - CELL_GAP,
          );
        }
      }
    }
  };

  const renderCurrentPiece = () => {
    const shape = getShape(current);
    ctx.fillStyle = COLORS[current.type];

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const x = (current.x + col) * CELL;
          const y = (current.y + row) * CELL;
          ctx.fillRect(x + 1, y + 1, CELL - CELL_GAP, CELL - CELL_GAP);
        }
      }
    }
  };

  const renderGhostPiece = () => {
    let ghostY = current.y;
    while (isValidPosition(board, { ...current, y: ghostY + 1 }, 0, 0)) {
      ghostY++;
    }

    if (ghostY === current.y) return;

    const shape = getShape(current);
    ctx.fillStyle = COLORS[current.type];
    ctx.globalAlpha = 0.3;

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const x = (current.x + col) * CELL;
          const y = (ghostY + row) * CELL;
          ctx.fillRect(x + 1, y + 1, CELL - CELL_GAP, CELL - CELL_GAP);
        }
      }
    }

    ctx.globalAlpha = 1.0;
  };

  const renderSidePanel = () => {
    const boardWidth = COLS * CELL;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(boardWidth, 0, SIDE_PANEL_WIDTH, ROWS * CELL);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boardWidth, 0);
    ctx.lineTo(boardWidth, ROWS * CELL);
    ctx.stroke();
  };

  const renderPreviewPiece = (
    type: TTetrominoType | null,
    centerX: number,
    centerY: number,
    label: string,
  ) => {
    ctx.fillStyle = '#888';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, centerX, centerY - 45);

    if (!type) {
      ctx.fillStyle = '#333';
      ctx.fillText('Empty', centerX, centerY + 10);
      return;
    }

    const shape = TETROMINOES[type][0];
    const previewCell = PREVIEW_CELL;

    const shapeWidth = shape[0].length * previewCell;
    const shapeHeight = shape.length * previewCell;
    const startX = centerX - shapeWidth / 2;
    const startY = centerY - shapeHeight / 2;

    ctx.fillStyle = COLORS[type];

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          ctx.fillRect(
            startX + col * previewCell + 1,
            startY + row * previewCell + 1,
            previewCell - 2,
            previewCell - 2,
          );
        }
      }
    }
  };

  const renderNextPiece = () => {
    const boardWidth = COLS * CELL;
    const centerX = boardWidth + SIDE_PANEL_WIDTH / 2;
    const centerY = 220;

    renderPreviewPiece(nextType, centerX, centerY, 'NEXT');
  };

  const renderHoldPiece = () => {
    const boardWidth = COLS * CELL;
    const centerX = boardWidth + SIDE_PANEL_WIDTH / 2;
    const centerY = 80;

    renderPreviewPiece(holdType, centerX, centerY, 'HOLD');

    if (!canHold && holdType) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(boardWidth + 10, 0, SIDE_PANEL_WIDTH, 100);
    }
  };

  const renderGameInfo = () => {
    const boardWidth = COLS * CELL;
    const x = boardWidth + SIDE_PANEL_WIDTH / 2;
    let y = 340;

    ctx.fillStyle = '#888';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';

    ctx.fillText('SCORE', x, y);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(String(score), x, y + 20);

    y += 55;
    ctx.fillStyle = '#888';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('LEVEL', x, y);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(String(level), x, y + 20);

    y += 55;
    ctx.fillStyle = '#888';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('LINES', x, y);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(String(lines), x, y + 20);

    // 콤보 표시 (콤보가 1 이상일 때만)
    if (combo > 0) {
      y += 55;
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('COMBO', x, y);
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`×${(1 + combo * COMBO_MULTIPLIER).toFixed(1)}`, x, y + 20);
    }
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    renderGrid();
    renderBoard();
    renderGhostPiece();
    renderCurrentPiece();

    renderSidePanel();
    renderNextPiece();
    renderHoldPiece();
    renderGameInfo();
  };

  const drawHud = () => {
    if (!isStarted) {
      gameStartHud(canvas, ctx);
      return;
    }

    if (isGameOver) {
      gameOverHud.render(score);
      return;
    }

    if (isPaused) {
      gamePauseHud(canvas, ctx);
      return;
    }
  };

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    drawHud();

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKeyDown);
  };
};
