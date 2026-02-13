import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const COLS = 4;
const ROWS = 3;
const WARNING_DURATION = 1.5;
const PHASE_DURATION = 1.0;
const PHASE_COUNT = 3;
const PATTERN_DURATION = WARNING_DURATION + PHASE_DURATION * PHASE_COUNT + 0.5;

const checkerboard: TPattern = {
  name: 'checkerboard',
  tier: 'advanced',
  duration: PATTERN_DURATION,

  init(_bossPos: TVector2, _playerPos: TVector2): TPatternState {
    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      walls: [],
      zones: [],
      custom: {
        phase: 'warning',
        currentPhase: 0,
        inverted: false,
      },
    };
  },

  update(state: TPatternState, dt: number, _playerPos: TVector2, _bossPos: TVector2): void {
    state.elapsed += dt;
    const c = state.custom as {
      phase: string; currentPhase: number; inverted: boolean;
    };

    if (state.elapsed < WARNING_DURATION) {
      c.phase = 'warning';
    } else {
      c.phase = 'active';
      const activeTime = state.elapsed - WARNING_DURATION;
      const phaseIndex = Math.floor(activeTime / PHASE_DURATION);

      if (phaseIndex !== c.currentPhase && phaseIndex < PHASE_COUNT) {
        c.currentPhase = phaseIndex;
        c.inverted = !c.inverted;
      }

      const cellW = CANVAS_WIDTH / COLS;
      const cellH = CANVAS_HEIGHT / ROWS;
      state.zones = [];

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const isChecked = (row + col) % 2 === 0;
          const isDanger = c.inverted ? !isChecked : isChecked;

          if (isDanger) {
            state.zones.push({
              x: col * cellW,
              y: row * cellH,
              width: cellW,
              height: cellH,
              warningTimer: 0,
              activeTimer: PHASE_DURATION,
              isActive: true,
              type: 'damage',
            });
          }
        }
      }
    }

    if (state.elapsed >= PATTERN_DURATION) {
      state.zones = [];
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const c = state.custom as {
      phase: string; currentPhase: number; inverted: boolean;
    };

    if (c.phase === 'warning') {
      const progress = state.elapsed / WARNING_DURATION;
      const cellW = CANVAS_WIDTH / COLS;
      const cellH = CANVAS_HEIGHT / ROWS;

      ctx.save();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const isChecked = (row + col) % 2 === 0;
          if (isChecked) {
            ctx.fillStyle = `rgba(255, 30, 30, ${0.05 + progress * 0.15})`;
            ctx.fillRect(col * cellW, row * cellH, cellW, cellH);
          }
        }
      }

      ctx.strokeStyle = `rgba(255, 50, 50, ${0.2 + progress * 0.3})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let col = 1; col < COLS; col++) {
        ctx.beginPath();
        ctx.moveTo(col * cellW, 0);
        ctx.lineTo(col * cellW, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let row = 1; row < ROWS; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * cellH);
        ctx.lineTo(CANVAS_WIDTH, row * cellH);
        ctx.stroke();
      }
      ctx.restore();
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(checkerboard);
export default checkerboard;
