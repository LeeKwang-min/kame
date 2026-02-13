import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const COLS = 4;
const ROWS = 3;
const INITIAL_WARNING = 1.5;
const SUB_WARNING = 1.0;
const DANGER_DURATION = 1.2;
const CYCLE_COUNT = 3;
// Pattern: initial_warning + (danger + sub_warning) * CYCLE_COUNT - last sub_warning + buffer
const PATTERN_DURATION = INITIAL_WARNING + (DANGER_DURATION + SUB_WARNING) * CYCLE_COUNT - SUB_WARNING + 0.5;

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
        currentCycle: 0,
        inverted: false,
      },
    };
  },

  update(state: TPatternState, dt: number, _playerPos: TVector2, _bossPos: TVector2): void {
    state.elapsed += dt;
    const c = state.custom as {
      phase: string; currentCycle: number; inverted: boolean;
    };

    if (state.elapsed >= PATTERN_DURATION) {
      state.zones = [];
      state.finished = true;
      return;
    }

    if (state.elapsed < INITIAL_WARNING) {
      // Initial warning before first danger
      c.phase = 'warning';
      state.zones = [];
      return;
    }

    const activeTime = state.elapsed - INITIAL_WARNING;
    const cycleDuration = DANGER_DURATION + SUB_WARNING;
    const cycleIndex = Math.floor(activeTime / cycleDuration);
    const timeInCycle = activeTime - cycleIndex * cycleDuration;

    // Update inversion based on cycle
    if (cycleIndex !== c.currentCycle && cycleIndex < CYCLE_COUNT) {
      c.currentCycle = cycleIndex;
      c.inverted = cycleIndex % 2 !== 0;
    }

    const cellW = CANVAS_WIDTH / COLS;
    const cellH = CANVAS_HEIGHT / ROWS;

    if (timeInCycle < DANGER_DURATION) {
      // Danger sub-phase: zones active
      c.phase = 'danger';
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
              activeTimer: DANGER_DURATION - timeInCycle,
              isActive: true,
              type: 'damage',
            });
          }
        }
      }
    } else {
      // Warning sub-phase: zones off, preview of NEXT pattern
      c.phase = 'sub-warning';
      state.zones = [];
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const c = state.custom as {
      phase: string; currentCycle: number; inverted: boolean;
    };

    const cellW = CANVAS_WIDTH / COLS;
    const cellH = CANVAS_HEIGHT / ROWS;

    const renderGrid = (alpha: number): void => {
      ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
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
    };

    const renderPreview = (inverted: boolean, progress: number): void => {
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const isChecked = (row + col) % 2 === 0;
          const isDanger = inverted ? !isChecked : isChecked;
          if (isDanger) {
            ctx.fillStyle = `rgba(255, 30, 30, ${0.05 + progress * 0.15})`;
            ctx.fillRect(col * cellW, row * cellH, cellW, cellH);
          }
        }
      }
    };

    if (c.phase === 'warning') {
      const progress = state.elapsed / INITIAL_WARNING;
      ctx.save();
      renderPreview(false, progress);
      renderGrid(0.2 + progress * 0.3);
      ctx.restore();
    } else if (c.phase === 'sub-warning') {
      // Preview of NEXT cycle's pattern
      const activeTime = state.elapsed - INITIAL_WARNING;
      const cycleDuration = DANGER_DURATION + SUB_WARNING;
      const timeInCycle = activeTime % cycleDuration;
      const subProgress = (timeInCycle - DANGER_DURATION) / SUB_WARNING;
      const nextInverted = (c.currentCycle + 1) % 2 !== 0;

      ctx.save();
      renderPreview(nextInverted, subProgress);
      renderGrid(0.2 + subProgress * 0.3);
      ctx.restore();
    }
    // Active danger zones are rendered by renderZones in boss.ts
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(checkerboard);
export default checkerboard;
