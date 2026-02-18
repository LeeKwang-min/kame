import {
  createGameOverHud,
  gameLoadingHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { TBoard, TTetromino, TTetrominoType, TTSpinType } from './types';
import {
  BASE_STEP,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CELL,
  CELL_GAP,
  COLORS,
  COLS,
  COMBO_MULTIPLIER,
  LOCK_DELAY,
  LOCK_MOVE_LIMIT,
  MIN_STEP,
  PREVIEW_CELL,
  ROWS,
  SCORE_PER_LINE,
  SIDE_PANEL_WIDTH,
  SPEED_INCREASE,
  TETROMINOES,
  TSPIN_SCORE,
} from './config';
import {
  checkTSpin,
  createBag,
  createEmptyBoard,
  createTetromino,
  getShape,
  isValidPosition,
} from './utils';

export type TTetrisCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

// --- 터치 컨트롤 상수 ---
const CELL_DRAG_PX = 22; // 캔버스 좌표 기준: 1셀 이동에 필요한 드래그 거리
const SOFT_DROP_PX = 25; // 1행 소프트 드롭에 필요한 드래그 거리
const TAP_THRESHOLD = 12; // 탭 인식 최대 이동 거리
const TAP_MAX_DURATION = 250; // 탭 인식 최대 시간 (ms)
const SWIPE_UP_THRESHOLD = 40; // 홀드를 위한 최소 위로 스와이프 거리
const HARD_DROP_VELOCITY = 0.8; // 하드 드롭 최소 속도 (px/ms)
const HARD_DROP_THRESHOLD = 50; // 하드 드롭 최소 이동 거리

export const setupTetris = (
  canvas: HTMLCanvasElement,
  callbacks?: TTetrisCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

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
  let combo = 0;
  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  let acc = 0;
  let sec = 0;

  // Lock Delay 관련 상태
  let isLocking = false;
  let lockTimer = 0;
  let lockMoveCount = 0;

  // T-Spin 관련 상태
  let lastMoveWasRotation = false;
  let lastTSpinType: TTSpinType = 'NONE';
  let tSpinDisplayTimer = 0;

  // 터치 상태
  const touch = {
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    lastProcessedX: 0,
    lastProcessedY: 0,
    hasMoved: false,
  };

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
    'tetris',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  const startGame = async () => {
    if (isStarted || isLoading) return;
    isLoading = true;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isLoading = false;
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

    isLocking = false;
    lockTimer = 0;
    lockMoveCount = 0;

    lastMoveWasRotation = false;
    lastTSpinType = 'NONE';
    tSpinDisplayTimer = 0;
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    resetGame();
  };

  // Lock delay 중 이동/회전 시 호출하는 헬퍼
  const onLockMove = () => {
    if (isLocking) {
      lockTimer = 0;
      lockMoveCount++;

      if (isValidPosition(board, current, 0, 1)) {
        isLocking = false;
        lockMoveCount = 0;
      }
    }
  };

  // --- 키보드 이벤트 ---

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

    if (e.code === 'KeyR' && !isGameOver && !isPaused) {
      resetGame();
      return;
    }

    if (!isStarted || isGameOver || isPaused) return;

    switch (e.code) {
      case 'ArrowLeft':
        if (isValidPosition(board, current, -1, 0)) {
          current.x--;
          lastMoveWasRotation = false;
          onLockMove();
        }
        e.preventDefault();
        break;

      case 'ArrowRight':
        if (isValidPosition(board, current, 1, 0)) {
          current.x++;
          lastMoveWasRotation = false;
          onLockMove();
        }
        e.preventDefault();
        break;

      case 'ArrowDown':
        if (isValidPosition(board, current, 0, 1)) {
          current.y++;
          lastMoveWasRotation = false;
          if (isLocking) {
            isLocking = false;
            lockMoveCount = 0;
          }
        }
        e.preventDefault();
        break;

      case 'ArrowUp':
      case 'KeyX':
        rotatePiece(1);
        onLockMove();
        e.preventDefault();
        break;

      case 'KeyZ':
        rotatePiece(-1);
        onLockMove();
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

  // --- 터치 이벤트 (스와이프 기반) ---

  const getTouchPos = (t: Touch) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (t.clientX - rect.left) * scaleX,
      y: (t.clientY - rect.top) * scaleY,
    };
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    if (!t) return;

    const pos = getTouchPos(t);

    // 게임 시작 전이면 터치로 시작
    if (!isStarted && !isLoading && !isGameOver) {
      startGame();
      return;
    }

    // 일시정지 상태이면 터치로 재개
    if (isPaused) {
      isPaused = false;
      lastTime = 0;
      return;
    }

    // 게임 오버 상태: 터치로 SAVE/SKIP/재시작 처리
    if (isGameOver) {
      const handled = gameOverHud.onTouchStart(pos.x, pos.y, score);
      if (handled) return;
      return;
    }

    touch.active = true;
    touch.startX = pos.x;
    touch.startY = pos.y;
    touch.startTime = performance.now();
    touch.lastProcessedX = pos.x;
    touch.lastProcessedY = pos.y;
    touch.hasMoved = false;
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!touch.active || !isStarted || isGameOver || isPaused) return;

    const t = e.touches[0];
    if (!t) return;

    const pos = getTouchPos(t);

    const totalDx = pos.x - touch.startX;
    const totalDy = pos.y - touch.startY;
    const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

    if (totalDist > TAP_THRESHOLD) {
      touch.hasMoved = true;
    }

    // 수평 드래그 → 좌우 이동 (셀 단위)
    const hDelta = pos.x - touch.lastProcessedX;
    if (Math.abs(hDelta) >= CELL_DRAG_PX) {
      const dir = hDelta > 0 ? 1 : -1;
      const cells = Math.floor(Math.abs(hDelta) / CELL_DRAG_PX);
      for (let i = 0; i < cells; i++) {
        if (isValidPosition(board, current, dir, 0)) {
          current.x += dir;
          lastMoveWasRotation = false;
          onLockMove();
        }
      }
      touch.lastProcessedX += dir * cells * CELL_DRAG_PX;
    }

    // 아래로 드래그 → 소프트 드롭 (행 단위)
    const vDelta = pos.y - touch.lastProcessedY;
    if (vDelta >= SOFT_DROP_PX) {
      const rows = Math.floor(vDelta / SOFT_DROP_PX);
      for (let i = 0; i < rows; i++) {
        if (isValidPosition(board, current, 0, 1)) {
          current.y++;
          lastMoveWasRotation = false;
          if (isLocking) {
            isLocking = false;
            lockMoveCount = 0;
          }
        }
      }
      touch.lastProcessedY += rows * SOFT_DROP_PX;
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    if (!touch.active) return;
    touch.active = false;

    if (!isStarted || isGameOver || isPaused) return;

    const t = e.changedTouches[0];
    if (!t) return;

    const endPos = getTouchPos(t);
    const elapsed = performance.now() - touch.startTime;
    const dy = endPos.y - touch.startY;
    const dx = endPos.x - touch.startX;

    // 탭 → 시계 방향 회전
    if (!touch.hasMoved && elapsed < TAP_MAX_DURATION) {
      rotatePiece(1);
      onLockMove();
      return;
    }

    // 위로 스와이프 → 홀드
    if (
      dy < -SWIPE_UP_THRESHOLD &&
      Math.abs(dy) > Math.abs(dx) * 1.5
    ) {
      holdPiece();
      return;
    }

    // 빠른 아래 스와이프 → 하드 드롭
    const velocity = dy / Math.max(elapsed, 1);
    if (
      velocity > HARD_DROP_VELOCITY &&
      dy > HARD_DROP_THRESHOLD &&
      Math.abs(dy) > Math.abs(dx) * 1.5
    ) {
      while (isValidPosition(board, current, 0, 1)) {
        current.y++;
      }
      lockPiece();
      return;
    }
  };

  // --- 게임 로직 ---

  const rotatePiece = (dir: 1 | -1) => {
    const newRotation = (current.rotation + dir + 4) % 4;

    if (isValidPosition(board, current, 0, 0, newRotation)) {
      current.rotation = newRotation;
      lastMoveWasRotation = true;
      return;
    }

    const kicks = [1, -1, 2, -2];
    for (const kick of kicks) {
      if (isValidPosition(board, current, kick, 0, newRotation)) {
        current.rotation = newRotation;
        current.x += kick;
        lastMoveWasRotation = true;
        return;
      }
    }
  };

  const lockPiece = () => {
    const tSpinResult = checkTSpin(board, current, lastMoveWasRotation);

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

    clearLines(tSpinResult);

    isLocking = false;
    lockTimer = 0;
    lockMoveCount = 0;
    lastMoveWasRotation = false;

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

    isLocking = false;
    lockTimer = 0;
    lockMoveCount = 0;
    lastMoveWasRotation = false;
  };

  const clearLines = (tSpinType: TTSpinType = 'NONE') => {
    let cleared = 0;

    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row].every((cell) => cell !== null)) {
        board.splice(row, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        row++;
      }
    }

    let tSpinScore = 0;
    if (tSpinType !== 'NONE') {
      if (tSpinType === 'MINI') {
        tSpinScore = TSPIN_SCORE.MINI;
        lastTSpinType = 'MINI';
        tSpinDisplayTimer = 2;
      } else if (tSpinType === 'FULL') {
        if (cleared === 1) {
          tSpinScore = TSPIN_SCORE.SINGLE;
          lastTSpinType = 'FULL';
        } else if (cleared === 2) {
          tSpinScore = TSPIN_SCORE.DOUBLE;
          lastTSpinType = 'FULL';
        } else if (cleared === 3) {
          tSpinScore = TSPIN_SCORE.TRIPLE;
          lastTSpinType = 'FULL';
        }
        if (cleared > 0) {
          tSpinDisplayTimer = 2;
        }
      }
    }

    if (cleared > 0 || tSpinScore > 0) {
      lines += cleared;

      const baseScore = (SCORE_PER_LINE[cleared] || 0) + tSpinScore;
      const comboMultiplier = 1 + combo * COMBO_MULTIPLIER;
      score += Math.floor(baseScore * comboMultiplier);

      if (cleared > 0) {
        combo++;
      }

      const newLevel = Math.floor(lines / 10) + 1;
      if (newLevel > level) {
        level = newLevel;
        step = Math.max(MIN_STEP, BASE_STEP - (level - 1) * SPEED_INCREASE);
      }
    } else {
      combo = 0;
      lastTSpinType = 'NONE';
    }
  };

  const spawnPiece = () => {
    current = createTetromino(nextType);
    nextType = bag.getNext();
    canHold = true;

    isLocking = false;
    lockTimer = 0;
    lockMoveCount = 0;
    lastMoveWasRotation = false;

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

    if (tSpinDisplayTimer > 0) {
      tSpinDisplayTimer -= dt;
      if (tSpinDisplayTimer <= 0) {
        tSpinDisplayTimer = 0;
        lastTSpinType = 'NONE';
      }
    }

    if (isStarted && !isGameOver) {
      if (isLocking) {
        lockTimer += dt;

        if (lockTimer >= LOCK_DELAY || lockMoveCount >= LOCK_MOVE_LIMIT) {
          lockPiece();
          return;
        }
      }

      while (acc >= step) {
        acc -= step;

        if (isValidPosition(board, current, 0, 1)) {
          current.y++;
          if (isLocking) {
            isLocking = false;
            lockTimer = 0;
            lockMoveCount = 0;
          }
        } else {
          if (!isLocking) {
            isLocking = true;
            lockTimer = 0;
          }
        }
      }
    }
  };

  // --- 렌더링 ---

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

  const renderHoldPiece = () => {
    const boardWidth = COLS * CELL;
    const panelX = boardWidth + 10;
    const panelY = 15;
    const panelWidth = SIDE_PANEL_WIDTH - 20;
    const panelHeight = 100;

    ctx.fillStyle = '#2d1f3d';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    ctx.fill();

    ctx.strokeStyle = canHold ? '#7B5D8E' : '#4a3a5a';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = canHold ? '#b8a0c8' : '#6a5a7a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HOLD', panelX + 8, panelY + 16);

    if (!canHold) {
      ctx.fillStyle = '#6a5a7a';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('\u{1F512}', panelX + panelWidth - 8, panelY + 16);
    }

    const centerX = panelX + panelWidth / 2;
    const centerY = panelY + 58;

    if (!holdType) {
      ctx.fillStyle = '#4a3a5a';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('- EMPTY -', centerX, centerY + 5);
      return;
    }

    const shape = TETROMINOES[holdType][0];
    const previewCell = PREVIEW_CELL;
    const shapeWidth = shape[0].length * previewCell;
    const shapeHeight = shape.length * previewCell;
    const startX = centerX - shapeWidth / 2;
    const startY = centerY - shapeHeight / 2;

    ctx.fillStyle = canHold ? COLORS[holdType] : '#4a4a4a';
    ctx.globalAlpha = canHold ? 1 : 0.5;

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
    ctx.globalAlpha = 1;
  };

  const renderNextPiece = () => {
    const boardWidth = COLS * CELL;
    const panelX = boardWidth + 10;
    const panelY = 130;
    const panelWidth = SIDE_PANEL_WIDTH - 20;
    const panelHeight = 100;

    ctx.fillStyle = '#1a3a4a';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    ctx.fill();

    ctx.strokeStyle = '#5B8A9A';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = '#7ab0c0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 8, panelY + 1);
    ctx.lineTo(panelX + panelWidth - 8, panelY + 1);
    ctx.stroke();

    ctx.fillStyle = '#7ab0c0';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\u25BC NEXT \u25BC', panelX + panelWidth / 2, panelY + 18);

    const centerX = panelX + panelWidth / 2;
    const centerY = panelY + 58;

    const shape = TETROMINOES[nextType][0];
    const previewCell = PREVIEW_CELL;
    const shapeWidth = shape[0].length * previewCell;
    const shapeHeight = shape.length * previewCell;
    const startX = centerX - shapeWidth / 2;
    const startY = centerY - shapeHeight / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          ctx.fillRect(
            startX + col * previewCell + 3,
            startY + row * previewCell + 3,
            previewCell - 2,
            previewCell - 2,
          );
        }
      }
    }

    ctx.fillStyle = COLORS[nextType];
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

  const renderGameInfo = () => {
    const boardWidth = COLS * CELL;
    const x = boardWidth + SIDE_PANEL_WIDTH / 2;
    let y = 250;

    ctx.fillStyle = '#888';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';

    ctx.fillText('SCORE', x, y);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(String(score), x, y + 20);

    y += 50;
    ctx.fillStyle = '#888';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('LEVEL', x, y);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(String(level), x, y + 20);

    y += 50;
    ctx.fillStyle = '#888';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('LINES', x, y);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(String(lines), x, y + 20);

    if (combo > 0) {
      y += 50;
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('COMBO', x, y);
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(
        `\u00D7${(1 + combo * COMBO_MULTIPLIER).toFixed(1)}`,
        x,
        y + 20,
      );
    }

    if (tSpinDisplayTimer > 0 && lastTSpinType !== 'NONE') {
      const tSpinY = 500;
      const alpha = Math.min(1, tSpinDisplayTimer);
      ctx.globalAlpha = alpha;

      ctx.fillStyle = '#7B5D8E';
      ctx.beginPath();
      ctx.roundRect(boardWidth + 10, tSpinY, SIDE_PANEL_WIDTH - 20, 40, 6);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      const tSpinText = lastTSpinType === 'MINI' ? 'T-SPIN MINI' : 'T-SPIN!';
      ctx.fillText(tSpinText, x, tSpinY + 25);

      ctx.globalAlpha = 1;
    }

    if (isLocking) {
      const lockY = 560;
      const progress = Math.min(lockTimer / LOCK_DELAY, 1);

      ctx.fillStyle = '#333';
      ctx.fillRect(boardWidth + 15, lockY, SIDE_PANEL_WIDTH - 30, 8);

      ctx.fillStyle = progress > 0.7 ? '#A85454' : '#5B8A9A';
      ctx.fillRect(
        boardWidth + 15,
        lockY,
        (SIDE_PANEL_WIDTH - 30) * progress,
        8,
      );
    }
  };

  const render = () => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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
      if (isLoading) {
        gameLoadingHud(canvas, ctx);
      } else {
        gameStartHud(canvas, ctx);
        // 터치 조작 힌트
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;
        ctx.save();
        ctx.font = '12px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Tap: Rotate  Drag: Move', cx, cy + 65);
        ctx.fillText(
          '\u2B07 Fast Swipe: Hard Drop  \u2B06 Swipe: Hold',
          cx,
          cy + 85,
        );
        ctx.restore();
      }
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
  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
  };
};
