import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const GAP_HEIGHT = 80;
const MOVE_SPEED = 100;
const WARNING_DURATION = 1.5;
const PATTERN_DURATION = WARNING_DURATION + CANVAS_WIDTH / MOVE_SPEED + 1.0;

const corridor: TPattern = {
  name: 'corridor',
  tier: 'advanced',
  duration: PATTERN_DURATION,

  init(_bossPos: TVector2, _playerPos: TVector2): TPatternState {
    const fromLeft = Math.random() < 0.5;
    const gapY = GAP_HEIGHT + Math.random() * (CANVAS_HEIGHT - GAP_HEIGHT * 3);
    const startX = fromLeft ? -CANVAS_WIDTH : CANVAS_WIDTH;
    const vx = fromLeft ? MOVE_SPEED : -MOVE_SPEED;

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      walls: [],
      zones: [],
      custom: {
        gapY,
        startX,
        vx,
        currentX: startX,
        fromLeft,
        phase: 'warning',
      },
    };
  },

  update(state: TPatternState, dt: number, _playerPos: TVector2, _bossPos: TVector2): void {
    state.elapsed += dt;
    const c = state.custom as {
      gapY: number; startX: number; vx: number;
      currentX: number; fromLeft: boolean; phase: string;
    };

    if (state.elapsed < WARNING_DURATION) {
      c.phase = 'warning';
    } else {
      c.phase = 'active';
      c.currentX += c.vx * dt;

      const topWall = {
        x: c.currentX,
        y: -10,
        width: CANVAS_WIDTH,
        height: c.gapY + 10,
        vx: 0,
        vy: 0,
        warningTimer: 0,
        activeTimer: PATTERN_DURATION,
        isActive: true,
      };

      const bottomWall = {
        x: c.currentX,
        y: c.gapY + GAP_HEIGHT,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT - c.gapY - GAP_HEIGHT + 10,
        vx: 0,
        vy: 0,
        warningTimer: 0,
        activeTimer: PATTERN_DURATION,
        isActive: true,
      };

      state.walls = [topWall, bottomWall];

      if (c.fromLeft && c.currentX > CANVAS_WIDTH + 50) {
        state.finished = true;
      } else if (!c.fromLeft && c.currentX + CANVAS_WIDTH < -50) {
        state.finished = true;
      }
    }

    if (state.elapsed >= PATTERN_DURATION) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const c = state.custom as {
      gapY: number; startX: number; vx: number;
      currentX: number; fromLeft: boolean; phase: string;
    };

    if (c.phase === 'warning') {
      const progress = state.elapsed / WARNING_DURATION;

      ctx.save();
      ctx.fillStyle = `rgba(0, 255, 100, ${0.1 + progress * 0.2})`;
      ctx.fillRect(0, c.gapY, CANVAS_WIDTH, GAP_HEIGHT);
      ctx.strokeStyle = `rgba(0, 255, 100, ${0.3 + progress * 0.4})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(0, c.gapY, CANVAS_WIDTH, GAP_HEIGHT);

      const arrowX = c.fromLeft ? 40 : CANVAS_WIDTH - 40;
      ctx.fillStyle = `rgba(255, 100, 50, ${0.5 + progress * 0.4})`;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.fromLeft ? '>>>' : '<<<', arrowX, c.gapY + GAP_HEIGHT / 2);

      ctx.restore();
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(corridor);
export default corridor;
