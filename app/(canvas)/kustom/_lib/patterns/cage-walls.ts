import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const WALL_THICKNESS = 20;
const WARNING_DURATION = 1.5;
const ACTIVE_DURATION = 2.0;
const GAP_SIZE = 80;
const PATTERN_DURATION = WARNING_DURATION + ACTIVE_DURATION + 0.5;

const cageWalls: TPattern = {
  name: 'cage-walls',
  tier: 'mid',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2, _playerPos: TVector2): TPatternState {
    const gapWall = Math.floor(Math.random() * 4); // 0=top,1=bottom,2=left,3=right
    const gapOffset = 0.2 + Math.random() * 0.6;

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
        gapWall,
        gapOffset,
        phase: 'warning',
        closeProgress: 0,
      },
    };
  },

  update(state: TPatternState, dt: number, _playerPos: TVector2, _bossPos: TVector2): void {
    state.elapsed += dt;
    const c = state.custom as {
      bossX: number; bossY: number;
      gapWall: number; gapOffset: number;
      phase: string; closeProgress: number;
    };

    if (state.elapsed < WARNING_DURATION) {
      c.phase = 'warning';
    } else if (state.elapsed < WARNING_DURATION + ACTIVE_DURATION) {
      c.phase = 'active';
      c.closeProgress = Math.min(1, (state.elapsed - WARNING_DURATION) / (ACTIVE_DURATION * 0.6));

      const margin = 200 * (1 - c.closeProgress);
      const cx = c.bossX;
      const cy = c.bossY;

      state.walls = [];

      const top = cy - margin - WALL_THICKNESS;
      const bottom = cy + margin;
      const left = cx - margin - WALL_THICKNESS;
      const right = cx + margin;
      const hSize = margin * 2 + WALL_THICKNESS;
      const vSize = margin * 2 + WALL_THICKNESS * 2;

      const wallDefs = [
        { x: left, y: top, w: hSize + WALL_THICKNESS, h: WALL_THICKNESS, isHorizontal: true },
        { x: left, y: bottom, w: hSize + WALL_THICKNESS, h: WALL_THICKNESS, isHorizontal: true },
        { x: left, y: top, w: WALL_THICKNESS, h: vSize, isHorizontal: false },
        { x: right, y: top, w: WALL_THICKNESS, h: vSize, isHorizontal: false },
      ];

      for (let i = 0; i < wallDefs.length; i++) {
        const wd = wallDefs[i];

        if (i === c.gapWall) {
          if (wd.isHorizontal) {
            const gapX = wd.x + (wd.w - GAP_SIZE) * c.gapOffset;
            if (gapX > wd.x) {
              state.walls.push({
                x: wd.x, y: wd.y, width: gapX - wd.x, height: wd.h,
                vx: 0, vy: 0, warningTimer: 0, activeTimer: ACTIVE_DURATION, isActive: true,
              });
            }
            const afterGap = gapX + GAP_SIZE;
            if (afterGap < wd.x + wd.w) {
              state.walls.push({
                x: afterGap, y: wd.y, width: wd.x + wd.w - afterGap, height: wd.h,
                vx: 0, vy: 0, warningTimer: 0, activeTimer: ACTIVE_DURATION, isActive: true,
              });
            }
          } else {
            const gapY = wd.y + (wd.h - GAP_SIZE) * c.gapOffset;
            if (gapY > wd.y) {
              state.walls.push({
                x: wd.x, y: wd.y, width: wd.w, height: gapY - wd.y,
                vx: 0, vy: 0, warningTimer: 0, activeTimer: ACTIVE_DURATION, isActive: true,
              });
            }
            const afterGap = gapY + GAP_SIZE;
            if (afterGap < wd.y + wd.h) {
              state.walls.push({
                x: wd.x, y: afterGap, width: wd.w, height: wd.y + wd.h - afterGap,
                vx: 0, vy: 0, warningTimer: 0, activeTimer: ACTIVE_DURATION, isActive: true,
              });
            }
          }
        } else {
          state.walls.push({
            x: wd.x, y: wd.y, width: wd.w, height: wd.h,
            vx: 0, vy: 0, warningTimer: 0, activeTimer: ACTIVE_DURATION, isActive: true,
          });
        }
      }
    } else {
      c.phase = 'done';
      state.walls = [];
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const c = state.custom as {
      bossX: number; bossY: number;
      gapWall: number; gapOffset: number;
      phase: string; closeProgress: number;
    };

    if (c.phase === 'warning') {
      const progress = state.elapsed / WARNING_DURATION;
      ctx.save();
      ctx.strokeStyle = `rgba(180, 80, 40, ${0.3 + progress * 0.5})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      const size = 210;
      ctx.strokeRect(c.bossX - size, c.bossY - size, size * 2, size * 2);

      const positions = [
        { x: c.bossX, y: c.bossY - size - 15 },
        { x: c.bossX, y: c.bossY + size + 15 },
        { x: c.bossX - size - 25, y: c.bossY },
        { x: c.bossX + size + 25, y: c.bossY },
      ];
      const gapPos = positions[c.gapWall];
      ctx.fillStyle = `rgba(0, 255, 100, ${0.4 + progress * 0.4})`;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAP', gapPos.x, gapPos.y);
      ctx.restore();
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(cageWalls);
export default cageWalls;
