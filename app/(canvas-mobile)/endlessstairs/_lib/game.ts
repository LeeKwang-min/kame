import {
  createGameOverHud,
  gameLoadingHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { TPlayer, TStair, TDirection, TAnimationState } from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_OFFSET_Y,
  PLAYER_MOVE_DURATION,
  STAIR_WIDTH,
  STAIR_HEIGHT,
  STAIR_GAP_X,
  STAIR_GAP_Y,
  INITIAL_STAIRS,
  PLAYER_LEFT_IMAGE,
  PLAYER_RIGHT_IMAGE,
  BACKGROUND_IMAGE,
  SCORE_PER_STAIR,
  CAMERA_SMOOTH_SPEED,
  PLAYER_TARGET_Y_RATIO,
  INITIAL_TIME,
  MAX_TIME,
  TIME_BONUS_BASE,
  TIME_DECAY_BASE,
  TIME_DECAY_INCREMENT,
  TIME_BONUS_DECAY,
  MIN_TIME_BONUS,
  PROGRESS_BAR_WIDTH,
  PROGRESS_BAR_MARGIN,
  PROGRESS_BAR_HEIGHT_RATIO,
  WRONG_DIRECTION_PENALTY,
} from './config';

export type TStairsCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupStairs = (
  canvas: HTMLCanvasElement,
  callbacks?: TStairsCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ==================== 이미지 로드 ====================
  const playerLeftImg = new Image();
  const playerRightImg = new Image();
  const backgroundImg = new Image();
  playerLeftImg.src = PLAYER_LEFT_IMAGE;
  playerRightImg.src = PLAYER_RIGHT_IMAGE;
  backgroundImg.src = BACKGROUND_IMAGE;

  let imagesLoaded = 0;
  const onImageLoad = () => {
    imagesLoaded++;
  };
  playerLeftImg.onload = onImageLoad;
  playerRightImg.onload = onImageLoad;
  backgroundImg.onload = onImageLoad;

  // ==================== State ====================
  let player: TPlayer = {
    x: 0,
    y: 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    direction: 'right',
    isMoving: false,
    currentStairIndex: 0,
  };

  let stairs: TStair[] = [];
  let score = 0;
  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;
  let lastTime = 0;

  // 시간(생명) 시스템
  let currentTime = INITIAL_TIME;
  let timeDecayRate = TIME_DECAY_BASE;

  // 카메라 오프셋 (스크롤용)
  let cameraOffsetY = 0;
  let targetCameraOffsetY = 0;

  // 애니메이션 상태
  let animationState: TAnimationState = 'idle';
  let animationFrame = 0;
  let animationTimer = 0;
  const ANIMATION_SPEED = 100;

  // 이동 애니메이션
  let moveStartX = 0;
  let moveEndX = 0;
  let moveStartY = 0;
  let moveEndY = 0;
  let moveProgress = 0;
  let pendingDirection: TDirection | null = null;

  // 게임 오버 HUD
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

  const gameOverHud = createGameOverHud(canvas, ctx, 'stairs', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  // ==================== Stair Functions ====================

  const createStair = (index: number, prevStair?: TStair): TStair => {
    const centerX = CANVAS_WIDTH / 2;

    if (index === 0) {
      return {
        x: centerX - STAIR_WIDTH / 2,
        y: CANVAS_HEIGHT - 100,
        width: STAIR_WIDTH,
        height: STAIR_HEIGHT,
        direction: 'right',
        passed: false,
      };
    }

    let goDirection: TDirection = Math.random() > 0.5 ? 'left' : 'right';

    let newX: number;
    if (goDirection === 'left') {
      newX = prevStair!.x - STAIR_GAP_X;
    } else {
      newX = prevStair!.x + STAIR_GAP_X;
    }

    if (newX < 20) {
      newX = prevStair!.x + STAIR_GAP_X;
      goDirection = 'right';
    } else if (newX + STAIR_WIDTH > CANVAS_WIDTH - 20) {
      newX = prevStair!.x - STAIR_GAP_X;
      goDirection = 'left';
    }

    prevStair!.direction = goDirection;

    return {
      x: newX,
      y: prevStair!.y - STAIR_GAP_Y,
      width: STAIR_WIDTH,
      height: STAIR_HEIGHT,
      direction: 'right',
      passed: false,
    };
  };

  const initStairs = () => {
    stairs = [];
    let prevStair: TStair | undefined;

    for (let i = 0; i < INITIAL_STAIRS; i++) {
      const stair = createStair(i, prevStair);
      stairs.push(stair);
      prevStair = stair;
    }
  };

  const startGame = async () => {
    if (isStarted || isLoading) return;
    isLoading = true;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isLoading = false;
    isStarted = true;
    lastTime = 0;
  };

  const resetGame = () => {
    isStarted = false;
    isGameOver = false;
    isPaused = false;
    score = 0;
    lastTime = 0;
    animationState = 'idle';
    animationFrame = 0;
    moveProgress = 0;
    pendingDirection = null;
    gameOverHud.reset();

    currentTime = INITIAL_TIME;
    timeDecayRate = TIME_DECAY_BASE;

    cameraOffsetY = 0;
    targetCameraOffsetY = 0;

    initStairs();

    const firstStair = stairs[0];
    player = {
      x: firstStair.x + firstStair.width / 2 - PLAYER_WIDTH / 2,
      y: firstStair.y - PLAYER_HEIGHT,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      direction: firstStair.direction,
      isMoving: false,
      currentStairIndex: 0,
    };

    const targetPlayerScreenY = CANVAS_HEIGHT * PLAYER_TARGET_Y_RATIO;
    cameraOffsetY = player.y - targetPlayerScreenY;
    targetCameraOffsetY = cameraOffsetY;
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    resetGame();
  };

  // ==================== Input Handlers ====================

  const movePlayer = (direction: TDirection) => {
    if (!isStarted || isGameOver || isPaused) return;

    if (player.isMoving) {
      pendingDirection = direction;
      return;
    }

    const currentStair = stairs[player.currentStairIndex];
    const nextStairIndex = player.currentStairIndex + 1;

    if (nextStairIndex >= stairs.length) return;

    const nextStair = stairs[nextStairIndex];

    if (direction !== currentStair.direction) {
      currentTime -= WRONG_DIRECTION_PENALTY;
      if (currentTime <= 0) {
        currentTime = 0;
        isGameOver = true;
        animationState = 'falling';
      }
      return;
    }

    player.isMoving = true;
    player.direction = direction;
    animationState = 'walking';

    moveStartX = player.x;
    moveStartY = player.y;
    moveEndX = nextStair.x + nextStair.width / 2 - PLAYER_WIDTH / 2;
    moveEndY = nextStair.y - PLAYER_HEIGHT;
    moveProgress = 0;

    score += SCORE_PER_STAIR;

    const timeBonus = Math.max(
      TIME_BONUS_BASE - score * TIME_BONUS_DECAY,
      MIN_TIME_BONUS,
    );
    currentTime = Math.min(currentTime + timeBonus, MAX_TIME);

    timeDecayRate = TIME_DECAY_BASE + score * TIME_DECAY_INCREMENT;

    currentStair.passed = true;
    player.currentStairIndex = nextStairIndex;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (e.code === 'KeyS') {
      if (isPaused) {
        isPaused = false;
        lastTime = 0;
        return;
      }
      if (!isStarted && !isGameOver) {
        startGame();
        return;
      }
    }

    if (e.code === 'KeyP' && isStarted && !isGameOver) {
      isPaused = true;
      return;
    }

    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, Math.floor(score));
      if (handled) return;
    }

    if (e.code === 'KeyR' && !isGameOver && !isPaused) {
      resetGame();
      return;
    }

    if (isPaused || !isStarted) return;

    if (e.code === 'ArrowLeft') {
      movePlayer('left');
      e.preventDefault();
    }
    if (e.code === 'ArrowRight') {
      movePlayer('right');
      e.preventDefault();
    }
  };

  // ==================== Touch Handlers ====================

  const getTouchPos = (touch: Touch) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
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

    // 게임 오버: 터치로 SAVE/SKIP/재시작 처리
    if (isGameOver) {
      gameOverHud.onTouchStart(pos.x, pos.y, Math.floor(score));
      return;
    }

    // 게임 시작 전: 터치로 시작
    if (!isStarted && !isLoading) {
      startGame();
      return;
    }

    // 일시정지: 터치로 재개
    if (isPaused) {
      isPaused = false;
      lastTime = 0;
      return;
    }

    // 플레이 중: 좌우 터치
    const centerX = CANVAS_WIDTH / 2;
    if (pos.x < centerX) {
      movePlayer('left');
    } else {
      movePlayer('right');
    }
  };

  // ==================== Update Functions ====================

  const updatePlayerMovement = (dt: number) => {
    if (!player.isMoving) return;

    moveProgress += dt / (PLAYER_MOVE_DURATION / 1000);

    if (moveProgress >= 1) {
      moveProgress = 1;
      player.isMoving = false;
      player.x = moveEndX;
      player.y = moveEndY;
      animationState = 'idle';

      const currentStair = stairs[player.currentStairIndex];
      if (currentStair) {
        player.direction = currentStair.direction;
      }

      if (pendingDirection) {
        const dir = pendingDirection;
        pendingDirection = null;
        movePlayer(dir);
      }
    } else {
      const eased = 1 - Math.pow(1 - moveProgress, 3);
      player.x = moveStartX + (moveEndX - moveStartX) * eased;
      player.y = moveStartY + (moveEndY - moveStartY) * eased;
    }
  };

  const updateAnimation = (dt: number) => {
    animationTimer += dt * 1000;

    if (animationTimer >= ANIMATION_SPEED) {
      animationTimer = 0;
      animationFrame = (animationFrame + 1) % 2;
    }
  };

  const updateCamera = (dt: number) => {
    const targetPlayerScreenY = CANVAS_HEIGHT * PLAYER_TARGET_Y_RATIO;
    targetCameraOffsetY = player.y - targetPlayerScreenY;

    cameraOffsetY += (targetCameraOffsetY - cameraOffsetY) * CAMERA_SMOOTH_SPEED * dt;

    if (stairs.length > 0) {
      let highestStair = stairs.reduce((a, b) => (a.y < b.y ? a : b));

      while (highestStair.y - cameraOffsetY > -STAIR_GAP_Y * 2) {
        const lastStair = stairs[stairs.length - 1];
        const newStair = createStair(stairs.length, lastStair);
        stairs.push(newStair);
        highestStair = newStair;
      }
    }

    const removeThreshold = cameraOffsetY + CANVAS_HEIGHT + 100;
    const removedCount = stairs.filter((s) => s.y > removeThreshold).length;
    stairs = stairs.filter((s) => s.y <= removeThreshold);

    if (removedCount > 0) {
      player.currentStairIndex = Math.max(0, player.currentStairIndex - removedCount);
    }
  };

  const updateTime = (dt: number) => {
    currentTime -= timeDecayRate * dt;

    if (currentTime <= 0) {
      currentTime = 0;
      isGameOver = true;
      animationState = 'falling';
    }
  };

  const checkGameOver = (): boolean => {
    return currentTime <= 0;
  };

  const update = (t: number) => {
    if (isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);

    if (isStarted && !isGameOver) {
      updatePlayerMovement(dt);
      updateAnimation(dt);
      updateCamera(dt);
      updateTime(dt);

      if (checkGameOver()) {
        isGameOver = true;
        animationState = 'falling';
      }
    }
  };

  // ==================== Render Functions ====================

  const renderStairs = () => {
    for (const stair of stairs) {
      const screenY = stair.y - cameraOffsetY;

      const gradient = ctx.createLinearGradient(
        stair.x,
        screenY,
        stair.x,
        screenY + stair.height,
      );
      gradient.addColorStop(0, '#E8E8E8');
      gradient.addColorStop(0.3, '#D0D0D0');
      gradient.addColorStop(0.7, '#B8B8B8');
      gradient.addColorStop(1, '#A0A0A0');

      ctx.fillStyle = gradient;
      ctx.fillRect(stair.x, screenY, stair.width, stair.height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(stair.x, screenY, stair.width, 2);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(stair.x, screenY, 2, stair.height);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(stair.x, screenY + stair.height - 2, stair.width, 2);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(stair.x + stair.width - 2, screenY, 2, stair.height);
    }
  };

  const renderPlayer = () => {
    const screenY = player.y - cameraOffsetY;
    const drawY = screenY + PLAYER_OFFSET_Y;

    if (imagesLoaded >= 2) {
      const img = player.direction === 'left' ? playerLeftImg : playerRightImg;

      let offsetY = 0;
      if (animationState === 'walking') {
        offsetY = Math.sin(animationFrame * Math.PI) * 2;
      }

      if (animationState === 'falling') {
        ctx.save();
        ctx.translate(player.x + player.width / 2, drawY + player.height / 2);
        ctx.rotate((Date.now() / 100) % (Math.PI * 2));
        ctx.drawImage(
          img,
          -player.width / 2,
          -player.height / 2,
          player.width,
          player.height,
        );
        ctx.restore();
      } else {
        ctx.drawImage(
          img,
          player.x,
          drawY + offsetY,
          player.width,
          player.height,
        );
      }
    } else {
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(player.x, drawY, player.width, player.height);
    }
  };

  const renderScore = () => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${score}`, CANVAS_WIDTH / 2 + 2, 52);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${score}`, CANVAS_WIDTH / 2, 50);
  };

  const renderProgressBar = () => {
    if (!isStarted || isGameOver) return;

    const barHeight = CANVAS_HEIGHT * PROGRESS_BAR_HEIGHT_RATIO;
    const barX = CANVAS_WIDTH - PROGRESS_BAR_MARGIN - PROGRESS_BAR_WIDTH;
    const barY = (CANVAS_HEIGHT - barHeight) / 2;

    const timeRatio = Math.max(0, Math.min(1, currentTime / MAX_TIME));
    const filledHeight = barHeight * timeRatio;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, PROGRESS_BAR_WIDTH, barHeight, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(barX, barY, PROGRESS_BAR_WIDTH, barHeight, 10);
    ctx.stroke();

    if (timeRatio > 0) {
      let barColor: string;
      if (timeRatio > 0.5) {
        const t = (timeRatio - 0.5) * 2;
        const r = Math.round(255 * (1 - t) + 76 * t);
        const g = Math.round(255 * (1 - t) + 217 * t);
        const b = Math.round(0 * (1 - t) + 100 * t);
        barColor = `rgb(${r}, ${g}, ${b})`;
      } else {
        const t = timeRatio * 2;
        const r = Math.round(239 * (1 - t) + 255 * t);
        const g = Math.round(68 * (1 - t) + 255 * t);
        const b = Math.round(0 * (1 - t) + 0 * t);
        barColor = `rgb(${r}, ${g}, ${b})`;
      }

      const gradient = ctx.createLinearGradient(
        barX,
        barY + barHeight - filledHeight,
        barX + PROGRESS_BAR_WIDTH,
        barY + barHeight - filledHeight,
      );
      gradient.addColorStop(0, barColor);
      gradient.addColorStop(0.5, barColor);
      gradient.addColorStop(1, barColor);

      ctx.fillStyle = gradient;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(barX, barY, PROGRESS_BAR_WIDTH, barHeight, 10);
      ctx.clip();

      ctx.fillRect(
        barX,
        barY + barHeight - filledHeight,
        PROGRESS_BAR_WIDTH,
        filledHeight,
      );

      if (timeRatio < 0.3) {
        const pulseAlpha = 0.3 + Math.sin(Date.now() / 100) * 0.2;
        ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha})`;
        ctx.fillRect(
          barX,
          barY + barHeight - filledHeight,
          PROGRESS_BAR_WIDTH,
          filledHeight,
        );
      }

      ctx.restore();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.roundRect(barX + 3, barY + barHeight - filledHeight + 2, 4, Math.min(20, filledHeight - 4), 2);
      ctx.fill();
    }
  };

  const renderBackground = () => {
    if (imagesLoaded >= 3 && backgroundImg.complete) {
      ctx.drawImage(backgroundImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, '#2C3E50');
      gradient.addColorStop(1, '#1A252F');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  };

  const render = () => {
    renderBackground();
    renderStairs();
    renderPlayer();
    renderScore();
    renderProgressBar();
  };

  const drawHud = () => {
    if (!isStarted && !isGameOver) {
      if (isLoading) {
        gameLoadingHud(canvas, ctx);
      } else {
        gameStartHud(canvas, ctx);
      }
      return;
    }

    if (isGameOver) {
      gameOverHud.render(Math.floor(score));
      return;
    }

    if (isPaused) {
      gamePauseHud(canvas, ctx);
      return;
    }
  };

  // ==================== Game Loop ====================

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

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  };
};
