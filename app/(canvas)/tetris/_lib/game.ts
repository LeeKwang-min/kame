import { drawHudWithoutPlay } from '@/lib/game';
import { TBoard, TTetromino, TTetrominoType } from './types';
import {
  BASE_STEP,
  CELL,
  CELL_GAP,
  COLORS,
  COLS,
  MIN_STEP,
  PREVIEW_CELL,
  ROWS,
  SCORE_PER_LINE,
  SIDE_PANEL_WIDTH,
  SPEED_INCREASE,
  TETROMINOES,
} from './config';
import {
  createEmptyBoard,
  createTetromino,
  getRandomType,
  getShape,
  isValidPosition,
} from './utils';

export const setupTetris = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ==================== State ====================
  let board: TBoard = createEmptyBoard();
  let current: TTetromino = createTetromino(getRandomType());
  let nextType: TTetrominoType = getRandomType();

  let holdType: TTetrominoType | null = null;
  let canHold = true;

  let level = 1;
  let lines = 0;
  let step = BASE_STEP;

  let score = 0;
  let isStarted = false;
  let isGameOver = false;

  let lastTime = 0;
  let acc = 0; // tick용 누적 시간 (snake 같은 고정 스텝 게임에서 사용)
  let sec = 0; // 총 경과 시간

  // ==================== Game State ====================

  const startGame = () => {
    if (isStarted) return;
    isStarted = true;
    lastTime = 0;
    acc = 0;
    sec = 0;
  };

  const resetGame = () => {
    const rect = canvas.getBoundingClientRect();

    isStarted = false;
    isGameOver = false;
    score = 0;
    lastTime = 0;
    acc = 0;
    sec = 0;

    // TODO: 게임 오브젝트 초기화
    board = createEmptyBoard();
    current = createTetromino(getRandomType());
    nextType = getRandomType();

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

  // ==================== Input Handlers ====================

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'KeyS') {
      startGame();
      return;
    }

    if (e.code === 'KeyR') {
      resetGame();
      return;
    }

    if (!isStarted || isGameOver) return;

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
        // 소프트 드롭
        if (isValidPosition(board, current, 0, 1)) {
          current.y++;
        }
        e.preventDefault();
        break;

      case 'ArrowUp':
      case 'KeyX':
        // 시계방향 회전
        rotatePiece(1);
        e.preventDefault();
        break;

      case 'KeyZ':
        // 반시계방향 회전
        rotatePiece(-1);
        e.preventDefault();
        break;

      case 'Space':
        // 하드 드롭
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

  // ==================== Update Functions ====================
  // 회전 함수
  const rotatePiece = (dir: 1 | -1) => {
    const newRotation = (current.rotation + dir + 4) % 4;

    // 기본 회전 시도
    if (isValidPosition(board, current, 0, 0, newRotation)) {
      current.rotation = newRotation;
      return;
    }

    // 벽 차기 (Wall Kick) - 좌우로 밀어보기
    const kicks = [1, -1, 2, -2];
    for (const kick of kicks) {
      if (isValidPosition(board, current, kick, 0, newRotation)) {
        current.rotation = newRotation;
        current.x += kick;
        return;
      }
    }
  };

  // 피스 고정
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

  // 라인 클리어
  const clearLines = () => {
    let cleared = 0;

    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row].every((cell) => cell !== null)) {
        board.splice(row, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        row++; // 같은 줄 다시 체크
      }
    }

    if (cleared > 0) {
      lines += cleared;
      score += SCORE_PER_LINE[cleared] || 0;

      // 레벨업 (10줄마다)
      const newLevel = Math.floor(lines / 10) + 1;
      if (newLevel > level) {
        level = newLevel;
        step = Math.max(MIN_STEP, BASE_STEP - (level - 1) * SPEED_INCREASE);
      }
    }
  };

  // 새 피스 스폰
  const spawnPiece = () => {
    current = createTetromino(nextType);
    nextType = getRandomType();
    canHold = true;

    // 스폰 위치에서 충돌 = 게임 오버
    if (!isValidPosition(board, current)) {
      isGameOver = true;
    }
  };

  // TODO: 각 오브젝트별 update 함수 작성
  // const updatePlayer = (dt: number) => { ... }
  // const updateEnemies = (dt: number) => { ... }

  // TODO: 충돌 처리 함수 작성
  // const handleCollision = (): boolean => { ... }

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    acc += dt;
    sec += dt;

    if (isStarted && !isGameOver) {
      // TODO: update 함수들 호출
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

  // ==================== Render Functions ====================

  // TODO: 각 오브젝트별 render 함수 작성
  // 보드 그리드 렌더링
  const renderGrid = () => {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 0.5;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        ctx.strokeRect(col * CELL, row * CELL, CELL, CELL);
      }
    }
  };

  // 고정된 블록 렌더링
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

  // 현재 떨어지는 피스 렌더링
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

  // 고스트 피스 렌더링 (하드 드롭 위치 미리보기)
  const renderGhostPiece = () => {
    let ghostY = current.y;
    while (isValidPosition(board, { ...current, y: ghostY + 1 }, 0, 0)) {
      ghostY++;
    }

    if (ghostY === current.y) return; // 같은 위치면 그리지 않음

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

  // 사이드 패널 배경
  const renderSidePanel = () => {
    const boardWidth = COLS * CELL;

    // 패널 배경
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(boardWidth, 0, SIDE_PANEL_WIDTH, ROWS * CELL);

    // 구분선
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boardWidth, 0);
    ctx.lineTo(boardWidth, ROWS * CELL);
    ctx.stroke();
  };

  // 미리보기 블록 그리기 (공통 함수)
  const renderPreviewPiece = (
    type: TTetrominoType | null,
    centerX: number,
    centerY: number,
    label: string,
  ) => {
    // 라벨
    ctx.fillStyle = '#888';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, centerX, centerY - 45);

    if (!type) {
      // 빈 상태 표시
      ctx.fillStyle = '#333';
      ctx.fillText('Empty', centerX, centerY + 10);
      return;
    }

    // 블록 그리기
    const shape = TETROMINOES[type][0]; // 기본 회전 상태
    const previewCell = PREVIEW_CELL;

    // 블록 중앙 정렬을 위한 오프셋 계산
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

  // Next 피스 렌더링
  const renderNextPiece = () => {
    const boardWidth = COLS * CELL;
    const centerX = boardWidth + SIDE_PANEL_WIDTH / 2;
    const centerY = 220;

    renderPreviewPiece(nextType, centerX, centerY, 'NEXT');
  };

  // Hold 피스 렌더링
  const renderHoldPiece = () => {
    const boardWidth = COLS * CELL;
    const centerX = boardWidth + SIDE_PANEL_WIDTH / 2;
    const centerY = 80;

    renderPreviewPiece(holdType, centerX, centerY, 'HOLD');

    // Hold 불가 상태면 어둡게 표시
    if (!canHold && holdType) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(boardWidth + 10, 0, SIDE_PANEL_WIDTH, 100);
    }
  };

  // 게임 정보 렌더링
  const renderGameInfo = () => {
    const boardWidth = COLS * CELL;
    const x = boardWidth + SIDE_PANEL_WIDTH / 2;
    let y = 420;

    ctx.fillStyle = '#888';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';

    // Score
    ctx.fillText('SCORE', x, y);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(String(score), x, y + 20);

    // Level
    y += 60;
    ctx.fillStyle = '#888';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('LEVEL', x, y);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(String(level), x, y + 20);

    // Lines
    y += 60;
    ctx.fillStyle = '#888';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('LINES', x, y);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(String(lines), x, y + 20);
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // 게임 보드
    renderGrid();
    renderBoard();
    renderGhostPiece();
    renderCurrentPiece();

    // ↓↓↓ 사이드 패널 추가 ↓↓↓
    renderSidePanel();
    renderNextPiece();
    renderHoldPiece();
    renderGameInfo();
  };

  // ==================== Game Loop ====================

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    drawHudWithoutPlay(canvas, ctx, score, isStarted, isGameOver);

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
