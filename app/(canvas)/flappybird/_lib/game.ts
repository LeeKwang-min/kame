import {
  createGameOverHud,
  gameHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
} from '@/lib/game';
import { Pipe, Point } from './types';
import {
  BIRD_GRAVITY,
  BIRD_JUMP,
  BIRD_RADIUS,
  MIN_PIPE_GAP,
  MAX_PIPE_GAP,
  PIPE_MARGIN,
  PIPE_SPAWN_INTERVAL,
  PIPE_SPEED,
  PIPE_WIDTH,
  PIPE_SPEED_PER_SECOND,
  PIPE_SPEED_MAX,
} from './config';
import { circleRectHit, rand } from '@/lib/utils';

export type TFlappyBirdCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (initials: string, score: number) => Promise<void>;
};

export const setupFlappyBird = (
  canvas: HTMLCanvasElement,
  callbacks?: TFlappyBirdCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let bird: Point = { x: 300, y: 300 };
  let vy = 0;

  let pipes: Pipe[] = [];
  let spawnTimer = 0;

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
    'flappybird',
    gameOverCallbacks,
  );

  const startGame = async () => {
    if (isStarted) return;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    vy = 0;
    isStarted = true;
    lastTime = 0;
    sec = 0;
  };

  const resetGame = () => {
    const rect = canvas.getBoundingClientRect();

    vy = 0;
    isStarted = false;
    isGameOver = false;
    isPaused = false;
    score = 0;
    lastTime = 0;
    sec = 0;
    gameOverHud.reset();

    bird = { x: 300, y: rect.height / 2 };
    pipes = [];
    spawnTimer = 0;
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
      vy = -BIRD_JUMP;
      return;
    }
  };

  const makePipe = (screenW: number, screenH: number): Pipe => {
    const width = PIPE_WIDTH;
    const margin = PIPE_MARGIN;

    const gapHeight = rand(MIN_PIPE_GAP, MAX_PIPE_GAP);
    const gapYMin = margin;
    const gapYMax = screenH - margin - gapHeight;
    const gapY = gapYMin + Math.random() * (gapYMax - gapYMin);

    return { x: screenW + width, width, gapY, gapHeight, passed: false };
  };

  const updateBird = (dt: number) => {
    vy += BIRD_GRAVITY * dt;
    bird.y += vy * dt;
  };

  const updatePipes = (dt: number) => {
    const rect = canvas.getBoundingClientRect();

    spawnTimer += dt;
    if (spawnTimer >= PIPE_SPAWN_INTERVAL) {
      spawnTimer = 0;
      pipes.push(makePipe(rect.width, rect.height));
    }

    const currentSpeed = Math.min(
      PIPE_SPEED_MAX,
      PIPE_SPEED + sec * PIPE_SPEED_PER_SECOND,
    );
    for (const p of pipes) {
      p.x -= currentSpeed * dt;
    }

    pipes = pipes.filter((p) => p.x + p.width > 0);
  };

  const handleBoundaryCollision = (): boolean => {
    const rect = canvas.getBoundingClientRect();
    return bird.y + BIRD_RADIUS > rect.height || bird.y - BIRD_RADIUS < 0;
  };

  const handlePipeCollision = (): boolean => {
    const rect = canvas.getBoundingClientRect();

    for (const p of pipes) {
      const hitTop = circleRectHit(
        bird.x,
        bird.y,
        BIRD_RADIUS,
        p.x,
        0,
        p.width,
        p.gapY,
      );
      const bottomY = p.gapY + p.gapHeight;
      const hitBottom = circleRectHit(
        bird.x,
        bird.y,
        BIRD_RADIUS,
        p.x,
        bottomY,
        p.width,
        rect.height - bottomY,
      );

      if (hitTop || hitBottom) {
        return true;
      }
    }
    return false;
  };

  const updateScore = () => {
    for (const p of pipes) {
      if (p.passed) continue;
      if (bird.x > p.x + p.width) {
        p.passed = true;
        score++;
      }
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
      updateBird(dt);
      updatePipes(dt);

      if (handleBoundaryCollision() || handlePipeCollision()) {
        isGameOver = true;
        return;
      }

      updateScore();
    }
  };

  const renderBird = () => {
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'limegreen';
    ctx.fill();
  };

  const renderPipes = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = 'seagreen';
    for (const p of pipes) {
      ctx.fillRect(p.x, 0, p.width, p.gapY);
      const bottomY = p.gapY + p.gapHeight;
      ctx.fillRect(p.x, bottomY, p.width, rect.height - bottomY);
    }
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    renderPipes();
    renderBird();
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

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
  };
};
