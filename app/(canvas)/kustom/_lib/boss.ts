import {
  BOSS_X,
  BOSS_Y,
  BOSS_RADIUS,
  BOSS_COLOR,
  BOSS_ROTATION_SPEED,
  BASE_ATTACK_INTERVAL,
  MIN_ATTACK_INTERVAL,
  ATTACK_INTERVAL_DECREASE_RATE,
  TIER_EXTREME_TIME,
} from './config';
import { TPatternState, TVector2 } from './types';
import { pickRandomPattern } from './patterns/registry';

// Import all patterns to trigger registration
import './patterns/aimed-shot';
import './patterns/radial-burst';
import './patterns/laser-beam';
import './patterns/area-hazard';
import './patterns/in-out';
import './patterns/spiral';
import './patterns/bullet-wall';

export type TBoss = {
  x: number;
  y: number;
  rotation: number;
  attackTimer: number;
  activePatterns: TActivePattern[];
};

export type TActivePattern = {
  state: TPatternState;
  pattern: ReturnType<typeof pickRandomPattern>;
};

export function createBoss(): TBoss {
  return {
    x: BOSS_X,
    y: BOSS_Y,
    rotation: 0,
    attackTimer: 2.0,
    activePatterns: [],
  };
}

export function getAttackInterval(elapsedTime: number): number {
  const interval = BASE_ATTACK_INTERVAL - elapsedTime * ATTACK_INTERVAL_DECREASE_RATE;
  return Math.max(MIN_ATTACK_INTERVAL, interval);
}

export function updateBoss(
  boss: TBoss,
  dt: number,
  elapsedTime: number,
  playerPos: TVector2,
): void {
  boss.rotation += BOSS_ROTATION_SPEED * dt;

  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) {
    const pattern = pickRandomPattern(elapsedTime);
    if (pattern) {
      const bossPos: TVector2 = { x: boss.x, y: boss.y };
      const state = pattern.init(bossPos, playerPos);

      boss.activePatterns.push({ state, pattern });

      if (elapsedTime >= TIER_EXTREME_TIME && Math.random() < 0.5) {
        const pattern2 = pickRandomPattern(elapsedTime);
        if (pattern2) {
          const state2 = pattern2.init(bossPos, playerPos);
          boss.activePatterns.push({ state: state2, pattern: pattern2 });
        }
      }
    }
    boss.attackTimer = getAttackInterval(elapsedTime);
  }

  const bossPos: TVector2 = { x: boss.x, y: boss.y };
  for (const ap of boss.activePatterns) {
    if (ap.pattern) {
      ap.pattern.update(ap.state, dt, playerPos, bossPos);
    }
  }

  boss.activePatterns = boss.activePatterns.filter(
    (ap) => ap.pattern && !ap.pattern.isFinished(ap.state),
  );
}

export function renderBoss(boss: TBoss, ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.rotate(boss.rotation);

  const sides = 8;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides;
    const px = Math.cos(angle) * BOSS_RADIUS;
    const py = Math.sin(angle) * BOSS_RADIUS;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = BOSS_COLOR;
  ctx.fill();
  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides;
    const px = Math.cos(angle) * BOSS_RADIUS * 0.5;
    const py = Math.sin(angle) * BOSS_RADIUS * 0.5;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(200, 0, 0, 0.3)';
  ctx.fill();

  ctx.restore();
}

export function renderPatterns(boss: TBoss, ctx: CanvasRenderingContext2D): void {
  for (const ap of boss.activePatterns) {
    if (ap.pattern) {
      ap.pattern.render(ap.state, ctx);
    }
  }
}
