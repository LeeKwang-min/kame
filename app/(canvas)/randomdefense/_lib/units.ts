import {
  SUMMON_PROBABILITIES,
  TIER_COLORS,
  ARCHETYPE_SYMBOLS,
  CELL_SIZE,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  SELL_REFUND_RATE,
  SUMMON_BASE_COST,
  SUMMON_COST_INCREMENT,
} from './config';
import { TUnitDef, TPlacedUnit, TArchetype } from './types';

// ─── 30 Unit Definitions (6 tiers × 5 archetypes) ───

const archetypes: TArchetype[] = ['shooter', 'splash', 'slow', 'buffer', 'debuffer'];

function makeUnitDefs(): TUnitDef[] {
  const defs: TUnitDef[] = [];

  const names: Record<TArchetype, string[]> = {
    shooter: ['Recruit', 'Archer', 'Ranger', 'Sniper', 'Assassin', 'Destroyer'],
    splash: ['Sparker', 'Bomber', 'Cannon', 'Mortar', 'Inferno', 'Apocalypse'],
    slow: ['Chiller', 'Frostbite', 'Blizzard', 'Glacier', 'Permafrost', 'Absolute Zero'],
    buffer: ['Bard', 'Drummer', 'Commander', 'General', 'Warlord', 'Overlord'],
    debuffer: ['Hexer', 'Warlock', 'Sorcerer', 'Necromancer', 'Lich', 'Archlich'],
  };

  for (let tier = 1; tier <= 6; tier++) {
    const tierIdx = tier - 1;
    for (const arch of archetypes) {
      const baseDmg = 20 * Math.pow(2.5, tierIdx);
      const baseAtkSpd = 1.0;
      const baseRange = 120;

      const def: TUnitDef = {
        id: `${arch}_t${tier}`,
        name: names[arch][tierIdx],
        tier,
        archetype: arch,
        damage: Math.round(baseDmg * getArchDamageMult(arch)),
        attackSpeed: baseAtkSpd * getArchSpeedMult(arch),
        range: baseRange + getArchRangeBonus(arch) + tier * 5,
        color: TIER_COLORS[tierIdx],
        symbol: ARCHETYPE_SYMBOLS[arch],
      };

      // Archetype-specific stats
      if (arch === 'splash') {
        def.splashRadius = 45 + tier * 8; // nerfed radius
        def.damage = Math.round(baseDmg * 0.7); // lower single target
      }
      if (arch === 'slow') {
        def.slowAmount = 0.25 + tier * 0.05;
        def.slowRadius = 100 + tier * 15;
        def.damage = Math.round(baseDmg * 0.08);
      }
      if (arch === 'buffer') {
        def.buffRadius = 100 + tier * 15;
        def.buffMultiplier = 1.15 + tier * 0.10;
        def.damage = Math.round(baseDmg * 0.5);
      }
      if (arch === 'debuffer') {
        def.debuffAmount = 0.1 + tier * 0.05;
        def.debuffRadius = 100 + tier * 15;
        def.damage = Math.round(baseDmg * 0.8);
      }

      defs.push(def);
    }
  }

  return defs;
}

function getArchDamageMult(arch: TArchetype): number {
  switch (arch) {
    case 'shooter': return 0.5; // rapid-fire: lower per-hit, higher DPS via speed
    case 'splash': return 0.7;
    case 'slow': return 0.5;
    case 'buffer': return 0.3;
    case 'debuffer': return 0.6;
  }
}

function getArchSpeedMult(arch: TArchetype): number {
  switch (arch) {
    case 'shooter': return 3.0; // rapid-fire machine gunner
    case 'splash': return 0.7;
    case 'slow': return 0.5; // ground zone placer (slower = less zone stacking)
    case 'buffer': return 0.6;
    case 'debuffer': return 0.8;
  }
}

function getArchRangeBonus(arch: TArchetype): number {
  switch (arch) {
    case 'shooter': return 30;
    case 'splash': return 0;
    case 'slow': return 20;
    case 'buffer': return 0;
    case 'debuffer': return 10;
  }
}

export const ALL_UNITS: TUnitDef[] = makeUnitDefs();

// Group by tier for easy lookup
export const UNITS_BY_TIER: TUnitDef[][] = [];
for (let t = 1; t <= 6; t++) {
  UNITS_BY_TIER[t] = ALL_UNITS.filter((u) => u.tier === t);
}

// ─── Summon ───

export function summonRandomUnit(): TUnitDef {
  const roll = Math.random();
  let cumulative = 0;
  let tier = 1;

  for (let i = 0; i < SUMMON_PROBABILITIES.length; i++) {
    cumulative += SUMMON_PROBABILITIES[i];
    if (roll < cumulative) {
      tier = i + 1;
      break;
    }
  }

  const pool = UNITS_BY_TIER[tier];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getSummonCost(summonCount: number): number {
  return SUMMON_BASE_COST + summonCount * SUMMON_COST_INCREMENT;
}

// ─── Merge ───

export function canMerge(a: TPlacedUnit, b: TPlacedUnit): boolean {
  return a.id !== b.id && a.def.id === b.def.id && a.def.tier < 6;
}

export function mergeResult(def: TUnitDef): TUnitDef {
  const nextTier = def.tier + 1;
  const pool = UNITS_BY_TIER[nextTier];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Create Placed Unit ───

let nextUnitId = 1;

export function createPlacedUnit(
  def: TUnitDef,
  gridCol: number,
  gridRow: number,
): TPlacedUnit {
  return {
    id: nextUnitId++,
    def,
    gridCol,
    gridRow,
    x: GRID_OFFSET_X + gridCol * CELL_SIZE + CELL_SIZE / 2,
    y: GRID_OFFSET_Y + gridRow * CELL_SIZE + CELL_SIZE / 2,
    attackTimer: 0,
    targetId: null,
    angle: 0,
    buffMultiplier: 1,
    attackFlash: 0,
  };
}

export function resetUnitIdCounter(): void {
  nextUnitId = 1;
}

// ─── Sell ───

export function getSellValue(unit: TPlacedUnit): number {
  const baseCost = SUMMON_BASE_COST;
  const tierMult = Math.pow(2, unit.def.tier - 1);
  return Math.floor(baseCost * tierMult * SELL_REFUND_RATE);
}
