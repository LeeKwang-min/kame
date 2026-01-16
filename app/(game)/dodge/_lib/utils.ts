export const PLAYER_RADIUS = 5;
export const PLAYER_SPEED = 260; // px/sec

export const ENEMY_RADIUS = 6;
export const ENEMY_SPAWN_INTERVAL_MS = 700;
export const MIN_ENEMY_SPEED = 120; // px/frame
export const MAX_ENEMY_SPEED = 220; // px/frame

// 난이도 조절
// 시작부터 많이 나오게 -> BASE_ENEMY_SPAWN_INTERVAL 줄이기
// 후반만 빡세게 하기 -> MIN_ENEMY_SPAWN_INTERVAL 줄이기 or lerp의 2번째값 줄이기
export const BASE_ENEMY_SPAWN_INTERVAL = 0.2; // 줄이면 시작 난이도에서 스폰 간격 빨라짐
export const MIN_ENEMY_SPAWN_INTERVAL = 0.1; // 줄이면 후반 최대 스폰 속도 빨라짐

export const SCORE_PER_SEC = 100;

export const DIRS = [
  { vx: 1, vy: 0 },
  { vx: -1, vy: 0 },
  { vx: 0, vy: 1 },
  { vx: 0, vy: -1 },
  { vx: 1, vy: 1 },
  { vx: 1, vy: -1 },
  { vx: -1, vy: 1 },
  { vx: -1, vy: -1 },
] as const;

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
