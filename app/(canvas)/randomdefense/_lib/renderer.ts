import {
  CANVAS_HEIGHT,
  MAP_WIDTH,
  PANEL_X,
  PANEL_WIDTH,
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  PATH_PIXELS,
  PATH_ROAD_HALF_WIDTH,
  TIER_COLORS,
  TIER_BORDER_COLORS,
  STAGE_X,
  STAGE_Y,
  STAGE_W,
  STAGE_H,
  MAX_ENEMIES_ON_SCREEN,
  ENEMIES_PER_WAVE,
} from './config';
import {
  TPlacedUnit,
  TEnemy,
  TProjectile,
  TParticle,
  TFloatingText,
  TDragState,
  TWaveState,
  TGroundZone,
} from './types';
import { getSummonCost, getSellValue } from './units';
import { drawSprite, WEAPON_COLORS } from './sprites';

// ─── Pre-computed path center rectangle ───

const _pathXs = PATH_PIXELS.map((p) => p[0]);
const _pathYs = PATH_PIXELS.map((p) => p[1]);
const PATH_CL = Math.min(..._pathXs);
const PATH_CR = Math.max(..._pathXs);
const PATH_CT = Math.min(..._pathYs);
const PATH_CB = Math.max(..._pathYs);

// ─── Grass tile cache ───

let grassTile: HTMLCanvasElement | null = null;

function getGrassTile(): HTMLCanvasElement {
  if (grassTile) return grassTile;
  const s = 16;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d')!;

  g.fillStyle = '#2d5016';
  g.fillRect(0, 0, s, s);

  const shades = ['#3a6b22', '#1e4010', '#356320', '#264d18'];
  for (let y = 0; y < s; y += 2) {
    for (let x = 0; x < s; x += 2) {
      const hash = (x * 7 + y * 13 + 3) % 11;
      if (hash < 4) {
        g.fillStyle = shades[hash];
        g.fillRect(x, y, 2, 2);
      }
    }
  }

  grassTile = c;
  return c;
}

// ─── Background ───

export function drawBackground(ctx: CanvasRenderingContext2D): void {
  // Dark game board
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, MAP_WIDTH, CANVAS_HEIGHT);

  // Panel background
  ctx.fillStyle = '#16162a';
  ctx.fillRect(PANEL_X, 0, PANEL_WIDTH, CANVAS_HEIGHT);

  // Panel separator
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PANEL_X, 0);
  ctx.lineTo(PANEL_X, CANVAS_HEIGHT);
  ctx.stroke();
}

// ─── Path (dirt road loop) ───

export function drawPath(ctx: CanvasRenderingContext2D): void {
  if (PATH_PIXELS.length < 2) return;

  ctx.save();

  const hw = PATH_ROAD_HALF_WIDTH;
  const oL = PATH_CL - hw;
  const oT = PATH_CT - hw;
  const oW = PATH_CR - PATH_CL + hw * 2;
  const oH = PATH_CB - PATH_CT + hw * 2;
  const outerR = 20;

  // Dark soil base
  ctx.fillStyle = '#5a3d1e';
  roundRect(ctx, oL, oT, oW, oH, outerR);
  ctx.fill();

  // Lighter road surface
  ctx.fillStyle = '#7a5a32';
  roundRect(ctx, oL + 3, oT + 3, oW - 6, oH - 6, outerR - 2);
  ctx.fill();

  // Outer border
  ctx.strokeStyle = '#3d2810';
  ctx.lineWidth = 2;
  roundRect(ctx, oL, oT, oW, oH, outerR);
  ctx.stroke();

  // Dashed center line (wheel tracks)
  ctx.strokeStyle = 'rgba(160, 130, 80, 0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 8]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(PATH_PIXELS[0][0], PATH_PIXELS[0][1]);
  for (let i = 1; i < PATH_PIXELS.length; i++) {
    ctx.lineTo(PATH_PIXELS[i][0], PATH_PIXELS[i][1]);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Stone/pebble texture along each side
  const sides = [
    { startX: PATH_CL, startY: PATH_CT, endX: PATH_CR, endY: PATH_CT, perpX: 0, perpY: 1 },
    { startX: PATH_CR, startY: PATH_CT, endX: PATH_CR, endY: PATH_CB, perpX: 1, perpY: 0 },
    { startX: PATH_CR, startY: PATH_CB, endX: PATH_CL, endY: PATH_CB, perpX: 0, perpY: 1 },
    { startX: PATH_CL, startY: PATH_CB, endX: PATH_CL, endY: PATH_CT, perpX: 1, perpY: 0 },
  ];

  for (let s = 0; s < sides.length; s++) {
    const { startX, startY, endX, endY } = sides[s];
    for (let i = 0; i < 25; i++) {
      const t = i / 25;
      const cx = startX + (endX - startX) * t;
      const cy = startY + (endY - startY) * t;
      const offset = ((i * 7 + s * 13 + 5) % (hw * 2 - 6)) - (hw - 3);
      const isHoriz = startY === endY;
      const sx = isHoriz ? cx : cx + offset;
      const sy = isHoriz ? cy + offset : cy;
      ctx.fillStyle = (i + s) % 3 === 0 ? 'rgba(138, 106, 64, 0.5)' : 'rgba(90, 60, 30, 0.4)';
      ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
    }
  }

  ctx.restore();
}

// ─── Stage (grass platform) ───

export function drawStage(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  // Clip to stage shape
  roundRect(ctx, STAGE_X, STAGE_Y, STAGE_W, STAGE_H, 14);
  ctx.clip();

  // Grass pattern fill
  const tile = getGrassTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
  } else {
    ctx.fillStyle = '#2d5016';
  }
  ctx.fillRect(STAGE_X, STAGE_Y, STAGE_W, STAGE_H);

  // Lighter overlay for grid area (placement zone)
  ctx.fillStyle = 'rgba(50, 100, 25, 0.15)';
  ctx.fillRect(
    GRID_OFFSET_X,
    GRID_OFFSET_Y,
    GRID_COLS * CELL_SIZE,
    GRID_ROWS * CELL_SIZE,
  );

  // Subtle grass detail — darker patches in outer ring
  const gridLeft = GRID_OFFSET_X;
  const gridTop = GRID_OFFSET_Y;
  const gridRight = GRID_OFFSET_X + GRID_COLS * CELL_SIZE;
  const gridBottom = GRID_OFFSET_Y + GRID_ROWS * CELL_SIZE;

  for (let i = 0; i < 40; i++) {
    const hash1 = (i * 137 + 53) % (STAGE_W - 20);
    const hash2 = (i * 97 + 31) % (STAGE_H - 20);
    const px = STAGE_X + 10 + hash1;
    const py = STAGE_Y + 10 + hash2;

    // Only in the outer ring (not on the grid)
    if (px >= gridLeft && px <= gridRight && py >= gridTop && py <= gridBottom) continue;

    ctx.fillStyle = i % 3 === 0 ? '#1e4010' : '#3a6b22';
    ctx.fillRect(px, py, 3, 3);
  }

  ctx.restore();

  // Green border
  ctx.strokeStyle = 'rgba(60, 130, 40, 0.35)';
  ctx.lineWidth = 2;
  roundRect(ctx, STAGE_X, STAGE_Y, STAGE_W, STAGE_H, 14);
  ctx.stroke();
}

// ─── Grid ───

export function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.lineWidth = 1;

  for (let col = 0; col <= GRID_COLS; col++) {
    const x = GRID_OFFSET_X + col * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(x, GRID_OFFSET_Y);
    ctx.lineTo(x, GRID_OFFSET_Y + GRID_ROWS * CELL_SIZE);
    ctx.stroke();
  }
  for (let row = 0; row <= GRID_ROWS; row++) {
    const y = GRID_OFFSET_Y + row * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(GRID_OFFSET_X, y);
    ctx.lineTo(GRID_OFFSET_X + GRID_COLS * CELL_SIZE, y);
    ctx.stroke();
  }
}

// ─── Unit ───

export function drawUnit(
  ctx: CanvasRenderingContext2D,
  unit: TPlacedUnit,
  isSelected: boolean,
  alpha: number = 1,
): void {
  const { x, y, def } = unit;
  const radius = CELL_SIZE * 0.38;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Buffer aura range
  if (def.archetype === 'buffer' && def.buffRadius) {
    ctx.beginPath();
    ctx.arc(x, y, def.buffRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 215, 0, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Debuffer aura range
  if (def.archetype === 'debuffer' && def.debuffRadius) {
    const auraRadius = def.debuffRadius * unit.buffMultiplier;
    ctx.beginPath();
    ctx.arc(x, y, auraRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Buff glow (base ring + pulse)
  if (unit.buffMultiplier > 1) {
    const glowPulse = 0.15 + 0.1 * Math.sin(performance.now() * 0.005);
    ctx.beginPath();
    ctx.arc(x, y + radius * 0.3, radius + 6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 215, 0, ${glowPulse})`;
    ctx.fill();
  }

  // Pulse animation (tower breathing effect, replaces bobbing)
  const pulse = 1.0 + Math.sin(performance.now() * 0.003 + unit.id * 2.1) * 0.02;

  // Pixel art sprite with tier glow / attack flash
  const flashActive = unit.attackFlash > 0;
  ctx.save();
  ctx.shadowColor = flashActive ? '#ffffff' : TIER_BORDER_COLORS[def.tier - 1];
  ctx.shadowBlur = flashActive ? 15 : def.tier >= 5 ? 12 : def.tier >= 3 ? 8 : 4;

  drawSprite(ctx, x, y, def.archetype, def.color, radius * 2 * pulse);
  ctx.restore();

  // Target direction indicator dot (replaces sprite flip)
  if (unit.targetId !== null) {
    const indicatorDist = radius + 3;
    const ix = x + Math.cos(unit.angle) * indicatorDist;
    const iy = y + Math.sin(unit.angle) * indicatorDist;
    ctx.beginPath();
    ctx.arc(ix, iy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = WEAPON_COLORS[def.archetype];
    ctx.fill();
  }

  // Tier bars (replaces tier dots)
  const barY = y + radius + 4;
  const barWidth = 3;
  const totalWidth = def.tier * barWidth + (def.tier - 1) * 1;
  const startX = x - totalWidth / 2;
  for (let i = 0; i < def.tier; i++) {
    ctx.fillStyle = TIER_COLORS[def.tier - 1];
    ctx.fillRect(startX + i * (barWidth + 1), barY, barWidth, 2);
  }

  ctx.globalAlpha = 1;

  // Selected range indicator
  if (isSelected) {
    // Cell-sized bright border
    const halfCell = CELL_SIZE / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - halfCell + 2, y - halfCell + 2, CELL_SIZE - 4, CELL_SIZE - 4);

    // Range circle
    ctx.beginPath();
    ctx.arc(x, y, def.range, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();
  }

  ctx.restore();
}

// ─── Merge Highlight ───

export function drawMergeHighlight(
  ctx: CanvasRenderingContext2D,
  unit: TPlacedUnit,
  time: number,
): void {
  const { x, y } = unit;
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);
  const hlRadius = CELL_SIZE * 0.45;

  ctx.save();
  // Outer glow ring
  ctx.beginPath();
  ctx.arc(x, y, hlRadius + 3 + pulse * 3, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(34, 197, 94, ${0.4 + pulse * 0.4})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner fill
  ctx.beginPath();
  ctx.arc(x, y, hlRadius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(34, 197, 94, ${0.08 + pulse * 0.08})`;
  ctx.fill();

  // Corner brackets
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.3})`;
  ctx.lineWidth = 2;
  const half = CELL_SIZE / 2 - 2;
  const len = 8;
  ctx.beginPath();
  ctx.moveTo(x - half, y - half + len);
  ctx.lineTo(x - half, y - half);
  ctx.lineTo(x - half + len, y - half);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + half - len, y - half);
  ctx.lineTo(x + half, y - half);
  ctx.lineTo(x + half, y - half + len);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - half, y + half - len);
  ctx.lineTo(x - half, y + half);
  ctx.lineTo(x - half + len, y + half);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + half - len, y + half);
  ctx.lineTo(x + half, y + half);
  ctx.lineTo(x + half, y + half - len);
  ctx.stroke();

  ctx.restore();
}

// ─── Ground Zone (frost floor) ───

export function drawGroundZone(ctx: CanvasRenderingContext2D, zone: TGroundZone, time: number): void {
  const alphaFactor = Math.min(1, zone.remainingLife / zone.duration);
  const { x, y, radius } = zone;

  ctx.save();

  // Gradient fill
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, `rgba(96, 165, 250, ${0.15 * alphaFactor})`);
  grad.addColorStop(0.6, `rgba(147, 197, 253, ${0.08 * alphaFactor})`);
  grad.addColorStop(1, 'rgba(96, 165, 250, 0)');
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Rotating dashed border
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 0.0004);
  ctx.beginPath();
  ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(147, 197, 253, ${0.25 * alphaFactor})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 7]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Frost crystal particles (deterministic)
  const crystalCount = 6;
  for (let i = 0; i < crystalCount; i++) {
    const seed = zone.id * 1000 + i;
    const orbitR = radius * 0.3 + ((seed * 7 + 13) % 100) / 100 * radius * 0.5;
    const speed = 0.0003 + ((seed * 3 + 7) % 50) / 50 * 0.0005;
    const angle = time * speed + seed * 2.4;
    const cx = x + Math.cos(angle) * orbitR;
    const cy = y + Math.sin(angle) * orbitR;
    const sparkle = (0.3 + 0.3 * Math.sin(time * 0.003 + seed)) * alphaFactor;

    ctx.fillStyle = `rgba(200, 220, 255, ${sparkle})`;
    ctx.beginPath();
    const s = 1.5 + (seed % 3);
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.7, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s * 0.7, cy);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// ─── Slow Field Aura ───

export function drawSlowField(ctx: CanvasRenderingContext2D, unit: TPlacedUnit, time: number): void {
  const { x, y, def } = unit;
  if (def.archetype !== 'slow' || !def.slowRadius) return;
  const auraRadius = def.slowRadius * unit.buffMultiplier;

  ctx.save();

  const grad = ctx.createRadialGradient(x, y, 0, x, y, auraRadius);
  grad.addColorStop(0, 'rgba(96, 165, 250, 0.08)');
  grad.addColorStop(0.5, 'rgba(147, 197, 253, 0.04)');
  grad.addColorStop(1, 'rgba(96, 165, 250, 0.0)');
  ctx.beginPath();
  ctx.arc(x, y, auraRadius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 0.0004);
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius - 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(147, 197, 253, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 7]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.restore();
}

// ─── Enemy ───

export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: TEnemy): void {
  const { x, y, type, hp, maxHp } = enemy;
  const size = type === 'boss' ? 18 : 10;

  ctx.save();

  // Hit flash
  if (enemy.hitFlash > 0) {
    ctx.globalAlpha = 0.6 + enemy.hitFlash * 4;
  }

  // Status effect tint
  let bodyColor = '#e2e8f0';
  if (type === 'fast') bodyColor = '#fbbf24';
  else if (type === 'tank') bodyColor = '#64748b';
  else if (type === 'boss') bodyColor = '#ef4444';

  if (enemy.slowTimer > 0) {
    bodyColor = blendColors(bodyColor, '#60a5fa', 0.4);
  }
  if (enemy.debuffTimer > 0) {
    bodyColor = blendColors(bodyColor, '#a855f7', 0.3);
  }

  ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : bodyColor;

  // Shape by type
  ctx.beginPath();
  switch (type) {
    case 'normal':
      ctx.arc(x, y, size, 0, Math.PI * 2);
      break;
    case 'fast':
      // Triangle
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size, y + size * 0.7);
      ctx.lineTo(x + size, y + size * 0.7);
      ctx.closePath();
      break;
    case 'tank':
      // Square
      ctx.rect(x - size, y - size, size * 2, size * 2);
      break;
    case 'boss':
      // Octagon
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 - Math.PI / 8;
        const px = x + Math.cos(angle) * size;
        const py = y + Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
  }
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.globalAlpha = 1;

  // HP bar
  const barWidth = size * 2.5;
  const barHeight = 3;
  const barY = y - size - 8;
  const hpRatio = Math.max(0, hp / maxHp);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - barWidth / 2, barY, barWidth, barHeight);

  const hpColor = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillStyle = hpColor;
  ctx.fillRect(x - barWidth / 2, barY, barWidth * hpRatio, barHeight);

  ctx.restore();
}

// ─── Projectile ───

export function drawProjectile(ctx: CanvasRenderingContext2D, proj: TProjectile): void {
  ctx.save();

  // Glow
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = proj.color + '40';
  ctx.fill();

  // Core
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = proj.color;
  ctx.fill();

  ctx.restore();
}

// ─── Particles ───

export function drawParticles(ctx: CanvasRenderingContext2D, particles: TParticle[]): void {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Floating Texts ───

export function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: TFloatingText[]): void {
  for (const ft of texts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${ft.fontSize ?? 16}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

// ─── Top HUD Bar ───

export function drawTopHud(
  ctx: CanvasRenderingContext2D,
  wave: number,
  gold: number,
  score: number,
  enemyCount: number,
): void {
  // Bar background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, MAP_WIDTH, 46);

  ctx.save();
  ctx.font = 'bold 16px sans-serif';
  ctx.textBaseline = 'middle';
  const cy = 23;

  // Wave
  ctx.fillStyle = '#60a5fa';
  ctx.textAlign = 'left';
  ctx.fillText(`Wave: ${wave}`, 15, cy);

  // Gold
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(`Gold: ${gold}`, 160, cy);

  // Score
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Score: ${score}`, 340, cy);

  // Enemy count (danger meter)
  const ratio = enemyCount / MAX_ENEMIES_ON_SCREEN;
  ctx.fillStyle = ratio > 0.8 ? '#ef4444' : ratio > 0.5 ? '#f59e0b' : '#22c55e';
  ctx.textAlign = 'right';
  ctx.fillText(`Enemies: ${enemyCount}/${MAX_ENEMIES_ON_SCREEN}`, MAP_WIDTH - 15, cy);

  ctx.restore();
}

// ─── Right Panel ───

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  gold: number,
  summonCount: number,
  selectedUnit: TPlacedUnit | null,
  unitCount: number,
  waveState: TWaveState,
  enemyCount: number,
  volume?: number,
): void {
  const px = PANEL_X + 15;
  let py = 20;
  const pw = PANEL_WIDTH - 30;

  ctx.save();

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('COMMAND', PANEL_X + PANEL_WIDTH / 2, py);
  py += 35;

  // Summon button
  const cost = getSummonCost(summonCount);
  const canAfford = gold >= cost;
  const btnH = 50;

  ctx.fillStyle = canAfford ? '#3b82f6' : '#374151';
  roundRect(ctx, px, py, pw, btnH, 8);
  ctx.fill();

  if (canAfford) {
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1;
    roundRect(ctx, px, py, pw, btnH, 8);
    ctx.stroke();
  }

  ctx.fillStyle = canAfford ? '#ffffff' : '#6b7280';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SUMMON [Space/D]', PANEL_X + PANEL_WIDTH / 2, py + 20);
  ctx.font = '13px sans-serif';
  ctx.fillText(`Cost: ${cost}G`, PANEL_X + PANEL_WIDTH / 2, py + 38);
  py += btnH + 20;

  // Unit count
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Units: ${unitCount}`, px, py);
  py += 20;

  // Enemy danger bar
  const dangerRatio = enemyCount / MAX_ENEMIES_ON_SCREEN;
  const barW = pw;
  const barH = 10;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  roundRect(ctx, px, py, barW, barH, 4);
  ctx.fill();
  ctx.fillStyle = dangerRatio > 0.8 ? '#ef4444' : dangerRatio > 0.5 ? '#f59e0b' : '#22c55e';
  if (dangerRatio > 0) {
    roundRect(ctx, px, py, barW * Math.min(1, dangerRatio), barH, 4);
    ctx.fill();
  }
  py += barH + 5;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Enemies: ${enemyCount} / ${MAX_ENEMIES_ON_SCREEN}`, px, py);
  py += 25;

  // Wave info
  ctx.fillStyle = '#94a3b8';
  if (waveState.phase === 'prep') {
    ctx.fillText(`Next wave in: ${Math.ceil(waveState.prepTimer)}s`, px, py);
    py += 18;
    ctx.fillStyle = '#22d3ee';
    ctx.font = '12px sans-serif';
    ctx.fillText('[F] 다음 웨이브 강제 호출', px, py);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
  } else if (waveState.phase === 'spawning') {
    ctx.fillText(`Spawning... (${waveState.spawnIndex}/${ENEMIES_PER_WAVE})`, px, py);
  }
  py += 30;

  // Separator
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + pw, py);
  ctx.stroke();
  py += 15;

  // Selected unit info
  if (selectedUnit) {
    const def = selectedUnit.def;
    ctx.fillStyle = def.color;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${def.symbol} ${def.name}`, px, py);
    py += 22;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Tier: ${'★'.repeat(def.tier)}`, px, py);
    py += 18;
    ctx.fillText(`Type: ${def.archetype}`, px, py);
    py += 18;
    ctx.fillText(`DMG: ${def.damage.toFixed(0)}`, px, py);
    py += 18;
    ctx.fillText(`ATK SPD: ${def.attackSpeed.toFixed(1)}/s`, px, py);
    py += 18;
    ctx.fillText(`Range: ${def.range}`, px, py);
    py += 18;

    if (selectedUnit.buffMultiplier > 1) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`Buff: x${selectedUnit.buffMultiplier.toFixed(2)}`, px, py);
      py += 18;
    }

    // Archetype-specific stats
    ctx.fillStyle = '#94a3b8';
    if (def.splashRadius) {
      ctx.fillText(`Splash: ${def.splashRadius}px`, px, py);
      py += 18;
    }
    if (def.slowAmount) {
      ctx.fillText(`Slow: ${Math.round(def.slowAmount * 100)}%`, px, py);
      py += 18;
    }
    if (def.slowRadius) {
      ctx.fillText(`Slow Radius: ${def.slowRadius}px`, px, py);
      py += 18;
    }
    if (def.buffMultiplier) {
      ctx.fillText(`Buff: x${def.buffMultiplier.toFixed(2)}`, px, py);
      py += 18;
    }
    if (def.debuffAmount) {
      ctx.fillText(`Debuff: +${Math.round(def.debuffAmount * 100)}% DMG`, px, py);
      py += 18;
    }
    if (def.debuffRadius) {
      ctx.fillText(`Debuff Radius: ${def.debuffRadius}px`, px, py);
      py += 18;
    }

    py += 10;
    // Sell button hint
    ctx.fillStyle = '#ef4444';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Sell: ${getSellValue(selectedUnit)}G [Del/RightClick]`, px, py);
  } else {
    ctx.fillStyle = '#4b5563';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click a unit to select', PANEL_X + PANEL_WIDTH / 2, py + 10);
  }

  // Volume display at panel bottom
  if (volume !== undefined) {
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Vol: ${Math.round(volume * 100)}% [-/+/M]`,
      PANEL_X + PANEL_WIDTH / 2,
      CANVAS_HEIGHT - 15,
    );
  }

  ctx.restore();
}

// ─── Drag Ghost ───

export function drawDragGhost(
  ctx: CanvasRenderingContext2D,
  drag: TDragState,
  units: TPlacedUnit[],
): void {
  if (!drag) return;
  const unit = units.find((u) => u.id === drag.unitId);
  if (!unit) return;

  drawUnit(ctx, { ...unit, x: drag.mouseX, y: drag.mouseY }, false, 0.6);
}

// ─── Helpers ───

function blendColors(c1: string, c2: string, ratio: number): string {
  const parse = (c: string) => {
    if (c.startsWith('#')) {
      const n = parseInt(c.replace('#', ''), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    return [200, 200, 200];
  };
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  return `rgb(${r},${g},${b})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
