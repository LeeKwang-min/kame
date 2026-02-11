import { PROJECTILE_SPEED } from './config';
import { TPlacedUnit, TEnemy, TProjectile } from './types';

let nextProjectileId = 1;

export function resetProjectileIdCounter(): void {
  nextProjectileId = 1;
}

// ─── Find Target (furthest on path within range) ───

export function findTarget(
  unit: TPlacedUnit,
  enemies: TEnemy[],
): TEnemy | null {
  let best: TEnemy | null = null;
  let bestProgress = -1;

  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const dx = enemy.x - unit.x;
    const dy = enemy.y - unit.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > unit.def.range * unit.buffMultiplier) continue;

    // Furthest on path = higher pathIndex, or same index but higher progress
    const progress = enemy.pathIndex * 10000 + enemy.pathProgress;
    if (progress > bestProgress) {
      bestProgress = progress;
      best = enemy;
    }
  }

  return best;
}

// ─── Create Projectile ───

export function createProjectile(
  unit: TPlacedUnit,
  target: TEnemy,
): TProjectile {
  const proj: TProjectile = {
    id: nextProjectileId++,
    x: unit.x,
    y: unit.y,
    targetId: target.id,
    damage: unit.def.damage * unit.buffMultiplier,
    speed: PROJECTILE_SPEED,
    color: unit.def.color,
  };

  // Archetype-specific effects
  if (unit.def.archetype === 'splash' && unit.def.splashRadius) {
    proj.splashRadius = unit.def.splashRadius;
    proj.splashDamage = proj.damage * 0.75;
  }
  return proj;
}

// ─── Move Projectile → returns true if hit ───

export function moveProjectile(
  proj: TProjectile,
  enemies: TEnemy[],
  dt: number,
): boolean {
  const target = enemies.find((e) => e.id === proj.targetId);
  if (!target || target.hp <= 0) {
    return true; // target gone, remove projectile
  }

  const dx = target.x - proj.x;
  const dy = target.y - proj.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 10) {
    // Hit
    return true;
  }

  // Move toward target
  const moveAmount = proj.speed * dt;
  const ratio = moveAmount / dist;
  proj.x += dx * ratio;
  proj.y += dy * ratio;

  return false;
}

// ─── Apply Damage (with debuff amplification) ───

export function applyDamage(enemy: TEnemy, damage: number): boolean {
  const amplifiedDamage = damage * (1 + enemy.debuffAmount);
  enemy.hp -= amplifiedDamage;
  enemy.hitFlash = 0.1;
  return enemy.hp <= 0;
}

// ─── Apply Splash Damage ───

export function applySplashDamage(
  origin: { x: number; y: number },
  radius: number,
  damage: number,
  enemies: TEnemy[],
  excludeId: number,
): number[] {
  const killedIds: number[] = [];

  for (const enemy of enemies) {
    if (enemy.id === excludeId || enemy.hp <= 0) continue;
    const dx = enemy.x - origin.x;
    const dy = enemy.y - origin.y;
    if (Math.sqrt(dx * dx + dy * dy) <= radius) {
      const killed = applyDamage(enemy, damage);
      if (killed) killedIds.push(enemy.id);
    }
  }

  return killedIds;
}

// ─── Apply Status Effects (stronger overwrites) ───

export function applySlowEffect(
  enemy: TEnemy,
  amount: number,
  duration: number,
): void {
  if (amount > enemy.slowAmount || enemy.slowTimer <= 0) {
    enemy.slowAmount = amount;
    enemy.slowTimer = duration;
  }
}

export function applyDebuffEffect(
  enemy: TEnemy,
  amount: number,
  duration: number,
): void {
  if (amount > enemy.debuffAmount || enemy.debuffTimer <= 0) {
    enemy.debuffAmount = amount;
    enemy.debuffTimer = duration;
  }
}

// ─── Apply Buffer Auras ───

export function applyBuffAuras(units: TPlacedUnit[]): void {
  // Reset all buffs
  for (const unit of units) {
    unit.buffMultiplier = 1;
  }

  // Apply buffer auras
  for (const buffer of units) {
    if (buffer.def.archetype !== 'buffer' || !buffer.def.buffRadius) continue;

    const radius = buffer.def.buffRadius;
    const mult = buffer.def.buffMultiplier ?? 1;

    for (const unit of units) {
      if (unit.id === buffer.id) continue;
      const dx = unit.x - buffer.x;
      const dy = unit.y - buffer.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        // Take the best buff
        unit.buffMultiplier = Math.max(unit.buffMultiplier, mult);
      }
    }
  }
}

// ─── Apply Slow Auras ───

export function applySlowAuras(units: TPlacedUnit[], enemies: TEnemy[]): void {
  for (const unit of units) {
    if (unit.def.archetype !== 'slow' || !unit.def.slowRadius) continue;

    const radius = unit.def.slowRadius * unit.buffMultiplier;
    const amount = unit.def.slowAmount ?? 0;

    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      const dx = enemy.x - unit.x;
      const dy = enemy.y - unit.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        enemy.slowAmount = Math.max(enemy.slowAmount, amount);
        enemy.slowTimer = Math.max(enemy.slowTimer, 0.2);
      }
    }
  }
}

// ─── Apply Debuff Auras ───

export function applyDebuffAuras(units: TPlacedUnit[], enemies: TEnemy[]): void {
  for (const unit of units) {
    if (unit.def.archetype !== 'debuffer' || !unit.def.debuffRadius) continue;

    const radius = unit.def.debuffRadius * unit.buffMultiplier;
    const amount = unit.def.debuffAmount ?? 0;

    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      const dx = enemy.x - unit.x;
      const dy = enemy.y - unit.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        enemy.debuffAmount = Math.max(enemy.debuffAmount, amount);
        enemy.debuffTimer = Math.max(enemy.debuffTimer, 0.2);
      }
    }
  }
}

// ─── Process Unit Attacks ───

export function processUnitAttacks(
  units: TPlacedUnit[],
  enemies: TEnemy[],
  dt: number,
): TProjectile[] {
  const newProjectiles: TProjectile[] = [];

  for (const unit of units) {
    if (unit.attackFlash > 0) {
      unit.attackFlash = Math.max(0, unit.attackFlash - dt);
    }

    unit.attackTimer -= dt;

    if (unit.attackTimer <= 0) {
      const target = findTarget(unit, enemies);
      if (target) {
        // Face the target
        unit.angle = Math.atan2(target.y - unit.y, target.x - unit.x);
        unit.targetId = target.id;
        unit.attackFlash = 0.15;

        newProjectiles.push(createProjectile(unit, target));
        unit.attackTimer = 1 / (unit.def.attackSpeed * (unit.def.archetype === 'buffer' ? 1 : 1));
      } else {
        unit.attackTimer = 0.1; // retry soon
        unit.targetId = null;
      }
    }
  }

  return newProjectiles;
}
