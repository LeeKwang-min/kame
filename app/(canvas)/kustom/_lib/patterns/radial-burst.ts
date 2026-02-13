import { TPattern, TPatternState, TVector2 } from '../types';
import { BULLET_RADIUS, BULLET_COLOR, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const BULLET_COUNT_MIN = 8;
const BULLET_COUNT_MAX = 12;
const BULLET_SPEED = 200;
const PATTERN_DURATION = 3.0;

const radialBurst: TPattern = {
  name: 'radial-burst',
  tier: 'basic',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2): TPatternState {
    const count = BULLET_COUNT_MIN + Math.floor(Math.random() * (BULLET_COUNT_MAX - BULLET_COUNT_MIN + 1));
    const projectiles = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      projectiles.push({
        x: bossPos.x,
        y: bossPos.y,
        vx: Math.cos(angle) * BULLET_SPEED,
        vy: Math.sin(angle) * BULLET_SPEED,
        radius: BULLET_RADIUS,
        color: BULLET_COLOR,
      });
    }

    return {
      elapsed: 0,
      finished: false,
      projectiles,
      lasers: [],
      areas: [],
      custom: {},
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;

    for (const p of state.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    state.projectiles = state.projectiles.filter(
      (p) => p.x > -50 && p.x < CANVAS_WIDTH + 50 && p.y > -50 && p.y < CANVAS_HEIGHT + 50,
    );

    if (state.projectiles.length === 0 && state.elapsed > 0.5) {
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

registerPattern(radialBurst);
export default radialBurst;
