import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const WARNING_DURATION = 1.2;
const SWEEP_DURATION = 1.5;
const LASER_WIDTH = 18;
const SWEEP_ANGLE = Math.PI;
const PATTERN_DURATION = WARNING_DURATION + SWEEP_DURATION + 0.3;

const sweepingLaser: TPattern = {
  name: 'sweeping-laser',
  tier: 'mid',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2, playerPos: TVector2): TPatternState {
    const dx = playerPos.x - bossPos.x;
    const dy = playerPos.y - bossPos.y;
    const startAngle = Math.atan2(dy, dx) - SWEEP_ANGLE / 2;
    const clockwise = Math.random() < 0.5;

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      walls: [],
      zones: [],
      custom: {
        bossX: bossPos.x,
        bossY: bossPos.y,
        startAngle,
        clockwise,
        currentAngle: startAngle,
        phase: 'warning',
      },
    };
  },

  update(state: TPatternState, dt: number, _playerPos: TVector2, _bossPos: TVector2): void {
    state.elapsed += dt;
    const c = state.custom as {
      bossX: number; bossY: number;
      startAngle: number; clockwise: boolean;
      currentAngle: number; phase: string;
    };

    if (state.elapsed < WARNING_DURATION) {
      c.phase = 'warning';
      c.currentAngle = c.startAngle;
    } else if (state.elapsed < WARNING_DURATION + SWEEP_DURATION) {
      c.phase = 'active';
      const sweepProgress = (state.elapsed - WARNING_DURATION) / SWEEP_DURATION;
      const direction = c.clockwise ? 1 : -1;
      c.currentAngle = c.startAngle + direction * SWEEP_ANGLE * sweepProgress;

      const maxDist = Math.sqrt(CANVAS_WIDTH * CANVAS_WIDTH + CANVAS_HEIGHT * CANVAS_HEIGHT);
      const endX = c.bossX + Math.cos(c.currentAngle) * maxDist;
      const endY = c.bossY + Math.sin(c.currentAngle) * maxDist;

      state.lasers = [{
        x1: c.bossX,
        y1: c.bossY,
        x2: endX,
        y2: endY,
        width: LASER_WIDTH,
        warningTimer: 0,
        activeTimer: SWEEP_DURATION - (state.elapsed - WARNING_DURATION),
        isActive: true,
      }];
    } else {
      c.phase = 'done';
      state.lasers = [];
    }

    if (state.elapsed >= PATTERN_DURATION) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const c = state.custom as {
      bossX: number; bossY: number;
      startAngle: number; clockwise: boolean;
      currentAngle: number; phase: string;
    };

    if (c.phase === 'warning') {
      const progress = state.elapsed / WARNING_DURATION;
      const maxDist = Math.sqrt(CANVAS_WIDTH * CANVAS_WIDTH + CANVAS_HEIGHT * CANVAS_HEIGHT);

      ctx.save();
      ctx.globalAlpha = 0.1 + progress * 0.15;
      ctx.fillStyle = '#ff2222';
      ctx.beginPath();
      ctx.moveTo(c.bossX, c.bossY);
      const direction = c.clockwise ? 1 : -1;
      const startA = c.startAngle;
      const endA = c.startAngle + direction * SWEEP_ANGLE;
      ctx.arc(c.bossX, c.bossY, maxDist,
        direction > 0 ? startA : endA,
        direction > 0 ? endA : startA,
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + progress * 0.4})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(c.bossX, c.bossY);
      ctx.lineTo(
        c.bossX + Math.cos(c.startAngle) * maxDist,
        c.bossY + Math.sin(c.startAngle) * maxDist,
      );
      ctx.stroke();
      ctx.restore();
    } else if (c.phase === 'active') {
      for (const laser of state.lasers) {
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

registerPattern(sweepingLaser);
export default sweepingLaser;
