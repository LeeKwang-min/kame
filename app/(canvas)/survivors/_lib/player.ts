import { TPlayer, TDirection, TCamera } from './types';
import {
  PLAYER_SPEED,
  PLAYER_HP,
  PLAYER_PICKUP_RANGE,
  PLAYER_INVINCIBLE_TIME,
  PLAYER_SIZE,
  PLAYER_RENDER_SIZE,
  BASE_EXP_TO_LEVEL,
  EXP_INCREMENT,
  COLORS,
} from './config';
import { drawSprite, PLAYER_SPRITES } from './sprites';

// Create initial player state at world origin
export function createPlayer(): TPlayer {
  return {
    x: 0,
    y: 0,
    hp: PLAYER_HP,
    maxHp: PLAYER_HP,
    speed: PLAYER_SPEED,
    pickupRange: PLAYER_PICKUP_RANGE,
    direction: 'down',
    animFrame: 0,
    animTimer: 0,
    isInvincible: false,
    invincibleTimer: 0,
    weapons: [
      { id: 'magic_wand', level: 1, cooldownTimer: 0, isEvolved: false },
    ],
    passives: [],
    exp: 0,
    level: 1,
    expToNext: BASE_EXP_TO_LEVEL,
    kills: 0,
  };
}

// Update player position based on currently held keys
export function updatePlayer(
  player: TPlayer,
  keys: Set<string>,
  dt: number,
): void {
  let dx = 0;
  let dy = 0;

  // WASD + Arrow keys (using e.code)
  if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  // Update direction when moving
  if (dx !== 0 || dy !== 0) {
    if (Math.abs(dx) > Math.abs(dy)) {
      player.direction = dx > 0 ? 'right' : 'left';
    } else {
      player.direction = dy > 0 ? 'down' : 'up';
    }

    // Walk animation
    player.animTimer += dt;
    if (player.animTimer >= 0.15) {
      player.animTimer = 0;
      player.animFrame = (player.animFrame + 1) % 2;
    }
  }

  // Apply movement with speed (speed can be modified by passives in main game loop)
  player.x += dx * player.speed * dt;
  player.y += dy * player.speed * dt;

  // Invincibility timer countdown
  if (player.isInvincible) {
    player.invincibleTimer -= dt;
    if (player.invincibleTimer <= 0) {
      player.isInvincible = false;
    }
  }
}

// Apply damage to player, returns true if player dies
export function damagePlayer(player: TPlayer, damage: number): boolean {
  if (player.isInvincible) return false;

  // Armor passive reduces damage (find armor in passives)
  const armorPassive = player.passives.find((p) => p.id === 'armor');
  const armorReduction = armorPassive ? armorPassive.level : 0;
  const finalDamage = Math.max(1, damage - armorReduction);

  player.hp -= finalDamage;
  player.isInvincible = true;
  player.invincibleTimer = PLAYER_INVINCIBLE_TIME;

  return player.hp <= 0;
}

// Add experience to player, returns true if leveled up
export function addExp(player: TPlayer, amount: number): boolean {
  player.exp += amount;
  if (player.exp >= player.expToNext) {
    player.exp -= player.expToNext;
    player.level++;
    player.expToNext = BASE_EXP_TO_LEVEL + (player.level - 1) * EXP_INCREMENT;
    return true; // Level up!
  }
  return false;
}

// Get passive bonus level (0 if not owned)
export function getPassiveBonus(player: TPlayer, passiveId: string): number {
  const passive = player.passives.find((p) => p.id === passiveId);
  return passive ? passive.level : 0;
}

// Render player sprite on screen
export function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: TPlayer,
  camera: TCamera,
): void {
  const sx = player.x - camera.x;
  const sy = player.y - camera.y;

  // Invincibility blink effect
  if (
    player.isInvincible &&
    Math.floor(player.invincibleTimer * 10) % 2 === 0
  ) {
    ctx.globalAlpha = 0.4;
  }

  // Draw pixel art sprite
  const sprites = PLAYER_SPRITES[player.direction];
  if (sprites && sprites[player.animFrame]) {
    const halfSize = PLAYER_RENDER_SIZE / 2;
    drawSprite(ctx, sprites[player.animFrame], sx - halfSize, sy - halfSize, 2);
  } else {
    // Fallback: simple circle
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(sx, sy, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}
