import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const ROCK_COUNT_MIN = 4;
const ROCK_COUNT_MAX = 6;
const ROCK_WIDTH = 50;
const ROCK_HEIGHT = 40;
const FALL_SPEED = 300;
const WARNING_DURATION = 1.0;
const STAGGER_DELAY = 0.3;
const PATTERN_DURATION =
  WARNING_DURATION + STAGGER_DELAY * ROCK_COUNT_MAX + CANVAS_HEIGHT / FALL_SPEED + 0.5;

const fallingRocks: TPattern = {
  name: 'falling-rocks',
  tier: 'basic',
  duration: PATTERN_DURATION,

  init(_bossPos: TVector2, _playerPos: TVector2): TPatternState {
    const count =
      ROCK_COUNT_MIN + Math.floor(Math.random() * (ROCK_COUNT_MAX - ROCK_COUNT_MIN + 1));
    const walls = [];

    for (let i = 0; i < count; i++) {
      const x = ROCK_WIDTH / 2 + Math.random() * (CANVAS_WIDTH - ROCK_WIDTH);
      walls.push({
        x,
        y: -ROCK_HEIGHT,
        width: ROCK_WIDTH,
        height: ROCK_HEIGHT,
        vx: 0,
        vy: FALL_SPEED,
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
      areas: [],
      walls,
      zones: [],
      custom: { warningPositions: walls.map((w) => w.x + ROCK_WIDTH / 2) },
    };
  },

  update(state: TPatternState, dt: number, _playerPos: TVector2, _bossPos: TVector2): void {
    state.elapsed += dt;

    for (const wall of state.walls) {
      if (wall.warningTimer > 0) {
        wall.warningTimer -= dt;
        if (wall.warningTimer <= 0) {
          wall.isActive = true;
        }
      } else if (wall.isActive) {
        wall.y += wall.vy * dt;
        if (wall.y > CANVAS_HEIGHT + ROCK_HEIGHT) {
          wall.isActive = false;
        }
      }
    }

    const allDone = state.walls.every((w) => !w.isActive && w.warningTimer <= 0);
    if (allDone && state.elapsed > WARNING_DURATION + 0.5) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const warningPositions = state.custom.warningPositions as number[];

    for (let i = 0; i < state.walls.length; i++) {
      const wall = state.walls[i];
      if (wall.warningTimer > 0) {
        const maxW = WARNING_DURATION + i * STAGGER_DELAY;
        const progress = 1 - wall.warningTimer / maxW;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 80, 0, ${0.3 + progress * 0.5})`;
        ctx.lineWidth = ROCK_WIDTH;
        ctx.globalAlpha = 0.1 + progress * 0.15;
        ctx.beginPath();
        ctx.moveTo(warningPositions[i], 0);
        ctx.lineTo(warningPositions[i], CANVAS_HEIGHT);
        ctx.stroke();
        ctx.restore();
      }
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(fallingRocks);
export default fallingRocks;
