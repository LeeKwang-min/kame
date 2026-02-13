import { TPattern, TPatternState, TVector2 } from '../types';
import { BULLET_RADIUS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';
import { renderProjectiles } from '../renderer';

const WALL_SPEED = 150;
const BULLET_SPACING = 30;
const GAP_SIZE = 60;
const GAP_COUNT_MIN = 1;
const GAP_COUNT_MAX = 2;
const PATTERN_DURATION = 6.0;

const bulletWall: TPattern = {
  name: 'bullet-wall',
  tier: 'advanced',
  duration: PATTERN_DURATION,

  init(): TPatternState {
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -BULLET_RADIUS : CANVAS_WIDTH + BULLET_RADIUS;
    const vx = fromLeft ? WALL_SPEED : -WALL_SPEED;
    const gapCount = GAP_COUNT_MIN + Math.floor(Math.random() * (GAP_COUNT_MAX - GAP_COUNT_MIN + 1));

    const gaps: number[] = [];
    for (let i = 0; i < gapCount; i++) {
      const gapY = GAP_SIZE + Math.random() * (CANVAS_HEIGHT - GAP_SIZE * 2);
      gaps.push(gapY);
    }
    gaps.sort((a, b) => a - b);

    const projectiles = [];
    for (let y = BULLET_RADIUS; y < CANVAS_HEIGHT; y += BULLET_SPACING) {
      let inGap = false;
      for (const gapY of gaps) {
        if (y > gapY - GAP_SIZE / 2 && y < gapY + GAP_SIZE / 2) {
          inGap = true;
          break;
        }
      }
      if (!inGap) {
        projectiles.push({
          x: startX,
          y,
          vx,
          vy: 0,
          radius: BULLET_RADIUS,
          color: '#ff4488',
        });
      }
    }

    return {
      elapsed: 0,
      finished: false,
      projectiles,
      lasers: [],
      areas: [],
      custom: { gaps, fromLeft },
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;

    for (const p of state.projectiles) {
      p.x += p.vx * dt;
    }

    state.projectiles = state.projectiles.filter(
      (p) => p.x > -50 && p.x < CANVAS_WIDTH + 50,
    );

    if (state.projectiles.length === 0 && state.elapsed > 0.5) {
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

registerPattern(bulletWall);
export default bulletWall;
