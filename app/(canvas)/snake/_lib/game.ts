import {
  createGameOverHud,
  gameHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
} from '@/lib/game';
import { CELL, DIR, STEP } from './config';
import { Point } from './types';

export type TSnakeCallbacks = {
  onScoreSave: (initials: string, score: number) => Promise<void>;
};

export const setupSnake = (
  canvas: HTMLCanvasElement,
  callbacks?: TSnakeCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let snake: Point[] = [{ x: 0, y: 0 }];
  let dir: Point = { x: 0, y: 0 };
  let nextDir: Point = dir;
  let food: Point = { x: 0, y: 0 };

  let score = 0;
  let isStarted = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  let acc = 0;
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

  const gameOverHud = createGameOverHud(canvas, ctx, 'snake', gameOverCallbacks);

  const spawnFood = (): Point => {
    const rect = canvas.getBoundingClientRect();
    const cols = Math.floor(rect.width / CELL);
    const rows = Math.floor(rect.height / CELL);

    while (true) {
      const x = Math.floor(Math.random() * cols) * CELL;
      const y = Math.floor(Math.random() * rows) * CELL;

      const onSnake = snake.some((seg) => seg.x === x && seg.y === y);
      if (!onSnake) return { x, y };
    }
  };

  const startGame = () => {
    if (isStarted) return;
    isStarted = true;
    lastTime = 0;
    acc = 0;
    sec = 0;
  };

  const resetGame = () => {
    const rect = canvas.getBoundingClientRect();

    isStarted = false;
    isGameOver = false;
    isPaused = false;
    score = 0;
    lastTime = 0;
    acc = 0;
    sec = 0;
    gameOverHud.reset();

    const startX = Math.floor(rect.width / 2 / CELL) * CELL;
    const startY = Math.floor(rect.height / 2 / CELL) * CELL;

    snake = [
      { x: startX, y: startY },
      { x: startX - CELL, y: startY },
      { x: startX - CELL * 2, y: startY },
    ];
    dir = { x: 1, y: 0 };
    nextDir = dir;

    food = spawnFood();
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

    if (e.code === 'KeyR' && !isGameOver) {
      resetGame();
      return;
    }

    if (isPaused) return;

    if (e.key in DIR) {
      const cand = DIR[e.key as keyof typeof DIR];

      if (cand.x + dir.x === 0 && cand.y + dir.y === 0) return;

      nextDir = cand;
      e.preventDefault();
    }
  };

  const handleWallCollision = (newHead: Point): boolean => {
    const rect = canvas.getBoundingClientRect();
    return (
      newHead.x < 0 ||
      newHead.y < 0 ||
      newHead.x >= Math.floor(rect.width / CELL) * CELL ||
      newHead.y >= Math.floor(rect.height / CELL) * CELL
    );
  };

  const handleSelfCollision = (newHead: Point): boolean => {
    return snake.some(
      (seg, i) => i > 0 && seg.x === newHead.x && seg.y === newHead.y,
    );
  };

  const handleFoodCollision = (newHead: Point): boolean => {
    return newHead.x === food.x && newHead.y === food.y;
  };

  const updateSnake = () => {
    dir = nextDir;
    const head = snake[0];
    const newHead = { x: head.x + dir.x * CELL, y: head.y + dir.y * CELL };

    if (handleWallCollision(newHead)) {
      isGameOver = true;
      return;
    }

    if (handleSelfCollision(newHead)) {
      isGameOver = true;
      return;
    }

    snake = [newHead, ...snake];

    if (handleFoodCollision(newHead)) {
      score += 1;
      food = spawnFood();
    } else {
      snake = snake.slice(0, -1);
    }
  };

  const update = (t: number) => {
    if (isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    acc += dt;
    sec += dt;

    if (isStarted && !isGameOver) {
      while (acc >= STEP) {
        updateSnake();
        acc -= STEP;
        if (isGameOver) break;
      }
    }
  };

  const renderSnake = () => {
    const head = snake[0];
    if (!head) return;

    ctx.fillStyle = 'limegreen';
    ctx.fillRect(head.x, head.y, CELL, CELL);

    ctx.fillStyle = 'black';
    for (let i = 1; i < snake.length; i++) {
      const seg = snake[i];
      ctx.fillRect(seg.x, seg.y, CELL, CELL);
    }
  };

  const renderFood = () => {
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x, food.y, CELL, CELL);
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    renderSnake();
    renderFood();
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
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKeyDown);
  };
};
