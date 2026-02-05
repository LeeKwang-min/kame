import {
  createGameOverHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
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

export type TDinoCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
};

export const setupDino = (
  canvas: HTMLCanvasElement,
  callbacks?: TDinoCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

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
  let isDownKeyHeld = false;

  let obstacles: TObstacle[] = [];
  let nextObstacleDistance = 0;

  let grounds: TGround[] = [];

  let score = 0;
  let gameSpeed = INITIAL_SPEED;
  let isStarted = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  let sec = 0;

  let animFrame = 0;
  let animTimer = 0;
  const ANIM_SPEED = 0.1;

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'dino', gameOverCallbacks);

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
    const rect = canvas.getBoundingClientRect();

    isStarted = false;
    isGameOver = false;
    isPaused = false;
    score = 0;
    lastTime = 0;
    sec = 0;
    gameOverHud.reset();

    animFrame = 0;
    animTimer = 0;

    gameSpeed = INITIAL_SPEED;

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
    isDownKeyHeld = false;

    obstacles = [];
    nextObstacleDistance =
      OBSTACLE_MIN_GAP + Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP);

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

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'KeyS') {
      if (isPaused) {
        isPaused = false;
        lastTime = 0;
        return;
      }
    }

    if (e.code === 'KeyP' && isStarted && !isGameOver) {
      isPaused = true;
      return;
    }

    if (
      (e.code === 'Space' || e.code === 'ArrowUp') &&
      !isStarted &&
      !isGameOver
    ) {
      startGame();
    }

    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, Math.floor(score));
      if (handled) return;
    }

    if (isPaused) return;

    if (
      (e.code === 'Space' || e.code === 'ArrowUp') &&
      isStarted &&
      !isGameOver
    ) {
      if (!dino.isJumping) {
        dino.vy = JUMP_FORCE;
        dino.isJumping = true;
        dino.isDucking = false;
      }
      e.preventDefault();
    }

    if (e.code === 'ArrowDown' && isStarted && !isGameOver) {
      isDownKeyHeld = true;
      if (dino.isJumping) {
        isFastFalling = true;
      } else {
        dino.isDucking = true;
      }
      e.preventDefault();
    }

    if (e.code === 'KeyR' && !isGameOver && !isPaused) {
      resetGame();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ArrowDown') {
      isDownKeyHeld = false;
      dino.isDucking = false;
      isFastFalling = false;
    }
  };

  const updateGameSpeed = (dt: number) => {
    gameSpeed = Math.min(MAX_SPEED, gameSpeed + SPEED_INCREMENT * dt * 60);
  };

  const updateScore = (dt: number) => {
    score += dt * 100;
  };

  const updateDino = (dt: number) => {
    if (isFastFalling && dino.isJumping) {
      dino.vy = FAST_FALL_SPEED;
    } else {
      dino.vy += GRAVITY * dt;
    }

    dino.y += dino.vy * dt;

    const currentHeight = dino.isDucking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
    const groundLevel = GROUND_Y - currentHeight;

    if (dino.y >= groundLevel) {
      dino.y = groundLevel;
      dino.vy = 0;
      dino.isJumping = false;
      isFastFalling = false;

      if (isDownKeyHeld) {
        dino.isDucking = true;
      }
    }

    if (!dino.isJumping) {
      const newHeight = dino.isDucking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
      if (dino.height !== newHeight) {
        dino.y = GROUND_Y - newHeight;
        dino.height = newHeight;
      }
    } else {
      dino.height = DINO_HEIGHT;
    }
  };

  const spawnObstacle = () => {
    const rect = canvas.getBoundingClientRect();

    const types: TObstacleType[] = ['cactus-small', 'cactus-large'];

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

    nextObstacleDistance =
      OBSTACLE_MIN_GAP + Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP);
  };

  const updateObstacles = (dt: number) => {
    const moveDistance = gameSpeed * dt;

    for (const obs of obstacles) {
      obs.x -= moveDistance;
    }

    obstacles = obstacles.filter((obs) => obs.x + obs.width > 0);

    nextObstacleDistance -= moveDistance;
    if (nextObstacleDistance <= 0) {
      spawnObstacle();
    }
  };

  const updateGround = (dt: number) => {
    const moveDistance = gameSpeed * dt;

    for (const ground of grounds) {
      ground.x -= moveDistance;

      if (ground.x + GROUND_SEGMENT_WIDTH < 0) {
        const maxX = Math.max(...grounds.map((g) => g.x));
        ground.x = maxX + GROUND_SEGMENT_WIDTH;
      }
    }
  };

  const updateAnimation = (dt: number) => {
    animTimer += dt;
    if (animTimer >= ANIM_SPEED) {
      animTimer = 0;
      animFrame = animFrame === 0 ? 1 : 0;
    }
  };

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
    if (isPaused) return;

    if (!isStarted || isGameOver) {
      lastTime = t;
      return;
    }

    if (!lastTime) lastTime = t;

    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    sec += dt;

    updateGameSpeed(dt);
    updateScore(dt);
    updateDino(dt);
    updateObstacles(dt);
    updateGround(dt);
    updateAnimation(dt);

    if (checkCollision()) {
      isGameOver = true;
    }
  };

  const renderGround = () => {
    ctx.fillStyle = '#535353';
    ctx.fillRect(0, GROUND_Y, canvas.width, 2);

    ctx.fillStyle = '#535353';
    for (const ground of grounds) {
      for (let i = 0; i < GROUND_SEGMENT_WIDTH; i += 20) {
        const x = ground.x + i;
        if (x >= 0 && x < canvas.width) {
          ctx.fillRect(x, GROUND_Y + 5, 10, 1);
        }
      }
    }
  };

  const renderDino = () => {
    ctx.fillStyle = '#535353';

    if (dino.isDucking) {
      ctx.fillRect(dino.x, dino.y, 55, DINO_DUCK_HEIGHT);

      ctx.fillStyle = 'white';
      ctx.fillRect(dino.x + 45, dino.y + 5, 6, 6);
      ctx.fillStyle = 'black';
      ctx.fillRect(dino.x + 47, dino.y + 7, 3, 3);

      ctx.fillStyle = '#535353';
      if (animFrame === 0) {
        ctx.fillRect(dino.x + 10, dino.y + DINO_DUCK_HEIGHT, 8, 10);
        ctx.fillRect(dino.x + 30, dino.y + DINO_DUCK_HEIGHT, 8, 5);
      } else {
        ctx.fillRect(dino.x + 10, dino.y + DINO_DUCK_HEIGHT, 8, 5);
        ctx.fillRect(dino.x + 30, dino.y + DINO_DUCK_HEIGHT, 8, 10);
      }
    } else if (dino.isJumping) {
      ctx.fillStyle = '#535353';

      ctx.fillRect(dino.x, dino.y, dino.width, dino.height - 15);

      ctx.fillRect(dino.x + 15, dino.y - 10, 30, 25);

      ctx.fillStyle = 'white';
      ctx.fillRect(dino.x + 35, dino.y - 5, 8, 8);
      ctx.fillStyle = 'black';
      ctx.fillRect(dino.x + 39, dino.y - 3, 4, 4);

      ctx.fillStyle = '#535353';
      if (isFastFalling) {
        ctx.fillRect(dino.x + 5, dino.y + dino.height - 15, 10, 20);
        ctx.fillRect(dino.x + 20, dino.y + dino.height - 15, 10, 20);
      } else {
        ctx.fillRect(dino.x + 5, dino.y + dino.height - 15, 10, 12);
        ctx.fillRect(dino.x + 20, dino.y + dino.height - 15, 10, 12);
      }
    } else {
      ctx.fillRect(dino.x, dino.y, dino.width, dino.height - 15);

      ctx.fillRect(dino.x + 15, dino.y - 10, 30, 25);

      ctx.fillStyle = 'white';
      ctx.fillRect(dino.x + 35, dino.y - 5, 8, 8);
      ctx.fillStyle = 'black';
      ctx.fillRect(dino.x + 39, dino.y - 3, 4, 4);

      ctx.fillStyle = '#535353';
      if (animFrame === 0) {
        ctx.fillRect(dino.x + 5, dino.y + dino.height - 15, 10, 18);
        ctx.fillRect(dino.x + 20, dino.y + dino.height - 15, 10, 10);
      } else {
        ctx.fillRect(dino.x + 5, dino.y + dino.height - 15, 10, 10);
        ctx.fillRect(dino.x + 20, dino.y + dino.height - 15, 10, 18);
      }
    }
  };

  const renderObstacles = () => {
    for (const obs of obstacles) {
      if (obs.type === 'bird') {
        ctx.fillStyle = '#535353';

        ctx.fillRect(obs.x + 15, obs.y + 15, 25, 15);

        ctx.beginPath();
        ctx.moveTo(obs.x + 40, obs.y + 20);
        ctx.lineTo(obs.x + 50, obs.y + 22);
        ctx.lineTo(obs.x + 40, obs.y + 25);
        ctx.closePath();
        ctx.fill();

        if (animFrame === 0) {
          ctx.beginPath();
          ctx.moveTo(obs.x + 15, obs.y + 18);
          ctx.lineTo(obs.x + 30, obs.y + 18);
          ctx.lineTo(obs.x + 22, obs.y);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(obs.x + 15, obs.y + 25);
          ctx.lineTo(obs.x + 30, obs.y + 25);
          ctx.lineTo(obs.x + 22, obs.y + 40);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#535353';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        if (obs.type === 'cactus-large') {
          ctx.fillRect(obs.x - 5, obs.y + 15, 8, 20);
          ctx.fillRect(obs.x + obs.width - 3, obs.y + 10, 8, 25);
        }
      }
    }
  };

  const renderScore = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#535353';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(
      String(Math.floor(score)).padStart(5, '0'),
      rect.width - 20,
      40,
    );
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();

    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, 0, rect.width, rect.height);

    renderGround();
    renderDino();
    renderObstacles();
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
