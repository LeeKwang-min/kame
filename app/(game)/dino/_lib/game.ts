import { TDino, TObstacle, TObstacleType, TGround } from './types';
import {
  GROUND_Y,
  DINO_WIDTH,
  DINO_HEIGHT,
  DINO_X,
  DINO_DUCK_HEIGHT,
  JUMP_FORCE,
  GRAVITY,
  INITIAL_SPEED,
  SPEED_INCREMENT,
  MAX_SPEED,
  OBSTACLE_MIN_GAP,
  OBSTACLE_MAX_GAP,
  CACTUS_SMALL,
  CACTUS_LARGE,
  BIRD_SIZE,
  BIRD_HEIGHTS,
  GROUND_SEGMENT_WIDTH,
  FAST_FALL_SPEED,
} from './config';
import { rectRectHit } from '@/lib/utils';

export const setupDino = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ==================== State ====================

  // 공룡
  let dino: TDino = {
    x: DINO_X,
    y: GROUND_Y - DINO_HEIGHT,
    width: DINO_WIDTH,
    height: DINO_HEIGHT,
    vy: 0,
    isJumping: false,
    isDucking: false,
  };

  let isFastFalling = false;

  // 장애물 배열
  let obstacles: TObstacle[] = [];
  let nextObstacleDistance = 0; // 다음 장애물까지 거리

  // 바닥 세그먼트 (무한 스크롤용)
  let grounds: TGround[] = [];

  // 게임 상태
  let score = 0;
  let gameSpeed = INITIAL_SPEED;
  let isStarted = false;
  let isGameOver = false;

  let lastTime = 0;
  let sec = 0; // 경과 시간

  // 애니메이션
  let animFrame = 0; // 현재 프레임 (0 또는 1)
  let animTimer = 0; // 프레임 전환 타이머
  const ANIM_SPEED = 0.1; // 프레임 전환 속도 (초)

  // ==================== Game State ====================

  const startGame = () => {
    if (isStarted) return;
    isStarted = true;
    lastTime = 0;
    sec = 0;
  };

  const resetGame = () => {
    const rect = canvas.getBoundingClientRect();

    isStarted = false;
    isGameOver = false;
    score = 0;
    lastTime = 0;
    sec = 0;

    // TODO: 게임 오브젝트 초기화
    animFrame = 0;
    animTimer = 0;

    gameSpeed = INITIAL_SPEED;

    // 공룡 초기화
    dino = {
      x: DINO_X,
      y: GROUND_Y - DINO_HEIGHT,
      width: DINO_WIDTH,
      height: DINO_HEIGHT,
      vy: 0,
      isJumping: false,
      isDucking: false,
    };

    isFastFalling = false;

    // 장애물 초기화
    obstacles = [];
    nextObstacleDistance =
      OBSTACLE_MIN_GAP + Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP);

    // 바닥 초기화 (화면을 덮도록 여러 세그먼트) -> 스크롤이 되면서 무한으로 반복되는 바닥을 구현하기 위함
    // 스크롤하면 왼쪽으로 나간 세그먼트를 오른쪽으로 재배치
    grounds = [];
    const segmentCount = Math.ceil(rect.width / GROUND_SEGMENT_WIDTH) + 1;
    for (let i = 0; i < segmentCount; i++) {
      grounds.push({ x: i * GROUND_SEGMENT_WIDTH });
    }
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
    if (
      (e.code === 'Space' || e.code === 'ArrowUp') &&
      !isStarted &&
      !isGameOver
    ) {
      startGame();
    }

    // 점프 (Space 또는 위 방향키)
    if (
      (e.code === 'Space' || e.code === 'ArrowUp') &&
      isStarted &&
      !isGameOver
    ) {
      if (!dino.isJumping) {
        dino.vy = JUMP_FORCE;
        dino.isJumping = true;
        dino.isDucking = false; // 점프하면 숙이기 해제
      }
      e.preventDefault();
    }

    // 아래 방향키
    if (e.code === 'ArrowDown' && isStarted && !isGameOver) {
      if (dino.isJumping) {
        // 공중에서: Fast Fall (빠른 낙하)
        isFastFalling = true;
      } else {
        // 땅에서: 숙이기
        dino.isDucking = true;
      }
      e.preventDefault();
    }

    // 재시작
    if (e.code === 'KeyR') {
      resetGame();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    // 숙이기 해제
    if (e.code === 'ArrowDown') {
      dino.isDucking = false;
      isFastFalling = false;
    }
  };

  // ==================== Update Functions ====================
  // 게임 속도 증가
  const updateGameSpeed = (dt: number) => {
    gameSpeed = Math.min(MAX_SPEED, gameSpeed + SPEED_INCREMENT * dt * 60);
  };

  // 점수 증가 (10ms당 1점 → 0.01초당 1점)
  const updateScore = (dt: number) => {
    score += Math.floor(dt * 100);
  };

  // 공룡 업데이트 (점프/중력)
  const updateDino = (dt: number) => {
    // Fast Fall 적용
    if (isFastFalling && dino.isJumping) {
      dino.vy = FAST_FALL_SPEED; // 아래로 빠르게
    } else {
      // 일반 중력 적용
      dino.vy += GRAVITY * dt;
    }

    dino.y += dino.vy * dt;

    // 바닥 높이 계산 (숙이기 여부에 따라)
    const currentHeight = dino.isDucking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
    const groundLevel = GROUND_Y - currentHeight;

    // 바닥 충돌
    if (dino.y >= groundLevel) {
      dino.y = groundLevel;
      dino.vy = 0;
      dino.isJumping = false;
      isFastFalling = false; // Fast Fall 해제
    }

    // 높이 업데이트 (숙이기 시)
    // ⚠️ 중요: 땅에 있을 때만 높이 변경 시 y 위치 조정
    if (!dino.isJumping) {
      const newHeight = dino.isDucking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
      if (dino.height !== newHeight) {
        // 높이가 변경될 때 y 위치도 조정 (바닥에 붙도록)
        dino.y = GROUND_Y - newHeight;
        dino.height = newHeight;
      }
    } else {
      // 공중에서는 항상 일반 높이 유지
      dino.height = DINO_HEIGHT;
    }
  };

  // 장애물 스폰
  const spawnObstacle = () => {
    const rect = canvas.getBoundingClientRect();

    // 랜덤 장애물 타입 선택
    const types: TObstacleType[] = ['cactus-small', 'cactus-large'];

    // 일정 점수 이상이면 새도 등장
    if (score > 500) {
      types.push('bird');
    }

    const type = types[Math.floor(Math.random() * types.length)];

    let obstacle: TObstacle;

    if (type === 'cactus-small') {
      obstacle = {
        x: rect.width,
        y: GROUND_Y - CACTUS_SMALL.height,
        width: CACTUS_SMALL.width,
        height: CACTUS_SMALL.height,
        type,
      };
    } else if (type === 'cactus-large') {
      obstacle = {
        x: rect.width,
        y: GROUND_Y - CACTUS_LARGE.height,
        width: CACTUS_LARGE.width,
        height: CACTUS_LARGE.height,
        type,
      };
    } else {
      // 새: 랜덤 높이
      const birdY =
        BIRD_HEIGHTS[Math.floor(Math.random() * BIRD_HEIGHTS.length)];
      obstacle = {
        x: rect.width,
        y: birdY - BIRD_SIZE.height,
        width: BIRD_SIZE.width,
        height: BIRD_SIZE.height,
        type,
      };
    }

    obstacles.push(obstacle);

    // 다음 장애물 거리 설정
    nextObstacleDistance =
      OBSTACLE_MIN_GAP + Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP);
  };

  // 장애물 업데이트
  const updateObstacles = (dt: number) => {
    const rect = canvas.getBoundingClientRect();
    const moveDistance = gameSpeed * dt;

    // 장애물 이동
    for (const obs of obstacles) {
      obs.x -= moveDistance;
    }

    // 화면 밖 장애물 제거
    obstacles = obstacles.filter((obs) => obs.x + obs.width > 0);

    // 새 장애물 스폰 체크
    nextObstacleDistance -= moveDistance;
    if (nextObstacleDistance <= 0) {
      spawnObstacle();
    }
  };

  // 바닥 업데이트 (무한 스크롤)
  const updateGround = (dt: number) => {
    const moveDistance = gameSpeed * dt;

    for (const ground of grounds) {
      ground.x -= moveDistance;

      // 왼쪽으로 완전히 나가면 오른쪽 끝으로 이동
      if (ground.x + GROUND_SEGMENT_WIDTH < 0) {
        // 가장 오른쪽 세그먼트 찾기
        const maxX = Math.max(...grounds.map((g) => g.x));
        ground.x = maxX + GROUND_SEGMENT_WIDTH;
      }
    }
  };

  // 애니메이션 프레임 업데이트
  const updateAnimation = (dt: number) => {
    animTimer += dt;
    if (animTimer >= ANIM_SPEED) {
      animTimer = 0;
      animFrame = animFrame === 0 ? 1 : 0; // 0 ↔ 1 토글
    }
  };

  // 충돌 체크
  const checkCollision = (): boolean => {
    for (const obs of obstacles) {
      if (
        rectRectHit(
          dino.x,
          dino.y,
          dino.width,
          dino.height,
          obs.x,
          obs.y,
          obs.width,
          obs.height,
        )
      ) {
        return true;
      }
    }
    return false;
  };

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    sec += dt;

    if (isStarted && !isGameOver) {
      updateGameSpeed(dt);
      updateScore(dt);
      updateDino(dt);
      updateObstacles(dt);
      updateGround(dt);
      updateAnimation(dt);

      if (checkCollision()) {
        isGameOver = true;
      }
    }
  };

  // ==================== Render Functions ====================
  // 바닥 그리기
  const renderGround = () => {
    ctx.fillStyle = '#535353';
    ctx.fillRect(0, GROUND_Y, canvas.width, 2);

    // 바닥 패턴 (점선 느낌)
    ctx.fillStyle = '#535353';
    for (const ground of grounds) {
      // 간단한 패턴
      for (let i = 0; i < GROUND_SEGMENT_WIDTH; i += 20) {
        const x = ground.x + i;
        if (x >= 0 && x < canvas.width) {
          ctx.fillRect(x, GROUND_Y + 5, 10, 1);
        }
      }
    }
  };

  // 공룡 그리기
  const renderDino = () => {
    ctx.fillStyle = '#535353';

    if (dino.isDucking) {
      // ===== 숙인 공룡 =====
      // 몸통 (넓고 낮게)
      ctx.fillRect(dino.x, dino.y, 55, DINO_DUCK_HEIGHT);

      // 눈
      ctx.fillStyle = 'white';
      ctx.fillRect(dino.x + 45, dino.y + 5, 6, 6);
      ctx.fillStyle = 'black';
      ctx.fillRect(dino.x + 47, dino.y + 7, 3, 3);

      // 다리 (애니메이션)
      ctx.fillStyle = '#535353';
      if (animFrame === 0) {
        ctx.fillRect(dino.x + 10, dino.y + DINO_DUCK_HEIGHT, 8, 10);
        ctx.fillRect(dino.x + 30, dino.y + DINO_DUCK_HEIGHT, 8, 5);
      } else {
        ctx.fillRect(dino.x + 10, dino.y + DINO_DUCK_HEIGHT, 8, 5);
        ctx.fillRect(dino.x + 30, dino.y + DINO_DUCK_HEIGHT, 8, 10);
      }
    } else if (dino.isJumping) {
      // ===== 점프/낙하 중인 공룡 =====
      ctx.fillStyle = '#535353';

      // 몸통
      ctx.fillRect(dino.x, dino.y, dino.width, dino.height - 15);

      // 머리
      ctx.fillRect(dino.x + 15, dino.y - 10, 30, 25);

      // 눈
      ctx.fillStyle = 'white';
      ctx.fillRect(dino.x + 35, dino.y - 5, 8, 8);
      ctx.fillStyle = 'black';
      ctx.fillRect(dino.x + 39, dino.y - 3, 4, 4);

      // 다리
      ctx.fillStyle = '#535353';
      if (isFastFalling) {
        // Fast Fall: 다리를 아래로 쭉 뻗음
        ctx.fillRect(dino.x + 5, dino.y + dino.height - 15, 10, 20);
        ctx.fillRect(dino.x + 20, dino.y + dino.height - 15, 10, 20);
      } else {
        // 일반 점프: 다리 모음
        ctx.fillRect(dino.x + 5, dino.y + dino.height - 15, 10, 12);
        ctx.fillRect(dino.x + 20, dino.y + dino.height - 15, 10, 12);
      }
    } else {
      // ===== 달리는 공룡 =====
      // 몸통
      ctx.fillRect(dino.x, dino.y, dino.width, dino.height - 15);

      // 머리
      ctx.fillRect(dino.x + 15, dino.y - 10, 30, 25);

      // 눈
      ctx.fillStyle = 'white';
      ctx.fillRect(dino.x + 35, dino.y - 5, 8, 8);
      ctx.fillStyle = 'black';
      ctx.fillRect(dino.x + 39, dino.y - 3, 4, 4);

      // 다리 (애니메이션)
      ctx.fillStyle = '#535353';
      if (animFrame === 0) {
        // 프레임 0: 왼발 앞, 오른발 뒤
        ctx.fillRect(dino.x + 5, dino.y + dino.height - 15, 10, 18); // 왼발 (길게)
        ctx.fillRect(dino.x + 20, dino.y + dino.height - 15, 10, 10); // 오른발 (짧게)
      } else {
        // 프레임 1: 왼발 뒤, 오른발 앞
        ctx.fillRect(dino.x + 5, dino.y + dino.height - 15, 10, 10); // 왼발 (짧게)
        ctx.fillRect(dino.x + 20, dino.y + dino.height - 15, 10, 18); // 오른발 (길게)
      }
    }
  };

  // 장애물 그리기
  const renderObstacles = () => {
    for (const obs of obstacles) {
      if (obs.type === 'bird') {
        // ===== 새 (날갯짓 애니메이션) =====
        ctx.fillStyle = '#535353';

        // 몸통
        ctx.fillRect(obs.x + 15, obs.y + 15, 25, 15);

        // 부리
        ctx.beginPath();
        ctx.moveTo(obs.x + 40, obs.y + 20);
        ctx.lineTo(obs.x + 50, obs.y + 22);
        ctx.lineTo(obs.x + 40, obs.y + 25);
        ctx.closePath();
        ctx.fill();

        // 날개 (애니메이션)
        if (animFrame === 0) {
          // 날개 위로
          ctx.beginPath();
          ctx.moveTo(obs.x + 15, obs.y + 18);
          ctx.lineTo(obs.x + 30, obs.y + 18);
          ctx.lineTo(obs.x + 22, obs.y);
          ctx.closePath();
          ctx.fill();
        } else {
          // 날개 아래로
          ctx.beginPath();
          ctx.moveTo(obs.x + 15, obs.y + 25);
          ctx.lineTo(obs.x + 30, obs.y + 25);
          ctx.lineTo(obs.x + 22, obs.y + 40);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // ===== 선인장 =====
        ctx.fillStyle = '#535353';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // 선인장 가시 (장식)
        if (obs.type === 'cactus-large') {
          ctx.fillRect(obs.x - 5, obs.y + 15, 8, 20);
          ctx.fillRect(obs.x + obs.width - 3, obs.y + 10, 8, 25);
        }
      }
    }
  };

  // 점수 그리기
  const renderScore = () => {
    ctx.fillStyle = '#535353';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(score).padStart(5, '0'), canvas.width - 20, 40);
  };

  // 게임 오버 화면
  const renderGameOver = () => {
    if (!isGameOver) return;

    const rect = canvas.getBoundingClientRect();

    ctx.fillStyle = '#535353';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', rect.width / 2, rect.height / 2 - 20);

    ctx.font = '16px sans-serif';
    ctx.fillText('Press R to restart', rect.width / 2, rect.height / 2 + 20);
  };

  // 시작 화면
  const renderStart = () => {
    if (isStarted || isGameOver) return;

    const rect = canvas.getBoundingClientRect();

    ctx.fillStyle = '#535353';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE or ↑ to Start', rect.width / 2, rect.height / 2);
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();

    // 배경 (밝은 회색)
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, rect.width, rect.height);

    renderGround();
    renderDino();
    renderObstacles();
    renderScore();
    renderGameOver();
    renderStart();
  };

  // ==================== Game Loop ====================

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    // drawHud(canvas, ctx, score, sec, isStarted, isGameOver);

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
};
