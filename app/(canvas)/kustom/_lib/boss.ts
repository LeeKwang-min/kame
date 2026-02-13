import {
  BOSS_X,
  BOSS_Y,
  BOSS_RADIUS,
  BOSS_MOVE_SPEED,
  BASE_ATTACK_INTERVAL,
  MIN_ATTACK_INTERVAL,
  ATTACK_INTERVAL_DECREASE_RATE,
  TIER_EXTREME_TIME,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_RADIUS,
  BOSS_FRAME_W,
  BOSS_FRAME_H,
  BOSS_FRAME_COUNT,
  BOSS_RENDER_SIZE,
  BOSS_ANIM_SPEED,
} from './config';
import { TPatternState, TVector2 } from './types';
import { pickRandomPattern } from './patterns/registry';
import { getAssets } from './assets';
import { renderWalls, renderZones } from './renderer';

// Import all patterns to trigger registration
import './patterns/aimed-shot';
import './patterns/radial-burst';
import './patterns/laser-beam';
import './patterns/area-hazard';
import './patterns/in-out';
import './patterns/spiral';
import './patterns/bullet-wall';
import './patterns/ground-spike';
import './patterns/falling-rocks';
import './patterns/cage-walls';
import './patterns/poison-zone';
import './patterns/sweeping-laser';
import './patterns/corridor';
import './patterns/checkerboard';
import './patterns/minefield';

export type TBoss = {
  x: number;
  y: number;
  rotation: number;
  attackTimer: number;
  activePatterns: TActivePattern[];
  animFrame: number;
  animTimer: number;
  facingLeft: boolean;
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
    animFrame: 0,
    animTimer: 0,
    facingLeft: false,
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
  // Face toward player
  boss.facingLeft = playerPos.x < boss.x;

  // Move toward player only when no active patterns
  if (boss.activePatterns.length === 0) {
    const dx = playerPos.x - boss.x;
    const dy = playerPos.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      boss.x += (dx / dist) * BOSS_MOVE_SPEED * dt;
      boss.y += (dy / dist) * BOSS_MOVE_SPEED * dt;
      boss.x = Math.max(BOSS_RADIUS, Math.min(CANVAS_WIDTH - BOSS_RADIUS, boss.x));
      boss.y = Math.max(BOSS_RADIUS, Math.min(CANVAS_HEIGHT - BOSS_RADIUS, boss.y));
    }
  }

  // Animation
  boss.animTimer += dt;
  if (boss.animTimer >= 1 / BOSS_ANIM_SPEED) {
    boss.animTimer -= 1 / BOSS_ANIM_SPEED;
    boss.animFrame = (boss.animFrame + 1) % BOSS_FRAME_COUNT;
  }

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

export function checkBossCollision(boss: TBoss, playerX: number, playerY: number): boolean {
  const dx = playerX - boss.x;
  const dy = playerY - boss.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < BOSS_RADIUS + PLAYER_RADIUS;
}

export function renderBoss(boss: TBoss, ctx: CanvasRenderingContext2D): void {
  const assets = getAssets();
  const half = BOSS_RENDER_SIZE / 2;

  ctx.save();
  ctx.translate(boss.x, boss.y);

  if (assets) {
    if (boss.facingLeft) {
      ctx.scale(-1, 1);
    }
    ctx.imageSmoothingEnabled = false;
    const srcX = boss.animFrame * BOSS_FRAME_W;
    ctx.drawImage(
      assets.bossWalk,
      srcX, 0, BOSS_FRAME_W, BOSS_FRAME_H,
      -half, -half, BOSS_RENDER_SIZE, BOSS_RENDER_SIZE,
    );
  } else {
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
    ctx.fillStyle = '#8b0000';
    ctx.fill();
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export function renderPatterns(boss: TBoss, ctx: CanvasRenderingContext2D): void {
  for (const ap of boss.activePatterns) {
    if (ap.pattern) {
      renderWalls(ctx, ap.state.walls);
      renderZones(ctx, ap.state.zones);
      ap.pattern.render(ap.state, ctx);
    }
  }
}
