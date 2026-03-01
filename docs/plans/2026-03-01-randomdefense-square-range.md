# Random Defense: Square Range Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert all range indicators and collision detection from circular (Euclidean) to grid-aligned square (Chebyshev) in the randomdefense game, with cell-snapped integer ranges.

**Architecture:** Change range values from pixel-based to cell-based integers, switch distance checks from `sqrt(dx²+dy²)` to `max(|dx|,|dy|)`, and replace `ctx.arc()` rendering with `ctx.fillRect()`/`ctx.strokeRect()`. Ground zones and splash damage remain circular.

**Tech Stack:** Canvas 2D, TypeScript

---

### Task 1: Update types.ts — Change range comments from pixels to cells

**Files:**
- Modify: `app/(canvas)/randomdefense/_lib/types.ts:12-22`

**Step 1: Update type comments**

Change the comments on range fields from "pixels" to "cells (grid units)":

```typescript
// In TUnitDef:
  range: number; // cells (grid units) — Chebyshev distance
  // ...
  splashRadius?: number; // pixels (stays circular)
  slowAmount?: number; // 0-1, multiplier
  slowRadius?: number; // cells (grid units) — aura range
  buffRadius?: number; // cells (grid units) — aura range
  buffMultiplier?: number; // damage multiplier for nearby allies
  debuffAmount?: number; // 0-1, damage amplification
  debuffRadius?: number; // cells (grid units) — aura range
```

**Step 2: Commit**

```bash
git add app/(canvas)/randomdefense/_lib/types.ts
git commit -m "refactor(randomdefense): update range type comments from pixels to cells"
```

---

### Task 2: Update units.ts — Convert range values to cell-based integers

**Files:**
- Modify: `app/(canvas)/randomdefense/_lib/units.ts:29-67`
- Modify: `app/(canvas)/randomdefense/_lib/units.ts:76-104`

**Step 1: Replace range calculation with cell-based lookup**

Replace `getArchRangeBonus` function and the range calculation in `makeUnitDefs`:

Remove the old `baseRange` calculation (line 34, 43) and `getArchRangeBonus` function (lines 96-104).

Replace with:

```typescript
function getArchRange(arch: TArchetype, tier: number): number {
  // Cell-based attack ranges (Chebyshev distance)
  const ranges: Record<TArchetype, number[]> = {
    shooter:  [3, 3, 3, 3, 4, 4], // longest range
    splash:   [2, 2, 3, 3, 3, 3],
    slow:     [3, 3, 3, 3, 3, 3],
    buffer:   [2, 2, 3, 3, 3, 3],
    debuffer: [3, 3, 3, 3, 3, 3],
  };
  return ranges[arch][tier - 1];
}
```

In `makeUnitDefs`, change `def.range` assignment from:
```typescript
range: baseRange + getArchRangeBonus(arch) + tier * 5,
```
to:
```typescript
range: getArchRange(arch, tier),
```

Remove the `const baseRange = 120;` line (it's no longer needed).

**Step 2: Replace aura radius calculations with cell-based values**

Change aura radius assignments from pixel formulas to cell-based lookup:

```typescript
function getAuraRange(tier: number): number {
  // Cell-based aura ranges
  const ranges = [2, 2, 3, 3, 4, 4];
  return ranges[tier - 1];
}
```

In `makeUnitDefs`, change:
```typescript
// Before:
def.slowRadius = 100 + tier * 15;
def.buffRadius = 100 + tier * 15;
def.debuffRadius = 100 + tier * 15;

// After:
def.slowRadius = getAuraRange(tier);
def.buffRadius = getAuraRange(tier);
def.debuffRadius = getAuraRange(tier);
```

**Step 3: Commit**

```bash
git add app/(canvas)/randomdefense/_lib/units.ts
git commit -m "refactor(randomdefense): convert range values from pixels to cell-based integers"
```

---

### Task 3: Update combat.ts — Switch distance checks to Chebyshev

**Files:**
- Modify: `app/(canvas)/randomdefense/_lib/combat.ts`

**Important:** Only change distance checks for attack range and aura detection. Keep Euclidean for `updateGroundZones`, `applySplashDamage`, and `moveProjectile`.

**Step 1: Add CELL_SIZE import**

Add `CELL_SIZE` to the import from `./config`:

```typescript
import {
  CELL_SIZE,
  PROJECTILE_SPEED,
  GROUND_ZONE_BASE_DURATION,
  GROUND_ZONE_DURATION_PER_TIER,
  SPLASH_MAX_TARGETS,
} from './config';
```

**Step 2: Update `findTarget()` — lines 17-40**

Change the distance check from Euclidean to Chebyshev:

```typescript
// Before:
const dist = Math.sqrt(dx * dx + dy * dy);
if (dist > unit.def.range * unit.buffMultiplier) continue;

// After:
const dist = Math.max(Math.abs(dx), Math.abs(dy));
if (dist > unit.def.range * CELL_SIZE * unit.buffMultiplier) continue;
```

**Step 3: Update `applyBuffAuras()` — lines 220-243**

```typescript
// Before:
const radius = buffer.def.buffRadius;
// ...
if (Math.sqrt(dx * dx + dy * dy) <= radius) {

// After:
const halfSize = buffer.def.buffRadius! * CELL_SIZE;
// ...
if (Math.max(Math.abs(dx), Math.abs(dy)) <= halfSize) {
```

**Step 4: Update `applySlowAuras()` — lines 247-264**

```typescript
// Before:
const radius = unit.def.slowRadius * unit.buffMultiplier;
// ...
if (Math.sqrt(dx * dx + dy * dy) <= radius) {

// After:
const halfSize = unit.def.slowRadius! * CELL_SIZE * unit.buffMultiplier;
// ...
if (Math.max(Math.abs(dx), Math.abs(dy)) <= halfSize) {
```

**Step 5: Update `applyDebuffAuras()` — lines 268-285**

```typescript
// Before:
const radius = unit.def.debuffRadius * unit.buffMultiplier;
// ...
if (Math.sqrt(dx * dx + dy * dy) <= radius) {

// After:
const halfSize = unit.def.debuffRadius! * CELL_SIZE * unit.buffMultiplier;
// ...
if (Math.max(Math.abs(dx), Math.abs(dy)) <= halfSize) {
```

**Step 6: Update `createGroundZone()` — lines 74-91**

Ground zone radius needs to convert from cells to pixels since ground zones remain circular:

```typescript
// Before:
radius: unit.def.slowRadius ?? 80,

// After:
radius: (unit.def.slowRadius ?? 2) * CELL_SIZE,
```

**Step 7: Commit**

```bash
git add app/(canvas)/randomdefense/_lib/combat.ts
git commit -m "refactor(randomdefense): switch range detection from Euclidean to Chebyshev distance"
```

---

### Task 4: Update renderer.ts — Change range rendering from circles to rectangles

**Files:**
- Modify: `app/(canvas)/randomdefense/_lib/renderer.ts`

**Step 1: Add CELL_SIZE to imports (if not already imported)**

Verify `CELL_SIZE` is already in the imports at the top of renderer.ts (line 7). It should be.

**Step 2: Update buffer aura rendering — lines 289-298**

Replace circular buffer aura with rectangular:

```typescript
// Before:
if (def.archetype === 'buffer' && def.buffRadius) {
  ctx.beginPath();
  ctx.arc(x, y, def.buffRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 215, 0, 0.05)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// After:
if (def.archetype === 'buffer' && def.buffRadius) {
  const halfSize = def.buffRadius * CELL_SIZE;
  ctx.fillStyle = 'rgba(255, 215, 0, 0.05)';
  ctx.fillRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);
}
```

**Step 3: Update debuffer aura rendering — lines 300-310**

Replace circular debuffer aura with rectangular:

```typescript
// Before:
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

// After:
if (def.archetype === 'debuffer' && def.debuffRadius) {
  const halfSize = def.debuffRadius * unit.buffMultiplier * CELL_SIZE;
  ctx.fillStyle = 'rgba(168, 85, 247, 0.05)';
  ctx.fillRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);
}
```

**Step 4: Update selected unit range indicator — lines 410-420**

Replace dashed circle with dashed rectangle:

```typescript
// Before:
ctx.beginPath();
ctx.arc(x, y, def.range, 0, Math.PI * 2);
ctx.strokeStyle = 'rgba(255,255,255,0.25)';
ctx.lineWidth = 1;
ctx.setLineDash([5, 5]);
ctx.stroke();
ctx.setLineDash([]);

ctx.fillStyle = 'rgba(255,255,255,0.04)';
ctx.fill();

// After:
const rangeHalf = def.range * CELL_SIZE;
ctx.strokeStyle = 'rgba(255,255,255,0.25)';
ctx.lineWidth = 1;
ctx.setLineDash([5, 5]);
ctx.strokeRect(x - rangeHalf, y - rangeHalf, rangeHalf * 2, rangeHalf * 2);
ctx.setLineDash([]);

ctx.fillStyle = 'rgba(255,255,255,0.04)';
ctx.fillRect(x - rangeHalf, y - rangeHalf, rangeHalf * 2, rangeHalf * 2);
```

**Step 5: Commit**

```bash
git add app/(canvas)/randomdefense/_lib/renderer.ts
git commit -m "refactor(randomdefense): render buffer/debuffer/attack range as rectangles"
```

---

### Task 5: Update renderer.ts — Rewrite drawSlowField to use rectangles

**Files:**
- Modify: `app/(canvas)/randomdefense/_lib/renderer.ts:536-567`

**Step 1: Rewrite `drawSlowField` function**

Replace the circular gradient + rotating dashed circle with a rectangular fill + animated dashed rectangle (marching ants effect):

```typescript
export function drawSlowField(ctx: CanvasRenderingContext2D, unit: TPlacedUnit, time: number): void {
  const { x, y, def } = unit;
  if (def.archetype !== 'slow' || !def.slowRadius) return;
  const halfSize = def.slowRadius * unit.buffMultiplier * CELL_SIZE;

  ctx.save();

  // Subtle blue fill
  ctx.fillStyle = 'rgba(96, 165, 250, 0.06)';
  ctx.fillRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);

  // Animated dashed border (marching ants effect)
  ctx.strokeStyle = 'rgba(147, 197, 253, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 7]);
  ctx.lineDashOffset = -time * 0.02;
  ctx.strokeRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);
  ctx.setLineDash([]);

  ctx.restore();
}
```

**Step 2: Commit**

```bash
git add app/(canvas)/randomdefense/_lib/renderer.ts
git commit -m "refactor(randomdefense): rewrite slow field rendering as animated dashed rectangle"
```

---

### Task 6: Update panel display — Fix range value display

**Files:**
- Modify: `app/(canvas)/randomdefense/_lib/renderer.ts:898,917-919`

**Step 1: Update range display in panel**

Since range values are now in cells, multiply by CELL_SIZE for display to keep the sci-fi "nm" units consistent:

```typescript
// Line 898 — Before:
ctx.fillText(`RANGE: ${def.range}nm`, px, py);
// After:
ctx.fillText(`RANGE: ${def.range * CELL_SIZE}nm`, px, py);

// Lines 917-919 — Before:
if (def.slowRadius) {
  ctx.fillText(`STASIS RAD: ${def.slowRadius}nm`, px, py);
  py += 20;
}
// After:
if (def.slowRadius) {
  ctx.fillText(`STASIS RAD: ${def.slowRadius * CELL_SIZE}nm`, px, py);
  py += 20;
}
```

**Step 2: Commit**

```bash
git add app/(canvas)/randomdefense/_lib/renderer.ts
git commit -m "fix(randomdefense): adjust panel range display for cell-based values"
```

---

### Task 7: Manual verification — Run dev server and test

**Step 1: Start dev server**

```bash
yarn dev
```

**Step 2: Verify in browser**

Navigate to the randomdefense game and check:

1. **Place a buffer unit** → gold rectangle aura should appear, aligned to grid
2. **Place a debuffer unit** → purple rectangle aura should appear, aligned to grid
3. **Place a slow unit** → blue dashed rectangle with marching ants animation
4. **Select any unit** → white dashed rectangle shows attack range
5. **Place a buffer next to another unit** → verify buffed unit's range scales correctly
6. **Play through a wave** → verify units attack enemies within rectangular range
7. **Verify ground zones** → slow unit's ground zones should still be circular
8. **Verify splash damage** → splash should still be circular

**Step 3: Final commit if any fixes needed**
