import { TPattern, TPatternState, TVector2 } from '../types';
import { BULLET_RADIUS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';
import { renderProjectiles } from '../renderer';

const ZONE_COUNT = 3;
const ZONE_SIZE_MIN = 100;
const ZONE_SIZE_MAX = 140;
const ZONE_WARNING = 1.2;
const ZONE_ACTIVE = 4.0;
const SHOT_DELAY = 1.5;
const SHOT_SPEED = 220;
const PATTERN_DURATION = ZONE_WARNING + ZONE_ACTIVE + 0.5;

const poisonZone: TPattern = {
  name: 'poison-zone',
  tier: 'mid',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2, playerPos: TVector2): TPatternState {
    const zones = [];

    for (let i = 0; i < ZONE_COUNT; i++) {
      const w = ZONE_SIZE_MIN + Math.random() * (ZONE_SIZE_MAX - ZONE_SIZE_MIN);
      const h = ZONE_SIZE_MIN + Math.random() * (ZONE_SIZE_MAX - ZONE_SIZE_MIN);
      const offsetX = (Math.random() - 0.5) * 300;
      const offsetY = (Math.random() - 0.5) * 300;
      const x = Math.max(0, Math.min(CANVAS_WIDTH - w, playerPos.x + offsetX - w / 2));
      const y = Math.max(0, Math.min(CANVAS_HEIGHT - h, playerPos.y + offsetY - h / 2));

      zones.push({
        x, y, width: w, height: h,
        warningTimer: ZONE_WARNING,
        activeTimer: ZONE_ACTIVE,
        isActive: false,
        type: 'slow' as const,
      });
    }

    const dx = playerPos.x - bossPos.x;
    const dy = playerPos.y - bossPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      walls: [],
      zones,
      custom: {
        bossX: bossPos.x,
        bossY: bossPos.y,
        dirX: dx / dist,
        dirY: dy / dist,
        shotsFired: 0,
        maxShots: 2,
        nextShotTime: ZONE_WARNING + SHOT_DELAY,
      },
    };
  },

  update(state: TPatternState, dt: number, playerPos: TVector2, _bossPos: TVector2): void {
    state.elapsed += dt;

    for (const zone of state.zones) {
      if (zone.warningTimer > 0) {
        zone.warningTimer -= dt;
        if (zone.warningTimer <= 0) {
          zone.isActive = true;
        }
      } else if (zone.isActive) {
        zone.activeTimer -= dt;
        if (zone.activeTimer <= 0) {
          zone.isActive = false;
        }
      }
    }

    const c = state.custom as {
      bossX: number; bossY: number;
      dirX: number; dirY: number;
      shotsFired: number; maxShots: number;
      nextShotTime: number;
    };

    if (c.shotsFired < c.maxShots && state.elapsed >= c.nextShotTime) {
      const dx = playerPos.x - c.bossX;
      const dy = playerPos.y - c.bossY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      state.projectiles.push({
        x: c.bossX,
        y: c.bossY,
        vx: (dx / dist) * SHOT_SPEED,
        vy: (dy / dist) * SHOT_SPEED,
        radius: BULLET_RADIUS,
        color: '#aa44ff',
      });
      c.shotsFired++;
      c.nextShotTime = state.elapsed + SHOT_DELAY;
    }

    for (const p of state.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    state.projectiles = state.projectiles.filter(
      (p) => p.x > -50 && p.x < CANVAS_WIDTH + 50 && p.y > -50 && p.y < CANVAS_HEIGHT + 50,
    );

    if (state.elapsed >= PATTERN_DURATION && state.projectiles.length === 0) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    renderProjectiles(ctx, state.projectiles, state.elapsed);
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(poisonZone);
export default poisonZone;
