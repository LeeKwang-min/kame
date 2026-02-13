import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  COLS,
  ROWS,
  CELL_SIZE,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  SIDE_PANEL_WIDTH,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GAME_DURATION,
  SCORE_3_MATCH,
  SCORE_4_MATCH,
  SCORE_5_MATCH,
  CHAIN_BONUS_MULTIPLIER,
  SWAP_DURATION,
  POP_DURATION,
  GRAVITY_ACCELERATION,
  MAX_FALL_SPEED,
  BOUNCE_FACTOR,
  BOUNCE_THRESHOLD,
  PARTICLE_COUNT,
  PARTICLE_LIFE,
  FLOATING_TEXT_LIFE,
  JEWEL_COLORS,
  JEWEL_COLOR_LIST,
} from './config';
import {
  TJewelColor,
  TCell,
  TBoard,
  TCursor,
  TSelected,
  TSwapAnim,
  TParticle,
  TFloatingText,
  TFallingCell,
} from './types';

export type TJewelCrushCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

type TState = 'start' | 'loading' | 'playing' | 'swapping' | 'popping' | 'dropping' | 'paused' | 'gameover';

export function setupJewelCrush(
  canvas: HTMLCanvasElement,
  callbacks?: TJewelCrushCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) return () => {};

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // --- State ---
  let board: TBoard = createEmptyBoard();
  let cursor: TCursor = { row: 0, col: 0 };
  let selected: TSelected = null;
  let swapAnim: TSwapAnim | null = null;
  let particles: TParticle[] = [];
  let floatingTexts: TFloatingText[] = [];
  let fallingCells: TFallingCell[] = [];
  let poppingCells: { row: number; col: number }[] = [];

  let score = 0;
  let chainCount = 0;
  let timeLeft = GAME_DURATION;
  let popTimer = 0;

  let state: TState = 'start';
  let lastTime = 0;
  let animationId = 0;
  let cursorPulse = 0; // 커서 펄스 애니메이션용
  let selectedPulse = 0;

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
    'jewelcrush',
    gameOverCallbacks,
    { isLoggedIn: callbacks?.isLoggedIn ?? false },
  );

  // --- Board Helpers ---
  function randomColor(): TJewelColor {
    return JEWEL_COLOR_LIST[Math.floor(Math.random() * JEWEL_COLOR_LIST.length)];
  }

  function createEmptyBoard(): TBoard {
    const b: TBoard = [];
    for (let r = 0; r < ROWS; r++) {
      b.push(new Array(COLS).fill(null));
    }
    return b;
  }

  function createCell(row: number, col: number, color: TJewelColor): TCell {
    return {
      color,
      x: col * CELL_SIZE,
      y: row * CELL_SIZE,
      targetX: col * CELL_SIZE,
      targetY: row * CELL_SIZE,
      scale: 1,
      opacity: 1,
    };
  }

  function initBoard() {
    board = createEmptyBoard();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let color = randomColor();
        // 초기 매칭 방지
        while (
          (c >= 2 && board[r][c - 1]?.color === color && board[r][c - 2]?.color === color) ||
          (r >= 2 && board[r - 1]?.[c]?.color === color && board[r - 2]?.[c]?.color === color)
        ) {
          color = randomColor();
        }
        board[r][c] = createCell(r, c, color);
      }
    }
  }

  function getMatchScore(len: number): number {
    if (len >= 5) return SCORE_5_MATCH;
    if (len >= 4) return SCORE_4_MATCH;
    return SCORE_3_MATCH;
  }

  // --- Match Detection ---
  function findAllMatches(): { row: number; col: number }[] {
    const matched = new Set<string>();

    // 가로 매칭
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 3; c++) {
        const color = board[r][c]?.color;
        if (!color) continue;
        let len = 1;
        while (c + len < COLS && board[r][c + len]?.color === color) len++;
        if (len >= 3) {
          const matchScore = getMatchScore(len);
          const multiplier = chainCount > 1 ? Math.pow(CHAIN_BONUS_MULTIPLIER, chainCount - 1) : 1;
          score += Math.floor(matchScore * multiplier);

          for (let i = 0; i < len; i++) {
            matched.add(`${r},${c + i}`);
          }

          // 플로팅 텍스트
          const midC = c + (len - 1) / 2;
          const displayScore = Math.floor(matchScore * multiplier);
          floatingTexts.push({
            x: midC * CELL_SIZE + CELL_SIZE / 2,
            y: r * CELL_SIZE + CELL_SIZE / 2,
            text: chainCount > 1 ? `+${displayScore} x${chainCount}` : `+${displayScore}`,
            life: FLOATING_TEXT_LIFE,
            maxLife: FLOATING_TEXT_LIFE,
          });

          c += len - 1;
        }
      }
    }

    // 세로 매칭
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 3; r++) {
        const color = board[r][c]?.color;
        if (!color) continue;
        let len = 1;
        while (r + len < ROWS && board[r + len]?.[c]?.color === color) len++;
        if (len >= 3) {
          // 이미 가로에서 점수를 받은 셀은 중복 카운트 방지
          let alreadyCounted = true;
          for (let i = 0; i < len; i++) {
            if (!matched.has(`${r + i},${c}`)) {
              alreadyCounted = false;
              break;
            }
          }

          if (!alreadyCounted) {
            const matchScore = getMatchScore(len);
            const multiplier = chainCount > 1 ? Math.pow(CHAIN_BONUS_MULTIPLIER, chainCount - 1) : 1;
            score += Math.floor(matchScore * multiplier);

            const midR = r + (len - 1) / 2;
            const displayScore = Math.floor(matchScore * multiplier);
            floatingTexts.push({
              x: c * CELL_SIZE + CELL_SIZE / 2,
              y: midR * CELL_SIZE + CELL_SIZE / 2,
              text: chainCount > 1 ? `+${displayScore} x${chainCount}` : `+${displayScore}`,
              life: FLOATING_TEXT_LIFE,
              maxLife: FLOATING_TEXT_LIFE,
            });
          }

          for (let i = 0; i < len; i++) {
            matched.add(`${r + i},${c}`);
          }

          r += len - 1;
        }
      }
    }

    return Array.from(matched).map((key) => {
      const [r, c] = key.split(',').map(Number);
      return { row: r, col: c };
    });
  }

  function hasAnyValidMove(): boolean {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // 오른쪽과 스왑
        if (c + 1 < COLS) {
          swapBoardData(r, c, r, c + 1);
          const m = findAllMatchesQuiet();
          swapBoardData(r, c, r, c + 1);
          if (m.length > 0) return true;
        }
        // 아래와 스왑
        if (r + 1 < ROWS) {
          swapBoardData(r, c, r + 1, c);
          const m = findAllMatchesQuiet();
          swapBoardData(r, c, r + 1, c);
          if (m.length > 0) return true;
        }
      }
    }
    return false;
  }

  // 점수/텍스트 없이 매칭만 확인
  function findAllMatchesQuiet(): { row: number; col: number }[] {
    const matched = new Set<string>();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 3; c++) {
        const color = board[r][c]?.color;
        if (!color) continue;
        let len = 1;
        while (c + len < COLS && board[r][c + len]?.color === color) len++;
        if (len >= 3) {
          for (let i = 0; i < len; i++) matched.add(`${r},${c + i}`);
          c += len - 1;
        }
      }
    }
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 3; r++) {
        const color = board[r][c]?.color;
        if (!color) continue;
        let len = 1;
        while (r + len < ROWS && board[r + len]?.[c]?.color === color) len++;
        if (len >= 3) {
          for (let i = 0; i < len; i++) matched.add(`${r + i},${c}`);
          r += len - 1;
        }
      }
    }
    return Array.from(matched).map((key) => {
      const [r, c] = key.split(',').map(Number);
      return { row: r, col: c };
    });
  }

  function swapBoardData(r1: number, c1: number, r2: number, c2: number) {
    const temp = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = temp;
    // 타겟 위치 업데이트
    if (board[r1][c1]) {
      board[r1][c1]!.targetX = c1 * CELL_SIZE;
      board[r1][c1]!.targetY = r1 * CELL_SIZE;
    }
    if (board[r2][c2]) {
      board[r2][c2]!.targetX = c2 * CELL_SIZE;
      board[r2][c2]!.targetY = r2 * CELL_SIZE;
    }
  }

  // --- Pop & Gravity ---
  function popCells(cells: { row: number; col: number }[]) {
    poppingCells = cells;
    for (const cell of cells) {
      const c = board[cell.row][cell.col];
      if (c) {
        spawnParticles(cell.col * CELL_SIZE + CELL_SIZE / 2, cell.row * CELL_SIZE + CELL_SIZE / 2, JEWEL_COLORS[c.color].body);
      }
    }
    state = 'popping';
    popTimer = POP_DURATION;
  }

  function removePoppedCells() {
    for (const cell of poppingCells) {
      board[cell.row][cell.col] = null;
    }
    poppingCells = [];
  }

  function startGravityAnimation() {
    fallingCells = [];

    for (let c = 0; c < COLS; c++) {
      // 빈 칸 수 세기
      let emptyCount = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][c] === null) {
          emptyCount++;
        } else if (emptyCount > 0) {
          const cell = board[r][c]!;
          const targetRow = r + emptyCount;
          fallingCells.push({
            col: c,
            color: cell.color,
            currentY: r * CELL_SIZE,
            targetY: targetRow * CELL_SIZE,
            velocity: 0,
          });
          board[targetRow][c] = cell;
          cell.targetY = targetRow * CELL_SIZE;
          board[r][c] = null;
        }
      }

      // 새 보석 생성 (위에서 떨어짐)
      let spawnRow = -1;
      for (let r = 0; r < ROWS; r++) {
        if (board[r][c] === null) {
          const color = randomColor();
          const cell = createCell(r, c, color);
          cell.y = spawnRow * CELL_SIZE;
          board[r][c] = cell;
          fallingCells.push({
            col: c,
            color,
            currentY: spawnRow * CELL_SIZE,
            targetY: r * CELL_SIZE,
            velocity: 0,
          });
          spawnRow--;
        }
      }
    }

    if (fallingCells.length > 0) {
      state = 'dropping';
    } else {
      afterDrop();
    }
  }

  function updateFallingCells(dt: number): boolean {
    let allDone = true;
    for (const fc of fallingCells) {
      if (fc.currentY < fc.targetY) {
        fc.velocity = Math.min(fc.velocity + GRAVITY_ACCELERATION * dt, MAX_FALL_SPEED);
        fc.currentY += fc.velocity * dt;
        if (fc.currentY >= fc.targetY) {
          if (fc.velocity > BOUNCE_THRESHOLD) {
            fc.currentY = fc.targetY;
            fc.velocity = -fc.velocity * BOUNCE_FACTOR;
          } else {
            fc.currentY = fc.targetY;
            fc.velocity = 0;
          }
        }
        allDone = false;
      } else if (fc.velocity < 0) {
        fc.velocity += GRAVITY_ACCELERATION * dt;
        fc.currentY += fc.velocity * dt;
        if (fc.velocity >= 0 && fc.currentY >= fc.targetY) {
          fc.currentY = fc.targetY;
          fc.velocity = 0;
        } else {
          allDone = false;
        }
      }
    }
    return allDone;
  }

  function finalizeFalling() {
    // board cell의 y 좌표를 타겟으로 설정
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (cell) {
          cell.x = c * CELL_SIZE;
          cell.y = r * CELL_SIZE;
          cell.targetX = c * CELL_SIZE;
          cell.targetY = r * CELL_SIZE;
        }
      }
    }
    fallingCells = [];
    afterDrop();
  }

  function afterDrop() {
    chainCount++;
    const matches = findAllMatches();
    if (matches.length > 0) {
      popCells(matches);
    } else {
      chainCount = 0;
      // 유효한 이동이 없으면 보드 재생성
      if (!hasAnyValidMove()) {
        initBoard();
      }
      state = 'playing';
    }
  }

  function spawnParticles(px: number, py: number, color: string) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;
      particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        color,
        radius: 2 + Math.random() * 3,
      });
    }
  }

  // --- Swap ---
  function trySwap(r1: number, c1: number, r2: number, c2: number) {
    if (r2 < 0 || r2 >= ROWS || c2 < 0 || c2 >= COLS) return;
    if (!board[r1][c1] || !board[r2][c2]) return;

    swapAnim = {
      r1, c1, r2, c2,
      progress: 0,
      reverting: false,
    };
    state = 'swapping';
  }

  function completeSwap() {
    if (!swapAnim) return;
    const { r1, c1, r2, c2, reverting } = swapAnim;

    if (reverting) {
      // 되돌리기 완료 — 원래 위치로 복구
      swapBoardData(r1, c1, r2, c2);
      if (board[r1][c1]) {
        board[r1][c1]!.x = c1 * CELL_SIZE;
        board[r1][c1]!.y = r1 * CELL_SIZE;
      }
      if (board[r2][c2]) {
        board[r2][c2]!.x = c2 * CELL_SIZE;
        board[r2][c2]!.y = r2 * CELL_SIZE;
      }
      swapAnim = null;
      state = 'playing';
      return;
    }

    // 스왑 실행
    swapBoardData(r1, c1, r2, c2);
    if (board[r1][c1]) {
      board[r1][c1]!.x = c1 * CELL_SIZE;
      board[r1][c1]!.y = r1 * CELL_SIZE;
    }
    if (board[r2][c2]) {
      board[r2][c2]!.x = c2 * CELL_SIZE;
      board[r2][c2]!.y = r2 * CELL_SIZE;
    }

    // 매칭 확인
    const matches = findAllMatches();
    if (matches.length > 0) {
      swapAnim = null;
      chainCount = 1;
      popCells(matches);
    } else {
      // 매칭 실패 → 되돌리기
      swapAnim.progress = 0;
      swapAnim.reverting = true;
    }
  }

  // --- Reset ---
  function resetGame() {
    initBoard();
    cursor = { row: 0, col: 0 };
    selected = null;
    swapAnim = null;
    particles = [];
    floatingTexts = [];
    fallingCells = [];
    poppingCells = [];
    score = 0;
    chainCount = 0;
    timeLeft = GAME_DURATION;
    popTimer = 0;
    state = 'start';
    gameOverHud.reset();
  }

  async function startGame() {
    if (state !== 'start' && state !== 'paused') return;

    if (state === 'paused') {
      state = 'playing';
      return;
    }

    state = 'loading';
    if (callbacks?.onGameStart) {
      try {
        await callbacks.onGameStart();
      } catch (error) {
        console.error('Failed to create game session:', error);
      }
    }

    initBoard();
    score = 0;
    chainCount = 0;
    timeLeft = GAME_DURATION;
    particles = [];
    floatingTexts = [];
    fallingCells = [];
    selected = null;
    cursor = { row: 0, col: 0 };

    state = 'playing';
  }

  // --- Keyboard ---
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (state === 'gameover') {
      if (gameOverHud.onKeyDown(e, score)) return;
    }

    switch (e.code) {
      case 'KeyS':
        if (state === 'start' || state === 'paused') startGame();
        break;
      case 'KeyP':
        if (state === 'playing') state = 'paused';
        else if (state === 'paused') state = 'playing';
        break;
      case 'KeyR':
        resetGame();
        break;
      case 'ArrowLeft':
        if (state === 'playing') {
          if (selected) {
            trySwap(selected.row, selected.col, selected.row, selected.col - 1);
            selected = null;
          } else {
            cursor.col = Math.max(0, cursor.col - 1);
          }
        }
        break;
      case 'ArrowRight':
        if (state === 'playing') {
          if (selected) {
            trySwap(selected.row, selected.col, selected.row, selected.col + 1);
            selected = null;
          } else {
            cursor.col = Math.min(COLS - 1, cursor.col + 1);
          }
        }
        break;
      case 'ArrowUp':
        if (state === 'playing') {
          if (selected) {
            trySwap(selected.row, selected.col, selected.row - 1, selected.col);
            selected = null;
          } else {
            cursor.row = Math.max(0, cursor.row - 1);
          }
        }
        break;
      case 'ArrowDown':
        if (state === 'playing') {
          if (selected) {
            trySwap(selected.row, selected.col, selected.row + 1, selected.col);
            selected = null;
          } else {
            cursor.row = Math.min(ROWS - 1, cursor.row + 1);
          }
        }
        break;
      case 'Space':
        if (state === 'playing') {
          if (selected && selected.row === cursor.row && selected.col === cursor.col) {
            selected = null; // 같은 셀 선택 해제
          } else if (selected) {
            // 인접한 셀이면 스왑, 아니면 새로 선택
            const dr = Math.abs(selected.row - cursor.row);
            const dc = Math.abs(selected.col - cursor.col);
            if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
              trySwap(selected.row, selected.col, cursor.row, cursor.col);
              selected = null;
            } else {
              selected = { row: cursor.row, col: cursor.col };
            }
          } else {
            selected = { row: cursor.row, col: cursor.col };
          }
        }
        break;
    }
  };

  // --- Update ---
  function update(dt: number) {
    cursorPulse += dt * 3;
    selectedPulse += dt * 5;

    // 파티클
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // 플로팅 텍스트
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 35 * dt;
      ft.life -= dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    if (state === 'playing') {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        state = 'gameover';
        return;
      }
    }

    if (state === 'swapping' && swapAnim) {
      swapAnim.progress += dt / SWAP_DURATION;
      if (swapAnim.progress >= 1) {
        swapAnim.progress = 1;
        completeSwap();
      }

      // 스왑 애니메이션 중 셀 위치 보간
      if (swapAnim) {
        const { r1, c1, r2, c2, progress, reverting } = swapAnim;
        const t = easeInOutQuad(progress);

        if (reverting) {
          // 되돌리기: 현재 위치(스왑된 상태)에서 원래로
          const cell1 = board[r1][c1];
          const cell2 = board[r2][c2];
          if (cell1) {
            cell1.x = c1 * CELL_SIZE + (c2 - c1) * CELL_SIZE * (1 - t);
            cell1.y = r1 * CELL_SIZE + (r2 - r1) * CELL_SIZE * (1 - t);
          }
          if (cell2) {
            cell2.x = c2 * CELL_SIZE + (c1 - c2) * CELL_SIZE * (1 - t);
            cell2.y = r2 * CELL_SIZE + (r1 - r2) * CELL_SIZE * (1 - t);
          }
        } else {
          const cell1 = board[r1][c1];
          const cell2 = board[r2][c2];
          if (cell1) {
            cell1.x = c1 * CELL_SIZE + (c2 - c1) * CELL_SIZE * t;
            cell1.y = r1 * CELL_SIZE + (r2 - r1) * CELL_SIZE * t;
          }
          if (cell2) {
            cell2.x = c2 * CELL_SIZE + (c1 - c2) * CELL_SIZE * t;
            cell2.y = r2 * CELL_SIZE + (r1 - r2) * CELL_SIZE * t;
          }
        }
      }
    }

    if (state === 'popping') {
      popTimer -= dt;
      if (popTimer <= 0) {
        removePoppedCells();
        startGravityAnimation();
      }
    }

    if (state === 'dropping') {
      const allDone = updateFallingCells(dt);
      if (allDone) {
        finalizeFalling();
      } else {
        // fallingCells의 위치를 board cell에 반영
        for (const fc of fallingCells) {
          // 타겟 row 찾기
          const targetRow = Math.round(fc.targetY / CELL_SIZE);
          const cell = board[targetRow]?.[fc.col];
          if (cell) {
            cell.y = fc.currentY;
          }
        }
      }
    }
  }

  function easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // --- Render ---
  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 보드 배경
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    // 그리드
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.1)';
        ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    // 보석 렌더링
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (!cell) continue;

        const isPopping = poppingCells.some((p) => p.row === r && p.col === c);
        if (isPopping) {
          const progress = 1 - popTimer / POP_DURATION;
          const scale = 1 - progress;
          const alpha = 1 - progress;
          drawJewel(cell.x + CELL_SIZE / 2, cell.y + CELL_SIZE / 2, cell.color, scale, alpha);
        } else {
          drawJewel(cell.x + CELL_SIZE / 2, cell.y + CELL_SIZE / 2, cell.color, cell.scale, cell.opacity);
        }
      }
    }

    // 커서
    if (state === 'playing' || state === 'paused') {
      const pulseAlpha = 0.4 + Math.sin(cursorPulse) * 0.2;
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(
        cursor.col * CELL_SIZE + 3,
        cursor.row * CELL_SIZE + 3,
        CELL_SIZE - 6,
        CELL_SIZE - 6,
      );

      // 선택된 셀
      if (selected) {
        const selPulse = 0.6 + Math.sin(selectedPulse) * 0.3;
        ctx.strokeStyle = `rgba(0, 255, 200, ${selPulse})`;
        ctx.lineWidth = 4;
        ctx.strokeRect(
          selected.col * CELL_SIZE + 2,
          selected.row * CELL_SIZE + 2,
          CELL_SIZE - 4,
          CELL_SIZE - 4,
        );
      }
    }

    // 파티클
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 플로팅 텍스트
    for (const ft of floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;

    // 사이드 패널
    renderSidePanel();

    // HUD
    if (state === 'start') gameStartHud(canvas, ctx);
    else if (state === 'loading') gameLoadingHud(canvas, ctx);
    else if (state === 'paused') gamePauseHud(canvas, ctx);
    else if (state === 'gameover') gameOverHud.render(score);
  }

  function drawJewel(
    cx: number,
    cy: number,
    color: TJewelColor,
    scale: number,
    alpha: number,
  ) {
    const colors = JEWEL_COLORS[color];
    const size = (CELL_SIZE / 2 - 4) * scale;

    ctx.globalAlpha = alpha;

    // 그림자
    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, size, 0, Math.PI * 2);
    ctx.fill();

    // 몸체
    const grad = ctx.createRadialGradient(cx - size * 0.2, cy - size * 0.2, size * 0.1, cx, cy, size);
    grad.addColorStop(0, colors.highlight);
    grad.addColorStop(0.6, colors.body);
    grad.addColorStop(1, colors.shadow);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();

    // 반짝이
    if (scale > 0.5) {
      ctx.fillStyle = colors.sparkle;
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.arc(cx - size * 0.3, cy - size * 0.3, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  function renderSidePanel() {
    const x = BOARD_WIDTH;
    const w = SIDE_PANEL_WIDTH;

    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(x, 0, w, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();

    const cx = x + w / 2;

    // TIME
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('TIME', cx, 30);

    const timeColor = timeLeft <= 10 ? '#FF4444' : timeLeft <= 20 ? '#FFCC00' : '#00FFCC';
    ctx.fillStyle = timeColor;
    ctx.font = 'bold 32px monospace';
    ctx.fillText(Math.ceil(timeLeft).toString(), cx, 50);

    // 타임바
    const barWidth = w - 30;
    const barHeight = 6;
    const barX = x + 15;
    const barY = 92;
    const progress = timeLeft / GAME_DURATION;

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = timeColor;
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);

    // SCORE
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px monospace';
    ctx.fillText('SCORE', cx, 120);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(score.toString(), cx, 140);

    // CHAIN
    if (chainCount > 1) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${chainCount} CHAIN!`, cx, 190);
    }

    // 조작 안내
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px monospace';
    ctx.fillText('SPACE: Select', cx, CANVAS_HEIGHT - 60);
    ctx.fillText('Arrow: Move/Swap', cx, CANVAS_HEIGHT - 44);
  }

  // --- Game Loop ---
  function gameLoop(timestamp: number) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render();

    animationId = requestAnimationFrame(gameLoop);
  }

  // --- Init ---
  window.addEventListener('keydown', handleKeyDown);
  animationId = requestAnimationFrame(gameLoop);
  render();

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    cancelAnimationFrame(animationId);
  };
}
