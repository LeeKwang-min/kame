import type {
  TWeaponId,
  TEvolvedWeaponId,
  TPassiveId,
  TWeaponDef,
  TPassiveDef,
  TWeaponInstance,
  TProjectile,
  TPlayer,
  TEnemy,
  TCamera,
} from './types';
import { MAX_PROJECTILES, CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from './config';
import { createPool, acquire, deactivate, forEachActive } from './pool';
import { findNearest, distSq } from './collision';
import { isInViewport, worldToScreen } from './camera';
import { getPassiveBonus } from './player';

// ─── Weapon Definitions ───

export const WEAPON_DEFS: Record<TWeaponId, TWeaponDef> = {
  magic_wand: {
    id: 'magic_wand',
    name: 'Magic Wand',
    description: 'Fires at the nearest enemy.',
    baseCooldown: 1.0,
    baseDamage: 10,
    baseProjectiles: 1,
    evolvesWith: 'empty_tome',
    evolvesInto: 'holy_wand',
    evolvedName: 'Holy Wand',
  },
  knife: {
    id: 'knife',
    name: 'Knife',
    description: 'Fires a knife in the direction you face.',
    baseCooldown: 0.8,
    baseDamage: 8,
    baseProjectiles: 1,
    evolvesWith: 'bracer',
    evolvesInto: 'thousand_edge',
    evolvedName: 'Thousand Edge',
  },
  axe: {
    id: 'axe',
    name: 'Axe',
    description: 'Lobs an axe high, affected by gravity.',
    baseCooldown: 1.5,
    baseDamage: 20,
    baseProjectiles: 1,
    evolvesWith: 'candelabrador',
    evolvesInto: 'death_spiral',
    evolvedName: 'Death Spiral',
  },
  cross: {
    id: 'cross',
    name: 'Cross',
    description: 'Thrown boomerang that returns to you.',
    baseCooldown: 1.2,
    baseDamage: 15,
    baseProjectiles: 1,
    evolvesWith: 'clover',
    evolvesInto: 'heaven_sword',
    evolvedName: 'Heaven Sword',
  },
  fire_wand: {
    id: 'fire_wand',
    name: 'Fire Wand',
    description: 'Fires in a random direction, pierces all enemies.',
    baseCooldown: 1.5,
    baseDamage: 20,
    baseProjectiles: 1,
    evolvesWith: 'spinach',
    evolvesInto: 'hellfire',
    evolvedName: 'Hellfire',
  },
  garlic: {
    id: 'garlic',
    name: 'Garlic',
    description: 'Damages all enemies in an aura around you.',
    baseCooldown: 0.5,
    baseDamage: 5,
    baseProjectiles: 0,
    evolvesWith: 'pummarola',
    evolvesInto: 'soul_eater',
    evolvedName: 'Soul Eater',
  },
  holy_water: {
    id: 'holy_water',
    name: 'Holy Water',
    description: 'Creates a damaging zone on the ground.',
    baseCooldown: 2.0,
    baseDamage: 12,
    baseProjectiles: 1,
    evolvesWith: 'attractorb',
    evolvesInto: 'blessed_water',
    evolvedName: 'Blessed Water',
  },
  whip: {
    id: 'whip',
    name: 'Whip',
    description: 'Strikes enemies in front of you.',
    baseCooldown: 1.0,
    baseDamage: 15,
    baseProjectiles: 0,
    evolvesWith: 'hollow_heart',
    evolvesInto: 'bloody_tear',
    evolvedName: 'Bloody Tear',
  },
  lightning_ring: {
    id: 'lightning_ring',
    name: 'Lightning Ring',
    description: 'Strikes a random enemy with lightning.',
    baseCooldown: 2.0,
    baseDamage: 25,
    baseProjectiles: 1,
    evolvesWith: 'duplicator',
    evolvesInto: 'thunder_loop',
    evolvedName: 'Thunder Loop',
  },
  runetracer: {
    id: 'runetracer',
    name: 'Runetracer',
    description: 'Bouncing projectile that ricochets off walls.',
    baseCooldown: 3.0,
    baseDamage: 12,
    baseProjectiles: 1,
    evolvesWith: 'armor',
    evolvesInto: 'no_future',
    evolvedName: 'NO FUTURE',
  },
};

// ─── Passive Definitions ───

export const PASSIVE_DEFS: Record<TPassiveId, TPassiveDef> = {
  spinach: {
    id: 'spinach',
    name: 'Spinach',
    description: 'Attack +10% per level',
    effectPerLevel: 0.1,
  },
  armor: {
    id: 'armor',
    name: 'Armor',
    description: 'Damage reduction +1 per level',
    effectPerLevel: 1,
  },
  hollow_heart: {
    id: 'hollow_heart',
    name: 'Hollow Heart',
    description: 'Max HP +1 per level',
    effectPerLevel: 1,
  },
  pummarola: {
    id: 'pummarola',
    name: 'Pummarola',
    description: 'HP recovery 0.2/s per level',
    effectPerLevel: 0.2,
  },
  empty_tome: {
    id: 'empty_tome',
    name: 'Empty Tome',
    description: 'Cooldown -8% per level',
    effectPerLevel: 0.08,
  },
  bracer: {
    id: 'bracer',
    name: 'Bracer',
    description: 'Projectile speed +10% per level',
    effectPerLevel: 0.1,
  },
  clover: {
    id: 'clover',
    name: 'Clover',
    description: 'Critical chance +10% per level',
    effectPerLevel: 0.1,
  },
  attractorb: {
    id: 'attractorb',
    name: 'Attractorb',
    description: 'Pickup range +25% per level',
    effectPerLevel: 0.25,
  },
  duplicator: {
    id: 'duplicator',
    name: 'Duplicator',
    description: 'Projectile count +1 per level',
    effectPerLevel: 1,
  },
  candelabrador: {
    id: 'candelabrador',
    name: 'Candelabrador',
    description: 'Area +10% per level',
    effectPerLevel: 0.1,
  },
};

// ─── Projectile Pool ───

export function createProjectilePool(): TProjectile[] {
  return createPool<TProjectile>(MAX_PROJECTILES, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    damage: 0,
    radius: 4,
    lifetime: 0,
    maxLifetime: 0,
    piercing: 0,
    weaponId: 'magic_wand',
    returning: false,
    originX: 0,
    originY: 0,
    auraRadius: 0,
    zoneTimer: 0,
    bounces: 0,
  }));
}

// ─── Helpers ───

/** Direction vector from player direction */
function directionVector(dir: 'up' | 'down' | 'left' | 'right'): { dx: number; dy: number } {
  switch (dir) {
    case 'up':
      return { dx: 0, dy: -1 };
    case 'down':
      return { dx: 0, dy: 1 };
    case 'left':
      return { dx: -1, dy: 0 };
    case 'right':
      return { dx: 1, dy: 0 };
  }
}

/** Compute damage with passive modifiers (spinach + clover crit) */
function computeDamage(baseDamage: number, player: TPlayer, isEvolved: boolean): number {
  const spinachLevel = getPassiveBonus(player, 'spinach');
  let dmg = baseDamage * (1 + spinachLevel * 0.1);

  if (isEvolved) {
    dmg *= 2;
  }

  const cloverLevel = getPassiveBonus(player, 'clover');
  if (cloverLevel > 0 && Math.random() < cloverLevel * 0.1) {
    dmg *= 2;
  }

  return dmg;
}

/** Get cooldown with empty_tome passive and evolution */
function computeCooldown(baseCooldown: number, player: TPlayer, isEvolved: boolean): number {
  const tomeLevel = getPassiveBonus(player, 'empty_tome');
  let cd = baseCooldown * (1 - tomeLevel * 0.08);
  if (isEvolved) {
    cd *= 0.5;
  }
  return Math.max(0.1, cd);
}

/** Get projectile speed with bracer passive */
function computeSpeed(baseSpeed: number, player: TPlayer): number {
  const bracerLevel = getPassiveBonus(player, 'bracer');
  return baseSpeed * (1 + bracerLevel * 0.1);
}

/** Get area multiplier with candelabrador passive */
function computeAreaMultiplier(player: TPlayer): number {
  const candelabradorLevel = getPassiveBonus(player, 'candelabrador');
  return 1 + candelabradorLevel * 0.1;
}

/** Get total projectile count with duplicator passive */
function computeProjectileCount(base: number, player: TPlayer): number {
  if (base === 0) return 0;
  const duplicatorLevel = getPassiveBonus(player, 'duplicator');
  return base + duplicatorLevel;
}

/** Initialize a projectile from the pool with common properties */
function initProjectile(
  proj: TProjectile,
  weaponId: TWeaponId | TEvolvedWeaponId,
  x: number,
  y: number,
  vx: number,
  vy: number,
  damage: number,
  radius: number,
  lifetime: number,
  piercing: number,
): void {
  proj.weaponId = weaponId;
  proj.x = x;
  proj.y = y;
  proj.vx = vx;
  proj.vy = vy;
  proj.damage = damage;
  proj.radius = radius;
  proj.lifetime = lifetime;
  proj.maxLifetime = lifetime;
  proj.piercing = piercing;
  proj.returning = false;
  proj.originX = x;
  proj.originY = y;
  proj.auraRadius = 0;
  proj.zoneTimer = 0;
  proj.bounces = 0;
}

/** Get the base weapon id (strips evolved prefix logic by looking up defs) */
function getBaseWeaponId(weapon: TWeaponInstance): TWeaponId | null {
  if (!weapon.isEvolved) return weapon.id as TWeaponId;
  // Find which base weapon evolves into this
  for (const def of Object.values(WEAPON_DEFS)) {
    if (def.evolvesInto === weapon.id) return def.id;
  }
  return null;
}

/** Collect active enemies from pool */
function getActiveEnemies(enemyPool: TEnemy[]): TEnemy[] {
  const active: TEnemy[] = [];
  for (const e of enemyPool) {
    if (e.active) active.push(e);
  }
  return active;
}

// ─── Attack Patterns ───

function fireMagicWand(
  player: TPlayer,
  weapon: TWeaponInstance,
  enemyPool: TEnemy[],
  projectilePool: TProjectile[],
): void {
  const def = WEAPON_DEFS.magic_wand;
  const count = computeProjectileCount(def.baseProjectiles + Math.floor((weapon.level - 1) / 2), player);
  const damage = computeDamage(def.baseDamage + weapon.level * 2, player, weapon.isEvolved);
  const speed = computeSpeed(300, player);
  const areaMulti = computeAreaMultiplier(player);

  for (let i = 0; i < count; i++) {
    const nearest = findNearest(enemyPool, player.x, player.y);
    if (!nearest) return;

    const proj = acquire(projectilePool);
    if (!proj) return;

    const dx = nearest.x - player.x;
    const dy = nearest.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    initProjectile(
      proj,
      weapon.id,
      player.x,
      player.y,
      (dx / dist) * speed,
      (dy / dist) * speed,
      damage,
      4 * areaMulti,
      1.5,
      0,
    );
  }
}

function fireKnife(
  player: TPlayer,
  weapon: TWeaponInstance,
  projectilePool: TProjectile[],
): void {
  const def = WEAPON_DEFS.knife;
  const count = computeProjectileCount(def.baseProjectiles + Math.floor((weapon.level - 1) / 3), player);
  const damage = computeDamage(def.baseDamage + weapon.level * 2, player, weapon.isEvolved);
  const speed = computeSpeed(400, player);
  const areaMulti = computeAreaMultiplier(player);
  const { dx: baseDx, dy: baseDy } = directionVector(player.direction);

  // Spread angle for multiple projectiles
  const spreadAngle = 0.15; // radians (~8.6 degrees)
  const baseAngle = Math.atan2(baseDy, baseDx);

  for (let i = 0; i < count; i++) {
    const proj = acquire(projectilePool);
    if (!proj) return;

    // Center the spread around the base angle
    const offset = count > 1 ? (i - (count - 1) / 2) * spreadAngle : 0;
    const angle = baseAngle + offset;

    initProjectile(
      proj,
      weapon.id,
      player.x,
      player.y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      damage,
      3 * areaMulti,
      1.0,
      0,
    );
  }
}

function fireAxe(
  player: TPlayer,
  weapon: TWeaponInstance,
  projectilePool: TProjectile[],
): void {
  const def = WEAPON_DEFS.axe;
  const count = computeProjectileCount(def.baseProjectiles + Math.floor((weapon.level - 1) / 3), player);
  const damage = computeDamage(def.baseDamage + weapon.level * 3, player, weapon.isEvolved);
  const areaMulti = computeAreaMultiplier(player);
  const speed = computeSpeed(1, player); // Speed multiplier applied to horizontal component

  for (let i = 0; i < count; i++) {
    const proj = acquire(projectilePool);
    if (!proj) return;

    // Random horizontal spread
    const hSpread = (Math.random() - 0.5) * 150 * speed;

    initProjectile(
      proj,
      weapon.id,
      player.x,
      player.y,
      hSpread,
      -300, // upward initial velocity
      damage,
      6 * areaMulti,
      2.0,
      -1, // piercing
    );
  }
}

function fireCross(
  player: TPlayer,
  weapon: TWeaponInstance,
  projectilePool: TProjectile[],
): void {
  const def = WEAPON_DEFS.cross;
  const count = computeProjectileCount(def.baseProjectiles + Math.floor((weapon.level - 1) / 3), player);
  const damage = computeDamage(def.baseDamage + weapon.level * 2, player, weapon.isEvolved);
  const speed = computeSpeed(250, player);
  const areaMulti = computeAreaMultiplier(player);
  const { dx: baseDx, dy: baseDy } = directionVector(player.direction);

  for (let i = 0; i < count; i++) {
    const proj = acquire(projectilePool);
    if (!proj) return;

    // Slight angle variation for extra projectiles
    const angle = Math.atan2(baseDy, baseDx) + (i - (count - 1) / 2) * 0.3;

    initProjectile(
      proj,
      weapon.id,
      player.x,
      player.y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      damage,
      5 * areaMulti,
      2.0,
      -1, // infinite piercing
    );
    proj.originX = player.x;
    proj.originY = player.y;
    proj.returning = false;
  }
}

function fireFireWand(
  player: TPlayer,
  weapon: TWeaponInstance,
  projectilePool: TProjectile[],
): void {
  const def = WEAPON_DEFS.fire_wand;
  const count = computeProjectileCount(def.baseProjectiles + Math.floor((weapon.level - 1) / 3), player);
  const damage = computeDamage(def.baseDamage + weapon.level * 3, player, weapon.isEvolved);
  const speed = computeSpeed(350, player);
  const areaMulti = computeAreaMultiplier(player);

  for (let i = 0; i < count; i++) {
    const proj = acquire(projectilePool);
    if (!proj) return;

    const angle = Math.random() * Math.PI * 2;

    initProjectile(
      proj,
      weapon.id,
      player.x,
      player.y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      damage,
      5 * areaMulti,
      2.0,
      -1, // infinite piercing
    );
  }
}

function fireGarlic(
  player: TPlayer,
  weapon: TWeaponInstance,
  enemyPool: TEnemy[],
  projectilePool: TProjectile[],
): void {
  const def = WEAPON_DEFS.garlic;
  const damage = computeDamage(def.baseDamage + weapon.level, player, weapon.isEvolved);
  const areaMulti = computeAreaMultiplier(player);
  const auraRadius = (50 + weapon.level * 5) * areaMulti;

  // Directly damage enemies within aura radius
  forEachActive(enemyPool, (enemy) => {
    const d = distSq(player.x, player.y, enemy.x, enemy.y);
    if (d < auraRadius * auraRadius) {
      enemy.hp -= damage;
      enemy.hitFlashTimer = 0.1;
    }
  });

  // Create visual-only projectile for rendering the aura
  // Deactivate any existing garlic visual first
  forEachActive(projectilePool, (p) => {
    if (p.weaponId === weapon.id && p.auraRadius && p.auraRadius > 0) {
      deactivate(p);
    }
  });

  const proj = acquire(projectilePool);
  if (!proj) return;

  initProjectile(
    proj,
    weapon.id,
    player.x,
    player.y,
    0,
    0,
    0, // no projectile damage, damage is dealt directly
    0,
    0.45, // slightly less than cooldown so it disappears before next fire
    0,
  );
  proj.auraRadius = auraRadius;
}

function fireHolyWater(
  player: TPlayer,
  weapon: TWeaponInstance,
  projectilePool: TProjectile[],
): void {
  const def = WEAPON_DEFS.holy_water;
  const count = computeProjectileCount(def.baseProjectiles + Math.floor((weapon.level - 1) / 3), player);
  const damage = computeDamage(def.baseDamage + weapon.level * 2, player, weapon.isEvolved);
  const areaMulti = computeAreaMultiplier(player);

  for (let i = 0; i < count; i++) {
    const proj = acquire(projectilePool);
    if (!proj) return;

    // Spawn at random position near player
    const offsetX = (Math.random() - 0.5) * 200;
    const offsetY = (Math.random() - 0.5) * 200;

    initProjectile(
      proj,
      weapon.id,
      player.x + offsetX,
      player.y + offsetY,
      0, // stationary
      0,
      damage,
      20 * areaMulti,
      10, // long lifetime, but controlled by zoneTimer
      -1, // infinite piercing (zone damages repeatedly)
    );
    proj.zoneTimer = 3.0 + weapon.level * 0.3;
  }
}

function fireWhip(
  player: TPlayer,
  weapon: TWeaponInstance,
  enemyPool: TEnemy[],
  projectilePool: TProjectile[],
): void {
  const def = WEAPON_DEFS.whip;
  const damage = computeDamage(def.baseDamage + weapon.level * 3, player, weapon.isEvolved);
  const areaMulti = computeAreaMultiplier(player);
  const range = 80 * areaMulti;
  const width = 60 * areaMulti;

  const { dx, dy } = directionVector(player.direction);

  // Damage enemies in a rectangle in front of player
  forEachActive(enemyPool, (enemy) => {
    const ex = enemy.x - player.x;
    const ey = enemy.y - player.y;

    // Project enemy position onto whip direction and perpendicular
    const along = ex * dx + ey * dy;
    const perp = Math.abs(ex * (-dy) + ey * dx);

    if (along > 0 && along < range && perp < width / 2) {
      enemy.hp -= damage;
      enemy.hitFlashTimer = 0.1;
    }
  });

  // Visual flash effect projectile
  const proj = acquire(projectilePool);
  if (!proj) return;

  initProjectile(
    proj,
    weapon.id,
    player.x + dx * range * 0.5,
    player.y + dy * range * 0.5,
    0,
    0,
    0,
    range * 0.5,
    0.15, // brief flash
    0,
  );
  proj.auraRadius = width; // Store width for rendering
}

function fireLightningRing(
  player: TPlayer,
  weapon: TWeaponInstance,
  enemyPool: TEnemy[],
  projectilePool: TProjectile[],
): void {
  const def = WEAPON_DEFS.lightning_ring;
  const count = computeProjectileCount(def.baseProjectiles + Math.floor((weapon.level - 1) / 2), player);
  const damage = computeDamage(def.baseDamage + weapon.level * 3, player, weapon.isEvolved);

  const activeEnemies = getActiveEnemies(enemyPool);
  if (activeEnemies.length === 0) return;

  for (let i = 0; i < count; i++) {
    // Pick random active enemy
    const target = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];

    // Deal damage directly
    target.hp -= damage;
    target.hitFlashTimer = 0.15;

    // Create brief visual-only projectile at enemy position
    const proj = acquire(projectilePool);
    if (!proj) continue;

    initProjectile(
      proj,
      weapon.id,
      target.x,
      target.y,
      0,
      0,
      0, // no projectile damage, damage is dealt directly
      8,
      0.2, // brief visual
      0,
    );
    // Store player position as origin for lightning line rendering
    proj.originX = player.x;
    proj.originY = player.y;
  }
}

function fireRunetracer(
  player: TPlayer,
  weapon: TWeaponInstance,
  projectilePool: TProjectile[],
): void {
  const def = WEAPON_DEFS.runetracer;
  const count = computeProjectileCount(def.baseProjectiles + Math.floor((weapon.level - 1) / 3), player);
  const damage = computeDamage(def.baseDamage + weapon.level * 2, player, weapon.isEvolved);
  const speed = computeSpeed(300, player);
  const areaMulti = computeAreaMultiplier(player);

  for (let i = 0; i < count; i++) {
    const proj = acquire(projectilePool);
    if (!proj) return;

    const angle = Math.random() * Math.PI * 2;

    initProjectile(
      proj,
      weapon.id,
      player.x,
      player.y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      damage,
      5 * areaMulti,
      4.0,
      -1, // infinite piercing
    );
    proj.bounces = 3 + Math.floor(weapon.level / 2);
  }
}

// ─── Update Weapons ───

/** Holy water zone damage ticker - tracks last tick per projectile index */
const holyWaterTickTimers = new Map<number, number>();

export function updateWeapons(
  player: TPlayer,
  enemyPool: TEnemy[],
  projectilePool: TProjectile[],
  dt: number,
): void {
  for (const weapon of player.weapons) {
    weapon.cooldownTimer -= dt;
    if (weapon.cooldownTimer > 0) continue;

    // Get base weapon def
    const baseId = getBaseWeaponId(weapon);
    if (!baseId) continue;
    const def = WEAPON_DEFS[baseId];

    // Reset cooldown with passive bonus
    weapon.cooldownTimer = computeCooldown(def.baseCooldown, player, weapon.isEvolved);

    // Execute weapon's attack pattern
    switch (baseId) {
      case 'magic_wand':
        fireMagicWand(player, weapon, enemyPool, projectilePool);
        break;
      case 'knife':
        fireKnife(player, weapon, projectilePool);
        break;
      case 'axe':
        fireAxe(player, weapon, projectilePool);
        break;
      case 'cross':
        fireCross(player, weapon, projectilePool);
        break;
      case 'fire_wand':
        fireFireWand(player, weapon, projectilePool);
        break;
      case 'garlic':
        fireGarlic(player, weapon, enemyPool, projectilePool);
        break;
      case 'holy_water':
        fireHolyWater(player, weapon, projectilePool);
        break;
      case 'whip':
        fireWhip(player, weapon, enemyPool, projectilePool);
        break;
      case 'lightning_ring':
        fireLightningRing(player, weapon, enemyPool, projectilePool);
        break;
      case 'runetracer':
        fireRunetracer(player, weapon, projectilePool);
        break;
    }
  }

  // Keep garlic visual at player position
  forEachActive(projectilePool, (proj) => {
    const baseId = getProjectileBaseWeaponId(proj);
    if (baseId === 'garlic' && proj.auraRadius && proj.auraRadius > 0) {
      proj.x = player.x;
      proj.y = player.y;
    }
  });
}

// ─── Update Projectiles ───

/** Get the base weapon id from a projectile's weaponId */
function getProjectileBaseWeaponId(proj: TProjectile): TWeaponId | null {
  // Check if it's a base weapon id directly
  if (proj.weaponId in WEAPON_DEFS) return proj.weaponId as TWeaponId;
  // Check if it's an evolved weapon - find the base
  for (const def of Object.values(WEAPON_DEFS)) {
    if (def.evolvesInto === proj.weaponId) return def.id;
  }
  return null;
}

export function updateProjectiles(
  projectilePool: TProjectile[],
  enemyPool: TEnemy[],
  dt: number,
  camera: TCamera,
): void {
  for (let i = 0; i < projectilePool.length; i++) {
    const proj = projectilePool[i];
    if (!proj.active) continue;

    const baseId = getProjectileBaseWeaponId(proj);

    // ── Holy water zone: stationary, tick damage ──
    if (baseId === 'holy_water') {
      if (proj.zoneTimer !== undefined) {
        proj.zoneTimer -= dt;
        if (proj.zoneTimer <= 0) {
          deactivate(proj);
          holyWaterTickTimers.delete(i);
          continue;
        }

        // Damage enemies in radius every 0.5s
        let tickTimer = holyWaterTickTimers.get(i) ?? 0;
        tickTimer -= dt;
        if (tickTimer <= 0) {
          tickTimer = 0.5;
          forEachActive(enemyPool, (enemy) => {
            const d = distSq(proj.x, proj.y, enemy.x, enemy.y);
            if (d < proj.radius * proj.radius) {
              enemy.hp -= proj.damage;
              enemy.hitFlashTimer = 0.1;
            }
          });
        }
        holyWaterTickTimers.set(i, tickTimer);
      }
      // Holy water does not move, skip rest of physics
      proj.lifetime -= dt;
      if (proj.lifetime <= 0) {
        deactivate(proj);
        holyWaterTickTimers.delete(i);
      }
      continue;
    }

    // ── Garlic aura: stationary visual, no movement ──
    if (baseId === 'garlic' && proj.auraRadius && proj.auraRadius > 0) {
      proj.lifetime -= dt;
      if (proj.lifetime <= 0) {
        deactivate(proj);
      }
      continue;
    }

    // ── Whip / lightning_ring: brief visual, no movement ──
    if (baseId === 'whip' || baseId === 'lightning_ring') {
      proj.lifetime -= dt;
      if (proj.lifetime <= 0) {
        deactivate(proj);
      }
      continue;
    }

    // ── Axe: apply gravity ──
    if (baseId === 'axe') {
      proj.vy += 400 * dt;
    }

    // ── Cross: boomerang return logic ──
    if (baseId === 'cross') {
      if (!proj.returning && proj.lifetime < proj.maxLifetime / 2) {
        proj.returning = true;
      }
      if (proj.returning && proj.originX !== undefined && proj.originY !== undefined) {
        const dx = proj.originX - proj.x;
        const dy = proj.originY - proj.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const returnSpeed = 300;
        proj.vx = (dx / d) * returnSpeed;
        proj.vy = (dy / d) * returnSpeed;
      }
    }

    // ── Movement ──
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;

    // ── Runetracer: bounce off viewport edges ──
    if (baseId === 'runetracer') {
      const sx = proj.x - camera.x;
      const sy = proj.y - camera.y;

      let bounced = false;
      if (sx < 0 || sx > CANVAS_WIDTH) {
        proj.vx = -proj.vx;
        // Clamp inside viewport
        proj.x = sx < 0 ? camera.x + 1 : camera.x + CANVAS_WIDTH - 1;
        bounced = true;
      }
      if (sy < 0 || sy > CANVAS_HEIGHT) {
        proj.vy = -proj.vy;
        proj.y = sy < 0 ? camera.y + 1 : camera.y + CANVAS_HEIGHT - 1;
        bounced = true;
      }

      if (bounced) {
        if (proj.bounces !== undefined) {
          proj.bounces--;
          if (proj.bounces < 0) {
            deactivate(proj);
            continue;
          }
        }
      }
    }

    // ── Lifetime ──
    proj.lifetime -= dt;
    if (proj.lifetime <= 0) {
      deactivate(proj);
    }
  }
}

// ─── Render Projectiles ───

// Weapon colors for projectiles
const WEAPON_COLORS: Record<string, string> = {
  magic_wand: '#88ccff',
  holy_wand: '#ddddff',
  knife: '#cccccc',
  thousand_edge: '#ffffff',
  axe: '#aa6644',
  death_spiral: '#882222',
  cross: '#ffdd44',
  heaven_sword: '#ffffaa',
  fire_wand: '#ff6622',
  hellfire: '#ff2200',
  garlic: COLORS.player,
  soul_eater: '#44ffaa',
  holy_water: '#4488ff',
  blessed_water: '#88ccff',
  whip: '#ffaa44',
  bloody_tear: '#ff4444',
  lightning_ring: '#ffff44',
  thunder_loop: '#ffff88',
  runetracer: '#cc44ff',
  no_future: '#ff44cc',
};

export function renderProjectiles(
  projectilePool: TProjectile[],
  ctx: CanvasRenderingContext2D,
  camera: TCamera,
): void {
  forEachActive(projectilePool, (proj) => {
    if (!isInViewport(proj.x, proj.y, camera, 50)) return;

    const screen = worldToScreen(proj.x, proj.y, camera);
    const baseId = getProjectileBaseWeaponId(proj);
    const color = WEAPON_COLORS[proj.weaponId] ?? '#ffffff';

    ctx.save();

    switch (baseId) {
      // ── Garlic: semi-transparent aura circle ──
      case 'garlic': {
        if (proj.auraRadius && proj.auraRadius > 0) {
          const alpha = 0.15 + 0.1 * Math.sin(Date.now() * 0.005);
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, proj.auraRadius, 0, Math.PI * 2);
          ctx.fill();

          // Outline
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, proj.auraRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }

      // ── Holy Water: semi-transparent blue zone with zoneTimer-based opacity ──
      case 'holy_water': {
        const maxZone = 3.0;
        const alpha = proj.zoneTimer !== undefined
          ? Math.max(0.1, Math.min(0.4, proj.zoneTimer / maxZone * 0.4))
          : 0.3;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();

        // Bubbling effect
        ctx.globalAlpha = alpha + 0.1;
        ctx.strokeStyle = '#88bbff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, proj.radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      // ── Lightning Ring: brief yellow flash line from player to target ──
      case 'lightning_ring': {
        if (proj.originX !== undefined && proj.originY !== undefined) {
          const originScreen = worldToScreen(proj.originX, proj.originY, camera);
          const alpha = Math.min(1, proj.lifetime / 0.1);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;

          // Draw jagged lightning line
          ctx.beginPath();
          ctx.moveTo(originScreen.x, originScreen.y);

          const segments = 5;
          for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const lx = originScreen.x + (screen.x - originScreen.x) * t;
            const ly = originScreen.y + (screen.y - originScreen.y) * t;
            const jitter = s < segments ? (Math.random() - 0.5) * 20 : 0;
            ctx.lineTo(lx + jitter, ly + jitter);
          }
          ctx.stroke();

          // Flash circle at impact
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = alpha * 0.8;
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, 10 * alpha, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      // ── Whip: brief arc/slash visual ──
      case 'whip': {
        const alpha = Math.min(1, proj.lifetime / 0.08);
        ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;

        // Draw arc slash
        const slashWidth = proj.auraRadius ?? 60; // stored width
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, slashWidth * 0.4, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();

        // Inner glow
        ctx.globalAlpha = alpha * 0.3;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, slashWidth * 0.35, -Math.PI * 0.3, Math.PI * 0.3);
        ctx.stroke();
        break;
      }

      // ── Axe: spinning projectile ──
      case 'axe': {
        const spin = Date.now() * 0.01;
        ctx.translate(screen.x, screen.y);
        ctx.rotate(spin);
        ctx.fillStyle = color;
        ctx.fillRect(-proj.radius, -proj.radius * 0.4, proj.radius * 2, proj.radius * 0.8);
        ctx.fillRect(-proj.radius * 0.4, -proj.radius, proj.radius * 0.8, proj.radius * 2);
        break;
      }

      // ── Cross: spinning cross shape ──
      case 'cross': {
        const spin = Date.now() * 0.008;
        ctx.translate(screen.x, screen.y);
        ctx.rotate(spin);
        ctx.fillStyle = color;
        ctx.fillRect(-proj.radius * 1.5, -proj.radius * 0.3, proj.radius * 3, proj.radius * 0.6);
        ctx.fillRect(-proj.radius * 0.3, -proj.radius * 1.5, proj.radius * 0.6, proj.radius * 3);
        break;
      }

      // ── Fire Wand: fiery trail ──
      case 'fire_wand': {
        // Outer glow
        ctx.fillStyle = '#ff4400';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, proj.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Inner core
        ctx.fillStyle = color;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // ── Runetracer: glowing orb with trail ──
      case 'runetracer': {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, proj.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, proj.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      // ── Default: small colored circle ──
      default: {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glow
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, proj.radius * 1.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  });
}

// ─── Evolution Check ───

export function checkEvolution(player: TPlayer): void {
  for (const weapon of player.weapons) {
    if (weapon.isEvolved) continue;
    if (weapon.level < 8) continue;

    // Look up the base weapon def
    const def = WEAPON_DEFS[weapon.id as TWeaponId];
    if (!def) continue;

    // Check if player has the required passive
    const hasPassive = player.passives.some((p) => p.id === def.evolvesWith);
    if (!hasPassive) continue;

    // Evolve the weapon
    weapon.id = def.evolvesInto;
    weapon.isEvolved = true;
  }
}
