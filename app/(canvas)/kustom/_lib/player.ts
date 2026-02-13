import {
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_COLOR,
  PLAYER_MAX_HP,
  DASH_SPEED_MULTIPLIER,
  DASH_DURATION,
  DASH_COOLDOWN,
  HIT_INVINCIBLE_DURATION,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HP_HEART_SIZE,
  HP_HEART_GAP,
  HP_HEART_X,
  HP_HEART_Y,
} from './config';
import { TPlayer, TProjectile, TLaser, TAreaHazard } from './types';

export function createPlayer(): TPlayer {
  return {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 80,
    hp: PLAYER_MAX_HP,
    isDashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    isInvincible: false,
    invincibleTimer: 0,
    dashDirX: 0,
    dashDirY: 0,
    trails: [],
  };
}

export function updatePlayer(
  player: TPlayer,
  dt: number,
  keys: Set<string>,
): void {
  if (player.dashCooldown > 0) {
    player.dashCooldown -= dt;
  }

  if (player.isDashing) {
    player.dashTimer -= dt;
    if (player.dashTimer <= 0) {
      player.isDashing = false;
      player.isInvincible = false;
    }
  }

  if (player.invincibleTimer > 0) {
    player.invincibleTimer -= dt;
    if (player.invincibleTimer <= 0) {
      player.isInvincible = false;
    }
  }

  let dx = 0;
  let dy = 0;
  if (keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('ArrowRight')) dx += 1;
  if (keys.has('ArrowUp')) dy -= 1;
  if (keys.has('ArrowDown')) dy += 1;

  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  let speed = PLAYER_SPEED;
  if (player.isDashing) {
    dx = player.dashDirX;
    dy = player.dashDirY;
    speed = PLAYER_SPEED * DASH_SPEED_MULTIPLIER;
  }

  player.x += dx * speed * dt;
  player.y += dy * speed * dt;

  player.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, player.x));
  player.y = Math.max(PLAYER_RADIUS, Math.min(CANVAS_HEIGHT - PLAYER_RADIUS, player.y));

  if (player.isDashing) {
    player.trails.push({ x: player.x, y: player.y, alpha: 0.6 });
  }
  player.trails = player.trails
    .map((t) => ({ ...t, alpha: t.alpha - dt * 2 }))
    .filter((t) => t.alpha > 0);
}

export function startDash(player: TPlayer, keys: Set<string>): boolean {
  if (player.dashCooldown > 0 || player.isDashing) return false;

  let dx = 0;
  let dy = 0;
  if (keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('ArrowRight')) dx += 1;
  if (keys.has('ArrowUp')) dy -= 1;
  if (keys.has('ArrowDown')) dy += 1;

  if (dx === 0 && dy === 0) {
    dy = -1;
  }

  const len = Math.sqrt(dx * dx + dy * dy);
  player.dashDirX = dx / len;
  player.dashDirY = dy / len;
  player.isDashing = true;
  player.dashTimer = DASH_DURATION;
  player.dashCooldown = DASH_COOLDOWN;
  player.isInvincible = true;

  return true;
}

export function hitPlayer(player: TPlayer): boolean {
  if (player.isInvincible || player.isDashing) return false;

  player.hp -= 1;
  player.isInvincible = true;
  player.invincibleTimer = HIT_INVINCIBLE_DURATION;

  return player.hp <= 0;
}

export function checkProjectileCollision(player: TPlayer, projectiles: TProjectile[]): boolean {
  if (player.isInvincible) return false;

  for (const p of projectiles) {
    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < PLAYER_RADIUS + p.radius) {
      return true;
    }
  }
  return false;
}

export function checkLaserCollision(player: TPlayer, lasers: TLaser[]): boolean {
  if (player.isInvincible) return false;

  for (const laser of lasers) {
    if (!laser.isActive) continue;

    const dx = laser.x2 - laser.x1;
    const dy = laser.y2 - laser.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;

    const t = Math.max(0, Math.min(1, ((player.x - laser.x1) * dx + (player.y - laser.y1) * dy) / lenSq));
    const closestX = laser.x1 + t * dx;
    const closestY = laser.y1 + t * dy;
    const distX = player.x - closestX;
    const distY = player.y - closestY;
    const dist = Math.sqrt(distX * distX + distY * distY);

    if (dist < PLAYER_RADIUS + laser.width / 2) {
      return true;
    }
  }
  return false;
}

export function checkAreaCollision(player: TPlayer, areas: TAreaHazard[], isInner?: boolean): boolean {
  if (player.isInvincible) return false;

  for (const area of areas) {
    if (!area.isActive) continue;

    const dx = player.x - area.x;
    const dy = player.y - area.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (isInner === true) {
      if (dist < area.radius + PLAYER_RADIUS) return true;
    } else if (isInner === false) {
      if (dist > area.radius - PLAYER_RADIUS) return true;
    } else {
      if (dist < area.radius + PLAYER_RADIUS) return true;
    }
  }
  return false;
}

export function renderPlayer(player: TPlayer, ctx: CanvasRenderingContext2D): void {
  for (const trail of player.trails) {
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 212, 255, ${trail.alpha * 0.4})`;
    ctx.fill();
  }

  ctx.save();
  if (player.isInvincible && !player.isDashing) {
    const blink = Math.floor(performance.now() / 80) % 2 === 0;
    ctx.globalAlpha = blink ? 0.3 : 0.8;
  }

  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = player.isDashing ? '#66eeff' : PLAYER_COLOR;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(player.x - 3, player.y - 3, PLAYER_RADIUS * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();

  ctx.restore();
}

export function renderHP(player: TPlayer, ctx: CanvasRenderingContext2D): void {
  for (let i = 0; i < PLAYER_MAX_HP; i++) {
    const x = HP_HEART_X + i * (HP_HEART_SIZE + HP_HEART_GAP);
    const y = HP_HEART_Y;
    const filled = i < player.hp;

    drawHeart(ctx, x, y, HP_HEART_SIZE, filled);
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, filled: boolean): void {
  const s = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.4);
  ctx.bezierCurveTo(x, y - s * 0.2, x - s, y - s * 0.6, x - s, y + s * 0.1);
  ctx.bezierCurveTo(x - s, y + s * 0.6, x, y + s, x, y + s * 1.2);
  ctx.bezierCurveTo(x, y + s, x + s, y + s * 0.6, x + s, y + s * 0.1);
  ctx.bezierCurveTo(x + s, y - s * 0.6, x, y - s * 0.2, x, y + s * 0.4);
  ctx.closePath();

  if (filled) {
    ctx.fillStyle = '#ff4466';
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,68,102,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

export function renderDashCooldown(player: TPlayer, ctx: CanvasRenderingContext2D): void {
  const barWidth = 30;
  const barHeight = 4;
  const x = player.x - barWidth / 2;
  const y = player.y + PLAYER_RADIUS + 8;

  if (player.dashCooldown > 0) {
    const progress = 1 - player.dashCooldown / DASH_COOLDOWN;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = 'rgba(0,212,255,0.6)';
    ctx.fillRect(x, y, barWidth * progress, barHeight);
  }
}
