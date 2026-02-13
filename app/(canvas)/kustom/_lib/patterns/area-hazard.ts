import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const WARNING_DURATION = 1.5;
const ACTIVE_DURATION = 0.5;
const AREA_COUNT_MIN = 2;
const AREA_COUNT_MAX = 3;
const AREA_RADIUS_MIN = 60;
const AREA_RADIUS_MAX = 80;
const PATTERN_DURATION = WARNING_DURATION + ACTIVE_DURATION + 0.3;

const areaHazard: TPattern = {
  name: 'area-hazard',
  tier: 'mid',
  duration: PATTERN_DURATION,

  init(_bossPos: TVector2, playerPos: TVector2): TPatternState {
    const count = AREA_COUNT_MIN + Math.floor(Math.random() * (AREA_COUNT_MAX - AREA_COUNT_MIN + 1));
    const areas = [];
    const margin = AREA_RADIUS_MAX;

    for (let i = 0; i < count; i++) {
      const radius = AREA_RADIUS_MIN + Math.random() * (AREA_RADIUS_MAX - AREA_RADIUS_MIN);
      const offsetX = (Math.random() - 0.5) * 200;
      const offsetY = (Math.random() - 0.5) * 200;
      const x = Math.max(margin, Math.min(CANVAS_WIDTH - margin, playerPos.x + offsetX));
      const y = Math.max(margin, Math.min(CANVAS_HEIGHT - margin, playerPos.y + offsetY));

      areas.push({
        x,
        y,
        radius,
        warningTimer: WARNING_DURATION,
        activeTimer: 0,
        isActive: false,
      });
    }

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas,
      custom: {},
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;

    for (const area of state.areas) {
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
    }

    if (state.elapsed >= PATTERN_DURATION) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    for (const area of state.areas) {
      if (area.warningTimer > 0) {
        const progress = 1 - area.warningTimer / WARNING_DURATION;
        ctx.save();
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 140, 0, ${0.1 + progress * 0.2})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 140, 0, ${0.3 + progress * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      } else if (area.isActive) {
        const fade = area.activeTimer / ACTIVE_DURATION;
        ctx.save();
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 100, 0, ${0.6 * fade})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 200, 0, ${0.8 * fade})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(areaHazard);
export default areaHazard;
