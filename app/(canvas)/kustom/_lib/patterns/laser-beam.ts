import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const WARNING_DURATION = 1.0;
const ACTIVE_DURATION = 0.5;
const LASER_WIDTH = 20;
const PATTERN_DURATION = WARNING_DURATION + ACTIVE_DURATION + 0.3;

const laserBeam: TPattern = {
  name: 'laser-beam',
  tier: 'mid',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2, playerPos: TVector2): TPatternState {
    const dx = playerPos.x - bossPos.x;
    const dy = playerPos.y - bossPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;
    const maxDist = Math.sqrt(CANVAS_WIDTH * CANVAS_WIDTH + CANVAS_HEIGHT * CANVAS_HEIGHT);

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [{
        x1: bossPos.x,
        y1: bossPos.y,
        x2: bossPos.x + dirX * maxDist,
        y2: bossPos.y + dirY * maxDist,
        width: LASER_WIDTH,
        warningTimer: WARNING_DURATION,
        activeTimer: 0,
        isActive: false,
      }],
      areas: [],
      custom: {},
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;

    for (const laser of state.lasers) {
      if (laser.warningTimer > 0) {
        laser.warningTimer -= dt;
        if (laser.warningTimer <= 0) {
          laser.isActive = true;
          laser.activeTimer = ACTIVE_DURATION;
        }
      } else if (laser.isActive) {
        laser.activeTimer -= dt;
        if (laser.activeTimer <= 0) {
          laser.isActive = false;
        }
      }
    }

    if (state.elapsed >= PATTERN_DURATION) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    for (const laser of state.lasers) {
      if (laser.warningTimer > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(laser.x1, laser.y1);
        ctx.lineTo(laser.x2, laser.y2);
        ctx.stroke();
        ctx.restore();
      } else if (laser.isActive) {
        ctx.save();
        ctx.strokeStyle = '#ff2222';
        ctx.lineWidth = laser.width;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(laser.x1, laser.y1);
        ctx.lineTo(laser.x2, laser.y2);
        ctx.stroke();
        ctx.strokeStyle = '#ff8888';
        ctx.lineWidth = laser.width * 0.3;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(laser.x1, laser.y1);
        ctx.lineTo(laser.x2, laser.y2);
        ctx.stroke();
        ctx.restore();
      }
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(laserBeam);
export default laserBeam;
