import { TPattern, TPatternState, TVector2 } from '../types';
import { BULLET_RADIUS, BULLET_COLOR, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';
import { renderProjectiles } from '../renderer';

const SHOT_COUNT_MIN = 3;
const SHOT_COUNT_MAX = 5;
const SHOT_SPEED = 250;
const SHOT_INTERVAL = 0.15;
const PATTERN_DURATION = 2.0;

const aimedShot: TPattern = {
  name: 'aimed-shot',
  tier: 'basic',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2, playerPos: TVector2): TPatternState {
    const dx = playerPos.x - bossPos.x;
    const dy = playerPos.y - bossPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;
    const shotCount = SHOT_COUNT_MIN + Math.floor(Math.random() * (SHOT_COUNT_MAX - SHOT_COUNT_MIN + 1));

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      custom: {
        dirX,
        dirY,
        shotCount,
        shotsFired: 0,
        nextShotTime: 0,
        bossX: bossPos.x,
        bossY: bossPos.y,
      },
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;
    const custom = state.custom as {
      dirX: number;
      dirY: number;
      shotCount: number;
      bossX: number;
      bossY: number;
      shotsFired: number;
      nextShotTime: number;
    };

    if (custom.shotsFired < custom.shotCount && state.elapsed >= custom.nextShotTime) {
      state.projectiles.push({
        x: custom.bossX,
        y: custom.bossY,
        vx: custom.dirX * SHOT_SPEED,
        vy: custom.dirY * SHOT_SPEED,
        radius: BULLET_RADIUS,
        color: BULLET_COLOR,
      });
      custom.shotsFired++;
      custom.nextShotTime = state.elapsed + SHOT_INTERVAL;
    }

    for (const p of state.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    state.projectiles = state.projectiles.filter(
      (p) => p.x > -50 && p.x < CANVAS_WIDTH + 50 && p.y > -50 && p.y < CANVAS_HEIGHT + 50,
    );

    if (state.projectiles.length === 0 && custom.shotsFired >= custom.shotCount) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    renderProjectiles(ctx, state.projectiles, state.elapsed);
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(aimedShot);
export default aimedShot;
