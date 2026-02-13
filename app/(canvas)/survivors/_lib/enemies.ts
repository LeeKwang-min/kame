import type { TEnemy, TEnemyType, TCamera } from './types';
import { MAX_ENEMIES, ENEMY_DEFS, CANVAS_WIDTH, CANVAS_HEIGHT } from './config';
import { createPool, acquire, deactivate, forEachActive } from './pool';
import { isInViewport } from './camera';
import { drawSprite, ENEMY_SPRITES } from './sprites';

// ─── Pool Creation ───

export function createEnemyPool(): TEnemy[] {
  return createPool<TEnemy>(MAX_ENEMIES, () => ({
    active: false,
    type: 'bat',
    x: 0,
    y: 0,
    hp: 0,
    maxHp: 0,
    speed: 0,
    damage: 0,
    exp: 0,
    radius: 0,
    animFrame: 0,
    animTimer: 0,
    hitFlashTimer: 0,
  }));
}

// ─── Spawn an Enemy ───

export function spawnEnemy(
  pool: TEnemy[],
  type: TEnemyType,
  x: number,
  y: number,
  hpMultiplier: number,
  speedMultiplier: number,
): TEnemy | null {
  const enemy = acquire(pool);
  if (!enemy) return null;

  const def = ENEMY_DEFS[type];
  enemy.type = type;
  enemy.x = x;
  enemy.y = y;
  enemy.hp = def.hp * hpMultiplier;
  enemy.maxHp = def.hp * hpMultiplier;
  enemy.speed = def.speed * speedMultiplier;
  enemy.damage = def.damage;
  enemy.exp = def.exp;
  enemy.radius = def.radius;
  enemy.animFrame = 0;
  enemy.animTimer = 0;
  enemy.hitFlashTimer = 0;

  // Witch special: ranged attacker with shoot cooldown
  if (type === 'witch') {
    enemy.shootTimer = 0;
    enemy.shootCooldown = 2.0;
  }

  return enemy;
}

// ─── Get Spawn Position Outside Viewport ───

export function getSpawnPosition(
  playerX: number,
  playerY: number,
): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2;
  const spawnDist = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.6;
  return {
    x: playerX + Math.cos(angle) * spawnDist,
    y: playerY + Math.sin(angle) * spawnDist,
  };
}

// ─── Update All Enemies ───

export function updateEnemies(
  pool: TEnemy[],
  playerX: number,
  playerY: number,
  dt: number,
): void {
  forEachActive(pool, (enemy) => {
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const dSq = dx * dx + dy * dy;
    const dist = Math.sqrt(dSq);

    // Move toward player
    if (dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;

      // Witch special: stop approaching if within 200px, increment shoot timer
      if (enemy.type === 'witch' && dist < 200) {
        enemy.shootTimer = (enemy.shootTimer ?? 0) + dt;
      } else {
        enemy.x += nx * enemy.speed * dt;
        enemy.y += ny * enemy.speed * dt;
      }
    }

    // Animation: flip frame every 0.3s
    enemy.animTimer += dt;
    if (enemy.animTimer >= 0.3) {
      enemy.animTimer -= 0.3;
      enemy.animFrame = enemy.animFrame === 0 ? 1 : 0;
    }

    // Decrement hit flash timer
    if (enemy.hitFlashTimer > 0) {
      enemy.hitFlashTimer -= dt;
      if (enemy.hitFlashTimer < 0) enemy.hitFlashTimer = 0;
    }
  });
}

// ─── Damage an Enemy ───

export function damageEnemy(enemy: TEnemy, damage: number): boolean {
  enemy.hp -= damage;
  enemy.hitFlashTimer = 0.1;

  if (enemy.hp <= 0) {
    deactivate(enemy);
    return true; // killed
  }
  return false; // alive
}

// ─── Render All Enemies ───

export function renderEnemies(
  pool: TEnemy[],
  ctx: CanvasRenderingContext2D,
  camera: TCamera,
): void {
  forEachActive(pool, (enemy) => {
    // Cull enemies outside viewport
    if (!isInViewport(enemy.x, enemy.y, camera)) return;

    // Convert to screen coordinates
    const sx = enemy.x - camera.x;
    const sy = enemy.y - camera.y;

    const sprites = ENEMY_SPRITES[enemy.type];
    const frame = sprites ? sprites[enemy.animFrame] : null;

    // Hit flash effect
    const prevAlpha = ctx.globalAlpha;
    if (enemy.hitFlashTimer > 0) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(enemy.hitFlashTimer * 60);
    }

    if (frame) {
      // Determine sprite size and scale
      const spriteW = frame[0].length;
      const spriteH = frame.length;
      // Scale so the rendered size roughly matches 2 * radius
      const scale = Math.max(1, Math.round((enemy.radius * 2) / Math.max(spriteW, spriteH)));
      const renderW = spriteW * scale;
      const renderH = spriteH * scale;

      // Draw white tint overlay when hit
      if (enemy.hitFlashTimer > 0) {
        // Draw sprite normally first
        drawSprite(ctx, frame, sx - renderW / 2, sy - renderH / 2, scale);
        // Then draw white overlay with reduced alpha for flash effect
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - renderW / 2, sy - renderH / 2, renderW, renderH);
        ctx.globalAlpha = prevAlpha;
      } else {
        drawSprite(ctx, frame, sx - renderW / 2, sy - renderH / 2, scale);
      }
    } else {
      // Fallback: draw colored circle
      const def = ENEMY_DEFS[enemy.type];
      ctx.beginPath();
      ctx.arc(sx, sy, enemy.radius, 0, Math.PI * 2);
      ctx.fillStyle = def.color;
      ctx.fill();
    }

    // Restore alpha
    ctx.globalAlpha = prevAlpha;

    // Boss: draw HP bar above sprite
    if (enemy.type === 'boss') {
      const barWidth = enemy.radius * 3;
      const barHeight = 4;
      const barX = sx - barWidth / 2;
      const barY = sy - enemy.radius - 10;
      const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // HP fill
      ctx.fillStyle = hpRatio > 0.5 ? '#22ee44' : hpRatio > 0.25 ? '#ffcc00' : '#ff4444';
      ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

      // Border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
  });
}
