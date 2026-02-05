import {
  createGameOverHud,
  gameHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CELL,
  DIR,
  STEP,
  PACMAN_SPEED,
  GHOST_SPEED,
  GHOST_FRIGHTENED_SPEED,
  GHOST_TUNNEL_SPEED,
  GHOST_EATEN_SPEED,
  SCORE_DOT,
  SCORE_POWER_PELLET,
  SCORE_GHOST,
  SCATTER_DURATION,
  CHASE_DURATION,
  FRIGHTENED_DURATION,
  FRIGHTENED_BLINK_TIME,
  GHOST_RELEASE_TIMES,
  INITIAL_LIVES,
  GHOST_COLORS,
  PACMAN_COLOR,
  WALL_COLOR,
  DOT_COLOR,
  POWER_PELLET_COLOR,
  MAZE_COLS,
  MAZE_ROWS,
} from './config';
import {
  Point,
  Direction,
  Ghost,
  GhostName,
  GhostMode,
  Pacman,
  GameState,
  CELL_TYPES,
} from './types';
import {
  cloneMaze,
  getCellType,
  canPacmanMove,
  handleTunnel,
  isInTunnel,
  isInGhostHouse,
  directionToDelta,
  countDots,
  PACMAN_START,
  GHOST_START_POSITIONS,
  GHOST_SCATTER_TARGETS,
  GHOST_HOUSE_EXIT,
} from './maze';
import {
  updateGhostDirection,
  hasReachedHouse,
} from './ghost-ai';

export type TPacmanCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupPacman = (
  canvas: HTMLCanvasElement,
  callbacks?: TPacmanCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 게임 상태
  let state: GameState;

  // 보간용 변수
  let moveProgress = 0;
  let ghostMoveProgress = 0;

  // 타이머
  let lastTime = 0;
  let acc = 0;
  let ghostAcc = 0;
  let elapsedTime = 0;

  // 애니메이션
  let pacmanMouthAngle = 0;
  let pacmanMouthDir = 1;
  let powerPelletBlink = 0;

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'pacman', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  // 유령 초기화
  const createGhost = (name: GhostName): Ghost => {
    const startPos = GHOST_START_POSITIONS[name];
    return {
      name,
      gridX: startPos.x,
      gridY: startPos.y,
      prevGridX: startPos.x,
      prevGridY: startPos.y,
      direction: name === 'blinky' ? 'left' : 'up',
      mode: 'scatter',
      prevMode: 'scatter',
      state: name === 'blinky' ? 'active' : 'inHouse',
      scatterTarget: GHOST_SCATTER_TARGETS[name],
    };
  };

  // 팩맨 초기화
  const createPacman = (): Pacman => {
    return {
      gridX: PACMAN_START.x,
      gridY: PACMAN_START.y,
      prevGridX: PACMAN_START.x,
      prevGridY: PACMAN_START.y,
      direction: 'none',
      nextDirection: 'none',
    };
  };

  // 게임 상태 초기화
  const initGameState = (): GameState => {
    const maze = cloneMaze();
    return {
      pacman: createPacman(),
      ghosts: [
        createGhost('blinky'),
        createGhost('pinky'),
        createGhost('inky'),
        createGhost('clyde'),
      ],
      maze,
      score: 0,
      lives: INITIAL_LIVES,
      level: 1,
      dotsRemaining: countDots(maze),
      totalDots: countDots(maze),
      currentMode: 'scatter',
      modeTimer: 0,
      modeIndex: 0,
      frightenedTimer: 0,
      ghostsEatenCount: 0,
      isStarted: false,
      isGameOver: false,
      isPaused: false,
      isDying: false,
      deathAnimTimer: 0,
      isLevelClear: false,
      levelClearTimer: 0,
    };
  };

  state = initGameState();

  const startGame = async () => {
    if (state.isStarted) return;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    state.isStarted = true;
    lastTime = 0;
    acc = 0;
    ghostAcc = 0;
    elapsedTime = 0;
  };

  const resetGame = () => {
    state = initGameState();
    lastTime = 0;
    acc = 0;
    ghostAcc = 0;
    elapsedTime = 0;
    moveProgress = 0;
    ghostMoveProgress = 0;
    gameOverHud.reset();
  };

  // 라운드 리셋 (죽었을 때)
  const resetRound = () => {
    state.pacman = createPacman();
    state.ghosts = [
      createGhost('blinky'),
      createGhost('pinky'),
      createGhost('inky'),
      createGhost('clyde'),
    ];
    state.currentMode = 'scatter';
    state.modeTimer = 0;
    state.modeIndex = 0;
    state.frightenedTimer = 0;
    state.ghostsEatenCount = 0;
    state.isDying = false;
    state.deathAnimTimer = 0;
    moveProgress = 0;
    ghostMoveProgress = 0;
    acc = 0;
    ghostAcc = 0;
  };

  // 레벨 클리어
  const nextLevel = () => {
    state.level++;
    state.maze = cloneMaze();
    state.dotsRemaining = countDots(state.maze);
    state.pacman = createPacman();
    state.ghosts = [
      createGhost('blinky'),
      createGhost('pinky'),
      createGhost('inky'),
      createGhost('clyde'),
    ];
    state.currentMode = 'scatter';
    state.modeTimer = 0;
    state.modeIndex = 0;
    state.frightenedTimer = 0;
    state.ghostsEatenCount = 0;
    state.isLevelClear = false;
    state.levelClearTimer = 0;
    moveProgress = 0;
    ghostMoveProgress = 0;
    acc = 0;
    ghostAcc = 0;
  };

  // 키 입력 처리
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'KeyS') {
      if (state.isPaused) {
        state.isPaused = false;
        lastTime = 0;
        return;
      }
      startGame();
      return;
    }

    if (e.code === 'KeyP' && state.isStarted && !state.isGameOver) {
      state.isPaused = true;
      return;
    }

    if (state.isGameOver) {
      const handled = gameOverHud.onKeyDown(e, state.score);
      if (handled) return;
    }

    if (e.code === 'KeyR' && !state.isGameOver && !state.isPaused) {
      resetGame();
      return;
    }

    if (state.isPaused || state.isDying || state.isLevelClear) return;

    // 방향키 처리
    if (e.key in DIR) {
      e.preventDefault();

      const keyToDir: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };

      const newDir = keyToDir[e.key];
      if (!newDir) return;

      // 반대 방향 매핑
      const opposite: Record<Direction, Direction> = {
        up: 'down',
        down: 'up',
        left: 'right',
        right: 'left',
        none: 'none',
      };

      const currentDir = state.pacman.direction;

      // 반대 방향은 즉시 적용 (벽 체크 없이)
      if (currentDir !== 'none' && newDir === opposite[currentDir]) {
        state.pacman.direction = newDir;
        state.pacman.nextDirection = newDir;
        return;
      }

      // 같은 방향 무시
      if (newDir === currentDir || newDir === state.pacman.nextDirection) return;

      // 다른 방향은 nextDirection에 저장 (팩맨 원본 스타일)
      state.pacman.nextDirection = newDir;
    }
  };

  // 팩맨 업데이트
  const updatePacman = () => {
    const { pacman, maze } = state;

    // 이전 위치 저장
    pacman.prevGridX = pacman.gridX;
    pacman.prevGridY = pacman.gridY;

    // nextDirection으로 이동 가능한지 체크 (팩맨 원본 스타일)
    if (pacman.nextDirection !== 'none') {
      const nextDelta = directionToDelta(pacman.nextDirection);
      const nextX = pacman.gridX + nextDelta.x;
      const nextY = pacman.gridY + nextDelta.y;

      if (canPacmanMove(maze, nextX, nextY)) {
        // 이동 가능하면 방향 전환
        pacman.direction = pacman.nextDirection;
      }
    }

    // 현재 방향으로 이동 시도
    if (pacman.direction !== 'none') {
      const delta = directionToDelta(pacman.direction);
      let nextX = pacman.gridX + delta.x;
      let nextY = pacman.gridY + delta.y;

      // 터널 처리
      const tunnelPos = handleTunnel(nextX, nextY);
      nextX = tunnelPos.x;
      nextY = tunnelPos.y;

      if (canPacmanMove(maze, nextX, nextY)) {
        pacman.gridX = nextX;
        pacman.gridY = nextY;
      }
    }

    // 점 먹기
    const cellType = getCellType(maze, pacman.gridX, pacman.gridY);

    if (cellType === CELL_TYPES.DOT) {
      maze[pacman.gridY][pacman.gridX] = CELL_TYPES.EMPTY;
      state.score += SCORE_DOT;
      state.dotsRemaining--;
    } else if (cellType === CELL_TYPES.POWER) {
      maze[pacman.gridY][pacman.gridX] = CELL_TYPES.EMPTY;
      state.score += SCORE_POWER_PELLET;
      state.dotsRemaining--;
      activateFrightenedMode();
    }

    // 레벨 클리어 체크
    if (state.dotsRemaining <= 0) {
      state.isLevelClear = true;
      state.levelClearTimer = 0;
    }

    moveProgress = 0;
  };

  // Frightened 모드 활성화
  const activateFrightenedMode = () => {
    state.frightenedTimer = FRIGHTENED_DURATION;
    state.ghostsEatenCount = 0;

    for (const ghost of state.ghosts) {
      if (ghost.mode !== 'eaten' && ghost.state === 'active') {
        ghost.prevMode = ghost.mode;
        ghost.mode = 'frightened';
        // 방향 반전
        const opposite: Record<Direction, Direction> = {
          up: 'down',
          down: 'up',
          left: 'right',
          right: 'left',
          none: 'none',
        };
        ghost.direction = opposite[ghost.direction];
      }
    }
  };

  // 유령 집 탈출 체크
  const checkGhostRelease = () => {
    for (const ghost of state.ghosts) {
      if (ghost.state === 'inHouse') {
        const releaseTime = GHOST_RELEASE_TIMES[ghost.name];
        if (elapsedTime >= releaseTime) {
          ghost.state = 'leavingHouse';
        }
      }
    }
  };

  // 유령 업데이트
  const updateGhost = (ghost: Ghost) => {
    // 이전 위치 저장
    ghost.prevGridX = ghost.gridX;
    ghost.prevGridY = ghost.gridY;

    // 유령 집에서 나가는 중
    if (ghost.state === 'leavingHouse') {
      const exitDir = updateGhostDirection(ghost, state.pacman, state.ghosts, state.maze);
      ghost.direction = exitDir;

      const delta = directionToDelta(exitDir);
      ghost.gridX += delta.x;
      ghost.gridY += delta.y;

      // 출구에 도착하면 활성화
      if (ghost.gridY <= GHOST_HOUSE_EXIT.y && !isInGhostHouse(ghost.gridX, ghost.gridY)) {
        ghost.state = 'active';
      }
      return;
    }

    // Eaten 상태에서 집에 도착
    if (ghost.mode === 'eaten' && hasReachedHouse(ghost)) {
      ghost.mode = state.frightenedTimer > 0 ? 'frightened' : state.currentMode;
      ghost.state = 'leavingHouse';
      return;
    }

    // 일반 이동
    if (ghost.state === 'active') {
      const newDir = updateGhostDirection(ghost, state.pacman, state.ghosts, state.maze);
      ghost.direction = newDir;

      const delta = directionToDelta(newDir);
      let nextX = ghost.gridX + delta.x;
      let nextY = ghost.gridY + delta.y;

      // 터널 처리
      const tunnelPos = handleTunnel(nextX, nextY);
      nextX = tunnelPos.x;
      nextY = tunnelPos.y;

      ghost.gridX = nextX;
      ghost.gridY = nextY;
    }
  };

  // 모든 유령 업데이트
  const updateGhosts = () => {
    for (const ghost of state.ghosts) {
      updateGhost(ghost);
    }
    ghostMoveProgress = 0;
  };

  // 모드 전환
  const updateMode = (dt: number) => {
    // Frightened 타이머
    if (state.frightenedTimer > 0) {
      state.frightenedTimer -= dt;

      if (state.frightenedTimer <= 0) {
        state.frightenedTimer = 0;
        // Frightened 종료
        for (const ghost of state.ghosts) {
          if (ghost.mode === 'frightened') {
            ghost.mode = state.currentMode;
          }
        }
      }
      return; // Frightened 중에는 모드 전환 타이머 멈춤
    }

    // Scatter/Chase 전환
    state.modeTimer += dt;

    const durations = [
      SCATTER_DURATION, CHASE_DURATION,
      SCATTER_DURATION, CHASE_DURATION,
      SCATTER_DURATION, CHASE_DURATION,
      SCATTER_DURATION, // 마지막은 무한 Chase
    ];

    if (state.modeIndex < durations.length) {
      if (state.modeTimer >= durations[state.modeIndex]) {
        state.modeTimer = 0;
        state.modeIndex++;

        // 모드 전환
        state.currentMode = state.currentMode === 'scatter' ? 'chase' : 'scatter';

        // 유령 방향 반전
        for (const ghost of state.ghosts) {
          if (ghost.mode !== 'eaten' && ghost.mode !== 'frightened' && ghost.state === 'active') {
            ghost.mode = state.currentMode;
            const opposite: Record<Direction, Direction> = {
              up: 'down',
              down: 'up',
              left: 'right',
              right: 'left',
              none: 'none',
            };
            ghost.direction = opposite[ghost.direction];
          }
        }
      }
    }
  };

  // 충돌 체크
  const checkCollisions = () => {
    const { pacman, ghosts } = state;

    for (const ghost of ghosts) {
      if (ghost.gridX === pacman.gridX && ghost.gridY === pacman.gridY) {
        if (ghost.mode === 'frightened') {
          // 유령 먹기
          ghost.mode = 'eaten';
          const points = SCORE_GHOST[Math.min(state.ghostsEatenCount, SCORE_GHOST.length - 1)];
          state.score += points;
          state.ghostsEatenCount++;
        } else if (ghost.mode !== 'eaten') {
          // 팩맨 사망
          state.isDying = true;
          state.deathAnimTimer = 0;
        }
      }
    }
  };

  // 유령 속도 계산
  const getGhostSpeed = (ghost: Ghost): number => {
    if (ghost.mode === 'eaten') return GHOST_EATEN_SPEED;
    if (ghost.mode === 'frightened') return GHOST_FRIGHTENED_SPEED;
    if (isInTunnel(ghost.gridX, ghost.gridY)) return GHOST_TUNNEL_SPEED;
    return GHOST_SPEED;
  };

  // 업데이트 메인
  const update = (t: number) => {
    if (state.isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);

    if (!state.isStarted || state.isGameOver) return;

    // 사망 애니메이션
    if (state.isDying) {
      state.deathAnimTimer += dt;
      if (state.deathAnimTimer >= 1.5) {
        state.lives--;
        if (state.lives <= 0) {
          state.isGameOver = true;
        } else {
          resetRound();
        }
      }
      return;
    }

    // 레벨 클리어 애니메이션
    if (state.isLevelClear) {
      state.levelClearTimer += dt;
      if (state.levelClearTimer >= 2) {
        nextLevel();
      }
      return;
    }

    elapsedTime += dt;

    // 모드 업데이트
    updateMode(dt);

    // 유령 탈출 체크
    checkGhostRelease();

    // 팩맨 이동
    acc += dt;
    moveProgress = Math.min(acc / STEP, 1);

    while (acc >= STEP) {
      updatePacman();
      acc -= STEP;
    }

    // 유령 이동 (각 유령 속도에 따라)
    ghostAcc += dt;
    const avgGhostStep = 1 / GHOST_SPEED;
    ghostMoveProgress = Math.min(ghostAcc / avgGhostStep, 1);

    while (ghostAcc >= avgGhostStep) {
      updateGhosts();
      ghostAcc -= avgGhostStep;
    }

    // 충돌 체크
    checkCollisions();

    // 애니메이션 업데이트
    pacmanMouthAngle += pacmanMouthDir * dt * 8;
    if (pacmanMouthAngle >= 0.5 || pacmanMouthAngle <= 0) {
      pacmanMouthDir *= -1;
    }
    pacmanMouthAngle = Math.max(0, Math.min(0.5, pacmanMouthAngle));

    powerPelletBlink += dt * 4;
  };

  // 미로 렌더링
  const renderMaze = () => {
    const { maze } = state;

    for (let y = 0; y < MAZE_ROWS; y++) {
      for (let x = 0; x < MAZE_COLS; x++) {
        const cellType = maze[y][x];
        const px = x * CELL;
        const py = y * CELL;

        if (cellType === CELL_TYPES.WALL) {
          ctx.fillStyle = WALL_COLOR;
          ctx.fillRect(px, py, CELL, CELL);
        } else if (cellType === CELL_TYPES.DOT) {
          ctx.fillStyle = DOT_COLOR;
          ctx.beginPath();
          ctx.arc(px + CELL / 2, py + CELL / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (cellType === CELL_TYPES.POWER) {
          // 깜빡임 효과
          if (Math.floor(powerPelletBlink) % 2 === 0) {
            ctx.fillStyle = POWER_PELLET_COLOR;
            ctx.beginPath();
            ctx.arc(px + CELL / 2, py + CELL / 2, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (cellType === CELL_TYPES.GHOST_DOOR) {
          ctx.fillStyle = '#FFB8DE';
          ctx.fillRect(px, py + CELL / 2 - 2, CELL, 4);
        }
      }
    }
  };

  // 팩맨 렌더링
  const renderPacman = () => {
    const { pacman } = state;

    // 보간 위치 계산
    const t = moveProgress;
    const eased = t * (2 - t);

    const px = (pacman.prevGridX + (pacman.gridX - pacman.prevGridX) * eased) * CELL + CELL / 2;
    const py = (pacman.prevGridY + (pacman.gridY - pacman.prevGridY) * eased) * CELL + CELL / 2;

    ctx.fillStyle = PACMAN_COLOR;
    ctx.beginPath();

    // 방향에 따른 회전
    let rotation = 0;
    switch (pacman.direction) {
      case 'right': rotation = 0; break;
      case 'down': rotation = Math.PI / 2; break;
      case 'left': rotation = Math.PI; break;
      case 'up': rotation = -Math.PI / 2; break;
    }

    const mouthAngle = pacmanMouthAngle * Math.PI;
    ctx.arc(px, py, CELL / 2 - 2, rotation + mouthAngle, rotation + Math.PI * 2 - mouthAngle);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();
  };

  // 사망 애니메이션 렌더링
  const renderDyingPacman = () => {
    const { pacman, deathAnimTimer } = state;

    const px = pacman.gridX * CELL + CELL / 2;
    const py = pacman.gridY * CELL + CELL / 2;

    ctx.fillStyle = PACMAN_COLOR;
    ctx.beginPath();

    // 애니메이션 진행률 (0~1)
    const progress = Math.min(deathAnimTimer / 1.5, 1);
    const startAngle = -Math.PI / 2 + progress * Math.PI;
    const endAngle = -Math.PI / 2 + Math.PI * 2 - progress * Math.PI;

    if (startAngle < endAngle) {
      ctx.arc(px, py, CELL / 2 - 2, startAngle, endAngle);
      ctx.lineTo(px, py);
      ctx.closePath();
      ctx.fill();
    }
  };

  // 유령 렌더링
  const renderGhost = (ghost: Ghost) => {
    // 보간 위치 계산
    const t = ghostMoveProgress;
    const eased = t * (2 - t);

    const px = (ghost.prevGridX + (ghost.gridX - ghost.prevGridX) * eased) * CELL + CELL / 2;
    const py = (ghost.prevGridY + (ghost.gridY - ghost.prevGridY) * eased) * CELL + CELL / 2;

    const radius = CELL / 2 - 2;

    // 색상 결정
    let color: string;
    if (ghost.mode === 'eaten') {
      // 눈만 렌더링
      renderGhostEyes(px, py, ghost.direction);
      return;
    } else if (ghost.mode === 'frightened') {
      // 깜빡임 (종료 2초 전부터)
      if (state.frightenedTimer <= FRIGHTENED_BLINK_TIME) {
        const blink = Math.floor(state.frightenedTimer * 5) % 2 === 0;
        color = blink ? GHOST_COLORS.frightenedBlink : GHOST_COLORS.frightened;
      } else {
        color = GHOST_COLORS.frightened;
      }
    } else {
      color = GHOST_COLORS[ghost.name];
    }

    ctx.fillStyle = color;

    // 유령 몸체 (반원 + 물결 하단)
    ctx.beginPath();
    ctx.arc(px, py - 2, radius, Math.PI, 0); // 상단 반원

    // 하단 물결
    const waveCount = 3;
    const waveWidth = (radius * 2) / waveCount;
    const waveHeight = 4;
    const bottomY = py + radius - 2;

    ctx.lineTo(px + radius, bottomY);

    for (let i = 0; i < waveCount; i++) {
      const x1 = px + radius - (i + 0.5) * waveWidth;
      const x2 = px + radius - (i + 1) * waveWidth;
      ctx.quadraticCurveTo(x1, bottomY + waveHeight, x2, bottomY);
    }

    ctx.lineTo(px - radius, py - 2);
    ctx.closePath();
    ctx.fill();

    // 눈 렌더링
    if (ghost.mode !== 'frightened') {
      renderGhostEyes(px, py - 2, ghost.direction);
    } else {
      // Frightened 모드 눈
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(px - 4, py - 4, 2, 0, Math.PI * 2);
      ctx.arc(px + 4, py - 4, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // 유령 눈 렌더링
  const renderGhostEyes = (px: number, py: number, direction: Direction) => {
    const eyeOffset = { x: 0, y: 0 };
    switch (direction) {
      case 'up': eyeOffset.y = -2; break;
      case 'down': eyeOffset.y = 2; break;
      case 'left': eyeOffset.x = -2; break;
      case 'right': eyeOffset.x = 2; break;
    }

    // 흰자
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(px - 4, py - 2, 4, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(px + 4, py - 2, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 눈동자
    ctx.fillStyle = '#2121DE';
    ctx.beginPath();
    ctx.arc(px - 4 + eyeOffset.x, py - 2 + eyeOffset.y, 2, 0, Math.PI * 2);
    ctx.arc(px + 4 + eyeOffset.x, py - 2 + eyeOffset.y, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  // 유령들 렌더링
  const renderGhosts = () => {
    for (const ghost of state.ghosts) {
      renderGhost(ghost);
    }
  };

  // HUD 렌더링
  const renderHud = () => {
    ctx.save();

    // 점수 (왼쪽 상단)
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${state.score}`, 8, 14);

    // 라이프 (오른쪽 상단)
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${state.lives}`, MAZE_COLS * CELL - 8, 14);

    // 레벨 (중앙 상단)
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${state.level}`, (MAZE_COLS * CELL) / 2, 14);

    ctx.restore();
  };

  // 레벨 클리어 HUD
  const renderLevelClearHud = () => {
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, MAZE_COLS * CELL, MAZE_ROWS * CELL);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEVEL CLEAR!', (MAZE_COLS * CELL) / 2, (MAZE_ROWS * CELL) / 2);

    ctx.restore();
  };

  // 메인 렌더링
  const render = () => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, MAZE_COLS * CELL, MAZE_ROWS * CELL);

    renderMaze();

    if (state.isDying) {
      renderDyingPacman();
    } else {
      renderPacman();
    }

    if (!state.isDying) {
      renderGhosts();
    }

    renderHud();
  };

  // HUD 드로잉
  const drawHud = () => {
    if (!state.isStarted) {
      gameStartHud(canvas, ctx);
      return;
    }

    if (state.isGameOver) {
      gameOverHud.render(state.score);
      return;
    }

    if (state.isPaused) {
      gamePauseHud(canvas, ctx);
      return;
    }

    if (state.isLevelClear) {
      renderLevelClearHud();
      return;
    }
  };

  // 게임 루프
  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    drawHud();

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  window.addEventListener('keydown', onKeyDown);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
  };
};
