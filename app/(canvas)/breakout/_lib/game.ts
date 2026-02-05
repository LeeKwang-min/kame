import {
  createGameOverHud,
  gameHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  BALL_RADIUS,
  BALL_SPEED,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_SPEED,
  PADDLE_MARGIN,
  BRICK_COLS,
  BRICK_GAP,
  BRICK_ROWS,
  BRICK_TOP_OFFSET,
  BRICK_HEIGHT,
  BRICK_COLORS,
  PADDLE_COLOR,
  BALL_COLOR,
  MIN_VY_RATIO,
} from './config';
import { TBall, TBrick, TPaddle } from './types';
import { circleRectHit } from '@/lib/utils';

export type TBreakoutCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
};

export const setupBreakOut = (
  canvas: HTMLCanvasElement,
  callbacks?: TBreakoutCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const keys = {
    ArrowLeft: false,
    ArrowRight: false,
  };

  let paddle: TPaddle = {
    x: 0,
    y: 0,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  };
  let ball: TBall = { x: 0, y: 0, vx: 0, vy: 0, radius: BALL_RADIUS };
  let bricks: TBrick[] = [];

  let score = 0;
  let isStarted = false;
  let isShoot = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  let sec = 0;

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

  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'breakout',
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

  const createBricks = (canvasWidth: number): TBrick[] => {
    const result: TBrick[] = [];

    const BRICK_WIDTH = Math.floor((canvasWidth - 120) / BRICK_COLS);
    const totalWidth = BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_GAP;
    const startX = (canvasWidth - totalWidth) / 2;

    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        result.push({
          x: startX + col * (BRICK_WIDTH + BRICK_GAP),
          y: BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_GAP),
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          alive: true,
          color: BRICK_COLORS[row % BRICK_COLORS.length],
        });
      }
    }

    return result;
  };

  const resetGame = () => {
    const rect = canvas.getBoundingClientRect();

    isStarted = false;
    isShoot = false;
    isGameOver = false;
    isPaused = false;
    score = 0;
    lastTime = 0;
    sec = 0;
    gameOverHud.reset();

    paddle = {
      x: rect.width / 2 - PADDLE_WIDTH / 2,
      y: rect.height - PADDLE_MARGIN - PADDLE_HEIGHT,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    };

    const angle = -Math.PI / 2;
    ball = {
      x: rect.width / 2,
      y: paddle.y - BALL_RADIUS - 5,
      vx: BALL_SPEED * Math.cos(angle),
      vy: BALL_SPEED * Math.sin(angle),
      radius: BALL_RADIUS,
    };

    bricks = createBricks(rect.width);
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
      isShoot = true;
      return;
    }

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

  const normalizeBallSpeed = () => {
    const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);

    ball.vx = (ball.vx / speed) * BALL_SPEED;
    ball.vy = (ball.vy / speed) * BALL_SPEED;

    const minVy = BALL_SPEED * MIN_VY_RATIO;

    if (Math.abs(ball.vy) < minVy) {
      ball.vy = ball.vy >= 0 ? minVy : -minVy;

      const remainingSpeed = Math.sqrt(BALL_SPEED ** 2 - ball.vy ** 2);
      ball.vx = ball.vx >= 0 ? remainingSpeed : -remainingSpeed;
    }
  };

  const handlePaddleCollision = () => {
    const hit = circleRectHit(
      ball.x,
      ball.y,
      ball.radius,
      paddle.x,
      paddle.y,
      paddle.width,
      paddle.height,
    );
    if (!hit || ball.vy <= 0) return;

    let paddleVx = 0;
    if (keys.ArrowLeft) paddleVx = -PADDLE_SPEED;
    if (keys.ArrowRight) paddleVx = PADDLE_SPEED;

    ball.vy *= -1;

    const influence = 0.4;
    ball.vx += paddleVx * influence;

    const currentSpeed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
    const targetSpeed = BALL_SPEED;
    ball.vx = (ball.vx / currentSpeed) * targetSpeed;
    ball.vy = (ball.vy / currentSpeed) * targetSpeed;

    ball.y = paddle.y - ball.radius;

    normalizeBallSpeed();
  };

  const handleBrickCollision = () => {
    for (const brick of bricks) {
      if (!brick.alive) continue;

      const hit = circleRectHit(
        ball.x,
        ball.y,
        ball.radius,
        brick.x,
        brick.y,
        brick.width,
        brick.height,
      );

      if (hit) {
        brick.alive = false;
        score += 10;

        const ballCenterX = ball.x;
        const ballCenterY = ball.y;
        const brickCenterX = brick.x + brick.width / 2;
        const brickCenterY = brick.y + brick.height / 2;

        const dx = ballCenterX - brickCenterX;
        const dy = ballCenterY - brickCenterY;

        if (Math.abs(dx / brick.width) > Math.abs(dy / brick.height)) {
          ball.vx *= -1;
        } else {
          ball.vy *= -1;
        }

        normalizeBallSpeed();

        break;
      }
    }
  };

  const updatePaddle = (dt: number) => {
    const rect = canvas.getBoundingClientRect();

    if (keys.ArrowLeft) paddle.x -= PADDLE_SPEED * dt;
    if (keys.ArrowRight) paddle.x += PADDLE_SPEED * dt;

    paddle.x = Math.max(0, Math.min(rect.width - PADDLE_WIDTH, paddle.x));
  };

  const updateBall = (dt: number) => {
    const rect = canvas.getBoundingClientRect();

    if (isShoot) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx *= -1;
      }
      if (ball.x + ball.radius > rect.width) {
        ball.x = rect.width - ball.radius;
        ball.vx *= -1;
      }

      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy *= -1;
      }

      if (ball.y + ball.radius > rect.height) {
        isGameOver = true;
        return;
      }
    } else {
      if (keys.ArrowLeft) ball.x -= PADDLE_SPEED * dt;
      if (keys.ArrowRight) ball.x += PADDLE_SPEED * dt;

      ball.x = Math.max(
        PADDLE_WIDTH / 2,
        Math.min(rect.width - PADDLE_WIDTH / 2, ball.x),
      );
    }
  };

  const update = (t: number) => {
    if (isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    sec += dt;

    if (isStarted && !isGameOver) {
      updatePaddle(dt);
      updateBall(dt);
      handlePaddleCollision();
      handleBrickCollision();
    }
  };

  const renderPaddle = () => {
    ctx.fillStyle = PADDLE_COLOR;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  };

  const renderBall = () => {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = BALL_COLOR;
    ctx.fill();
  };

  const renderBricks = () => {
    for (const brick of bricks) {
      if (!brick.alive) continue;
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    }
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    renderBricks();
    renderPaddle();
    renderBall();
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
