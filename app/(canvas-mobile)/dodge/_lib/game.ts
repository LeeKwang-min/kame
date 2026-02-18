import {
  createGameOverHud,
  gameHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CANVAS_SIZE,
  ENEMY_RADIUS,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  SCORE_PER_SEC,
} from './config';
import { Enemy, Player } from './types';
import {
  circleCircleCollide,
  getEnemySpeedRange,
  getSpawnInterval,
  spawnAimingAtPlayer,
} from './utils';

export type TDodgeCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupDodge = (
  canvas: HTMLCanvasElement,
  callbacks?: TDodgeCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  };

  // 가상 조이스틱 상태
  const joystick = {
    active: false,
    centerX: 0,
    centerY: 0,
    currentX: 0,
    currentY: 0,
    radius: 50,
    knobRadius: 20,
  };

  let player: Player = { x: 80, y: 80 };
  let enemies: Enemy[] = [];
  let enemyId = 1;

  let lastTime = 0;
  let sec = 0;
  let score = 0;
  let spawnAcc = 0;
  let isGameOver = false;
  let isStarted = false;
  let isLoading = false;
  let isPaused = false;

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'dodge', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  const startGame = async () => {
    if (isStarted || isLoading) return;
    isLoading = true;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isLoading = false;
    isStarted = true;
    lastTime = 0;
    sec = 0;
  };

  const resetGame = () => {
    isStarted = false;
    isGameOver = false;
    isPaused = false;
    sec = 0;
    score = 0;
    spawnAcc = 0;
    enemies = [];
    gameOverHud.reset();

    player = {
      x: CANVAS_SIZE / 2,
      y: CANVAS_SIZE / 2,
    };

    lastTime = 0;
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(CANVAS_SIZE * dpr);
    canvas.height = Math.round(CANVAS_SIZE * dpr);
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    resetGame();
  };

  // --- 키보드 이벤트 ---

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (e.code === 'KeyS') {
      if (isPaused) {
        isPaused = false;
        lastTime = 0;
        return;
      }
      startGame();
      return;
    }

    if (e.code === 'KeyP' && isStarted && !isGameOver) {
      isPaused = true;
      return;
    }

    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    if (e.code === 'KeyR' && !isGameOver && !isPaused) {
      resetGame();
      return;
    }

    if (isPaused) return;

    // e.code 사용으로 버그 수정 (기존: e.key in keys)
    if (e.code === 'ArrowUp') {
      keys.ArrowUp = true;
      e.preventDefault();
    }
    if (e.code === 'ArrowDown') {
      keys.ArrowDown = true;
      e.preventDefault();
    }
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
    // e.code 사용으로 버그 수정 (기존: e.key in keys)
    if (e.code === 'ArrowUp') {
      keys.ArrowUp = false;
      e.preventDefault();
    }
    if (e.code === 'ArrowDown') {
      keys.ArrowDown = false;
      e.preventDefault();
    }
    if (e.code === 'ArrowLeft') {
      keys.ArrowLeft = false;
      e.preventDefault();
    }
    if (e.code === 'ArrowRight') {
      keys.ArrowRight = false;
      e.preventDefault();
    }
  };

  // --- 터치 이벤트 (가상 조이스틱) ---

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

    // 게임 시작 전이면 터치로 시작
    if (!isStarted && !isLoading && !isGameOver) {
      startGame();
      return;
    }

    // 일시정지 상태이면 터치로 재개
    if (isPaused) {
      isPaused = false;
      lastTime = 0;
      return;
    }

    // 게임 오버 상태: 터치로 SAVE/SKIP/재시작 처리
    if (isGameOver) {
      const handled = gameOverHud.onTouchStart(pos.x, pos.y, score);
      if (handled) return;
      return;
    }

    // 조이스틱 활성화
    joystick.active = true;
    joystick.centerX = pos.x;
    joystick.centerY = pos.y;
    joystick.currentX = pos.x;
    joystick.currentY = pos.y;
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!joystick.active) return;

    const touch = e.touches[0];
    if (!touch) return;

    const pos = getTouchPos(touch);

    // knob 위치를 조이스틱 범위 내로 제한
    const dx = pos.x - joystick.centerX;
    const dy = pos.y - joystick.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > joystick.radius) {
      joystick.currentX = joystick.centerX + (dx / dist) * joystick.radius;
      joystick.currentY = joystick.centerY + (dy / dist) * joystick.radius;
    } else {
      joystick.currentX = pos.x;
      joystick.currentY = pos.y;
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    joystick.active = false;
  };

  // --- 게임 로직 ---

  const updatePlayer = (dt: number) => {
    let dx = 0;
    let dy = 0;

    // 키보드 입력
    if (keys.ArrowLeft) dx -= 1;
    if (keys.ArrowRight) dx += 1;
    if (keys.ArrowUp) dy -= 1;
    if (keys.ArrowDown) dy += 1;

    // 터치 조이스틱 입력 (키보드 입력이 없을 때)
    if (dx === 0 && dy === 0 && joystick.active) {
      const jdx = joystick.currentX - joystick.centerX;
      const jdy = joystick.currentY - joystick.centerY;
      const dist = Math.sqrt(jdx * jdx + jdy * jdy);
      if (dist > 5) {
        dx = jdx / dist;
        dy = jdy / dist;
      }
    }

    // 대각선 정규화 (키보드만 해당)
    if (dx !== 0 && dy !== 0 && !joystick.active) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }

    player.x += dx * PLAYER_SPEED * dt;
    player.y += dy * PLAYER_SPEED * dt;

    player.x = Math.max(
      PLAYER_RADIUS,
      Math.min(CANVAS_SIZE - PLAYER_RADIUS, player.x),
    );
    player.y = Math.max(
      PLAYER_RADIUS,
      Math.min(CANVAS_SIZE - PLAYER_RADIUS, player.y),
    );
  };

  const spawnEnemy = () => {
    if (!isStarted || isGameOver) return;

    const { min, max } = getEnemySpeedRange(sec);
    const speed = min + Math.random() * (max - min);

    // 플레이어를 조준하여 발사
    const { x, y, vx, vy } = spawnAimingAtPlayer(
      CANVAS_SIZE,
      ENEMY_RADIUS,
      player.x,
      player.y,
    );

    enemies.push({
      id: enemyId++,
      x,
      y,
      r: ENEMY_RADIUS,
      speed,
      vx,
      vy,
    });
  };

  const updateEnemies = (dt: number) => {
    spawnAcc += dt;
    const interval = getSpawnInterval(sec);
    while (spawnAcc >= interval) {
      spawnAcc -= interval;
      spawnEnemy();
    }

    for (const e of enemies) {
      e.x += e.vx * e.speed * dt;
      e.y += e.vy * e.speed * dt;
    }

    const isOutside = (e: Enemy) => {
      const m = e.r + 2;
      return (
        e.x < -m || e.x > CANVAS_SIZE + m || e.y < -m || e.y > CANVAS_SIZE + m
      );
    };
    enemies = enemies.filter((e) => !isOutside(e));
  };

  const handleEnemyCollision = (): boolean => {
    for (const e of enemies) {
      if (
        circleCircleCollide(player.x, player.y, PLAYER_RADIUS, e.x, e.y, e.r)
      ) {
        return true;
      }
    }
    return false;
  };

  const updateScore = (dt: number) => {
    score += SCORE_PER_SEC * dt;
  };

  const update = (t: number) => {
    if (isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    sec += dt;

    if (isStarted && !isGameOver) {
      updateScore(dt);
      updatePlayer(dt);
      updateEnemies(dt);

      if (handleEnemyCollision()) {
        isGameOver = true;
      }
    }
  };

  // --- 렌더링 ---

  const renderPlayer = () => {
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.fill();
  };

  const renderEnemies = () => {
    for (const e of enemies) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = 'red';
      ctx.fill();
    }
  };

  const renderJoystick = () => {
    if (!joystick.active || !isStarted || isGameOver || isPaused) return;

    // 외부 원 (반투명)
    ctx.beginPath();
    ctx.arc(joystick.centerX, joystick.centerY, joystick.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 내부 원 (knob)
    ctx.beginPath();
    ctx.arc(joystick.currentX, joystick.currentY, joystick.knobRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();
  };

  const render = () => {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    renderPlayer();
    renderEnemies();
    renderJoystick();
  };

  const drawHud = () => {
    if (!isStarted) {
      if (isLoading) {
        gameLoadingHud(canvas, ctx);
      } else {
        gameStartHud(canvas, ctx);
      }
      return;
    }

    if (isGameOver) {
      gameOverHud.render(score);
      return;
    }

    if (isPaused) {
      gamePauseHud(canvas, ctx);
      return;
    }

    gameHud(ctx, score, sec);
  };

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
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
  };
};
