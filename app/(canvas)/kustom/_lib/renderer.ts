import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BG_COLOR,
  GRASS_TILE_SIZE,
  GRASS_TILE_RENDER_SIZE,
  SHURIKEN_RENDER_SIZE,
} from './config';
import { TProjectile, TWall, TZone } from './types';
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

export function renderWalls(ctx: CanvasRenderingContext2D, walls: TWall[]): void {
  for (const wall of walls) {
    ctx.save();
    if (wall.warningTimer > 0) {
      const progress = 1 - wall.warningTimer / (wall.warningTimer + wall.activeTimer || 1);
      ctx.fillStyle = `rgba(180, 80, 40, ${0.15 + progress * 0.25})`;
      ctx.strokeStyle = `rgba(200, 100, 50, ${0.4 + progress * 0.4})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    } else if (wall.isActive) {
      ctx.fillStyle = 'rgba(140, 70, 30, 0.85)';
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeStyle = 'rgba(200, 120, 60, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeStyle = 'rgba(100, 50, 20, 0.4)';
      ctx.lineWidth = 1;
      for (let ly = wall.y + 8; ly < wall.y + wall.height; ly += 12) {
        ctx.beginPath();
        ctx.moveTo(wall.x + 2, ly);
        ctx.lineTo(wall.x + wall.width - 2, ly);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

export function renderZones(ctx: CanvasRenderingContext2D, zones: TZone[]): void {
  for (const zone of zones) {
    ctx.save();
    if (zone.warningTimer > 0) {
      const maxWarning = zone.warningTimer + zone.activeTimer || 1;
      const progress = 1 - zone.warningTimer / maxWarning;
      if (zone.type === 'slow') {
        ctx.fillStyle = `rgba(80, 0, 180, ${0.1 + progress * 0.2})`;
        ctx.strokeStyle = `rgba(120, 40, 220, ${0.3 + progress * 0.5})`;
      } else {
        ctx.fillStyle = `rgba(255, 30, 30, ${0.1 + progress * 0.25})`;
        ctx.strokeStyle = `rgba(255, 50, 50, ${0.3 + progress * 0.5})`;
      }
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    } else if (zone.isActive) {
      const fade = zone.activeTimer > 0 ? Math.min(1, zone.activeTimer / 0.3) : 1;
      if (zone.type === 'slow') {
        ctx.fillStyle = `rgba(100, 20, 200, ${0.3 * fade})`;
        ctx.strokeStyle = `rgba(140, 60, 240, ${0.6 * fade})`;
      } else {
        ctx.fillStyle = `rgba(255, 20, 20, ${0.5 * fade})`;
        ctx.strokeStyle = `rgba(255, 60, 60, ${0.8 * fade})`;
      }
      ctx.lineWidth = 2;
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    }
    ctx.restore();
  }
}
