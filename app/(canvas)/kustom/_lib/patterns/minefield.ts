import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const MINE_COUNT_MIN = 6;
const MINE_COUNT_MAX = 8;
const MINE_RADIUS = 15;
const DETECTION_RADIUS = 60;
const MINE_WARNING_DURATION = 0.6;
const MINE_ACTIVE_DURATION = 0.3;
const EXPLOSION_RADIUS = 70;
const PATTERN_DURATION = 8.0;

type TMine = {
  x: number;
  y: number;
  state: 'idle' | 'triggered' | 'exploding' | 'done';
  triggerTimer: number;
  explosionTimer: number;
};

const minefield: TPattern = {
  name: 'minefield',
  tier: 'advanced',
  duration: PATTERN_DURATION,

  init(_bossPos: TVector2, _playerPos: TVector2): TPatternState {
    const count = MINE_COUNT_MIN + Math.floor(Math.random() * (MINE_COUNT_MAX - MINE_COUNT_MIN + 1));
    const mines: TMine[] = [];
    const margin = 60;

    for (let i = 0; i < count; i++) {
      mines.push({
        x: margin + Math.random() * (CANVAS_WIDTH - margin * 2),
        y: margin + Math.random() * (CANVAS_HEIGHT - margin * 2),
        state: 'idle',
        triggerTimer: 0,
        explosionTimer: 0,
      });
    }

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      walls: [],
      zones: [],
      custom: { mines },
    };
  },

  update(state: TPatternState, dt: number, playerPos: TVector2, _bossPos: TVector2): void {
    state.elapsed += dt;
    const mines = state.custom.mines as TMine[];

    state.areas = [];

    for (const mine of mines) {
      if (mine.state === 'idle') {
        const dx = playerPos.x - mine.x;
        const dy = playerPos.y - mine.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < DETECTION_RADIUS) {
          mine.state = 'triggered';
          mine.triggerTimer = MINE_WARNING_DURATION;
        }
      } else if (mine.state === 'triggered') {
        mine.triggerTimer -= dt;
        if (mine.triggerTimer <= 0) {
          mine.state = 'exploding';
          mine.explosionTimer = MINE_ACTIVE_DURATION;

          for (const other of mines) {
            if (other.state === 'idle') {
              const dx = other.x - mine.x;
              const dy = other.y - mine.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < EXPLOSION_RADIUS + DETECTION_RADIUS * 0.5) {
                other.state = 'triggered';
                other.triggerTimer = MINE_WARNING_DURATION * 0.4;
              }
            }
          }
        }
      } else if (mine.state === 'exploding') {
        mine.explosionTimer -= dt;

        state.areas.push({
          x: mine.x,
          y: mine.y,
          radius: EXPLOSION_RADIUS,
          warningTimer: 0,
          activeTimer: mine.explosionTimer,
          isActive: true,
        });

        if (mine.explosionTimer <= 0) {
          mine.state = 'done';
        }
      }
    }

    const allDone = mines.every((m) => m.state === 'done');
    if ((allDone && state.elapsed > 1.0) || state.elapsed >= PATTERN_DURATION) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const mines = state.custom.mines as TMine[];

    for (const mine of mines) {
      ctx.save();

      if (mine.state === 'idle') {
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, MINE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(80, 80, 80, 0.7)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mine.x, mine.y, DETECTION_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 60, 60, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        const s = MINE_RADIUS * 0.5;
        ctx.beginPath();
        ctx.moveTo(mine.x - s, mine.y - s);
        ctx.lineTo(mine.x + s, mine.y + s);
        ctx.moveTo(mine.x + s, mine.y - s);
        ctx.lineTo(mine.x - s, mine.y + s);
        ctx.stroke();
      } else if (mine.state === 'triggered') {
        const flash = Math.floor(mine.triggerTimer * 12) % 2 === 0;
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, MINE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = flash ? 'rgba(255, 60, 0, 0.8)' : 'rgba(80, 80, 80, 0.7)';
        ctx.fill();

        const progress = 1 - mine.triggerTimer / MINE_WARNING_DURATION;
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, EXPLOSION_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 50, 0, ${0.1 + progress * 0.2})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 80, 0, ${0.5 + progress * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (mine.state === 'exploding') {
        const fade = mine.explosionTimer / MINE_ACTIVE_DURATION;
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, EXPLOSION_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 100, 0, ${0.6 * fade})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 200, 50, ${0.8 * fade})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.restore();
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(minefield);
export default minefield;
