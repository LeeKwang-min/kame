import {
  PATH_PIXELS,
  HP_BASE,
  HP_SCALE_FACTOR,
  HP_SCALE_EXPONENT,
  ENEMY_SPEED_BASE,
  ENEMY_TYPE_MULT,
  BOSS_WAVE_INTERVAL,
  KILL_GOLD_BASE,
  BOSS_KILL_GOLD,
  ENEMIES_PER_WAVE,
} from './config';
import { TEnemy, TEnemyType } from './types';

// ─── Path Segment Lengths (loop: includes closing segment) ───

export const SEGMENT_LENGTHS: number[] = [];
let TOTAL_PATH_LENGTH = 0;

const segCount = PATH_PIXELS.length; // loop has N segments (N points → N segments back to start)
for (let i = 0; i < segCount; i++) {
  const [x1, y1] = PATH_PIXELS[i];
  const [x2, y2] = PATH_PIXELS[(i + 1) % segCount];
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  SEGMENT_LENGTHS.push(len);
  TOTAL_PATH_LENGTH += len;
}

export { TOTAL_PATH_LENGTH };

// ─── Interpolate Position on Path (loop-aware) ───

export function getPositionOnPath(
  pathIndex: number,
  pathProgress: number,
): { x: number; y: number } {
  const n = PATH_PIXELS.length;
  const idx = ((pathIndex % n) + n) % n;
  const next = (idx + 1) % n;
  const [x1, y1] = PATH_PIXELS[idx];
  const [x2, y2] = PATH_PIXELS[next];
  const t = Math.max(0, Math.min(1, pathProgress));
  return {
    x: x1 + (x2 - x1) * t,
    y: y1 + (y2 - y1) * t,
  };
}

// ─── Wave Composition (exactly ENEMIES_PER_WAVE enemies) ───

export function getWaveComposition(wave: number): TEnemyType[] {
  const total = ENEMIES_PER_WAVE;
  const isBoss = wave % BOSS_WAVE_INTERVAL === 0;

  // Scale enemy types with wave number
  const bossCount = isBoss ? Math.min(1 + Math.floor(wave / BOSS_WAVE_INTERVAL), 8) : 0;
  const tankCount = wave >= 3 ? Math.min(Math.floor(wave * 2), 25) : 0;
  const fastCount = wave >= 2 ? Math.min(Math.floor(wave * 3), 35) : 0;
  const normalCount = Math.max(0, total - bossCount - tankCount - fastCount);

  const enemies: TEnemyType[] = [];
  for (let i = 0; i < normalCount; i++) enemies.push('normal');
  for (let i = 0; i < fastCount; i++) enemies.push('fast');
  for (let i = 0; i < tankCount; i++) enemies.push('tank');

  // Shuffle non-boss enemies
  for (let i = enemies.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [enemies[i], enemies[j]] = [enemies[j], enemies[i]];
  }

  // Boss at end
  for (let i = 0; i < bossCount; i++) enemies.push('boss');

  return enemies;
}

// ─── Create Enemy ───

let nextEnemyId = 1;

export function createEnemy(type: TEnemyType, wave: number): TEnemy {
  const mult = ENEMY_TYPE_MULT[type];
  const hp = Math.round(
    HP_BASE * mult.hp * Math.pow(1 + wave * HP_SCALE_FACTOR, HP_SCALE_EXPONENT),
  );
  const speed = ENEMY_SPEED_BASE * mult.speed;
  const gold =
    type === 'boss'
      ? BOSS_KILL_GOLD + wave * 2
      : KILL_GOLD_BASE * mult.gold;

  const startPos = getPositionOnPath(0, 0);

  return {
    id: nextEnemyId++,
    type,
    hp,
    maxHp: hp,
    speed,
    pathIndex: 0,
    pathProgress: 0,
    x: startPos.x,
    y: startPos.y,
    gold,
    slowAmount: 0,
    slowTimer: 0,
    debuffAmount: 0,
    debuffTimer: 0,
    hitFlash: 0,
  };
}

export function resetEnemyIdCounter(): void {
  nextEnemyId = 1;
}

// ─── Move Enemy (loops endlessly around the oval) ───

export function moveEnemy(enemy: TEnemy, dt: number): void {
  // Apply slow
  const speedMult = 1 - enemy.slowAmount;
  const effectiveSpeed = enemy.speed * Math.max(0.1, speedMult);
  const distance = effectiveSpeed * dt;

  // Tick status effects
  if (enemy.slowTimer > 0) {
    enemy.slowTimer -= dt;
    if (enemy.slowTimer <= 0) {
      enemy.slowAmount = 0;
      enemy.slowTimer = 0;
    }
  }
  if (enemy.debuffTimer > 0) {
    enemy.debuffTimer -= dt;
    if (enemy.debuffTimer <= 0) {
      enemy.debuffAmount = 0;
      enemy.debuffTimer = 0;
    }
  }
  if (enemy.hitFlash > 0) {
    enemy.hitFlash -= dt;
  }

  // Move along looping path
  const n = PATH_PIXELS.length;
  const segLen = SEGMENT_LENGTHS[((enemy.pathIndex % n) + n) % n];
  const progressDelta = distance / segLen;
  enemy.pathProgress += progressDelta;

  while (enemy.pathProgress >= 1) {
    enemy.pathProgress -= 1;
    enemy.pathIndex = (enemy.pathIndex + 1) % n; // wrap around
  }

  const pos = getPositionOnPath(enemy.pathIndex, enemy.pathProgress);
  enemy.x = pos.x;
  enemy.y = pos.y;
}
