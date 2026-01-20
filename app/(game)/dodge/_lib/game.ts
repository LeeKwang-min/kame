import { drawHud } from "@/lib/game";
import { ENEMY_RADIUS, PLAYER_RADIUS, PLAYER_SPEED, SCORE_PER_SEC } from "./config";
import { Enemy, Player } from "./types";
import {
  circleCircleCollide,
  getEnemySpeedRange,
  getSpawnInterval,
  pickDir,
  spawnOutsideByDir,
} from "./utils";

export const setupDodge = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
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


  const startGame = () => {
    if (isStarted) return;
    isStarted = true;
    lastTime = 0;
  };

  const resetGame = () => {
    isStarted = false;
    isGameOver = false;
    sec = 0;
    score = 0;
    spawnAcc = 0;
    enemies = [];

    const rect = canvas.getBoundingClientRect();
    player = {
      x: rect.width / 2,
      y: rect.height / 2,
    };

    lastTime = 0;
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
    if (e.code === "KeyS") {
      startGame();
      return;
    }

    if (e.code === "KeyR") {
      resetGame();
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

  const updatePlayer = (dt: number) => {
    const rect = canvas.getBoundingClientRect();

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

    player.x = Math.max(PLAYER_RADIUS, Math.min(rect.width - PLAYER_RADIUS, player.x));
    player.y = Math.max(PLAYER_RADIUS, Math.min(rect.height - PLAYER_RADIUS, player.y));
  };

  const drawPlayer = () => {
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();
  };

  const spawnEnemy = () => {
    if (!isStarted || isGameOver) return;

    const rect = canvas.getBoundingClientRect();

    const dir = pickDir();
    const { min, max } = getEnemySpeedRange(sec);
    const speed = min + Math.random() * (max - min);

    const { x, y } = spawnOutsideByDir(rect, ENEMY_RADIUS, dir);

    enemies.push({
      id: enemyId++,
      x,
      y,
      r: ENEMY_RADIUS,
      speed,
      vx: dir.vx,
      vy: dir.vy,
    });
  };

  const trySpawnEnemies = (dt: number) => {
    spawnAcc += dt;

    const interval = getSpawnInterval(sec);

    while (spawnAcc >= interval) {
      spawnAcc -= interval;
      spawnEnemy();
    }
  };

  const updateEnemies = (dt: number) => {
    const rect = canvas.getBoundingClientRect();
    for (const e of enemies) {
      e.x += e.vx * e.speed * dt;
      e.y += e.vy * e.speed * dt;
    }

    const isOutside = (e: Enemy) => {
      const m = e.r + 2;
      return e.x < -m || e.x > rect.width + m || e.y < -m || e.y > rect.height + m;
    };

    enemies = enemies.filter((e) => !isOutside(e));
  };

  const drawEnemies = () => {
    for (const e of enemies) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();
    }
  };

  const checkCollision = () => {
    for (const e of enemies) {
      if (circleCircleCollide(player.x, player.y, PLAYER_RADIUS, e.x, e.y, e.r)) {
        return true;
      }
    }
    return false;
  };

  const updateScore = (dt: number) => {
    score += SCORE_PER_SEC * dt;
  };

  resize();

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  let raf = 0;
  const draw = (t: number) => {
    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (isStarted && !isGameOver) {
      sec += dt;
      updateScore(dt);

      updatePlayer(dt);
      trySpawnEnemies(dt);
      updateEnemies(dt);

      if (checkCollision()) {
        isGameOver = true;
      }
    }

    drawPlayer();
    drawEnemies();
    drawHud(canvas, ctx, score, sec, isStarted, isGameOver);

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };
}
