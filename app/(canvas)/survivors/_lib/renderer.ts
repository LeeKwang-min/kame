import type { TCamera, TPlayer, TDecoration, TWeaponId, TPassiveId } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE, CHUNK_SIZE, COLORS } from './config';
import { worldToScreen } from './camera';
import { drawSprite, DECORATION_SPRITES, HEART_SPRITE, WEAPON_ICONS, PASSIVE_ICONS } from './sprites';
import { WEAPON_DEFS, PASSIVE_DEFS } from './weapons';

// ─── Seeded Pseudo-Random ───

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Chunk Decoration Generator ───

function getChunkDecorations(chunkX: number, chunkY: number): TDecoration[] {
  const seed = chunkX * 73856093 + chunkY * 19349663;
  const count = 3 + Math.floor(seededRandom(seed) * 6); // 3-8 per chunk
  const decorations: TDecoration[] = [];
  for (let i = 0; i < count; i++) {
    const s = seed + i * 12345;
    const x = chunkX * CHUNK_SIZE + seededRandom(s) * CHUNK_SIZE;
    const y = chunkY * CHUNK_SIZE + seededRandom(s + 1) * CHUNK_SIZE;
    const typeRand = seededRandom(s + 2);
    const type = typeRand < 0.3 ? 'tree' : typeRand < 0.6 ? 'rock' : 'bush';
    decorations.push({ x, y, type });
  }
  return decorations;
}

// ─── Background Rendering ───

export function renderBackground(ctx: CanvasRenderingContext2D, camera: TCamera): void {
  // Calculate visible tile range
  const startTileX = Math.floor(camera.x / TILE_SIZE);
  const startTileY = Math.floor(camera.y / TILE_SIZE);
  const endTileX = Math.floor((camera.x + CANVAS_WIDTH) / TILE_SIZE);
  const endTileY = Math.floor((camera.y + CANVAS_HEIGHT) / TILE_SIZE);

  for (let tileY = startTileY; tileY <= endTileY; tileY++) {
    for (let tileX = startTileX; tileX <= endTileX; tileX++) {
      const isEven = (tileX + tileY) % 2 === 0;
      ctx.fillStyle = isEven ? COLORS.tile1 : COLORS.tile2;

      const screen = worldToScreen(tileX * TILE_SIZE, tileY * TILE_SIZE, camera);
      ctx.fillRect(screen.x, screen.y, TILE_SIZE, TILE_SIZE);
    }
  }
}

// ─── Decoration Rendering ───

export function renderDecorations(ctx: CanvasRenderingContext2D, camera: TCamera): void {
  // Calculate visible chunk range
  const startChunkX = Math.floor(camera.x / CHUNK_SIZE);
  const startChunkY = Math.floor(camera.y / CHUNK_SIZE);
  const endChunkX = Math.floor((camera.x + CANVAS_WIDTH) / CHUNK_SIZE);
  const endChunkY = Math.floor((camera.y + CANVAS_HEIGHT) / CHUNK_SIZE);

  for (let chunkY = startChunkY; chunkY <= endChunkY; chunkY++) {
    for (let chunkX = startChunkX; chunkX <= endChunkX; chunkX++) {
      const decorations = getChunkDecorations(chunkX, chunkY);

      for (const deco of decorations) {
        const screen = worldToScreen(deco.x, deco.y, camera);

        // Skip decorations that are off-screen (with margin for sprite size)
        if (screen.x < -64 || screen.x > CANVAS_WIDTH + 64) continue;
        if (screen.y < -64 || screen.y > CANVAS_HEIGHT + 64) continue;

        const sprite = DECORATION_SPRITES[deco.type];
        if (sprite) {
          drawSprite(ctx, sprite, screen.x, screen.y, 2);
        }
      }
    }
  }
}

// ─── HUD Rendering ───

export function renderHUD(
  ctx: CanvasRenderingContext2D,
  player: TPlayer,
  elapsed: number,
  canvasW: number,
  canvasH: number,
): void {
  ctx.save();

  // 1. Top-left: Timer (mm:ss format)
  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60)
    .toString()
    .padStart(2, '0');
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`${minutes}:${seconds}`, 20, 30);

  // 2. Top-left below timer: HP Hearts
  for (let i = 0; i < player.maxHp; i++) {
    const heartX = 20 + i * 20;
    const heartY = 45;

    if (i < player.hp) {
      // Full heart
      drawSprite(ctx, HEART_SPRITE, heartX, heartY, 2);
    } else {
      // Empty heart (reduced opacity)
      ctx.globalAlpha = 0.3;
      drawSprite(ctx, HEART_SPRITE, heartX, heartY, 2);
      ctx.globalAlpha = 1;
    }
  }

  // 3. Top-center: Experience Bar
  const barWidth = 300;
  const barHeight = 12;
  const barX = (canvasW - barWidth) / 2;
  const barY = 30;

  // Level text above bar
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`Lv. ${player.level}`, canvasW / 2, barY - 2);

  // Background bar (gray)
  ctx.fillStyle = '#555555';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Fill bar (cyan)
  const fillWidth = player.expToNext > 0 ? (player.exp / player.expToNext) * barWidth : 0;
  ctx.fillStyle = '#00d4ff';
  ctx.fillRect(barX, barY, fillWidth, barHeight);

  // Bar border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  // 4. Bottom-left: Weapon Icons
  for (let i = 0; i < player.weapons.length; i++) {
    const weapon = player.weapons[i];
    const iconX = 20 + i * 30;
    const iconY = canvasH - 50;

    // Look up the base weapon id to get the icon
    let baseId: TWeaponId | null = null;
    if (!weapon.isEvolved) {
      baseId = weapon.id as TWeaponId;
    } else {
      for (const def of Object.values(WEAPON_DEFS)) {
        if (def.evolvesInto === weapon.id) {
          baseId = def.id;
          break;
        }
      }
    }

    if (baseId && WEAPON_ICONS[baseId]) {
      drawSprite(ctx, WEAPON_ICONS[baseId], iconX, iconY, 3);
    }

    // Weapon level number below icon
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${weapon.level}`, iconX + 12, iconY + 26);
  }

  // 5. Bottom-right: Passive Icons
  const passiveCount = player.passives.length;
  for (let i = 0; i < passiveCount; i++) {
    const passive = player.passives[i];
    const iconX = canvasW - 20 - passiveCount * 30 + i * 30;
    const iconY = canvasH - 50;

    const passiveId = passive.id as TPassiveId;
    if (PASSIVE_ICONS[passiveId]) {
      drawSprite(ctx, PASSIVE_ICONS[passiveId], iconX, iconY, 3);
    }

    // Passive level number below icon
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${passive.level}`, iconX + 12, iconY + 26);
  }

  // 6. Top-right: Kill Count
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`Kills: ${player.kills}`, canvasW - 120, 30);

  ctx.restore();
}
