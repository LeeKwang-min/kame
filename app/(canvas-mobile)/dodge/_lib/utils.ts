import {
  BASE_ENEMY_SPAWN_INTERVAL,
  DIRS,
  MAX_ENEMY_SPEED,
  MIN_ENEMY_SPAWN_INTERVAL,
  MIN_ENEMY_SPEED,
} from './config';

export const pickDir = () => {
  const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
  if (dir.vx !== 0 && dir.vy !== 0) {
    const inv = 1 / Math.sqrt(2);
    return { vx: dir.vx * inv, vy: dir.vy * inv };
  }
  return dir;
};

export const spawnOutsideByDir = (
  size: number,
  r: number,
  dir: { vx: number; vy: number },
) => {
  const margin = r + 2;

  let x: number;
  let y: number;

  if (dir.vx > 0) x = -margin;
  else if (dir.vx < 0) x = size + margin;
  else x = Math.random() * size;

  if (dir.vy > 0) y = -margin;
  else if (dir.vy < 0) y = size + margin;
  else y = Math.random() * size;

  return { x, y };
};

export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

// 화면 가장자리 랜덤 위치에서 스폰하고 플레이어 방향으로 조준
export const spawnAimingAtPlayer = (
  size: number,
  r: number,
  playerX: number,
  playerY: number,
) => {
  const margin = r + 2;

  // 화면 4개 가장자리 중 하나 선택
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number;

  switch (edge) {
    case 0: // 상단
      x = Math.random() * size;
      y = -margin;
      break;
    case 1: // 하단
      x = Math.random() * size;
      y = size + margin;
      break;
    case 2: // 좌측
      x = -margin;
      y = Math.random() * size;
      break;
    default: // 우측
      x = size + margin;
      y = Math.random() * size;
      break;
  }

  // 플레이어 방향 계산
  const dx = playerX - x;
  const dy = playerY - y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const vx = dx / dist;
  const vy = dy / dist;

  return { x, y, vx, vy };
};

export const circleCircleCollide = (
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
) => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const d = Math.sqrt(dx * dx + dy * dy);
  return d <= r1 + r2;
};

export const getDifficulty = (t: number) => {
  return 1 - Math.exp(-t / 30); // 15로 줄여서 난이도 상승 2배 빠름
};

export const lerp = (a: number, b: number, t: number) => {
  return a + (b - a) * t;
};

export const getSpawnInterval = (t: number) => {
  const d = getDifficulty(t);
  return Math.max(
    MIN_ENEMY_SPAWN_INTERVAL,
    lerp(BASE_ENEMY_SPAWN_INTERVAL, 0.1, d), // 0.22를 0.18에 가깝게 줄이면 스폰이 더 촘촘하게 됨
  );
};

export const getEnemySpeedRange = (t: number) => {
  const d = getDifficulty(t);
  const min = lerp(MIN_ENEMY_SPEED, 400, d); // 후반 최소 속도 400
  const max = lerp(MAX_ENEMY_SPEED, 520, d); // 후반 최대 속도 520
  return { min, max };
};

export const randomDirection = () => {
  const a = Math.random() * Math.PI * 2;
  return { vx: Math.cos(a), vy: Math.sin(a) };
};
