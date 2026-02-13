import { TPattern, TPatternState, TVector2 } from '../types';
import { BULLET_RADIUS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const BULLET_SPEED = 180;
const ROTATION_SPEED = 3.0;
const FIRE_RATE = 0.08;
const PATTERN_DURATION = 3.0;
const ARM_COUNT = 2;

const spiral: TPattern = {
  name: 'spiral',
  tier: 'advanced',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2): TPatternState {
    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      custom: {
        bossX: bossPos.x,
        bossY: bossPos.y,
        nextFireTime: 0,
        angle: 0,
      },
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;
    const custom = state.custom as { bossX: number; bossY: number; nextFireTime: number; angle: number };

    custom.angle += ROTATION_SPEED * dt;

    if (state.elapsed < PATTERN_DURATION && state.elapsed >= custom.nextFireTime) {
      for (let arm = 0; arm < ARM_COUNT; arm++) {
        const angle = custom.angle + (Math.PI * 2 * arm) / ARM_COUNT;
        state.projectiles.push({
          x: custom.bossX,
          y: custom.bossY,
          vx: Math.cos(angle) * BULLET_SPEED,
          vy: Math.sin(angle) * BULLET_SPEED,
          radius: BULLET_RADIUS,
          color: '#ff6644',
        });
      }
      custom.nextFireTime = state.elapsed + FIRE_RATE;
    }

    for (const p of state.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    state.projectiles = state.projectiles.filter(
      (p) => p.x > -50 && p.x < CANVAS_WIDTH + 50 && p.y > -50 && p.y < CANVAS_HEIGHT + 50,
    );

    if (state.elapsed >= PATTERN_DURATION + 1.0 && state.projectiles.length === 0) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    for (const p of state.projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(spiral);
export default spiral;
