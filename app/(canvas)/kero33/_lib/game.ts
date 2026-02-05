import { COLORS, GAME_CONFIG, PLAYER_FRAMES, SPRITE_CONFIG } from './config';
import { getAvailablePatterns, Pattern, WavePattern } from './patterns';
import { GameState, MapState, PlayerFacing, WaveDirection } from './types';
import {
  calculateLevel,
  calculateTickInterval,
  createInitialMap,
  createInitialState,
  createInitialWaveState,
  createShuffledIndices,
  dashPlayer,
  getWaveSafeCells,
  getWaveStepCells,
  isInSafeCells,
  lerpPoint,
  movePlayer,
  PLAYER_DIR,
  PLAYER_DIR_CODES,
} from './utils';
import {
  createGameOverHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';

export type TKero33Callbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
};

// 이미지 로드 헬퍼
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// 이미지 캐시 타입
type GameImages = {
  player: HTMLImageElement | null;
  tileSafe: HTMLImageElement | null;
  tileWarn: HTMLImageElement | null;
  tileDanger: HTMLImageElement | null;
};

export const setupKero33 = (
  canvas: HTMLCanvasElement,
  callbacks?: TKero33Callbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let state: GameState = createInitialState();
  let lastTickTime = 0;
  let currentPattern: Pattern | null = null;
  let imagesLoaded = false;
  let currentDirection: keyof typeof PLAYER_DIR | null = null; // 현재 누르고 있는 방향키
  let isPaused = false;

  // 이미지 캐시
  const images: GameImages = {
    player: null,
    tileSafe: null,
    tileWarn: null,
    tileDanger: null,
  };

  // 게임 오버 HUD
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      if (callbacks?.onScoreSave) {
        return callbacks.onScoreSave(finalScore);
      }
      return { saved: false };
    },
    onRestart: () => {
      startGame();
    },
  };

  const gameOverHud = createGameOverHud(canvas, ctx, 'kero33', gameOverCallbacks);

  // 베이스 경로 (Next.js public 폴더 기준)
  const basePath = '/kero33';

  // 이미지 로드
  const loadAllImages = async () => {
    try {
      const [player, tileSafe, tileWarn, tileDanger] = await Promise.all([
        loadImage(`${basePath}${SPRITE_CONFIG.PLAYER.PATH}`),
        loadImage(`${basePath}${SPRITE_CONFIG.TILES.SAFE}`),
        loadImage(`${basePath}${SPRITE_CONFIG.TILES.WARN}`),
        loadImage(`${basePath}${SPRITE_CONFIG.TILES.DANGER}`),
      ]);
      images.player = player;
      images.tileSafe = tileSafe;
      images.tileWarn = tileWarn;
      images.tileDanger = tileDanger;
      imagesLoaded = true;
    } catch (e) {
      console.error('Failed to load images:', e);
    }
  };

  loadAllImages();

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const startGame = async () => {
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    state = createInitialState();
    state.phase = 'playing';
    currentPattern = null;
    lastTickTime = performance.now();
    isPaused = false;
    gameOverHud.reset();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // 게임 시작 / 일시정지 해제
    if (e.code === 'KeyS') {
      if (isPaused) {
        isPaused = false;
        lastTickTime = performance.now();
        return;
      }
      if (state.phase === 'ready') {
        startGame();
        e.preventDefault();
        return;
      }
    }

    // 일시정지
    if (e.code === 'KeyP' && state.phase === 'playing' && !isPaused) {
      isPaused = true;
      return;
    }

    // 게임 오버 시 HUD 처리
    if (state.phase === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, state.score);
      if (handled) return;
    }

    if (state.phase !== 'playing' || isPaused) return;

    // 방향키 입력 처리
    if (PLAYER_DIR_CODES.includes(e.code as keyof typeof PLAYER_DIR)) {
      currentDirection = e.code as keyof typeof PLAYER_DIR;
      const dir = PLAYER_DIR[currentDirection];
      const oldPos = { ...state.playerPos };
      state.playerPos = movePlayer(state.playerPos, dir);

      // 실제로 이동했을 때만 방향/애니메이션 업데이트
      if (oldPos.x !== state.playerPos.x || oldPos.y !== state.playerPos.y) {
        const now = performance.now();

        // 좌우 방향 설정
        if (dir.x < 0) {
          state.playerFacing = 'left';
        } else if (dir.x > 0) {
          state.playerFacing = 'right';
        }
        // 상하 이동 시 마지막 방향 유지 (idle이면 idle 유지)

        // 애니메이션 프레임 토글
        state.playerAnimFrame = state.playerAnimFrame === 0 ? 1 : 0;
        state.playerLastMoveTime = now;
      }

      checkCollision(performance.now());
      e.preventDefault();
    }

    // Space: 대시 (현재 방향키 방향으로 끝까지 이동)
    if (e.code === 'Space' && currentDirection) {
      const dir = PLAYER_DIR[currentDirection];
      const oldPos = { ...state.playerPos };
      state.playerPos = dashPlayer(state.playerPos, dir);

      // 대시 이동 시 방향/애니메이션 업데이트
      if (oldPos.x !== state.playerPos.x || oldPos.y !== state.playerPos.y) {
        const now = performance.now();

        if (dir.x < 0) {
          state.playerFacing = 'left';
        } else if (dir.x > 0) {
          state.playerFacing = 'right';
        }

        state.playerAnimFrame = state.playerAnimFrame === 0 ? 1 : 0;
        state.playerLastMoveTime = now;
      }

      checkCollision(performance.now());
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    // 방향키를 떼면 현재 방향 초기화
    if (e.code === currentDirection) {
      currentDirection = null;
    }
  };

  const spawnPattern = () => {
    const availablePatterns = getAvailablePatterns(state.level);

    // 큐가 비었거나 패턴 수가 변경되면 새로 셔플
    if (
      state.patternQueue.length === 0 ||
      state.patternQueue.length !== availablePatterns.length ||
      state.patternQueueIndex >= state.patternQueue.length
    ) {
      state.patternQueue = createShuffledIndices(availablePatterns.length);
      state.patternQueueIndex = 0;
    }

    // 큐에서 순차적으로 패턴 선택
    const patternIndex = state.patternQueue[state.patternQueueIndex];
    state.patternQueueIndex += 1;
    currentPattern = availablePatterns[patternIndex];
    state.currentPatternName = currentPattern.name;

    if (currentPattern.type === 'wave') {
      const wavePattern = currentPattern as WavePattern;
      const safeCells = getWaveSafeCells(wavePattern.cells, wavePattern.direction);

      // 안전 영역을 제외한 실제 위험 스텝 수 계산
      const dangerSteps = GAME_CONFIG.MAP_SIZE - 1; // 안전 영역 1줄 제외

      state.wave = {
        active: true,
        direction: wavePattern.direction,
        currentStep: -1,
        totalSteps: dangerSteps,
        safeCells,
      };

      // 경고 표시 (안전 지대 제외)
      wavePattern.cells.forEach(({ x, y }) => {
        if (!isInSafeCells({ x, y }, safeCells)) {
          state.map[y][x] = 'warn';
        }
      });
    } else {
      // Mine 패턴
      currentPattern.cells.forEach(({ x, y }) => {
        state.map[y][x] = 'warn';
      });
    }
  };

  const updateWave = (): boolean => {
    if (!state.wave.active || !currentPattern || currentPattern.type !== 'wave') {
      return false;
    }

    const wavePattern = currentPattern as WavePattern;
    state.wave.currentStep += 1;

    // 이전 스텝 셀을 safe로
    if (state.wave.currentStep > 0) {
      const prevCells = getWaveStepCells(
        wavePattern.cells,
        state.wave.direction,
        state.wave.currentStep - 1,
      );
      prevCells.forEach(({ x, y }) => {
        if (!isInSafeCells({ x, y }, state.wave.safeCells)) {
          state.map[y][x] = 'safe';
        }
      });
    }

    // 현재 스텝이 범위 내면 danger 적용
    if (state.wave.currentStep >= 0 && state.wave.currentStep < state.wave.totalSteps) {
      const currentCells = getWaveStepCells(
        wavePattern.cells,
        state.wave.direction,
        state.wave.currentStep,
      );
      currentCells.forEach(({ x, y }) => {
        if (!isInSafeCells({ x, y }, state.wave.safeCells)) {
          state.map[y][x] = 'danger';
        }
      });
      return true;
    } else if (state.wave.currentStep < 0) {
      return true; // 아직 경고 단계
    } else {
      // wave 종료
      state.wave = createInitialWaveState();
      state.map = createInitialMap();
      currentPattern = null;
      return false;
    }
  };

  const updateMap = () => {
    // Wave 패턴 처리
    if (state.wave.active) {
      const waveActive = updateWave();
      if (!waveActive) {
        spawnPattern();
      }
      return;
    }

    // Mine 패턴 처리
    const newMap = createInitialMap();
    let hasWarn = false;

    for (let y = 0; y < GAME_CONFIG.MAP_SIZE; y++) {
      for (let x = 0; x < GAME_CONFIG.MAP_SIZE; x++) {
        const current = state.map[y][x];

        if (current === 'warn') {
          newMap[y][x] = 'danger';
          hasWarn = true;
        } else if (current === 'danger') {
          newMap[y][x] = 'safe';
        }
      }
    }

    state.map = newMap;

    if (!hasWarn) {
      currentPattern = null;
      spawnPattern();
    }
  };

  const isInvincible = (time: number) => time < state.invincibleUntil;

  const checkCollision = (time: number) => {
    if (isInvincible(time)) return;

    const { x, y } = state.playerPos;
    const cellState = state.map[y][x];

    if (cellState === 'danger') {
      state.lives -= 1;
      state.invincibleUntil = time + GAME_CONFIG.INVINCIBLE_DURATION;

      if (state.lives <= 0) {
        state.phase = 'gameover';
      }
    }
  };

  const gameTick = (time: number) => {
    if (state.phase !== 'playing') return;

    state.tick += 1;
    state.score += 1;

    const newLevel = calculateLevel(state.score);
    if (newLevel > state.level) {
      state.level = newLevel;
    }

    updateMap();
    checkCollision(time);
  };

  const drawWaveArrow = (
    cx: number,
    cy: number,
    cellSize: number,
    direction: WaveDirection,
    time: number,
  ) => {
    const arrowSize = cellSize * 0.3;
    const pulse = Math.sin(time * 0.008) * 0.3 + 0.7;
    const offset = Math.sin(time * 0.01) * 5;

    ctx.save();
    ctx.fillStyle = `rgba(220, 38, 38, ${pulse})`;
    ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.lineWidth = 2;

    ctx.translate(cx, cy);

    const rotations: Record<WaveDirection, number> = {
      right: 0,
      down: Math.PI / 2,
      left: Math.PI,
      up: -Math.PI / 2,
    };
    ctx.rotate(rotations[direction]);
    ctx.translate(offset, 0);

    ctx.beginPath();
    ctx.moveTo(arrowSize, 0);
    ctx.lineTo(-arrowSize * 0.5, -arrowSize * 0.6);
    ctx.lineTo(-arrowSize * 0.5, arrowSize * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  const drawGrid = (time: number) => {
    const rect = canvas.getBoundingClientRect();
    const cellSize = rect.width / GAME_CONFIG.MAP_SIZE;

    for (let y = 0; y < GAME_CONFIG.MAP_SIZE; y++) {
      for (let x = 0; x < GAME_CONFIG.MAP_SIZE; x++) {
        const cellState: MapState = state.map[y][x];
        const cx = x * cellSize + cellSize / 2;
        const cy = y * cellSize + cellSize / 2;
        const cellX = x * cellSize;
        const cellY = y * cellSize;

        ctx.save();

        // 이미지 기반 타일 렌더링
        if (imagesLoaded) {
          // 기본 safe 타일 먼저 그리기
          if (images.tileSafe) {
            ctx.drawImage(images.tileSafe, cellX, cellY, cellSize, cellSize);
          }

          if (cellState === 'warn' && images.tileWarn) {
            // warn 타일을 펄스 효과와 함께 오버레이
            const pulse = Math.sin(time * 0.01) * 0.3 + 0.7;
            ctx.globalAlpha = pulse;
            ctx.drawImage(images.tileWarn, cellX, cellY, cellSize, cellSize);
            ctx.globalAlpha = 1;

            // Wave 경고 시 화살표
            if (state.wave.active && state.wave.currentStep < 0) {
              drawWaveArrow(cx, cy, cellSize, state.wave.direction, time);
            }
          } else if (cellState === 'safe' && state.wave.active && state.wave.currentStep < 0) {
            // Wave 안전 지대 표시
            if (isInSafeCells({ x, y }, state.wave.safeCells)) {
              const pulse = Math.sin(time * 0.008) * 0.3 + 0.7;
              ctx.strokeStyle = `rgba(34, 197, 94, ${pulse})`;
              ctx.lineWidth = 4;
              ctx.strokeRect(cellX + 4, cellY + 4, cellSize - 8, cellSize - 8);

              // 체크 마크
              ctx.strokeStyle = `rgba(22, 163, 74, ${pulse})`;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(cx - cellSize * 0.15, cy);
              ctx.lineTo(cx - cellSize * 0.05, cy + cellSize * 0.1);
              ctx.lineTo(cx + cellSize * 0.15, cy - cellSize * 0.1);
              ctx.stroke();
            }
          } else if (cellState === 'danger' && images.tileDanger) {
            ctx.drawImage(images.tileDanger, cellX, cellY, cellSize, cellSize);

            // 추가 폭발 이펙트
            const elapsed = (time - lastTickTime) / calculateTickInterval(state.level);
            const progress = Math.min(elapsed, 1);

            const waveRadius = cellSize * 0.3 + cellSize * 0.4 * progress;
            const waveAlpha = (1 - progress) * 0.5;
            ctx.strokeStyle = `rgba(255, 200, 100, ${waveAlpha})`;
            ctx.lineWidth = 3 * (1 - progress) + 1;
            ctx.beginPath();
            ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          // 이미지 로드 전 폴백 (기존 색상 렌더링)
          ctx.fillStyle = COLORS.safe;
          ctx.strokeStyle = COLORS.grid;
          ctx.lineWidth = 2;
          ctx.fillRect(cellX, cellY, cellSize, cellSize);
          ctx.strokeRect(cellX, cellY, cellSize, cellSize);

          if (cellState === 'warn') {
            const pulse = Math.sin(time * 0.01) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(251, 191, 36, ${0.5 + pulse * 0.5})`;
            ctx.fillRect(cellX, cellY, cellSize, cellSize);
          } else if (cellState === 'danger') {
            ctx.fillStyle = COLORS.danger;
            ctx.fillRect(cellX, cellY, cellSize, cellSize);
          }
        }

        ctx.restore();
      }
    }
  };

  const updateRenderPos = () => {
    state.renderPos = lerpPoint(state.renderPos, state.playerPos, 0.2);
  };

  // 플레이어 스프라이트 프레임 인덱스 계산
  const getPlayerFrameIndex = (facing: PlayerFacing, animFrame: number): number => {
    switch (facing) {
      case 'left':
        return animFrame === 0 ? PLAYER_FRAMES.WALK_LEFT_1 : PLAYER_FRAMES.WALK_LEFT_2;
      case 'right':
        return animFrame === 0 ? PLAYER_FRAMES.WALK_RIGHT_1 : PLAYER_FRAMES.WALK_RIGHT_2;
      case 'idle':
      default:
        return PLAYER_FRAMES.IDLE;
    }
  };

  const drawPlayer = (time: number) => {
    const rect = canvas.getBoundingClientRect();
    const cellSize = rect.width / GAME_CONFIG.MAP_SIZE;
    const { x, y } = state.renderPos;

    const invincible = isInvincible(time);
    if (invincible && Math.floor(time / 100) % 2 === 0) {
      return;
    }

    ctx.save();

    // 무적 시 반투명
    if (invincible) {
      ctx.globalAlpha = 0.6;
    }

    // 이동 후 일정 시간 지나면 idle로 전환
    const timeSinceMove = time - state.playerLastMoveTime;
    if (timeSinceMove > 300 && state.playerFacing !== 'idle') {
      state.playerFacing = 'idle';
    }

    const playerCenterX = x * cellSize + cellSize / 2;
    const playerCenterY = y * cellSize + cellSize / 2;

    if (imagesLoaded && images.player) {
      const frameIndex = getPlayerFrameIndex(state.playerFacing, state.playerAnimFrame);
      const { FRAME_WIDTH, FRAME_HEIGHT } = SPRITE_CONFIG.PLAYER;

      // 플레이어 크기 (셀의 80%)
      const playerSize = cellSize * 0.8;
      const aspectRatio = FRAME_WIDTH / FRAME_HEIGHT;
      const drawWidth = playerSize * aspectRatio;
      const drawHeight = playerSize;

      ctx.drawImage(
        images.player,
        frameIndex * FRAME_WIDTH, // source x
        0, // source y
        FRAME_WIDTH, // source width
        FRAME_HEIGHT, // source height
        playerCenterX - drawWidth / 2, // dest x
        playerCenterY - drawHeight / 2, // dest y
        drawWidth, // dest width
        drawHeight, // dest height
      );
    } else {
      // 폴백: 원형 플레이어
      ctx.fillStyle = invincible ? '#6b7280' : COLORS.player;
      ctx.beginPath();
      ctx.arc(playerCenterX, playerCenterY, cellSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  const drawUI = () => {
    const rect = canvas.getBoundingClientRect();

    ctx.save();
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 18px sans-serif';

    ctx.textAlign = 'left';
    ctx.fillText(`❤️ ${state.lives}`, 10, 28);

    ctx.textAlign = 'center';
    ctx.fillText(`Lv.${state.level}`, rect.width / 2, 28);

    ctx.textAlign = 'right';
    ctx.fillText(`${state.score}`, rect.width - 10, 28);

    ctx.restore();
  };

  const drawOverlay = (text: string, subtext: string) => {
    const rect = canvas.getBoundingClientRect();

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, rect.width / 2, rect.height / 2 - 20);

    ctx.font = '18px sans-serif';
    ctx.fillText(subtext, rect.width / 2, rect.height / 2 + 20);
    ctx.restore();
  };

  resize();

  let raf = 0;
  const draw = (time: number) => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (state.phase === 'playing' && !isPaused) {
      const tickInterval = calculateTickInterval(state.level);
      if (time - lastTickTime >= tickInterval) {
        gameTick(time);
        lastTickTime = time;
      }
    }

    updateRenderPos();
    drawGrid(time);
    drawPlayer(time);
    drawUI();

    if (state.phase === 'ready') {
      drawOverlay('KERO33', 'Press S to start');
    } else if (state.phase === 'gameover') {
      gameOverHud.render(state.score);
    } else if (isPaused) {
      gamePauseHud(canvas, ctx);
    }

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
};
