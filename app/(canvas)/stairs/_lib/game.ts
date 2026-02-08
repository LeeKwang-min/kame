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
  const ANIMATION_SPEED = 100; // ms per frame

  // 이동 애니메이션
  let moveStartX = 0;
  let moveEndX = 0;
  let moveStartY = 0;
  let moveEndY = 0;
  let moveProgress = 0;

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
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;

    // 첫 번째 계단은 중앙에
    if (index === 0) {
      // 첫 번째 계단의 direction은 나중에 두 번째 계단 생성 시 설정됨
      return {
        x: centerX - STAIR_WIDTH / 2,
        y: rect.height - 100,
        width: STAIR_WIDTH,
        height: STAIR_HEIGHT,
        direction: 'right', // 임시값, 아래에서 업데이트됨
        passed: false,
      };
    }

    // 다음 계단이 갈 방향을 랜덤으로 결정
    let goDirection: TDirection = Math.random() > 0.5 ? 'left' : 'right';

    let newX: number;
    if (goDirection === 'left') {
      newX = prevStair!.x - STAIR_GAP_X;
    } else {
      newX = prevStair!.x + STAIR_GAP_X;
    }

    // 경계 체크 - 화면 밖으로 나가면 반대 방향으로
    if (newX < 20) {
      newX = prevStair!.x + STAIR_GAP_X;
      goDirection = 'right';
    } else if (newX + STAIR_WIDTH > rect.width - 20) {
      newX = prevStair!.x - STAIR_GAP_X;
      goDirection = 'left';
    }

    // 이전 계단의 direction을 실제 이동 방향으로 설정
    prevStair!.direction = goDirection;

    return {
      x: newX,
      y: prevStair!.y - STAIR_GAP_Y,
      width: STAIR_WIDTH,
      height: STAIR_HEIGHT,
      direction: 'right', // 임시값, 다음 계단 생성 시 업데이트됨
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
    const rect = canvas.getBoundingClientRect();

    isStarted = false;
    isGameOver = false;
    isPaused = false;
    score = 0;
    lastTime = 0;
    animationState = 'idle';
    animationFrame = 0;
    moveProgress = 0;
    gameOverHud.reset();

    // 시간 시스템 초기화
    currentTime = INITIAL_TIME;
    timeDecayRate = TIME_DECAY_BASE;

    // 카메라 초기화
    cameraOffsetY = 0;
    targetCameraOffsetY = 0;

    initStairs();

    // 플레이어 초기 위치 (첫 번째 계단 위)
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

    // 초기 카메라 위치 설정
    const targetPlayerScreenY = rect.height * PLAYER_TARGET_Y_RATIO;
    cameraOffsetY = player.y - targetPlayerScreenY;
    targetCameraOffsetY = cameraOffsetY;
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

  const movePlayer = (direction: TDirection) => {
    if (!isStarted || isGameOver || isPaused || player.isMoving) return;

    const currentStair = stairs[player.currentStairIndex];
    const nextStairIndex = player.currentStairIndex + 1;

    if (nextStairIndex >= stairs.length) return;

    const nextStair = stairs[nextStairIndex];

    // 올바른 방향인지 체크
    if (direction !== currentStair.direction) {
      // 잘못된 방향 - 시간 페널티
      currentTime -= WRONG_DIRECTION_PENALTY;

      // 시간이 0 이하가 되면 게임 오버
      if (currentTime <= 0) {
        currentTime = 0;
        isGameOver = true;
        animationState = 'falling';
      }
      return;
    }

    // 이동 시작
    player.isMoving = true;
    player.direction = direction;
    animationState = 'walking';

    moveStartX = player.x;
    moveStartY = player.y;
    moveEndX = nextStair.x + nextStair.width / 2 - PLAYER_WIDTH / 2;
    moveEndY = nextStair.y - PLAYER_HEIGHT;
    moveProgress = 0;

    // 점수 증가
    score += SCORE_PER_STAIR;

    // 시간 보너스 (점수가 높아질수록 보너스 감소)
    const timeBonus = Math.max(
      TIME_BONUS_BASE - score * TIME_BONUS_DECAY,
      MIN_TIME_BONUS,
    );
    currentTime = Math.min(currentTime + timeBonus, MAX_TIME);

    // 시간 감소 속도 증가 (후반으로 갈수록 더 빨리 감소)
    timeDecayRate = TIME_DECAY_BASE + score * TIME_DECAY_INCREMENT;

    // 현재 계단 통과 표시
    currentStair.passed = true;
    player.currentStairIndex = nextStairIndex;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // 키 반복 입력 방지
    if (e.repeat) return;

    // 게임 시작
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

    // 게임 오버 시 HUD 처리
    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, Math.floor(score));
      if (handled) return;
    }

    // 재시작
    if (e.code === 'KeyR' && !isGameOver && !isPaused) {
      resetGame();
      return;
    }

    if (isPaused || !isStarted) return;

    // 좌우 이동
    if (e.code === 'ArrowLeft') {
      movePlayer('left');
      e.preventDefault();
    }
    if (e.code === 'ArrowRight') {
      movePlayer('right');
      e.preventDefault();
    }
  };

  // 터치/클릭 지원
  const onCanvasClick = (e: MouseEvent | TouchEvent) => {
    if (!isStarted || isGameOver || isPaused) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number;

    if (e instanceof TouchEvent) {
      clientX = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0;
    } else {
      clientX = e.clientX;
    }

    const x = clientX - rect.left;
    const centerX = rect.width / 2;

    if (x < centerX) {
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

      // 다음 계단 방향 설정
      const currentStair = stairs[player.currentStairIndex];
      if (currentStair) {
        player.direction = currentStair.direction;
      }
    } else {
      // 부드러운 이동 (ease-out)
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
    const rect = canvas.getBoundingClientRect();
    const targetPlayerScreenY = rect.height * PLAYER_TARGET_Y_RATIO;

    // 플레이어의 실제 Y 위치를 기준으로 타겟 카메라 오프셋 계산
    // 플레이어가 targetPlayerScreenY에 위치하도록 카메라 조정
    targetCameraOffsetY = player.y - targetPlayerScreenY;

    // 부드러운 카메라 이동
    cameraOffsetY += (targetCameraOffsetY - cameraOffsetY) * CAMERA_SMOOTH_SPEED * dt;

    // 새 계단 생성 (카메라 위쪽에 항상 계단이 있도록)
    if (stairs.length > 0) {
      let highestStair = stairs.reduce((a, b) => (a.y < b.y ? a : b));

      // 카메라 뷰 위쪽으로 계단 생성
      while (highestStair.y - cameraOffsetY > -STAIR_GAP_Y * 2) {
        const lastStair = stairs[stairs.length - 1];
        const newStair = createStair(stairs.length, lastStair);
        stairs.push(newStair);
        highestStair = newStair;
      }
    }

    // 화면 밖 계단 제거 (카메라 아래로 멀리 벗어난 것들)
    const removeThreshold = cameraOffsetY + rect.height + 100;
    const removedCount = stairs.filter((s) => s.y > removeThreshold).length;
    stairs = stairs.filter((s) => s.y <= removeThreshold);

    // 제거된 계단 수만큼 인덱스 감소
    if (removedCount > 0) {
      player.currentStairIndex = Math.max(0, player.currentStairIndex - removedCount);
    }
  };

  const updateTime = (dt: number) => {
    // 시간 감소
    currentTime -= timeDecayRate * dt;

    // 시간이 0 이하가 되면 게임 오버
    if (currentTime <= 0) {
      currentTime = 0;
      isGameOver = true;
      animationState = 'falling';
    }
  };

  const checkGameOver = (): boolean => {
    // 시간이 0이 되면 게임 오버 (updateTime에서 처리)
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
      // 카메라 오프셋 적용
      const screenY = stair.y - cameraOffsetY;

      // 대리석 느낌의 그라데이션
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

      // 메인 발판
      ctx.fillStyle = gradient;
      ctx.fillRect(stair.x, screenY, stair.width, stair.height);

      // 상단 하이라이트 (빛 반사)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(stair.x, screenY, stair.width, 2);

      // 좌측 하이라이트
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(stair.x, screenY, 2, stair.height);

      // 하단 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(stair.x, screenY + stair.height - 2, stair.width, 2);

      // 우측 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(stair.x + stair.width - 2, screenY, 2, stair.height);
    }
  };

  const renderPlayer = () => {
    // 카메라 오프셋 적용
    const screenY = player.y - cameraOffsetY;
    const drawY = screenY + PLAYER_OFFSET_Y; // 캐릭터를 아래로 오프셋

    if (imagesLoaded >= 2) {
      // 방향에 따라 이미지 선택
      const img = player.direction === 'left' ? playerLeftImg : playerRightImg;

      // 이동 중 흔들림 애니메이션
      let offsetY = 0;
      if (animationState === 'walking') {
        offsetY = Math.sin(animationFrame * Math.PI) * 2;
      }

      // 떨어질 때 회전 효과
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
      // 폴백: 단순 사각형
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(player.x, drawY, player.width, player.height);
    }
  };

  const renderScore = () => {
    const rect = canvas.getBoundingClientRect();

    // 그림자 효과
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${score}`, rect.width / 2 + 2, 52);

    // 메인 텍스트
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${score}`, rect.width / 2, 50);
  };

  const renderProgressBar = () => {
    if (!isStarted || isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    const barHeight = rect.height * PROGRESS_BAR_HEIGHT_RATIO;
    const barX = rect.width - PROGRESS_BAR_MARGIN - PROGRESS_BAR_WIDTH;
    const barY = (rect.height - barHeight) / 2;

    // 시간 비율 계산
    const timeRatio = Math.max(0, Math.min(1, currentTime / MAX_TIME));
    const filledHeight = barHeight * timeRatio;

    // 배경 (빈 바)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, PROGRESS_BAR_WIDTH, barHeight, 10);
    ctx.fill();

    // 테두리
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(barX, barY, PROGRESS_BAR_WIDTH, barHeight, 10);
    ctx.stroke();

    // 채워진 부분 (아래에서 위로)
    if (timeRatio > 0) {
      // 시간에 따른 색상 변화 (초록 -> 노랑 -> 빨강)
      let barColor: string;
      if (timeRatio > 0.5) {
        // 초록 -> 노랑
        const t = (timeRatio - 0.5) * 2;
        const r = Math.round(255 * (1 - t) + 76 * t);
        const g = Math.round(255 * (1 - t) + 217 * t);
        const b = Math.round(0 * (1 - t) + 100 * t);
        barColor = `rgb(${r}, ${g}, ${b})`;
      } else {
        // 노랑 -> 빨강
        const t = timeRatio * 2;
        const r = Math.round(239 * (1 - t) + 255 * t);
        const g = Math.round(68 * (1 - t) + 255 * t);
        const b = Math.round(68 * (1 - t) + 0 * t);
        barColor = `rgb(${r}, ${g}, ${b})`;
      }

      // 그라데이션 효과
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

      // 채워진 영역 클리핑
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(barX, barY, PROGRESS_BAR_WIDTH, barHeight, 10);
      ctx.clip();

      // 채워진 부분 그리기
      ctx.fillRect(
        barX,
        barY + barHeight - filledHeight,
        PROGRESS_BAR_WIDTH,
        filledHeight,
      );

      // 빛나는 효과 (위험할 때)
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

      // 상단 하이라이트
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.roundRect(barX + 3, barY + barHeight - filledHeight + 2, 4, Math.min(20, filledHeight - 4), 2);
      ctx.fill();
    }
  };

  const renderBackground = () => {
    const rect = canvas.getBoundingClientRect();

    if (imagesLoaded >= 3 && backgroundImg.complete) {
      // 배경 이미지 그리기 (캔버스 크기에 맞춤)
      ctx.drawImage(backgroundImg, 0, 0, rect.width, rect.height);
    } else {
      // 폴백: 그라데이션
      const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      gradient.addColorStop(0, '#2C3E50');
      gradient.addColorStop(1, '#1A252F');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);
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
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('touchstart', onCanvasClick);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('click', onCanvasClick);
    canvas.removeEventListener('touchstart', onCanvasClick);
  };
};
