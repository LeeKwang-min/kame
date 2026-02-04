import {
  createGameOverHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
} from '@/lib/game';
import { TPlayer, TPlatform, TPlatformType } from './types';
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  JUMP_FORCE,
  SPRING_JUMP_FORCE,
  GRAVITY,
  PLATFORM_WIDTH,
  PLATFORM_HEIGHT,
  PLATFORM_GAP_MIN,
  PLATFORM_GAP_MAX,
  PLATFORM_CHANCES,
  MOVING_PLATFORM_SPEED,
  SCROLL_THRESHOLD,
  INITIAL_PLATFORMS,
} from './config';

export type TDoodleCallbacks = {
  onScoreSave: (initials: string, score: number) => Promise<void>;
};

export const setupDoodle = (
  canvas: HTMLCanvasElement,
  callbacks?: TDoodleCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ==================== State ====================

  // 키 입력
  const keys = {
    ArrowLeft: false,
    ArrowRight: false,
  };

  // 플레이어
  let player: TPlayer = {
    x: 0,
    y: 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
  };

  // 플랫폼 배열
  let platforms: TPlatform[] = [];

  // 게임 상태
  let score = 0;
  let highestY = 0; // 도달한 최고 높이 (점수 계산용)
  let isStarted = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  const sec = 0; // 총 경과 시간

  // 게임 오버 HUD
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

  const gameOverHud = createGameOverHud(canvas, ctx, 'doodle', gameOverCallbacks);

  // ==================== Game State ====================

  // ==================== Platform Functions ====================

  // 랜덤 플랫폼 타입 선택
  const getRandomPlatformType = (): TPlatformType => {
    const rand = Math.random();
    let cumulative = 0;

    // 점수가 낮을 때는 normal만
    if (score < 500) return 'normal';

    cumulative += PLATFORM_CHANCES.normal;
    if (rand < cumulative) return 'normal';

    cumulative += PLATFORM_CHANCES.moving;
    if (rand < cumulative) return 'moving';

    cumulative += PLATFORM_CHANCES.breaking;
    if (rand < cumulative) return 'breaking';

    return 'spring';
  };

  // 플랫폼 생성
  const createPlatform = (y: number): TPlatform => {
    const rect = canvas.getBoundingClientRect();
    const type = getRandomPlatformType();

    const x = Math.random() * (rect.width - PLATFORM_WIDTH);

    const platform: TPlatform = {
      x,
      y,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      type,
    };

    // moving 타입이면 이동 범위 설정
    if (type === 'moving') {
      platform.vx = MOVING_PLATFORM_SPEED * (Math.random() > 0.5 ? 1 : -1);
      platform.minX = 0;
      platform.maxX = rect.width - PLATFORM_WIDTH;
    }

    // breaking 타입 초기화
    if (type === 'breaking') {
      platform.isBroken = false;
    }

    return platform;
  };

  // 초기 플랫폼 생성
  const initPlatforms = () => {
    const rect = canvas.getBoundingClientRect();
    platforms = [];

    // 바닥 플랫폼 (항상 normal)
    platforms.push({
      x: rect.width / 2 - PLATFORM_WIDTH / 2,
      y: rect.height - 50,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      type: 'normal',
    });

    // 나머지 플랫폼
    let lastY = rect.height - 50;
    for (let i = 1; i < INITIAL_PLATFORMS; i++) {
      const gap =
        PLATFORM_GAP_MIN +
        Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN);
      lastY -= gap;
      platforms.push(createPlatform(lastY));
    }
  };

  const startGame = () => {
    if (isStarted) return;
    isStarted = true;
    lastTime = 0;

    // 첫 점프!
    player.vy = JUMP_FORCE;
  };

  const resetGame = () => {
    const rect = canvas.getBoundingClientRect();

    isStarted = false;
    isGameOver = false;
    isPaused = false;
    score = 0;
    highestY = rect.height;
    lastTime = 0;
    gameOverHud.reset();

    // 플레이어 초기 위치 (바닥 플랫폼 위)
    player = {
      x: rect.width / 2 - PLAYER_WIDTH / 2,
      y: rect.height - 50 - PLAYER_HEIGHT,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
    };

    // 플랫폼 초기화
    initPlatforms();
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

    // 재시작 (게임 오버가 아닐 때만)
    if (e.code === 'KeyR' && !isGameOver) {
      resetGame();
      return;
    }

    if (isPaused) return;

    // 좌우 이동
    if (e.code === 'ArrowLeft') {
      keys.ArrowLeft = true;
      e.preventDefault();
    }
    if (e.code === 'ArrowRight') {
      keys.ArrowRight = true;
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ArrowLeft') {
      keys.ArrowLeft = false;
    }
    if (e.code === 'ArrowRight') {
      keys.ArrowRight = false;
    }
  };

  // ==================== Update Functions ====================
  // 플레이어 좌우 이동
  const updatePlayerMovement = (dt: number) => {
    // 좌우 입력
    if (keys.ArrowLeft) {
      player.vx = -PLAYER_SPEED;
    } else if (keys.ArrowRight) {
      player.vx = PLAYER_SPEED;
    } else {
      player.vx = 0;
    }

    player.x += player.vx * dt;

    // 화면 랩어라운드 (좌우)
    const rect = canvas.getBoundingClientRect();
    if (player.x + player.width < 0) {
      player.x = rect.width;
    }
    if (player.x > rect.width) {
      player.x = -player.width;
    }
  };

  // 플레이어 점프/중력
  const updatePlayerJump = (dt: number) => {
    // 중력 적용
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;
  };

  // 플랫폼 충돌 (착지)
  const checkPlatformCollision = () => {
    // 떨어지고 있을 때만 체크 (vy > 0)
    if (player.vy <= 0) return;

    const playerBottom = player.y + player.height;
    const playerCenterX = player.x + player.width / 2;

    for (const platform of platforms) {
      // 부서진 플랫폼은 무시
      if (platform.type === 'breaking' && platform.isBroken) continue;

      // 플랫폼 위에 착지했는지 체크
      const isAbovePlatform =
        playerBottom >= platform.y &&
        playerBottom <= platform.y + platform.height + player.vy * 0.02;
      const isWithinPlatformX =
        playerCenterX >= platform.x &&
        playerCenterX <= platform.x + platform.width;

      if (isAbovePlatform && isWithinPlatformX) {
        // 착지!
        player.y = platform.y - player.height;

        // 플랫폼 타입별 처리
        if (platform.type === 'spring') {
          player.vy = SPRING_JUMP_FORCE;
        } else if (platform.type === 'breaking') {
          player.vy = JUMP_FORCE; // 일단 점프!
          platform.isBroken = true; // 그리고 부서짐
        } else {
          player.vy = JUMP_FORCE;
        }

        return;
      }
    }
  };

  // 움직이는 플랫폼 업데이트
  const updatePlatforms = (dt: number) => {
    for (const platform of platforms) {
      if (platform.type === 'moving' && platform.vx !== undefined) {
        platform.x += platform.vx * dt;

        // 경계에서 방향 전환
        if (platform.x <= platform.minX!) {
          platform.x = platform.minX!;
          platform.vx *= -1;
        }
        if (platform.x >= platform.maxX!) {
          platform.x = platform.maxX!;
          platform.vx *= -1;
        }
      }
    }
  };

  // 스크롤 처리
  const updateScroll = () => {
    const rect = canvas.getBoundingClientRect();

    // 플레이어가 SCROLL_THRESHOLD 위로 올라가면
    if (player.y < SCROLL_THRESHOLD) {
      const scrollAmount = SCROLL_THRESHOLD - player.y;

      // 플레이어 위치 고정
      player.y = SCROLL_THRESHOLD;

      // 모든 플랫폼을 아래로 이동
      for (const platform of platforms) {
        platform.y += scrollAmount;
      }

      // 점수 업데이트 (올라간 만큼)
      score += Math.floor(scrollAmount);
    }

    // 화면 아래로 나간 플랫폼 제거 & 위에 새 플랫폼 생성
    platforms = platforms.filter((p) => p.y < rect.height + 50);

    // 새 플랫폼 생성 (가장 높은 플랫폼 위에)
    if (platforms.length > 0) {
      const highestPlatform = platforms.reduce((a, b) => (a.y < b.y ? a : b));

      while (highestPlatform.y > -PLATFORM_GAP_MAX) {
        const gap =
          PLATFORM_GAP_MIN +
          Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN);
        const newY = highestPlatform.y - gap;
        const newPlatform = createPlatform(newY);
        platforms.push(newPlatform);

        // 다음 반복을 위해 갱신
        if (newY < highestPlatform.y) {
          highestPlatform.y = newY;
        }
      }
    }
  };

  // 게임 오버 체크
  const checkGameOver = (): boolean => {
    const rect = canvas.getBoundingClientRect();
    return player.y > rect.height;
  };

  const update = (t: number) => {
    if (isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);

    if (isStarted && !isGameOver) {
      updatePlayerMovement(dt);
      updatePlayerJump(dt);
      updatePlatforms(dt);
      checkPlatformCollision();
      updateScroll();

      if (checkGameOver()) {
        isGameOver = true;
      }
    }
  };

  // ==================== Render Functions ====================

  // 플랫폼 그리기
  const renderPlatforms = () => {
    for (const platform of platforms) {
      // 부서진 플랫폼은 그리지 않음
      if (platform.type === 'breaking' && platform.isBroken) continue;

      // 타입별 색상
      switch (platform.type) {
        case 'normal':
          ctx.fillStyle = '#5cb85c'; // 초록
          break;
        case 'moving':
          ctx.fillStyle = '#5bc0de'; // 파랑
          break;
        case 'breaking':
          ctx.fillStyle = '#d9534f'; // 빨강
          break;
        case 'spring':
          ctx.fillStyle = '#f0ad4e'; // 노랑
          break;
      }

      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

      // 스프링 표시
      if (platform.type === 'spring') {
        ctx.fillStyle = '#c87137';
        ctx.fillRect(
          platform.x + platform.width / 2 - 8,
          platform.y - 10,
          16,
          10,
        );
      }
    }
  };

  // 플레이어 그리기
  const renderPlayer = () => {
    // 몸통
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // 눈
    ctx.fillStyle = 'white';
    ctx.fillRect(player.x + 8, player.y + 8, 10, 10);
    ctx.fillRect(player.x + player.width - 18, player.y + 8, 10, 10);

    // 눈동자 (이동 방향에 따라)
    ctx.fillStyle = 'black';
    const eyeOffsetX = keys.ArrowLeft ? -2 : keys.ArrowRight ? 2 : 0;
    ctx.fillRect(player.x + 11 + eyeOffsetX, player.y + 12, 4, 4);
    ctx.fillRect(
      player.x + player.width - 15 + eyeOffsetX,
      player.y + 12,
      4,
      4,
    );
  };

  // 점수 그리기
  const renderScore = () => {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 40);
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();

    // 배경
    ctx.fillStyle = '#f5f5dc'; // 베이지색
    ctx.fillRect(0, 0, rect.width, rect.height);

    renderPlatforms();
    renderPlayer();
    renderScore();
  };

  const drawHud = () => {
    if (!isStarted && !isGameOver) {
      gameStartHud(canvas, ctx);
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
  window.addEventListener('keyup', onKeyUp);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
};
