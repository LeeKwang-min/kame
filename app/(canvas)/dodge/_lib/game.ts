import {
  createGameOverHud,
  gameHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
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
  onScoreSave: (initials: string, score: number) => Promise<void>;
};

export const setupDodge = (
  canvas: HTMLCanvasElement,
  callbacks?: TDodgeCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
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
  let isPaused = false;

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'dodge', gameOverCallbacks);

  const startGame = () => {
    if (isStarted) return;
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

  const onKeyDown = (e: KeyboardEvent) => {
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

    if (e.code === 'KeyR' && !isGameOver) {
      resetGame();
      return;
    }

    if (isPaused) return;

    if (e.key in keys) {
      keys[e.key as keyof typeof keys] = true;
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key in keys) {
      keys[e.key as keyof typeof keys] = false;
      e.preventDefault();
    }
  };

  const updatePlayer = (dt: number) => {
    let dx = 0;
    let dy = 0;
    if (keys.ArrowLeft) dx -= 1;
    if (keys.ArrowRight) dx += 1;
    if (keys.ArrowUp) dy -= 1;
    if (keys.ArrowDown) dy += 1;

    if (dx !== 0 && dy !== 0) {
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

  const render = () => {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    renderPlayer();
    renderEnemies();
  };

  const drawHud = () => {
    if (!isStarted) {
      gameStartHud(canvas, ctx);
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

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
};
