import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const SPIKE_COUNT = 4;
const SPIKE_RADIUS_MIN = 50;
const SPIKE_RADIUS_MAX = 65;
const WARNING_DURATION = 1.2;
const ACTIVE_DURATION = 0.4;
const STAGGER_DELAY = 0.4;
const PATTERN_DURATION =
  WARNING_DURATION + STAGGER_DELAY * (SPIKE_COUNT - 1) + ACTIVE_DURATION + 0.3;

const groundSpike: TPattern = {
  name: 'ground-spike',
  tier: 'basic',
  duration: PATTERN_DURATION,

  init(_bossPos: TVector2, playerPos: TVector2): TPatternState {
    const areas = [];
    const margin = SPIKE_RADIUS_MAX;

    for (let i = 0; i < SPIKE_COUNT; i++) {
      const radius = SPIKE_RADIUS_MIN + Math.random() * (SPIKE_RADIUS_MAX - SPIKE_RADIUS_MIN);
      const offsetX = (Math.random() - 0.5) * 250;
      const offsetY = (Math.random() - 0.5) * 250;
      const x = Math.max(margin, Math.min(CANVAS_WIDTH - margin, playerPos.x + offsetX));
      const y = Math.max(margin, Math.min(CANVAS_HEIGHT - margin, playerPos.y + offsetY));

      areas.push({
        x,
        y,
        radius,
        warningTimer: WARNING_DURATION + i * STAGGER_DELAY,
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
      walls: [],
      zones: [],
      custom: {},
    };
  },

  update(state: TPatternState, dt: number, _playerPos: TVector2, _bossPos: TVector2): void {
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
        const maxWarning = WARNING_DURATION + STAGGER_DELAY * (SPIKE_COUNT - 1);
        const progress = 1 - area.warningTimer / maxWarning;
        ctx.save();
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 100, 0, ${0.1 + progress * 0.3})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 140, 0, ${0.4 + progress * 0.5})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        const s = area.radius * 0.3;
        ctx.strokeStyle = `rgba(255, 160, 0, ${0.5 + progress * 0.4})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(area.x - s, area.y - s);
        ctx.lineTo(area.x + s, area.y + s);
        ctx.moveTo(area.x + s, area.y - s);
        ctx.lineTo(area.x - s, area.y + s);
        ctx.stroke();
        ctx.restore();
      } else if (area.isActive) {
        const fade = area.activeTimer / ACTIVE_DURATION;
        ctx.save();
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 120, 0, ${0.6 * fade})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 180, 50, ${0.9 * fade})`;
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

registerPattern(groundSpike);
export default groundSpike;
