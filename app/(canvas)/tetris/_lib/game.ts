import {
  createGameOverHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
} from '@/lib/game';
import { TBoard, TTetromino, TTetrominoType, TTSpinType } from './types';
import {
  BASE_STEP,
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

  // Lock Delay 관련 상태
  let isLocking = false; // 바닥에 닿아서 lock delay 진행 중
  let lockTimer = 0; // lock delay 타이머
  let lockMoveCount = 0; // lock delay 중 이동/회전 횟수

  // T-Spin 관련 상태
  let lastMoveWasRotation = false; // 마지막 동작이 회전이었는지
  let lastTSpinType: TTSpinType = 'NONE';
  let tSpinDisplayTimer = 0; // T-Spin 표시 타이머

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

    // Lock Delay 상태 초기화
    isLocking = false;
    lockTimer = 0;
    lockMoveCount = 0;

    // T-Spin 상태 초기화
    lastMoveWasRotation = false;
    lastTSpinType = 'NONE';
    tSpinDisplayTimer = 0;
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

    // Lock delay 중 움직임 처리 헬퍼
    const onLockMove = () => {
      if (isLocking) {
        lockTimer = 0; // 타이머 리셋
        lockMoveCount++;

        // 이동 후 바닥에서 떨어지면 lock 상태 해제
        if (isValidPosition(board, current, 0, 1)) {
          isLocking = false;
          lockMoveCount = 0;
        }
      }
    };

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
          // 아래로 내리면 lock 상태 해제
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
    // T-Spin 판정 (보드에 고정하기 전에 체크)
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

    // Lock 상태 초기화
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

    // Lock 상태 초기화
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

    // T-Spin 점수 계산
    let tSpinScore = 0;
    if (tSpinType !== 'NONE') {
      if (tSpinType === 'MINI') {
        tSpinScore = TSPIN_SCORE.MINI;
        lastTSpinType = 'MINI';
        tSpinDisplayTimer = 2; // 2초간 표시
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

      // 콤보 배수 적용: 기본 점수 × (1 + combo × COMBO_MULTIPLIER)
      const baseScore = (SCORE_PER_LINE[cleared] || 0) + tSpinScore;
      const comboMultiplier = 1 + combo * COMBO_MULTIPLIER;
      score += Math.floor(baseScore * comboMultiplier);

      if (cleared > 0) {
        combo++; // 콤보 증가
      }

      const newLevel = Math.floor(lines / 10) + 1;
      if (newLevel > level) {
        level = newLevel;
        step = Math.max(MIN_STEP, BASE_STEP - (level - 1) * SPEED_INCREASE);
      }
    } else {
      // 줄을 제거하지 못하면 콤보 리셋
      combo = 0;
      lastTSpinType = 'NONE';
    }
  };

  const spawnPiece = () => {
    current = createTetromino(nextType);
    nextType = bag.getNext();
    canHold = true;

    // Lock 상태 초기화
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

    // T-Spin 표시 타이머 감소
    if (tSpinDisplayTimer > 0) {
      tSpinDisplayTimer -= dt;
      if (tSpinDisplayTimer <= 0) {
        tSpinDisplayTimer = 0;
        lastTSpinType = 'NONE';
      }
    }

    if (isStarted && !isGameOver) {
      // Lock Delay 처리
      if (isLocking) {
        lockTimer += dt;

        // 이동 횟수 초과 또는 타이머 만료 시 확정
        if (lockTimer >= LOCK_DELAY || lockMoveCount >= LOCK_MOVE_LIMIT) {
          lockPiece();
          return;
        }
      }

      while (acc >= step) {
        acc -= step;

        if (isValidPosition(board, current, 0, 1)) {
          current.y++;
          // 아래로 내려가면 lock 상태 해제
          if (isLocking) {
            isLocking = false;
            lockTimer = 0;
            lockMoveCount = 0;
          }
        } else {
          // 바닥에 닿음 - Lock Delay 시작
          if (!isLocking) {
            isLocking = true;
            lockTimer = 0;
          }
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

  const renderHoldPiece = () => {
    const boardWidth = COLS * CELL;
    const panelX = boardWidth + 10;
    const panelY = 15;
    const panelWidth = SIDE_PANEL_WIDTH - 20;
    const panelHeight = 100;

    // HOLD 패널 배경 - 어두운 보라색 그라데이션 느낌
    ctx.fillStyle = '#2d1f3d';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    ctx.fill();

    // 테두리
    ctx.strokeStyle = canHold ? '#7B5D8E' : '#4a3a5a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // HOLD 라벨 - 왼쪽 상단에 작게
    ctx.fillStyle = canHold ? '#b8a0c8' : '#6a5a7a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HOLD', panelX + 8, panelY + 16);

    // 잠금 아이콘 (사용 불가 시)
    if (!canHold) {
      ctx.fillStyle = '#6a5a7a';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('🔒', panelX + panelWidth - 8, panelY + 16);
    }

    // 블록 렌더링
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

    // 블록 색상 (사용 불가 시 어둡게)
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

    // NEXT 패널 배경 - 밝은 청록색
    ctx.fillStyle = '#1a3a4a';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    ctx.fill();

    // 테두리 - 밝은 색
    ctx.strokeStyle = '#5B8A9A';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 하이라이트 상단 라인
    ctx.strokeStyle = '#7ab0c0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 8, panelY + 1);
    ctx.lineTo(panelX + panelWidth - 8, panelY + 1);
    ctx.stroke();

    // NEXT 라벨 - 중앙 상단에 강조
    ctx.fillStyle = '#7ab0c0';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▼ NEXT ▼', panelX + panelWidth / 2, panelY + 18);

    // 블록 렌더링
    const centerX = panelX + panelWidth / 2;
    const centerY = panelY + 58;

    const shape = TETROMINOES[nextType][0];
    const previewCell = PREVIEW_CELL;
    const shapeWidth = shape[0].length * previewCell;
    const shapeHeight = shape.length * previewCell;
    const startX = centerX - shapeWidth / 2;
    const startY = centerY - shapeHeight / 2;

    // 블록 그림자
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

    // 블록 본체
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

    // 콤보 표시 (콤보가 1 이상일 때만)
    if (combo > 0) {
      y += 50;
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('COMBO', x, y);
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`×${(1 + combo * COMBO_MULTIPLIER).toFixed(1)}`, x, y + 20);
    }

    // T-Spin 표시
    if (tSpinDisplayTimer > 0 && lastTSpinType !== 'NONE') {
      const tSpinY = 500;
      const alpha = Math.min(1, tSpinDisplayTimer);
      ctx.globalAlpha = alpha;

      // T-Spin 배경
      ctx.fillStyle = '#7B5D8E';
      ctx.beginPath();
      ctx.roundRect(boardWidth + 10, tSpinY, SIDE_PANEL_WIDTH - 20, 40, 6);
      ctx.fill();

      // T-Spin 텍스트
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      const tSpinText = lastTSpinType === 'MINI' ? 'T-SPIN MINI' : 'T-SPIN!';
      ctx.fillText(tSpinText, x, tSpinY + 25);

      ctx.globalAlpha = 1;
    }

    // Lock delay 인디케이터 (바닥에 닿았을 때)
    if (isLocking) {
      const lockY = 560;
      const progress = Math.min(lockTimer / LOCK_DELAY, 1);

      // 배경
      ctx.fillStyle = '#333';
      ctx.fillRect(boardWidth + 15, lockY, SIDE_PANEL_WIDTH - 30, 8);

      // 진행 바
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
  window.addEventListener('keydown', onKeyDown);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
  };
};
