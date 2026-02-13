import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BG_COLOR,
  GRID_COLOR,
  GRID_SPACING,
} from './config';

export function renderBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  for (let x = 0; x < CANVAS_WIDTH; x += GRID_SPACING) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < CANVAS_HEIGHT; y += GRID_SPACING) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
}

export function renderTimeHud(ctx: CanvasRenderingContext2D, elapsedTime: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`${Math.floor(elapsedTime)}s`, CANVAS_WIDTH - 20, 20);
  ctx.restore();
}
