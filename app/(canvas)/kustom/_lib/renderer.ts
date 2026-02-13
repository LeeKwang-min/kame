import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BG_COLOR,
  GRASS_TILE_SIZE,
  GRASS_TILE_RENDER_SIZE,
  SHURIKEN_RENDER_SIZE,
} from './config';
import { TProjectile } from './types';
import { getAssets } from './assets';

let grassPattern: CanvasPattern | null = null;
let grassPatternBuilt = false;

function getGrassPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (grassPatternBuilt) return grassPattern;

  const assets = getAssets();
  if (!assets) return null;

  const tile = document.createElement('canvas');
  tile.width = GRASS_TILE_RENDER_SIZE;
  tile.height = GRASS_TILE_RENDER_SIZE;
  const tileCtx = tile.getContext('2d')!;
  tileCtx.imageSmoothingEnabled = false;
  tileCtx.drawImage(
    assets.grass,
    0, 0, GRASS_TILE_SIZE, GRASS_TILE_SIZE,
    0, 0, GRASS_TILE_RENDER_SIZE, GRASS_TILE_RENDER_SIZE,
  );

  grassPattern = ctx.createPattern(tile, 'repeat');
  grassPatternBuilt = true;
  return grassPattern;
}

export function renderBackground(ctx: CanvasRenderingContext2D): void {
  const pattern = getGrassPattern(ctx);
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

export function renderProjectiles(ctx: CanvasRenderingContext2D, projectiles: TProjectile[], time: number): void {
  const assets = getAssets();
  if (!assets) {
    for (const p of projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    return;
  }

  const size = SHURIKEN_RENDER_SIZE;
  const half = size / 2;
  for (const p of projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(time * 10);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(assets.shuriken, -half, -half, size, size);
    ctx.restore();
  }
}

export function renderTimeHud(ctx: CanvasRenderingContext2D, elapsedTime: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText(`${Math.floor(elapsedTime)}s`, CANVAS_WIDTH - 20, 20);
  ctx.restore();
}
