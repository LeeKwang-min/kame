import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const WARNING_DURATION = 1.5;
const ACTIVE_DURATION = 0.6;
const DANGER_RADIUS = 150;
const PATTERN_DURATION = WARNING_DURATION + ACTIVE_DURATION + 0.3;

const inOut: TPattern = {
  name: 'in-out',
  tier: 'advanced',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2): TPatternState {
    const isInner = Math.random() < 0.5;

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [{
        x: bossPos.x,
        y: bossPos.y,
        radius: DANGER_RADIUS,
        warningTimer: WARNING_DURATION,
        activeTimer: 0,
        isActive: false,
      }],
      custom: { isInner },
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;
    const area = state.areas[0];

    if (area.warningTimer > 0) {
      area.warningTimer -= dt;
      if (area.warningTimer <= 0) {
        area.isActive = true;
        area.activeTimer = ACTIVE_DURATION;
      }
    } else if (area.isActive) {
      area.activeTimer -= dt;
      if (area.activeTimer <= 0) {
        area.isActive = false;
      }
    }

    if (state.elapsed >= PATTERN_DURATION) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const area = state.areas[0];
    const isInner = state.custom.isInner as boolean;

    if (area.warningTimer > 0) {
      const progress = 1 - area.warningTimer / WARNING_DURATION;
      ctx.save();

      if (isInner) {
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 0, ${0.05 + progress * 0.15})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + progress * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(255, 0, 0, ${0.05 + progress * 0.15})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 0, ${0.3 + progress * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + progress * 0.3})`;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isInner ? 'GET OUT!' : 'GET IN!', area.x, area.y - area.radius - 20);

      ctx.restore();
    } else if (area.isActive) {
      const fade = area.activeTimer / ACTIVE_DURATION;
      ctx.save();

      if (isInner) {
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 50, 0, ${0.5 * fade})`;
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255, 50, 0, ${0.5 * fade})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(inOut);
export default inOut;
