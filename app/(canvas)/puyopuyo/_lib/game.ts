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
  HIDDEN_ROWS,
  TOTAL_ROWS,
  CELL_SIZE,
  CELL_GAP,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  SIDE_PANEL_WIDTH,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BASE_DROP_INTERVAL,
  MIN_DROP_INTERVAL,
  SPEED_INCREASE_PER_PUYO,
  SOFT_DROP_INTERVAL,
  DEATH_COL,
  MIN_MATCH,
  SCORE_PER_PUYO,
  CHAIN_MULTIPLIER,
  POP_ANIMATION_DURATION,
  GRAVITY_ACCELERATION,
  MAX_FALL_SPEED,
  BOUNCE_FACTOR,
  BOUNCE_THRESHOLD,
  PARTICLE_COUNT,
  PARTICLE_LIFE,
  FLOATING_TEXT_LIFE,
  PUYO_COLORS,
  PUYO_COLOR_LIST,
  NEXT_PREVIEW_COUNT,
} from './config';
import {
  TPuyoColor,
  TBoard,
  TPuyoPair,
  TParticle,
  TFloatingText,
  TFallingPuyo,
} from './types';

export type TPuyoPuyoCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

// 회전 오프셋: child가 pivot 기준으로 어디에 있는지
const ROTATION_OFFSETS: { dr: number; dc: number }[] = [
  { dr: -1, dc: 0 }, // 0: 위
  { dr: 0, dc: 1 }, // 1: 오른쪽
  { dr: 1, dc: 0 }, // 2: 아래
  { dr: 0, dc: -1 }, // 3: 왼쪽
];

type TState = 'start' | 'loading' | 'playing' | 'popping' | 'dropping' | 'paused' | 'gameover';

export function setupPuyoPuyo(
  canvas: HTMLCanvasElement,
  callbacks?: TPuyoPuyoCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) return () => {};

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // --- State ---
  let board: TBoard = createBoard();
  let currentPair: TPuyoPair | null = null;
  let nextPairs: { pivot: TPuyoColor; child: TPuyoColor }[] = [];
  let particles: TParticle[] = [];
  let floatingTexts: TFloatingText[] = [];
  let fallingPuyos: TFallingPuyo[] = [];

  let score = 0;
  let chainCount = 0;
  let maxChain = 0;
  let puyoCount = 0;
  let dropInterval = BASE_DROP_INTERVAL;
  let dropTimer = 0;
  let softDropping = false;

  let state: TState = 'start';
  let popTimer = 0;
  let poppingCells: { row: number; col: number }[] = [];

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
    'puyopuyo',
    gameOverCallbacks,
    { isLoggedIn: callbacks?.isLoggedIn ?? false },
  );

  // --- Helpers ---
  function randomColor(): TPuyoColor {
    return PUYO_COLOR_LIST[Math.floor(Math.random() * PUYO_COLOR_LIST.length)];
  }

  function createBoard(): TBoard {
    const b: TBoard = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      b.push(new Array(COLS).fill(null));
    }
    return b;
  }

  function generateNextPair(): { pivot: TPuyoColor; child: TPuyoColor } {
    return { pivot: randomColor(), child: randomColor() };
  }

  function spawnPair(): boolean {
    if (nextPairs.length < NEXT_PREVIEW_COUNT + 1) {
      while (nextPairs.length < NEXT_PREVIEW_COUNT + 1) {
        nextPairs.push(generateNextPair());
      }
    }

    const next = nextPairs.shift()!;
    nextPairs.push(generateNextPair());

    const pivotRow = HIDDEN_ROWS;
    const pivotCol = 2;
    const childRow = HIDDEN_ROWS - 1;
    const childCol = 2;

    if (board[pivotRow][pivotCol] !== null) {
      return false;
    }

    currentPair = {
      pivot: { row: pivotRow, col: pivotCol, color: next.pivot },
      child: { row: childRow, col: childCol, color: next.child },
      rotation: 0,
    };
    return true;
  }

  function isValidCell(row: number, col: number): boolean {
    return row >= 0 && row < TOTAL_ROWS && col >= 0 && col < COLS;
  }

  function isCellEmpty(row: number, col: number): boolean {
    if (!isValidCell(row, col)) return false;
    return board[row][col] === null;
  }

  function canMove(pair: TPuyoPair, dr: number, dc: number): boolean {
    const pr = pair.pivot.row + dr;
    const pc = pair.pivot.col + dc;
    const cr = pair.child.row + dr;
    const cc = pair.child.col + dc;

    if (!isValidCell(pr, pc) || !isValidCell(cr, cc)) return false;
    if (pr >= 0 && board[pr][pc] !== null) return false;
    if (cr >= 0 && board[cr][cc] !== null) return false;
    return true;
  }

  function movePair(dr: number, dc: number): boolean {
    if (!currentPair) return false;
    if (!canMove(currentPair, dr, dc)) return false;
    currentPair.pivot.row += dr;
    currentPair.pivot.col += dc;
    currentPair.child.row += dr;
    currentPair.child.col += dc;
    return true;
  }

  function rotatePair(): boolean {
    if (!currentPair) return false;

    const newRotation = (currentPair.rotation + 1) % 4;
    const offset = ROTATION_OFFSETS[newRotation];
    const newChildRow = currentPair.pivot.row + offset.dr;
    const newChildCol = currentPair.pivot.col + offset.dc;

    if (isValidCell(newChildRow, newChildCol) && isCellEmpty(newChildRow, newChildCol)) {
      currentPair.child.row = newChildRow;
      currentPair.child.col = newChildCol;
      currentPair.rotation = newRotation;
      return true;
    }

    // 벽 킥
    const kickDr = -offset.dr;
    const kickDc = -offset.dc;
    const kickPivotRow = currentPair.pivot.row + kickDr;
    const kickPivotCol = currentPair.pivot.col + kickDc;

    if (
      isValidCell(kickPivotRow, kickPivotCol) &&
      isCellEmpty(kickPivotRow, kickPivotCol)
    ) {
      currentPair.pivot.row = kickPivotRow;
      currentPair.pivot.col = kickPivotCol;
      currentPair.child.row = kickPivotRow + offset.dr;
      currentPair.child.col = kickPivotCol + offset.dc;
      currentPair.rotation = newRotation;
      return true;
    }

    return false;
  }

  function lockPair() {
    if (!currentPair) return;

    if (currentPair.pivot.row >= 0 && currentPair.pivot.row < TOTAL_ROWS) {
      board[currentPair.pivot.row][currentPair.pivot.col] = currentPair.pivot.color;
    }
    if (currentPair.child.row >= 0 && currentPair.child.row < TOTAL_ROWS) {
      board[currentPair.child.row][currentPair.child.col] = currentPair.child.color;
    }

    currentPair = null;
    puyoCount += 2;
    dropInterval = Math.max(MIN_DROP_INTERVAL, BASE_DROP_INTERVAL - puyoCount * SPEED_INCREASE_PER_PUYO);
  }

  // 즉시 중력 적용 (보드 데이터만 변경, 초기 lock 직후용)
  function applyGravityInstant(): boolean {
    let moved = false;
    for (let col = 0; col < COLS; col++) {
      let writeRow = TOTAL_ROWS - 1;
      for (let row = TOTAL_ROWS - 1; row >= 0; row--) {
        if (board[row][col] !== null) {
          if (row !== writeRow) {
            board[writeRow][col] = board[row][col];
            board[row][col] = null;
            moved = true;
          }
          writeRow--;
        }
      }
    }
    return moved;
  }

  // 애니메이션 낙하 시작 (pop 이후 사용)
  function startGravityAnimation() {
    fallingPuyos = [];

    for (let col = 0; col < COLS; col++) {
      // 각 열에서 아래부터 위로 스캔, 빈 칸 아래로 떨어질 뿌요 계산
      const colPuyos: { row: number; color: TPuyoColor }[] = [];
      for (let row = TOTAL_ROWS - 1; row >= 0; row--) {
        if (board[row][col] !== null) {
          colPuyos.push({ row, color: board[row][col]! });
        }
      }

      // 목표 위치 계산 (아래부터 채움)
      let targetRow = TOTAL_ROWS - 1;
      for (const puyo of colPuyos) {
        if (puyo.row !== targetRow) {
          // 이동이 필요한 뿌요
          const fromPixelY = (puyo.row - HIDDEN_ROWS) * CELL_SIZE;
          fallingPuyos.push({
            col,
            color: puyo.color,
            fromRow: puyo.row,
            toRow: targetRow,
            currentY: fromPixelY,
            velocity: 0,
          });
        }
        targetRow--;
      }
    }

    if (fallingPuyos.length > 0) {
      // 보드에서 떨어질 뿌요를 제거 (렌더링은 fallingPuyos로 처리)
      for (const fp of fallingPuyos) {
        board[fp.fromRow][fp.col] = null;
      }
      state = 'dropping';
    } else {
      // 떨어질 게 없으면 바로 연쇄 체크
      chainCount++;
      processChain();
    }
  }

  function updateFallingPuyos(dt: number): boolean {
    let allLanded = true;

    for (const fp of fallingPuyos) {
      const targetY = (fp.toRow - HIDDEN_ROWS) * CELL_SIZE;

      if (fp.currentY < targetY) {
        // 가속
        fp.velocity = Math.min(fp.velocity + GRAVITY_ACCELERATION * dt, MAX_FALL_SPEED);
        fp.currentY += fp.velocity * dt;

        if (fp.currentY >= targetY) {
          // 착지
          if (fp.velocity > BOUNCE_THRESHOLD) {
            // 바운스
            fp.currentY = targetY;
            fp.velocity = -fp.velocity * BOUNCE_FACTOR;
          } else {
            fp.currentY = targetY;
            fp.velocity = 0;
          }
        }
        allLanded = false;
      } else if (fp.velocity < 0) {
        // 바운스 중 (위로 올라가는 중)
        fp.velocity += GRAVITY_ACCELERATION * dt;
        fp.currentY += fp.velocity * dt;

        const targetYPos = (fp.toRow - HIDDEN_ROWS) * CELL_SIZE;
        if (fp.velocity >= 0 && fp.currentY >= targetYPos) {
          fp.currentY = targetYPos;
          fp.velocity = 0;
        } else {
          allLanded = false;
        }
      }
      // velocity === 0 && currentY === targetY → 착지 완료
    }

    return allLanded;
  }

  function finalizeFalling() {
    // 떨어진 뿌요를 보드에 배치
    for (const fp of fallingPuyos) {
      board[fp.toRow][fp.col] = fp.color;
    }
    fallingPuyos = [];
    chainCount++;
    processChain();
  }

  function findMatches(): { row: number; col: number }[][] {
    const visited: boolean[][] = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      visited.push(new Array(COLS).fill(false));
    }

    const groups: { row: number; col: number }[][] = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (visited[r][c] || board[r][c] === null) continue;

        const color = board[r][c];
        const group: { row: number; col: number }[] = [];
        const queue: { row: number; col: number }[] = [{ row: r, col: c }];
        visited[r][c] = true;

        while (queue.length > 0) {
          const cell = queue.shift()!;
          group.push(cell);

          for (const [dr, dc] of dirs) {
            const nr = cell.row + dr;
            const nc = cell.col + dc;
            if (
              isValidCell(nr, nc) &&
              !visited[nr][nc] &&
              board[nr][nc] === color
            ) {
              visited[nr][nc] = true;
              queue.push({ row: nr, col: nc });
            }
          }
        }

        if (group.length >= MIN_MATCH) {
          groups.push(group);
        }
      }
    }

    return groups;
  }

  function popMatches(groups: { row: number; col: number }[][]) {
    let totalPopped = 0;
    const allCells: { row: number; col: number }[] = [];

    for (const group of groups) {
      for (const cell of group) {
        const color = board[cell.row][cell.col];
        if (color) {
          spawnParticles(cell.col, cell.row, PUYO_COLORS[color].body);
        }
        board[cell.row][cell.col] = null;
        allCells.push(cell);
        totalPopped++;
      }
    }

    const multiplier = CHAIN_MULTIPLIER[Math.min(chainCount, CHAIN_MULTIPLIER.length - 1)];
    const chainScore = totalPopped * SCORE_PER_PUYO * multiplier;
    score += chainScore;

    if (allCells.length > 0) {
      const avgCol = allCells.reduce((s, c) => s + c.col, 0) / allCells.length;
      const avgRow = allCells.reduce((s, c) => s + c.row, 0) / allCells.length;
      const visibleRow = avgRow - HIDDEN_ROWS;

      if (chainCount > 1) {
        floatingTexts.push({
          x: avgCol * CELL_SIZE + CELL_SIZE / 2,
          y: visibleRow * CELL_SIZE + CELL_SIZE / 2 - 25,
          text: `${chainCount} CHAIN!`,
          life: FLOATING_TEXT_LIFE,
          maxLife: FLOATING_TEXT_LIFE,
        });
      }

      floatingTexts.push({
        x: avgCol * CELL_SIZE + CELL_SIZE / 2,
        y: visibleRow * CELL_SIZE + CELL_SIZE / 2 + 10,
        text: `+${chainScore}`,
        life: FLOATING_TEXT_LIFE,
        maxLife: FLOATING_TEXT_LIFE,
      });
    }

    poppingCells = allCells;
  }

  function spawnParticles(col: number, row: number, color: string) {
    const visibleRow = row - HIDDEN_ROWS;
    const cx = col * CELL_SIZE + CELL_SIZE / 2;
    const cy = visibleRow * CELL_SIZE + CELL_SIZE / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.5;
      const speed = 100 + Math.random() * 150;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        color,
        radius: 3 + Math.random() * 4,
      });
    }
  }

  function checkGameOver(): boolean {
    return board[HIDDEN_ROWS][DEATH_COL] !== null;
  }

  function canPairDrop(): boolean {
    if (!currentPair) return false;
    return canMove(currentPair, 1, 0);
  }

  function hardDrop() {
    if (!currentPair) return;
    while (canPairDrop()) {
      movePair(1, 0);
    }
    lockAndProcess();
  }

  function lockAndProcess() {
    lockPair();
    applyGravityInstant();
    chainCount = 1;
    processChain();
  }

  function processChain() {
    const groups = findMatches();
    if (groups.length > 0) {
      popMatches(groups);
      if (chainCount > maxChain) maxChain = chainCount;
      state = 'popping';
      popTimer = POP_ANIMATION_DURATION;
    } else {
      chainCount = 0;
      if (checkGameOver()) {
        state = 'gameover';
      } else {
        if (!spawnPair()) {
          state = 'gameover';
        } else {
          state = 'playing';
          dropTimer = 0;
        }
      }
    }
  }

  // --- Reset ---
  function resetGame() {
    board = createBoard();
    currentPair = null;
    nextPairs = [];
    particles = [];
    floatingTexts = [];
    fallingPuyos = [];
    score = 0;
    chainCount = 0;
    maxChain = 0;
    puyoCount = 0;
    dropInterval = BASE_DROP_INTERVAL;
    dropTimer = 0;
    softDropping = false;
    state = 'start';
    popTimer = 0;
    poppingCells = [];
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

    board = createBoard();
    nextPairs = [];
    for (let i = 0; i < NEXT_PREVIEW_COUNT + 1; i++) {
      nextPairs.push(generateNextPair());
    }

    score = 0;
    chainCount = 0;
    maxChain = 0;
    puyoCount = 0;
    dropInterval = BASE_DROP_INTERVAL;
    dropTimer = 0;
    particles = [];
    floatingTexts = [];
    fallingPuyos = [];

    spawnPair();
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
        if (state === 'start' || state === 'paused') {
          startGame();
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
        resetGame();
        break;
      case 'ArrowLeft':
        if (state === 'playing' && currentPair) {
          movePair(0, -1);
        }
        break;
      case 'ArrowRight':
        if (state === 'playing' && currentPair) {
          movePair(0, 1);
        }
        break;
      case 'ArrowUp':
      case 'KeyZ':
        if (state === 'playing' && currentPair) {
          rotatePair();
        }
        break;
      case 'ArrowDown':
        if (state === 'playing') {
          softDropping = true;
        }
        break;
      case 'Space':
        if (state === 'playing' && currentPair) {
          hardDrop();
        }
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ArrowDown') {
      softDropping = false;
    }
  };

  // --- Update ---
  function update(dt: number) {
    // 파티클 업데이트
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // 플로팅 텍스트 업데이트
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 30 * dt;
      ft.life -= dt;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    if (state === 'popping') {
      popTimer -= dt;
      if (popTimer <= 0) {
        poppingCells = [];
        startGravityAnimation();
      }
      return;
    }

    if (state === 'dropping') {
      const allLanded = updateFallingPuyos(dt);
      if (allLanded) {
        finalizeFalling();
      }
      return;
    }

    if (state === 'playing' && currentPair) {
      const interval = softDropping ? SOFT_DROP_INTERVAL : dropInterval;
      dropTimer += dt;

      if (dropTimer >= interval) {
        dropTimer = 0;
        if (!movePair(1, 0)) {
          lockAndProcess();
        }
      }
    }
  }

  // --- Render ---
  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 보드 배경
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    // 그리드 라인
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = CELL_GAP;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL_SIZE);
      ctx.lineTo(BOARD_WIDTH, r * CELL_SIZE);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL_SIZE, 0);
      ctx.lineTo(c * CELL_SIZE, BOARD_HEIGHT);
      ctx.stroke();
    }

    // 게임 오버 열 표시
    if (state === 'playing' || state === 'popping' || state === 'dropping') {
      ctx.fillStyle = 'rgba(255,0,0,0.05)';
      ctx.fillRect(DEATH_COL * CELL_SIZE, 0, CELL_SIZE, CELL_SIZE);

      ctx.strokeStyle = 'rgba(255,0,0,0.2)';
      ctx.lineWidth = 2;
      const xPad = 12;
      ctx.beginPath();
      ctx.moveTo(DEATH_COL * CELL_SIZE + xPad, xPad);
      ctx.lineTo((DEATH_COL + 1) * CELL_SIZE - xPad, CELL_SIZE - xPad);
      ctx.moveTo((DEATH_COL + 1) * CELL_SIZE - xPad, xPad);
      ctx.lineTo(DEATH_COL * CELL_SIZE + xPad, CELL_SIZE - xPad);
      ctx.stroke();
    }

    // 보드 뿌요 렌더링
    // 낙하 중인 뿌요의 열은 제외 (fallingPuyos로 별도 렌더링)
    const fallingCols = new Set(fallingPuyos.map((fp) => fp.col));

    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = board[r][c];
        if (!color) continue;

        const visibleRow = r - HIDDEN_ROWS;

        // 터지는 중인 셀
        const isPopping = poppingCells.some(
          (cell) => cell.row === r && cell.col === c,
        );
        if (isPopping) {
          const progress = 1 - popTimer / POP_ANIMATION_DURATION;
          const scale = 1 - progress;
          drawPuyo(c * CELL_SIZE + CELL_SIZE / 2, visibleRow * CELL_SIZE + CELL_SIZE / 2, color, scale, 1 - progress);
        } else {
          drawPuyo(c * CELL_SIZE + CELL_SIZE / 2, visibleRow * CELL_SIZE + CELL_SIZE / 2, color, 1, 1);
        }
      }
    }

    // 연결부 그리기 (dropping 중엔 스킵 — 위치가 계속 변하므로)
    if (state !== 'dropping') {
      renderConnections();
    }

    // 낙하 애니메이션 뿌요 렌더링
    for (const fp of fallingPuyos) {
      const cx = fp.col * CELL_SIZE + CELL_SIZE / 2;
      const cy = fp.currentY + CELL_SIZE / 2;
      // 속도에 따른 미세한 스쿼시/스트레치
      const speed = Math.abs(fp.velocity);
      const stretch = 1 + Math.min(speed / MAX_FALL_SPEED, 0.3) * 0.15;
      const squash = 1 / stretch;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(squash, stretch);
      ctx.translate(-cx, -cy);
      drawPuyo(cx, cy, fp.color, 1, 1);
      ctx.restore();
    }

    // 현재 떨어지는 쌍
    if (currentPair && (state === 'playing' || state === 'paused')) {
      renderGhost();

      const pVisRow = currentPair.pivot.row - HIDDEN_ROWS;
      const cVisRow = currentPair.child.row - HIDDEN_ROWS;
      if (pVisRow >= 0) {
        drawPuyo(
          currentPair.pivot.col * CELL_SIZE + CELL_SIZE / 2,
          pVisRow * CELL_SIZE + CELL_SIZE / 2,
          currentPair.pivot.color, 1, 1,
        );
      }
      if (cVisRow >= 0) {
        drawPuyo(
          currentPair.child.col * CELL_SIZE + CELL_SIZE / 2,
          cVisRow * CELL_SIZE + CELL_SIZE / 2,
          currentPair.child.color, 1, 1,
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
      ctx.fillStyle = ft.text.includes('CHAIN') ? '#FFD700' : '#FFFFFF';
      ctx.font = ft.text.includes('CHAIN') ? 'bold 24px monospace' : 'bold 18px monospace';
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

    // HUD 오버레이
    if (state === 'start') {
      gameStartHud(canvas, ctx);
    } else if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
    } else if (state === 'paused') {
      gamePauseHud(canvas, ctx);
    } else if (state === 'gameover') {
      gameOverHud.render(score);
    }
  }

  function drawPuyo(
    cx: number,
    cy: number,
    color: TPuyoColor,
    scale: number,
    alpha: number,
  ) {
    const colors = PUYO_COLORS[color];
    const r = (CELL_SIZE / 2 - 3) * scale;

    ctx.globalAlpha = alpha;

    // 그림자
    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, r, 0, Math.PI * 2);
    ctx.fill();

    // 몸체
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 하이라이트
    ctx.fillStyle = colors.highlight;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 눈
    if (scale > 0.5) {
      const eyeOffsetX = r * 0.22;
      const eyeOffsetY = -r * 0.1;
      const eyeRadius = r * 0.18;
      const pupilRadius = r * 0.1;

      ctx.fillStyle = colors.eye;
      ctx.beginPath();
      ctx.arc(cx - eyeOffsetX, cy + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + eyeOffsetX, cy + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#222222';
      ctx.beginPath();
      ctx.arc(cx - eyeOffsetX, cy + eyeOffsetY, pupilRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + eyeOffsetX, cy + eyeOffsetY, pupilRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  function renderConnections() {
    for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = board[r][c];
        if (!color) continue;

        const visRow = r - HIDDEN_ROWS;
        const colors = PUYO_COLORS[color];

        if (c + 1 < COLS && board[r][c + 1] === color) {
          ctx.fillStyle = colors.body;
          ctx.fillRect(
            c * CELL_SIZE + CELL_SIZE / 2,
            visRow * CELL_SIZE + 5,
            CELL_SIZE,
            CELL_SIZE - 10,
          );
        }

        if (r + 1 < TOTAL_ROWS && board[r + 1][c] === color) {
          ctx.fillStyle = colors.body;
          ctx.fillRect(
            c * CELL_SIZE + 5,
            visRow * CELL_SIZE + CELL_SIZE / 2,
            CELL_SIZE - 10,
            CELL_SIZE,
          );
        }
      }
    }
  }

  function renderGhost() {
    if (!currentPair) return;

    let ghostDr = 0;
    while (canMove(currentPair, ghostDr + 1, 0)) {
      ghostDr++;
    }

    if (ghostDr === 0) return;

    const pVisRow = currentPair.pivot.row + ghostDr - HIDDEN_ROWS;
    const cVisRow = currentPair.child.row + ghostDr - HIDDEN_ROWS;

    if (pVisRow >= 0) {
      drawPuyo(
        currentPair.pivot.col * CELL_SIZE + CELL_SIZE / 2,
        pVisRow * CELL_SIZE + CELL_SIZE / 2,
        currentPair.pivot.color, 1, 0.2,
      );
    }
    if (cVisRow >= 0) {
      drawPuyo(
        currentPair.child.col * CELL_SIZE + CELL_SIZE / 2,
        cVisRow * CELL_SIZE + CELL_SIZE / 2,
        currentPair.child.color, 1, 0.2,
      );
    }
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

    // SCORE
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('SCORE', cx, 30);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(score.toString(), cx, 48);

    // MAX CHAIN
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px monospace';
    ctx.fillText('MAX CHAIN', cx, 96);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(maxChain.toString(), cx, 114);

    // SPEED
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px monospace';
    ctx.fillText('SPEED', cx, 162);

    const speedPercent = Math.round(
      ((BASE_DROP_INTERVAL - dropInterval) / (BASE_DROP_INTERVAL - MIN_DROP_INTERVAL)) * 100,
    );
    ctx.fillStyle = '#00FFCC';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`${speedPercent}%`, cx, 180);

    // NEXT
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px monospace';
    ctx.fillText('NEXT', cx, 240);

    for (let i = 0; i < Math.min(nextPairs.length, NEXT_PREVIEW_COUNT); i++) {
      const pair = nextPairs[i];
      const previewY = 272 + i * 110;
      const previewSize = 32;

      // child (위)
      drawPreviewPuyo(cx, previewY, pair.child, previewSize);
      // pivot (아래)
      drawPreviewPuyo(cx, previewY + previewSize + 6, pair.pivot, previewSize);
    }
  }

  function drawPreviewPuyo(cx: number, cy: number, color: TPuyoColor, size: number) {
    const colors = PUYO_COLORS[color];
    const r = size / 2 - 2;

    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.arc(cx, cy + 1, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.highlight;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    const eyeOffX = r * 0.22;
    const eyeOffY = -r * 0.1;
    const eyeR = r * 0.16;
    const pupilR = r * 0.09;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - eyeOffX, cy + eyeOffY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeOffX, cy + eyeOffY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(cx - eyeOffX, cy + eyeOffY, pupilR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeOffX, cy + eyeOffY, pupilR, 0, Math.PI * 2);
    ctx.fill();
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
  window.addEventListener('keyup', handleKeyUp);
  animationId = requestAnimationFrame(gameLoop);

  render();

  // --- Cleanup ---
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    cancelAnimationFrame(animationId);
  };
}
