import type { TGem, TPlayer, TCamera } from './types';
import { MAX_GEMS, PLAYER_PICKUP_RANGE } from './config';
import { createPool, acquire, deactivate, forEachActive } from './pool';
import { distSq } from './collision';
import { isInViewport, worldToScreen } from './camera';
import { addExp, getPassiveBonus } from './player';
import { drawSprite, GEM_SPRITE } from './sprites';

// ─── Gem Pool ───

export function createGemPool(): TGem[] {
  return createPool<TGem>(MAX_GEMS, () => ({
    active: false,
    x: 0,
    y: 0,
    value: 0,
    radius: 4,
    magnetized: false,
  }));
}

// ─── Spawn Gem ───

export function spawnGem(pool: TGem[], x: number, y: number, value: number): void {
  const gem = acquire(pool);
  if (!gem) return;

  // Small random offset from exact position (+/- 10px)
  gem.x = x + (Math.random() * 20 - 10);
  gem.y = y + (Math.random() * 20 - 10);
  gem.value = value;
  gem.magnetized = false;
}

// ─── Update Gems ───

export function updateGems(gemPool: TGem[], player: TPlayer, dt: number): boolean {
  // Calculate effective pickup range with attractorb bonus
  const attractorbLevel = getPassiveBonus(player, 'attractorb');
  const effectiveRange = PLAYER_PICKUP_RANGE * (1 + attractorbLevel * 0.25);
  const effectiveRangeSq = effectiveRange * effectiveRange;

  // Very close threshold for pickup (8px)
  const pickupDistSq = 8 * 8;

  let leveledUp = false;

  forEachActive(gemPool, (gem) => {
    const d = distSq(player.x, player.y, gem.x, gem.y);

    // Check if within pickup range -> magnetize
    if (d < effectiveRangeSq) {
      gem.magnetized = true;
    }

    // If magnetized, move toward player at 400 px/s
    if (gem.magnetized) {
      const dx = player.x - gem.x;
      const dy = player.y - gem.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const speed = 400 * dt;
        gem.x += (dx / dist) * speed;
        gem.y += (dy / dist) * speed;
      }
    }

    // Check if very close to player -> pick up
    const currentDist = distSq(player.x, player.y, gem.x, gem.y);
    if (currentDist < pickupDistSq) {
      const didLevelUp = addExp(player, gem.value);
      if (didLevelUp) {
        leveledUp = true;
      }
      deactivate(gem);
    }
  });

  return leveledUp;
}

// ─── Render Gems ───

export function renderGems(
  gemPool: TGem[],
  ctx: CanvasRenderingContext2D,
  camera: TCamera,
): void {
  const now = performance.now() / 1000; // current time in seconds

  forEachActive(gemPool, (gem) => {
    // Skip if not in viewport
    if (!isInViewport(gem.x, gem.y, camera)) return;

    // Convert to screen coordinates
    const screen = worldToScreen(gem.x, gem.y, camera);

    // Subtle floating animation: use gem.x as seed for phase offset
    const floatOffset = Math.sin(now * 3 + gem.x * 0.1) * 2;

    // GEM_SPRITE is 8x8, draw at scale 1, centered on gem position
    const halfSize = 4; // 8 / 2
    drawSprite(ctx, GEM_SPRITE, screen.x - halfSize, screen.y - halfSize + floatOffset, 1);
  });
}
