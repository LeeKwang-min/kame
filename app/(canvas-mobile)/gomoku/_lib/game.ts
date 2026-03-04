import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CANVAS_SIZE,
  BOARD_PADDING,
  CELL_SIZE,
  STONE_RADIUS,
  COLORS,
} from './config';
import {
  BOARD_SIZE,
  STAR_POINTS,
  createBoard,
  placeStone,
  checkWin,
  isDraw,
  getAllForbiddenPositions,
  getAIMove,
  getAIDelay,
  isForbidden,
} from '@/lib/gomoku';
import type { TBoard, TPosition, TStone, TDifficulty } from '@/lib/gomoku';

export type TGomokuCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

type TDifficultyOption = {
  label: string;
  value: TDifficulty;
  x: number;
  y: number;
  w: number;
  h: number;
};

export const setupGomoku = (
  canvas: HTMLCanvasElement,
  callbacks?: TGomokuCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  // Game state
  let board: TBoard = createBoard();
  let state: 'start' | 'loading' | 'diffselect' | 'playing' | 'paused' | 'gameover' = 'start';
  let difficulty: TDifficulty = 'easy';
  let currentTurn: TStone = 1; // 1=black(player), 2=white(AI)
  let lastMove: TPosition | null = null;
  let winLine: TPosition[] | null = null;
  let winner: TStone = 0;
  let forbiddenPositions: TPosition[] = [];
  let hoverPos: TPosition | null = null;
  let isAIThinking = false;
  let aiTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let score = 0;

  // Stats tracking
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let totalGames = 0;

  // Win line animation
  let winLineAlpha = 0;
  let winLineDirection = 1;

  // Difficulty selection buttons (computed in render)
  let difficultyButtons: TDifficultyOption[] = [];

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'gomoku' as Parameters<typeof createGameOverHud>[2], gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  // --- Coordinate conversion ---

  function boardToCanvas(bx: number, by: number): { x: number; y: number } {
    return {
      x: BOARD_PADDING + bx * CELL_SIZE,
      y: BOARD_PADDING + by * CELL_SIZE,
    };
  }

  function canvasToBoard(cx: number, cy: number): TPosition | null {
    const bx = Math.round((cx - BOARD_PADDING) / CELL_SIZE);
    const by = Math.round((cy - BOARD_PADDING) / CELL_SIZE);
    if (bx < 0 || bx >= BOARD_SIZE || by < 0 || by >= BOARD_SIZE) return null;
    return { x: bx, y: by };
  }

  // --- Game logic ---

  const startGame = async () => {
    if (state === 'loading') return;
    state = 'loading';
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    state = 'diffselect';
  };

  const beginPlay = () => {
    board = createBoard();
    currentTurn = 1;
    lastMove = null;
    winLine = null;
    winner = 0;
    isAIThinking = false;
    hoverPos = null;
    forbiddenPositions = getAllForbiddenPositions(board);
    state = 'playing';
  };

  const resetGame = () => {
    if (aiTimeoutId !== null) {
      clearTimeout(aiTimeoutId);
      aiTimeoutId = null;
    }
    board = createBoard();
    state = 'diffselect';
    currentTurn = 1;
    lastMove = null;
    winLine = null;
    winner = 0;
    isAIThinking = false;
    hoverPos = null;
    forbiddenPositions = [];
    score = 0;
    winLineAlpha = 0;
    winLineDirection = 1;
    gameOverHud.reset();
  };

  const handlePlayerMove = (bx: number, by: number) => {
    if (state !== 'playing' || currentTurn !== 1 || isAIThinking) return;
    if (board[by][bx] !== 0) return;

    // Check renju forbidden
    if (isForbidden(board, bx, by)) return;

    const newBoard = placeStone(board, bx, by, 1);
    if (!newBoard) return;

    board = newBoard;
    lastMove = { x: bx, y: by };

    // Check win
    const result = checkWin(board, bx, by);
    if (result.winner === 1) {
      winner = 1;
      winLine = result.winLine;
      wins++;
      totalGames++;
      score = totalGames > 0 ? Math.round((wins / totalGames) * 1000) : 0;
      state = 'gameover';
      return;
    }

    // Check draw
    if (isDraw(board)) {
      winner = 0;
      draws++;
      totalGames++;
      score = totalGames > 0 ? Math.round((wins / totalGames) * 1000) : 0;
      state = 'gameover';
      return;
    }

    // Switch to AI turn
    currentTurn = 2;
    forbiddenPositions = [];
    triggerAIMove();
  };

  const triggerAIMove = () => {
    isAIThinking = true;
    const delay = getAIDelay(difficulty);

    aiTimeoutId = setTimeout(() => {
      aiTimeoutId = null;
      const move = getAIMove(board, 2, difficulty);
      if (!move) {
        // No moves available
        draws++;
        totalGames++;
        score = totalGames > 0 ? Math.round((wins / totalGames) * 1000) : 0;
        state = 'gameover';
        isAIThinking = false;
        return;
      }

      const newBoard = placeStone(board, move.x, move.y, 2);
      if (!newBoard) {
        isAIThinking = false;
        return;
      }

      board = newBoard;
      lastMove = { x: move.x, y: move.y };

      // Check win
      const result = checkWin(board, move.x, move.y);
      if (result.winner === 2) {
        winner = 2;
        winLine = result.winLine;
        losses++;
        totalGames++;
        score = totalGames > 0 ? Math.round((wins / totalGames) * 1000) : 0;
        state = 'gameover';
        isAIThinking = false;
        return;
      }

      // Check draw
      if (isDraw(board)) {
        winner = 0;
        draws++;
        totalGames++;
        score = totalGames > 0 ? Math.round((wins / totalGames) * 1000) : 0;
        state = 'gameover';
        isAIThinking = false;
        return;
      }

      // Switch back to player
      currentTurn = 1;
      isAIThinking = false;
      forbiddenPositions = getAllForbiddenPositions(board);
    }, delay);
  };

  // --- DPR-aware canvas setup ---

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(CANVAS_SIZE * dpr);
    canvas.height = Math.round(CANVAS_SIZE * dpr);
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    resetGame();
  };

  // --- Keyboard events ---

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (e.code === 'KeyS') {
      if (state === 'paused') {
        state = 'playing';
        return;
      }
      if (state === 'start') {
        startGame();
      }
      return;
    }

    if (e.code === 'KeyP' && state === 'playing' && !isAIThinking) {
      state = 'paused';
      return;
    }

    if (state === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    if (e.code === 'KeyR' && state !== 'gameover') {
      resetGame();
      return;
    }

    // Difficulty selection with number keys
    if (state === 'diffselect') {
      if (e.code === 'Digit1') {
        difficulty = 'beginner';
        beginPlay();
        return;
      }
      if (e.code === 'Digit2') {
        difficulty = 'easy';
        beginPlay();
        return;
      }
      if (e.code === 'Digit3') {
        difficulty = 'medium';
        beginPlay();
        return;
      }
      if (e.code === 'Digit4') {
        difficulty = 'hard';
        beginPlay();
        return;
      }
    }
  };

  // --- Touch events ---

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

    // Start screen: tap to start
    if (state === 'start') {
      startGame();
      return;
    }

    // Loading: do nothing
    if (state === 'loading') return;

    // Paused: tap to resume
    if (state === 'paused') {
      state = 'playing';
      return;
    }

    // Game over: delegate to gameOverHud
    if (state === 'gameover') {
      const handled = gameOverHud.onTouchStart(pos.x, pos.y, score);
      if (handled) return;
      return;
    }

    // Difficulty selection: tap on buttons
    if (state === 'diffselect') {
      for (const btn of difficultyButtons) {
        if (
          pos.x >= btn.x &&
          pos.x <= btn.x + btn.w &&
          pos.y >= btn.y &&
          pos.y <= btn.y + btn.h
        ) {
          difficulty = btn.value;
          beginPlay();
          return;
        }
      }
      return;
    }

    // Playing: place stone
    if (state === 'playing' && currentTurn === 1 && !isAIThinking) {
      const boardPos = canvasToBoard(pos.x, pos.y);
      if (boardPos) {
        handlePlayerMove(boardPos.x, boardPos.y);
      }
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
  };

  // --- Mouse events (desktop hover & click) ---

  const handleMouseMove = (e: MouseEvent) => {
    if (state !== 'playing' || currentTurn !== 1 || isAIThinking) {
      hoverPos = null;
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const boardPos = canvasToBoard(cx, cy);
    if (boardPos && board[boardPos.y][boardPos.x] === 0 && !isForbidden(board, boardPos.x, boardPos.y)) {
      hoverPos = boardPos;
    } else {
      hoverPos = null;
    }
  };

  const handleMouseLeave = () => {
    hoverPos = null;
  };

  const handleClick = (e: MouseEvent) => {
    if (state !== 'playing' || currentTurn !== 1 || isAIThinking) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const boardPos = canvasToBoard(cx, cy);
    if (boardPos) {
      handlePlayerMove(boardPos.x, boardPos.y);
    }
  };

  // --- Rendering ---

  const drawBoard = () => {
    // Board background
    ctx.fillStyle = COLORS.BOARD_BG;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid lines
    ctx.strokeStyle = COLORS.BOARD_GRID;
    ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
      const { x: startX, y: startY } = boardToCanvas(0, i);
      const { x: endX, y: endY } = boardToCanvas(BOARD_SIZE - 1, i);
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      // Vertical
      const { x: vStartX, y: vStartY } = boardToCanvas(i, 0);
      const { x: vEndX, y: vEndY } = boardToCanvas(i, BOARD_SIZE - 1);
      ctx.beginPath();
      ctx.moveTo(vStartX, vStartY);
      ctx.lineTo(vEndX, vEndY);
      ctx.stroke();
    }

    // Star points
    for (const [sx, sy] of STAR_POINTS) {
      const { x: px, y: py } = boardToCanvas(sx, sy);
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.STAR_POINT;
      ctx.fill();
    }
  };

  const drawStones = () => {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const stone = board[y][x];
        if (stone === 0) continue;

        const { x: cx, y: cy } = boardToCanvas(x, y);

        if (stone === 1) {
          // Black stone with gradient
          const grad = ctx.createRadialGradient(
            cx - STONE_RADIUS * 0.3,
            cy - STONE_RADIUS * 0.3,
            STONE_RADIUS * 0.1,
            cx,
            cy,
            STONE_RADIUS,
          );
          grad.addColorStop(0, COLORS.BLACK_STONE_HIGHLIGHT);
          grad.addColorStop(1, COLORS.BLACK_STONE);

          ctx.beginPath();
          ctx.arc(cx, cy, STONE_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else {
          // White stone with gradient and shadow
          ctx.beginPath();
          ctx.arc(cx + 1, cy + 1, STONE_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.WHITE_STONE_SHADOW;
          ctx.fill();

          const grad = ctx.createRadialGradient(
            cx - STONE_RADIUS * 0.3,
            cy - STONE_RADIUS * 0.3,
            STONE_RADIUS * 0.1,
            cx,
            cy,
            STONE_RADIUS,
          );
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(1, COLORS.WHITE_STONE);

          ctx.beginPath();
          ctx.arc(cx, cy, STONE_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = '#bbb';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  };

  const drawLastMove = () => {
    if (!lastMove) return;

    const { x: cx, y: cy } = boardToCanvas(lastMove.x, lastMove.y);
    const stone = board[lastMove.y][lastMove.x];

    ctx.beginPath();
    ctx.arc(cx, cy, STONE_RADIUS * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = stone === 1 ? COLORS.LAST_MOVE_DOT : COLORS.LAST_MOVE_DOT;
    ctx.fill();
  };

  const drawForbidden = () => {
    if (currentTurn !== 1 || state !== 'playing') return;

    ctx.strokeStyle = COLORS.FORBIDDEN_MARK;
    ctx.lineWidth = 2;

    for (const pos of forbiddenPositions) {
      const { x: cx, y: cy } = boardToCanvas(pos.x, pos.y);
      const s = STONE_RADIUS * 0.5;

      ctx.beginPath();
      ctx.moveTo(cx - s, cy - s);
      ctx.lineTo(cx + s, cy + s);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + s, cy - s);
      ctx.lineTo(cx - s, cy + s);
      ctx.stroke();
    }
  };

  const drawHoverPreview = () => {
    if (!hoverPos || state !== 'playing' || currentTurn !== 1) return;

    const { x: cx, y: cy } = boardToCanvas(hoverPos.x, hoverPos.y);

    ctx.beginPath();
    ctx.arc(cx, cy, STONE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.HOVER_PREVIEW;
    ctx.fill();
  };

  const drawWinLine = () => {
    if (!winLine || winLine.length === 0) return;

    // Pulsing animation
    winLineAlpha += 0.03 * winLineDirection;
    if (winLineAlpha >= 1) {
      winLineAlpha = 1;
      winLineDirection = -1;
    } else if (winLineAlpha <= 0.3) {
      winLineAlpha = 0.3;
      winLineDirection = 1;
    }

    for (const pos of winLine) {
      const { x: cx, y: cy } = boardToCanvas(pos.x, pos.y);
      ctx.beginPath();
      ctx.arc(cx, cy, STONE_RADIUS + 3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(231, 76, 60, ${winLineAlpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  const drawGameInfo = () => {
    if (state !== 'playing' && state !== 'gameover') return;

    ctx.save();

    // Top-left: Turn indicator
    const turnText = isAIThinking ? 'AI 생각 중...' : (currentTurn === 1 ? '흑 (당신) 차례' : '백 (AI) 차례');
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Background pill for text
    const textMetrics = ctx.measureText(turnText);
    const pillW = textMetrics.width + 16;
    const pillH = 24;
    const pillX = 6;
    const pillY = 4;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 4);
    ctx.fill();

    ctx.fillStyle = currentTurn === 1 ? '#ffffff' : '#e0e0e0';
    ctx.fillText(turnText, pillX + 8, pillY + 5);

    // Top-right: Difficulty
    const diffNames: Record<TDifficulty, string> = {
      beginner: '입문',
      easy: '초급',
      medium: '중급',
      hard: '고급',
    };
    const diffText = diffNames[difficulty];
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    const diffMetrics = ctx.measureText(diffText);
    const diffPillW = diffMetrics.width + 16;
    const diffPillX = CANVAS_SIZE - 6 - diffPillW;
    const diffPillY = 4;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(diffPillX, diffPillY, diffPillW, pillH, 4);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.fillText(diffText, CANVAS_SIZE - 14, diffPillY + 6);

    // Bottom: stats
    const statsText = `승 ${wins} / 패 ${losses} / 무 ${draws}`;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    const statsMetrics = ctx.measureText(statsText);
    const statsPillW = statsMetrics.width + 16;
    const statsPillX = CANVAS_SIZE / 2 - statsPillW / 2;
    const statsPillY = CANVAS_SIZE - 28;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(statsPillX, statsPillY, statsPillW, pillH, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(statsText, CANVAS_SIZE / 2, statsPillY + 6);

    ctx.restore();
  };

  const drawDifficultySelect = () => {
    ctx.save();

    // Background
    ctx.fillStyle = COLORS.BOARD_BG;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Title
    ctx.fillStyle = COLORS.BOARD_GRID;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('오목', CANVAS_SIZE / 2, CANVAS_SIZE * 0.2);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#5a4a3a';
    ctx.fillText('난이도를 선택하세요', CANVAS_SIZE / 2, CANVAS_SIZE * 0.3);

    // Difficulty buttons
    const buttonW = 200;
    const buttonH = 50;
    const gap = 16;
    const startY = CANVAS_SIZE * 0.38;
    const cx = CANVAS_SIZE / 2;

    const difficulties: { label: string; value: TDifficulty; desc: string }[] = [
      { label: '1. 입문', value: 'beginner', desc: '랜덤 수' },
      { label: '2. 초급', value: 'easy', desc: '기본 전략' },
      { label: '3. 중급', value: 'medium', desc: '공격적' },
      { label: '4. 고급', value: 'hard', desc: '최강 AI' },
    ];

    difficultyButtons = [];

    for (let i = 0; i < difficulties.length; i++) {
      const d = difficulties[i];
      const bx = cx - buttonW / 2;
      const by = startY + i * (buttonH + gap);

      difficultyButtons.push({
        label: d.label,
        value: d.value,
        x: bx,
        y: by,
        w: buttonW,
        h: buttonH,
      });

      // Button background
      ctx.fillStyle = '#5a4a3a';
      ctx.beginPath();
      ctx.roundRect(bx, by, buttonW, buttonH, 8);
      ctx.fill();

      // Button text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, cx, by + buttonH / 2 - 6);

      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(d.desc, cx, by + buttonH / 2 + 12);
    }

    // Renju rule note
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#5a4a3a';
    ctx.textAlign = 'center';
    ctx.fillText('렌주룰 적용 (흑: 33/44/장목 금지)', CANVAS_SIZE / 2, CANVAS_SIZE * 0.85);

    ctx.restore();
  };

  // --- Render & HUD ---

  const render = () => {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (state === 'diffselect') {
      drawDifficultySelect();
      return;
    }

    if (state === 'playing' || state === 'paused' || state === 'gameover') {
      drawBoard();
      drawStones();
      drawLastMove();
      drawForbidden();
      drawHoverPreview();
      drawWinLine();
      drawGameInfo();
    }
  };

  const drawHud = () => {
    if (state === 'start') {
      // Draw board background for visual appeal
      drawBoard();
      gameStartHud(canvas, ctx);
      return;
    }

    if (state === 'loading') {
      drawBoard();
      gameLoadingHud(canvas, ctx);
      return;
    }

    if (state === 'gameover') {
      // Draw result message before game over hud
      ctx.save();
      const resultText = winner === 1
        ? '승리!'
        : winner === 2
          ? '패배...'
          : '무승부';
      const resultColor = winner === 1 ? '#4ade80' : winner === 2 ? '#ef4444' : '#fbbf24';

      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      const resultW = ctx.measureText(resultText).width + 32;
      ctx.beginPath();
      ctx.roundRect(CANVAS_SIZE / 2 - resultW / 2, CANVAS_SIZE / 2 - 80, resultW, 40, 8);
      ctx.fill();
      ctx.fillStyle = resultColor;
      ctx.fillText(resultText, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 60);
      ctx.restore();

      gameOverHud.render(score);
      return;
    }

    if (state === 'paused') {
      gamePauseHud(canvas, ctx);
      return;
    }
  };

  // --- Game loop ---

  let raf = 0;
  const draw = (_t: number) => {
    render();
    drawHud();

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  resize();

  // Event listeners
  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  canvas.addEventListener('click', handleClick);

  // Cleanup
  return () => {
    cancelAnimationFrame(raf);
    if (aiTimeoutId !== null) {
      clearTimeout(aiTimeoutId);
    }
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
    canvas.removeEventListener('click', handleClick);
  };
};
