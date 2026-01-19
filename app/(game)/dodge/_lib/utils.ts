import { BASE_ENEMY_SPAWN_INTERVAL, DIRS, INITIALS_KEY_COLS, INITIALS_KEY_GRID, MAX_ENEMY_SPEED, MIN_ENEMY_SPAWN_INTERVAL, MIN_ENEMY_SPEED } from "./config";

export const pickDir = () => {
  const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
  if (dir.vx !== 0 && dir.vy !== 0) {
    const inv = 1 / Math.sqrt(2);
    return { vx: dir.vx * inv, vy: dir.vy * inv };
  }
  return dir;
};

export const spawnOutsideByDir = (
  rect: DOMRect,
  r: number,
  dir: { vx: number; vy: number }
) => {
  const margin = r + 2;

  let x: number;
  let y: number;

  if (dir.vx > 0) x = -margin;
  else if (dir.vx < 0) x = rect.width + margin;
  else x = Math.random() * rect.width;

  if (dir.vy > 0) y = -margin;
  else if (dir.vy < 0) y = rect.height + margin;
  else y = Math.random() * rect.height;

  return { x, y };
};

export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export const circleCircleCollide = (
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
) => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const d = Math.sqrt(dx * dx + dy * dy);
  return d <= r1 + r2;
};

export const getDifficulty = (t: number) => {
  return 1 - Math.exp(-t / 30); // 30을 줄이면 더 빠르고 어렵게 만듬
};

export const lerp = (a: number, b: number, t: number) => {
  return a + (b - a) * t;
};

export const getSpawnInterval = (t: number) => {
  const d = getDifficulty(t);
  return Math.max(
    MIN_ENEMY_SPAWN_INTERVAL,
    lerp(BASE_ENEMY_SPAWN_INTERVAL, 0.1, d) // 0.22를 0.18에 가깝게 줄이면 스폰이 더 촘촘하게 됨
  );
};

export const getEnemySpeedRange = (t: number) => {
  const d = getDifficulty(t);
  const min = lerp(MIN_ENEMY_SPEED, 320, d); // 260을 더 늘리면 속도가 더 빠름
  const max = lerp(MAX_ENEMY_SPEED, 420, d); // 420을 더 늘리면 속도가 더 빠름
  return { min, max };
};

export const randomDirection = () => {
  const a = Math.random() * Math.PI * 2;
  return { vx: Math.cos(a), vy: Math.sin(a) };
};

export const initialLabelAt = (r: number, c: number) => {
  return INITIALS_KEY_GRID[r * INITIALS_KEY_COLS + c];
};