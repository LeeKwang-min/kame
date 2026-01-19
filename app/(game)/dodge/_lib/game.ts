import { gameOver } from "@/lib/game";
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
  let elapsed = 0;
  let score = 0;
  let spawnAcc = 0;
  let isGameOver = false;
  let isStarted = false;

  const { resetInitial, onInitialKeyDown } = gameOver(canvas, ctx);

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    player = {
      x: rect.width / 2,
      y: rect.height / 2,
    };
  };

  const startGame = () => {
    if (isStarted) return;
    isStarted = true;
    lastTime = 0;
  };

  const resetGame = () => {
    resetInitial();
    isGameOver = false;
    elapsed = 0;
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

  const onKeyDown = (e: KeyboardEvent) => {
    // if (isGameOver) {
    //   if (e.code === "KeyR") {
    //     resetGame();
    //     return;
    //   }
    //   onInitialKeyDown(e);
    //   return;
    // }

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
    const { min, max } = getEnemySpeedRange(elapsed);
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

    const interval = getSpawnInterval(elapsed);

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

  const gameStartHud = () => {
    const rect = canvas.getBoundingClientRect();

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "white";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Press 'S' for start", rect.width / 2, rect.height / 2);
    ctx.restore();
  }

  const gameOverHud = () => {
    const rect = canvas.getBoundingClientRect();
    const totalScore = Math.floor(score);

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(0, 0, rect.width, rect.height);






    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = 2;

    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const cx = rect.width / 2;


    ctx.font = "52px sans-serif";
    ctx.fillText("GAME OVER", cx, rect.height / 2 - 40);

    ctx.font = "22px sans-serif";
    ctx.fillText(`Score: ${totalScore}`, cx, rect.height / 2 + 18);

    ctx.font = "18px sans-serif";
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillText("Press R for Restart", cx, rect.height / 2 + 58);

    ctx.restore();
  }

  const gameHud = () => {
    ctx.save();
    const time = elapsed;
    const totalScore = Math.floor(score);

    ctx.font = "16px sans-serif";
    ctx.fillStyle = "black";
    ctx.textAlign = "left";
    ctx.fillText(`Time: ${time.toFixed(0)}s`, 12, 22);
    ctx.fillText(`Score: ${totalScore}`, 12, 44);
    ctx.restore();
  }

  const drawHud = () => {
    if (!isStarted) {
      gameStartHud();
      return;
    }

    if (isGameOver) {
      gameOverHud();
      // gameOverHud(score);
      return;
    }

    gameHud();
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
      elapsed += dt;
      updateScore(dt);

      updatePlayer(dt);
      trySpawnEnemies(dt);
      updateEnemies(dt);

      if (checkCollision()) {
        isGameOver = true;
        resetInitial();
      }
    }

    drawPlayer();
    drawEnemies();
    drawHud();

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
