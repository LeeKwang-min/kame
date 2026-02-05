import {
  createGameOverHud,
  gameHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
} from '@/lib/game';
import {
  CANVAS_SIZE,
  SHIP_RADIUS,
  SHIP_ROTATION_SPEED,
  SHIP_THRUST,
  SHIP_FRICTION,
  SHIP_MAX_SPEED,
  BULLET_SPEED,
  BULLET_LIFE,
  BULLET_RADIUS,
  FIRE_COOLDOWN,
  ASTEROID_SPEED,
  ASTEROID_SIZE,
  INITIAL_ASTEROIDS,
} from './config';
import { TShip, TBullet, TAsteroid } from './types';
import { circleCircleHit } from '@/lib/utils';

export type TAsteroidCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (initials: string, score: number) => Promise<void>;
};

export const setupAsteroid = (
  canvas: HTMLCanvasElement,
  callbacks?: TAsteroidCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
  };

  let ship: TShip = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: SHIP_RADIUS,
  };
  let bullets: TBullet[] = [];
  let fireCooldown = 0;

  let asteroids: TAsteroid[] = [];

  let wave = 1;

  let score = 0;
  let isStarted = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  let sec = 0;

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

  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'asteroid',
    gameOverCallbacks,
  );

  const startGame = async () => {
    if (isStarted) return;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isStarted = true;
    lastTime = 0;
    sec = 0;
  };

  const resetGame = () => {
    isStarted = false;
    isGameOver = false;
    isPaused = false;
    score = 0;
    lastTime = 0;
    sec = 0;
    gameOverHud.reset();

    ship = {
      x: CANVAS_SIZE / 2,
      y: CANVAS_SIZE / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      radius: SHIP_RADIUS,
    };

    bullets = [];
    fireCooldown = 0;

    wave = 1;

    asteroids = [];
    spawnInitialAsteroids();
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

    if (e.code === 'KeyR' && !isGameOver && !isPaused) {
      resetGame();
      return;
    }

    if (isPaused) return;

    if (e.code === 'Space') {
      keys.Space = true;
      e.preventDefault();
      return;
    }

    if (e.key in keys) {
      keys[e.key as keyof typeof keys] = true;
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      keys.Space = false;
      e.preventDefault();
      return;
    }

    if (e.key in keys) {
      keys[e.key as keyof typeof keys] = false;
      e.preventDefault();
    }
  };

  const updateShip = (dt: number) => {
    if (keys.ArrowLeft) ship.angle -= SHIP_ROTATION_SPEED * dt;
    if (keys.ArrowRight) ship.angle += SHIP_ROTATION_SPEED * dt;

    if (keys.ArrowUp) {
      ship.vx += Math.cos(ship.angle) * SHIP_THRUST * dt;
      ship.vy += Math.sin(ship.angle) * SHIP_THRUST * dt;
    }

    const speed = Math.sqrt(ship.vx ** 2 + ship.vy ** 2);
    if (speed > SHIP_MAX_SPEED) {
      ship.vx = (ship.vx / speed) * SHIP_MAX_SPEED;
      ship.vy = (ship.vy / speed) * SHIP_MAX_SPEED;
    }

    ship.vx *= SHIP_FRICTION;
    ship.vy *= SHIP_FRICTION;

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    if (ship.x < 0) ship.x = CANVAS_SIZE;
    if (ship.x > CANVAS_SIZE) ship.x = 0;
    if (ship.y < 0) ship.y = CANVAS_SIZE;
    if (ship.y > CANVAS_SIZE) ship.y = 0;
  };

  const fireBullet = () => {
    const bulletX = ship.x + Math.cos(ship.angle) * ship.radius;
    const bulletY = ship.y + Math.sin(ship.angle) * ship.radius;

    bullets.push({
      x: bulletX,
      y: bulletY,
      vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx,
      vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy,
      life: BULLET_LIFE,
    });
  };

  const updateBullets = (dt: number) => {
    if (fireCooldown > 0) {
      fireCooldown -= dt;
    }

    if (keys.Space && fireCooldown <= 0) {
      fireBullet();
      fireCooldown = FIRE_COOLDOWN;
    }

    for (const bullet of bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
    }

    bullets = bullets.filter((b) => b.life > 0);
  };

  const createAsteroid = (x: number, y: number, radius: number) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = ASTEROID_SPEED + Math.random() * ASTEROID_SPEED;

    const vertexCount = 8 + Math.floor(Math.random() * 5);
    const vertices: number[] = [];
    for (let i = 0; i < vertexCount; i++) {
      vertices.push(0.7 + Math.random() * 0.6);
    }

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      vertices,
    };
  };

  const spawnInitialAsteroids = () => {
    for (let i = 0; i < INITIAL_ASTEROIDS; i++) {
      let x: number, y: number;

      if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 50 : CANVAS_SIZE - 50;
        y = Math.random() * CANVAS_SIZE;
      } else {
        x = Math.random() * CANVAS_SIZE;
        y = Math.random() < 0.5 ? 50 : CANVAS_SIZE - 50;
      }

      asteroids.push(createAsteroid(x, y, ASTEROID_SIZE[0]));
    }
  };

  const updateAsteroids = (dt: number) => {
    for (const asteroid of asteroids) {
      asteroid.x += asteroid.vx * dt;
      asteroid.y += asteroid.vy * dt;

      if (asteroid.x < -asteroid.radius)
        asteroid.x = CANVAS_SIZE + asteroid.radius;
      if (asteroid.x > CANVAS_SIZE + asteroid.radius)
        asteroid.x = -asteroid.radius;
      if (asteroid.y < -asteroid.radius)
        asteroid.y = CANVAS_SIZE + asteroid.radius;
      if (asteroid.y > CANVAS_SIZE + asteroid.radius)
        asteroid.y = -asteroid.radius;
    }
  };

  const startNextWave = () => {
    wave++;

    const asteroidCount = INITIAL_ASTEROIDS + (wave - 1);

    for (let i = 0; i < asteroidCount; i++) {
      let x: number, y: number;

      do {
        if (Math.random() < 0.5) {
          x = Math.random() < 0.5 ? 50 : CANVAS_SIZE - 50;
          y = Math.random() * CANVAS_SIZE;
        } else {
          x = Math.random() * CANVAS_SIZE;
          y = Math.random() < 0.5 ? 50 : CANVAS_SIZE - 50;
        }
      } while (Math.sqrt((x - ship.x) ** 2 + (y - ship.y) ** 2) < 150);

      asteroids.push(createAsteroid(x, y, ASTEROID_SIZE[0]));
    }
  };

  const checkWaveComplete = () => {
    if (asteroids.length === 0) {
      startNextWave();
    }
  };

  const splitAsteroid = (asteroid: TAsteroid): TAsteroid[] => {
    const currentSizeIndex = ASTEROID_SIZE.findIndex(
      (size) => size === asteroid.radius,
    );

    if (
      currentSizeIndex === -1 ||
      currentSizeIndex >= ASTEROID_SIZE.length - 1
    ) {
      return [];
    }

    const newRadius = ASTEROID_SIZE[currentSizeIndex + 1];

    const result: TAsteroid[] = [];
    for (let i = 0; i < 2; i++) {
      const newAsteroid = createAsteroid(asteroid.x, asteroid.y, newRadius);

      newAsteroid.vx = asteroid.vx + (Math.random() - 0.5) * 100;
      newAsteroid.vy = asteroid.vy + (Math.random() - 0.5) * 100;

      result.push(newAsteroid);
    }

    return result;
  };

  const handleBulletAsteroidCollision = () => {
    const bulletsToRemove: number[] = [];
    const asteroidsToRemove: number[] = [];
    const newAsteroids: TAsteroid[] = [];

    for (let i = 0; i < bullets.length; i++) {
      const bullet = bullets[i];

      for (let j = 0; j < asteroids.length; j++) {
        const asteroid = asteroids[j];

        if (
          circleCircleHit(
            bullet.x,
            bullet.y,
            BULLET_RADIUS,
            asteroid.x,
            asteroid.y,
            asteroid.radius,
          )
        ) {
          bulletsToRemove.push(i);
          asteroidsToRemove.push(j);

          const sizeIndex = ASTEROID_SIZE.findIndex(
            (s) => s === asteroid.radius,
          );
          score += (sizeIndex + 1) * 20;

          const splits = splitAsteroid(asteroid);
          newAsteroids.push(...splits);

          break;
        }
      }
    }

    bulletsToRemove.sort((a, b) => b - a).forEach((i) => bullets.splice(i, 1));
    asteroidsToRemove
      .sort((a, b) => b - a)
      .forEach((j) => asteroids.splice(j, 1));

    asteroids.push(...newAsteroids);
  };

  const handleShipAsteroidCollision = (): boolean => {
    for (const asteroid of asteroids) {
      if (
        circleCircleHit(
          ship.x,
          ship.y,
          ship.radius,
          asteroid.x,
          asteroid.y,
          asteroid.radius,
        )
      ) {
        return true;
      }
    }
    return false;
  };

  const update = (t: number) => {
    if (isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    sec += dt;

    if (isStarted && !isGameOver) {
      updateShip(dt);
      updateBullets(dt);
      updateAsteroids(dt);

      handleBulletAsteroidCollision();
      checkWaveComplete();

      if (handleShipAsteroidCollision()) {
        isGameOver = true;
        return;
      }
    }
  };

  const renderShip = () => {
    ctx.save();

    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    ctx.beginPath();
    ctx.moveTo(ship.radius, 0);
    ctx.lineTo(-ship.radius * 0.7, -ship.radius * 0.7);
    ctx.lineTo(-ship.radius * 0.4, 0);
    ctx.lineTo(-ship.radius * 0.7, ship.radius * 0.7);
    ctx.closePath();

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  };

  const renderBullets = () => {
    ctx.fillStyle = 'limegreen';
    for (const bullet of bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, BULLET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const renderAsteroids = () => {
    ctx.strokeStyle = 'gray';
    ctx.lineWidth = 2;

    for (const asteroid of asteroids) {
      ctx.save();
      ctx.translate(asteroid.x, asteroid.y);

      ctx.beginPath();
      const vertexCount = asteroid.vertices.length;

      for (let i = 0; i <= vertexCount; i++) {
        const angle = (i / vertexCount) * Math.PI * 2;
        const vertexRadius =
          asteroid.radius * asteroid.vertices[i % vertexCount];
        const x = Math.cos(angle) * vertexRadius;
        const y = Math.sin(angle) * vertexRadius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    }
  };

  const render = () => {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    renderAsteroids();
    renderBullets();
    renderShip();
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
