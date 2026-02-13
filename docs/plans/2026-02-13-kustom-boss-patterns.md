# Kustom Boss Patterns Expansion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 8 new terrain/trap-focused boss patterns (TWall, TZone types) across all tiers to the kustom game.

**Architecture:** Extend `TPatternState` with `walls: TWall[]` and `zones: TZone[]`. Add collision detection functions for walls (circle vs AABB) and zones (point-in-rect with damage/slow effects). Each new pattern is a self-registering module following the existing pattern system.

**Tech Stack:** TypeScript, Canvas API, existing pattern registry system

---

### Task 1: Add TWall and TZone types to types.ts

**Files:**
- Modify: `app/(canvas)/kustom/_lib/types.ts`

**Step 1: Add TWall type after TAreaHazard**

```typescript
export type TWall = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  warningTimer: number;
  activeTimer: number;
  isActive: boolean;
};
```

**Step 2: Add TZone type after TWall**

```typescript
export type TZoneType = 'damage' | 'slow';

export type TZone = {
  x: number;
  y: number;
  width: number;
  height: number;
  warningTimer: number;
  activeTimer: number;
  isActive: boolean;
  type: TZoneType;
};
```

**Step 3: Add walls and zones to TPatternState**

Update `TPatternState` to include the new fields:

```typescript
export type TPatternState = {
  elapsed: number;
  finished: boolean;
  projectiles: TProjectile[];
  lasers: TLaser[];
  areas: TAreaHazard[];
  walls: TWall[];
  zones: TZone[];
  custom: Record<string, unknown>;
};
```

**Step 4: Build check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: Errors in existing pattern files (missing walls/zones). This is expected and will be fixed in Task 2.

**Step 5: Commit**

```bash
git add app/(canvas)/kustom/_lib/types.ts
git commit -m "feat(kustom): add TWall and TZone types to TPatternState"
```

---

### Task 2: Update existing 7 patterns for new fields

**Files:**
- Modify: `app/(canvas)/kustom/_lib/patterns/aimed-shot.ts`
- Modify: `app/(canvas)/kustom/_lib/patterns/radial-burst.ts`
- Modify: `app/(canvas)/kustom/_lib/patterns/laser-beam.ts`
- Modify: `app/(canvas)/kustom/_lib/patterns/area-hazard.ts`
- Modify: `app/(canvas)/kustom/_lib/patterns/in-out.ts`
- Modify: `app/(canvas)/kustom/_lib/patterns/spiral.ts`
- Modify: `app/(canvas)/kustom/_lib/patterns/bullet-wall.ts`

**Step 1: Add `walls: []` and `zones: []` to each pattern's init() return**

In every pattern file, find the `return { ... }` inside `init()` and add:
```typescript
walls: [],
zones: [],
```

For example, in aimed-shot.ts:
```typescript
return {
  elapsed: 0,
  finished: false,
  projectiles: [],
  lasers: [],
  areas: [],
  walls: [],
  zones: [],
  custom: { ... },
};
```

Do this for all 7 files.

**Step 2: Build check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors)

**Step 3: Commit**

```bash
git add app/(canvas)/kustom/_lib/patterns/
git commit -m "feat(kustom): add walls/zones empty arrays to existing patterns"
```

---

### Task 3: Add wall and zone collision detection

**Files:**
- Modify: `app/(canvas)/kustom/_lib/player.ts`

**Step 1: Import TWall and TZone**

Update import line to include TWall and TZone:
```typescript
import { TPlayer, TProjectile, TLaser, TAreaHazard, TWall, TZone, TDirection } from './types';
```

**Step 2: Add checkWallCollision function**

After `checkAreaCollision`, add:

```typescript
export function checkWallCollision(player: TPlayer, walls: TWall[]): boolean {
  if (player.isInvincible) return false;

  for (const wall of walls) {
    if (!wall.isActive) continue;

    const closestX = Math.max(wall.x, Math.min(player.x, wall.x + wall.width));
    const closestY = Math.max(wall.y, Math.min(player.y, wall.y + wall.height));
    const dx = player.x - closestX;
    const dy = player.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < PLAYER_RADIUS) {
      return true;
    }
  }
  return false;
}
```

**Step 3: Add isPlayerInZone function**

```typescript
export function isPlayerInZone(player: TPlayer, zones: TZone[], zoneType: TZoneType): boolean {
  for (const zone of zones) {
    if (!zone.isActive || zone.type !== zoneType) continue;

    if (
      player.x >= zone.x &&
      player.x <= zone.x + zone.width &&
      player.y >= zone.y &&
      player.y <= zone.y + zone.height
    ) {
      return true;
    }
  }
  return false;
}
```

Also import `TZoneType`:
```typescript
import { TPlayer, TProjectile, TLaser, TAreaHazard, TWall, TZone, TZoneType, TDirection } from './types';
```

**Step 4: Build check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add app/(canvas)/kustom/_lib/player.ts
git commit -m "feat(kustom): add wall and zone collision detection"
```

---

### Task 4: Add wall and zone renderers

**Files:**
- Modify: `app/(canvas)/kustom/_lib/renderer.ts`

**Step 1: Import TWall and TZone types**

```typescript
import { TProjectile, TWall, TZone } from './types';
```

**Step 2: Add renderWalls function**

```typescript
export function renderWalls(ctx: CanvasRenderingContext2D, walls: TWall[]): void {
  for (const wall of walls) {
    ctx.save();
    if (wall.warningTimer > 0) {
      const progress = 1 - wall.warningTimer / (wall.warningTimer + wall.activeTimer || 1);
      ctx.fillStyle = `rgba(180, 80, 40, ${0.15 + progress * 0.25})`;
      ctx.strokeStyle = `rgba(200, 100, 50, ${0.4 + progress * 0.4})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    } else if (wall.isActive) {
      ctx.fillStyle = 'rgba(140, 70, 30, 0.85)';
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.strokeStyle = 'rgba(200, 120, 60, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
      // Inner texture lines
      ctx.strokeStyle = 'rgba(100, 50, 20, 0.4)';
      ctx.lineWidth = 1;
      for (let ly = wall.y + 8; ly < wall.y + wall.height; ly += 12) {
        ctx.beginPath();
        ctx.moveTo(wall.x + 2, ly);
        ctx.lineTo(wall.x + wall.width - 2, ly);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
```

**Step 3: Add renderZones function**

```typescript
export function renderZones(ctx: CanvasRenderingContext2D, zones: TZone[]): void {
  for (const zone of zones) {
    ctx.save();
    if (zone.warningTimer > 0) {
      const maxWarning = zone.warningTimer + zone.activeTimer || 1;
      const progress = 1 - zone.warningTimer / maxWarning;
      if (zone.type === 'slow') {
        ctx.fillStyle = `rgba(80, 0, 180, ${0.1 + progress * 0.2})`;
        ctx.strokeStyle = `rgba(120, 40, 220, ${0.3 + progress * 0.5})`;
      } else {
        ctx.fillStyle = `rgba(255, 30, 30, ${0.1 + progress * 0.25})`;
        ctx.strokeStyle = `rgba(255, 50, 50, ${0.3 + progress * 0.5})`;
      }
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    } else if (zone.isActive) {
      const fade = zone.activeTimer > 0 ? Math.min(1, zone.activeTimer / 0.3) : 1;
      if (zone.type === 'slow') {
        ctx.fillStyle = `rgba(100, 20, 200, ${0.3 * fade})`;
        ctx.strokeStyle = `rgba(140, 60, 240, ${0.6 * fade})`;
      } else {
        ctx.fillStyle = `rgba(255, 20, 20, ${0.5 * fade})`;
        ctx.strokeStyle = `rgba(255, 60, 60, ${0.8 * fade})`;
      }
      ctx.lineWidth = 2;
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    }
    ctx.restore();
  }
}
```

**Step 4: Build check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add app/(canvas)/kustom/_lib/renderer.ts
git commit -m "feat(kustom): add wall and zone renderers"
```

---

### Task 5: Update game.ts for wall/zone collision and slow effect

**Files:**
- Modify: `app/(canvas)/kustom/_lib/game.ts`

**Step 1: Import new collision functions**

Update import from player.ts:
```typescript
import { createPlayer, updatePlayer, startDash, hitPlayer, renderPlayer, renderHP, renderDashCooldown, checkProjectileCollision, checkLaserCollision, checkAreaCollision, checkWallCollision, isPlayerInZone } from './player';
```

**Step 2: Add wall collision check in update()**

Inside the `for (const ap of boss.activePatterns)` loop, after the area collision block, add:

```typescript
// Wall collision
if (!wasHit && checkWallCollision(player, s.walls)) {
  wasHit = true;
}

// Damage zone collision
if (!wasHit && isPlayerInZone(player, s.zones, 'damage')) {
  wasHit = true;
}
```

**Step 3: Add slow zone effect**

Before `updatePlayer(player, dt, keys)` in the `update()` function, add slow zone detection:

```typescript
// Check slow zones
let speedMultiplier = 1.0;
for (const ap of boss.activePatterns) {
  if (!ap.pattern) continue;
  if (isPlayerInZone(player, ap.state.zones, 'slow')) {
    speedMultiplier = 0.5;
    break;
  }
}

// Update player
updatePlayer(player, dt, keys, speedMultiplier);
```

**Step 4: Update updatePlayer signature**

In `player.ts`, update `updatePlayer` to accept optional speed multiplier:
```typescript
export function updatePlayer(
  player: TPlayer,
  dt: number,
  keys: Set<string>,
  speedMultiplier: number = 1.0,
): void {
```

And apply it to `speed`:
```typescript
let speed = PLAYER_SPEED * speedMultiplier;
```

**Step 5: Build check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add app/(canvas)/kustom/_lib/game.ts app/(canvas)/kustom/_lib/player.ts
git commit -m "feat(kustom): add wall/zone collision and slow effect to game loop"
```

---

### Task 6: Update boss.ts to render walls and zones

**Files:**
- Modify: `app/(canvas)/kustom/_lib/boss.ts`

**Step 1: Import renderWalls and renderZones**

Update import from renderer.ts:
```typescript
import { renderWalls, renderZones } from './renderer'; // ADD to existing imports or as new import
```

Note: boss.ts currently does not import from renderer.ts, so this is a new import line.

**Step 2: Update renderPatterns to include walls and zones**

```typescript
export function renderPatterns(boss: TBoss, ctx: CanvasRenderingContext2D): void {
  for (const ap of boss.activePatterns) {
    if (ap.pattern) {
      renderWalls(ctx, ap.state.walls);
      renderZones(ctx, ap.state.zones);
      ap.pattern.render(ap.state, ctx);
    }
  }
}
```

**Step 3: Build check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add app/(canvas)/kustom/_lib/boss.ts
git commit -m "feat(kustom): render walls and zones in boss patterns"
```

---

### Task 7: Create ground-spike pattern (basic)

**Files:**
- Create: `app/(canvas)/kustom/_lib/patterns/ground-spike.ts`
- Modify: `app/(canvas)/kustom/_lib/boss.ts` (add import)

**Step 1: Create pattern file**

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const SPIKE_COUNT = 4;
const SPIKE_RADIUS_MIN = 50;
const SPIKE_RADIUS_MAX = 65;
const WARNING_DURATION = 1.2;
const ACTIVE_DURATION = 0.4;
const STAGGER_DELAY = 0.4;
const PATTERN_DURATION = WARNING_DURATION + STAGGER_DELAY * (SPIKE_COUNT - 1) + ACTIVE_DURATION + 0.3;

const groundSpike: TPattern = {
  name: 'ground-spike',
  tier: 'basic',
  duration: PATTERN_DURATION,

  init(_bossPos: TVector2, playerPos: TVector2): TPatternState {
    const areas = [];
    const margin = SPIKE_RADIUS_MAX;

    for (let i = 0; i < SPIKE_COUNT; i++) {
      const radius = SPIKE_RADIUS_MIN + Math.random() * (SPIKE_RADIUS_MAX - SPIKE_RADIUS_MIN);
      const offsetX = (Math.random() - 0.5) * 250;
      const offsetY = (Math.random() - 0.5) * 250;
      const x = Math.max(margin, Math.min(CANVAS_WIDTH - margin, playerPos.x + offsetX));
      const y = Math.max(margin, Math.min(CANVAS_HEIGHT - margin, playerPos.y + offsetY));

      areas.push({
        x,
        y,
        radius,
        warningTimer: WARNING_DURATION + i * STAGGER_DELAY,
        activeTimer: 0,
        isActive: false,
      });
    }

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas,
      walls: [],
      zones: [],
      custom: {},
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;

    for (const area of state.areas) {
      if (area.warningTimer > 0) {
        area.warningTimer -= dt;
        if (area.warningTimer <= 0) {
          area.isActive = true;
          area.activeTimer = ACTIVE_DURATION;
        }
      } else if (area.isActive) {
        area.activeTimer -= dt;
        if (area.activeTimer <= 0) {
          area.isActive = false;
        }
      }
    }

    if (state.elapsed >= PATTERN_DURATION) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    for (const area of state.areas) {
      if (area.warningTimer > 0) {
        const maxWarning = WARNING_DURATION + STAGGER_DELAY * (SPIKE_COUNT - 1);
        const progress = 1 - area.warningTimer / maxWarning;
        ctx.save();
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 100, 0, ${0.1 + progress * 0.3})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 140, 0, ${0.4 + progress * 0.5})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        // Spike cross marks
        const s = area.radius * 0.3;
        ctx.strokeStyle = `rgba(255, 160, 0, ${0.5 + progress * 0.4})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(area.x - s, area.y - s);
        ctx.lineTo(area.x + s, area.y + s);
        ctx.moveTo(area.x + s, area.y - s);
        ctx.lineTo(area.x - s, area.y + s);
        ctx.stroke();
        ctx.restore();
      } else if (area.isActive) {
        const fade = area.activeTimer / ACTIVE_DURATION;
        ctx.save();
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 120, 0, ${0.6 * fade})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 180, 50, ${0.9 * fade})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(groundSpike);
export default groundSpike;
```

**Step 2: Add import in boss.ts**

Add to the import block:
```typescript
import './patterns/ground-spike';
```

**Step 3: Build check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add app/(canvas)/kustom/_lib/patterns/ground-spike.ts app/(canvas)/kustom/_lib/boss.ts
git commit -m "feat(kustom): add ground-spike pattern (basic)"
```

---

### Task 8: Create falling-rocks pattern (basic)

**Files:**
- Create: `app/(canvas)/kustom/_lib/patterns/falling-rocks.ts`
- Modify: `app/(canvas)/kustom/_lib/boss.ts` (add import)

**Step 1: Create pattern file**

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const ROCK_COUNT_MIN = 4;
const ROCK_COUNT_MAX = 6;
const ROCK_WIDTH = 50;
const ROCK_HEIGHT = 40;
const FALL_SPEED = 300;
const WARNING_DURATION = 1.0;
const STAGGER_DELAY = 0.3;
const PATTERN_DURATION = WARNING_DURATION + STAGGER_DELAY * ROCK_COUNT_MAX + CANVAS_HEIGHT / FALL_SPEED + 0.5;

const fallingRocks: TPattern = {
  name: 'falling-rocks',
  tier: 'basic',
  duration: PATTERN_DURATION,

  init(): TPatternState {
    const count = ROCK_COUNT_MIN + Math.floor(Math.random() * (ROCK_COUNT_MAX - ROCK_COUNT_MIN + 1));
    const walls = [];

    for (let i = 0; i < count; i++) {
      const x = ROCK_WIDTH / 2 + Math.random() * (CANVAS_WIDTH - ROCK_WIDTH);
      walls.push({
        x,
        y: -ROCK_HEIGHT,
        width: ROCK_WIDTH,
        height: ROCK_HEIGHT,
        vx: 0,
        vy: FALL_SPEED,
        warningTimer: WARNING_DURATION + i * STAGGER_DELAY,
        activeTimer: 0,
        isActive: false,
      });
    }

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      walls,
      zones: [],
      custom: { warningPositions: walls.map((w) => w.x + ROCK_WIDTH / 2) },
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;

    for (const wall of state.walls) {
      if (wall.warningTimer > 0) {
        wall.warningTimer -= dt;
        if (wall.warningTimer <= 0) {
          wall.isActive = true;
        }
      } else if (wall.isActive) {
        wall.y += wall.vy * dt;
        if (wall.y > CANVAS_HEIGHT + ROCK_HEIGHT) {
          wall.isActive = false;
        }
      }
    }

    const allDone = state.walls.every((w) => !w.isActive && w.warningTimer <= 0);
    if (allDone && state.elapsed > WARNING_DURATION + 0.5) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const warningPositions = state.custom.warningPositions as number[];

    // Warning lines
    for (let i = 0; i < state.walls.length; i++) {
      const wall = state.walls[i];
      if (wall.warningTimer > 0) {
        const maxW = WARNING_DURATION + i * STAGGER_DELAY;
        const progress = 1 - wall.warningTimer / maxW;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 80, 0, ${0.3 + progress * 0.5})`;
        ctx.lineWidth = ROCK_WIDTH;
        ctx.globalAlpha = 0.1 + progress * 0.15;
        ctx.beginPath();
        ctx.moveTo(warningPositions[i], 0);
        ctx.lineTo(warningPositions[i], CANVAS_HEIGHT);
        ctx.stroke();
        ctx.restore();
      }
    }
    // Active walls are rendered by renderWalls in boss.ts
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(fallingRocks);
export default fallingRocks;
```

**Step 2: Add import in boss.ts**

```typescript
import './patterns/falling-rocks';
```

**Step 3: Build check & Commit**

```bash
npx tsc --noEmit
git add app/(canvas)/kustom/_lib/patterns/falling-rocks.ts app/(canvas)/kustom/_lib/boss.ts
git commit -m "feat(kustom): add falling-rocks pattern (basic)"
```

---

### Task 9: Create cage-walls pattern (mid)

**Files:**
- Create: `app/(canvas)/kustom/_lib/patterns/cage-walls.ts`
- Modify: `app/(canvas)/kustom/_lib/boss.ts` (add import)

**Step 1: Create pattern file**

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const WALL_THICKNESS = 20;
const CLOSE_SPEED = 120;
const WARNING_DURATION = 1.5;
const ACTIVE_DURATION = 2.0;
const GAP_SIZE = 80;
const PATTERN_DURATION = WARNING_DURATION + ACTIVE_DURATION + 0.5;

const cageWalls: TPattern = {
  name: 'cage-walls',
  tier: 'mid',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2): TPatternState {
    // Pick which wall gets the gap (0=top,1=bottom,2=left,3=right)
    const gapWall = Math.floor(Math.random() * 4);
    const gapOffset = 0.2 + Math.random() * 0.6; // gap position as ratio

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      walls: [],
      zones: [],
      custom: {
        bossX: bossPos.x,
        bossY: bossPos.y,
        gapWall,
        gapOffset,
        phase: 'warning',
        closeProgress: 0,
      },
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;
    const c = state.custom as {
      bossX: number; bossY: number;
      gapWall: number; gapOffset: number;
      phase: string; closeProgress: number;
    };

    if (state.elapsed < WARNING_DURATION) {
      c.phase = 'warning';
    } else if (state.elapsed < WARNING_DURATION + ACTIVE_DURATION) {
      c.phase = 'active';
      c.closeProgress = Math.min(1, (state.elapsed - WARNING_DURATION) / (ACTIVE_DURATION * 0.6));
    } else {
      c.phase = 'done';
    }

    if (c.phase === 'active') {
      // Build walls based on close progress
      const margin = 200 * (1 - c.closeProgress); // starts far, closes in
      const cx = c.bossX;
      const cy = c.bossY;

      state.walls = [];

      // Top wall
      const top = cy - margin - WALL_THICKNESS;
      const bottom = cy + margin;
      const left = cx - margin - WALL_THICKNESS;
      const right = cx + margin;
      const hSize = margin * 2 + WALL_THICKNESS;
      const vSize = margin * 2 + WALL_THICKNESS * 2;

      // Build 4 walls with gap in one
      const wallDefs = [
        { x: left, y: top, w: hSize + WALL_THICKNESS, h: WALL_THICKNESS, isHorizontal: true }, // top
        { x: left, y: bottom, w: hSize + WALL_THICKNESS, h: WALL_THICKNESS, isHorizontal: true }, // bottom
        { x: left, y: top, w: WALL_THICKNESS, h: vSize, isHorizontal: false }, // left
        { x: right, y: top, w: WALL_THICKNESS, h: vSize, isHorizontal: false }, // right
      ];

      for (let i = 0; i < wallDefs.length; i++) {
        const wd = wallDefs[i];

        if (i === c.gapWall) {
          // Split wall into two parts with a gap
          if (wd.isHorizontal) {
            const gapX = wd.x + (wd.w - GAP_SIZE) * c.gapOffset;
            // Part before gap
            if (gapX > wd.x) {
              state.walls.push({
                x: wd.x, y: wd.y, width: gapX - wd.x, height: wd.h,
                vx: 0, vy: 0, warningTimer: 0, activeTimer: ACTIVE_DURATION, isActive: true,
              });
            }
            // Part after gap
            const afterGap = gapX + GAP_SIZE;
            if (afterGap < wd.x + wd.w) {
              state.walls.push({
                x: afterGap, y: wd.y, width: wd.x + wd.w - afterGap, height: wd.h,
                vx: 0, vy: 0, warningTimer: 0, activeTimer: ACTIVE_DURATION, isActive: true,
              });
            }
          } else {
            const gapY = wd.y + (wd.h - GAP_SIZE) * c.gapOffset;
            if (gapY > wd.y) {
              state.walls.push({
                x: wd.x, y: wd.y, width: wd.w, height: gapY - wd.y,
                vx: 0, vy: 0, warningTimer: 0, activeTimer: ACTIVE_DURATION, isActive: true,
              });
            }
            const afterGap = gapY + GAP_SIZE;
            if (afterGap < wd.y + wd.h) {
              state.walls.push({
                x: wd.x, y: afterGap, width: wd.w, height: wd.y + wd.h - afterGap,
                vx: 0, vy: 0, warningTimer: 0, activeTimer: ACTIVE_DURATION, isActive: true,
              });
            }
          }
        } else {
          state.walls.push({
            x: wd.x, y: wd.y, width: wd.w, height: wd.h,
            vx: 0, vy: 0, warningTimer: 0, activeTimer: ACTIVE_DURATION, isActive: true,
          });
        }
      }
    } else if (c.phase === 'done') {
      state.walls = [];
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const c = state.custom as {
      bossX: number; bossY: number;
      gapWall: number; gapOffset: number;
      phase: string; closeProgress: number;
    };

    if (c.phase === 'warning') {
      const progress = state.elapsed / WARNING_DURATION;
      ctx.save();
      ctx.strokeStyle = `rgba(180, 80, 40, ${0.3 + progress * 0.5})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      const size = 200 + 10;
      ctx.strokeRect(
        c.bossX - size, c.bossY - size,
        size * 2, size * 2,
      );

      // Show gap indicator
      const sides = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'];
      ctx.fillStyle = `rgba(0, 255, 100, ${0.4 + progress * 0.4})`;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const positions = [
        { x: c.bossX, y: c.bossY - size - 15 },
        { x: c.bossX, y: c.bossY + size + 15 },
        { x: c.bossX - size - 25, y: c.bossY },
        { x: c.bossX + size + 25, y: c.bossY },
      ];
      const gapPos = positions[c.gapWall];
      ctx.fillText('GAP', gapPos.x, gapPos.y);
      ctx.restore();
    }
    // Active walls are rendered by renderWalls
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(cageWalls);
export default cageWalls;
```

**Step 2: Add import in boss.ts**

```typescript
import './patterns/cage-walls';
```

**Step 3: Build check & Commit**

```bash
npx tsc --noEmit
git add app/(canvas)/kustom/_lib/patterns/cage-walls.ts app/(canvas)/kustom/_lib/boss.ts
git commit -m "feat(kustom): add cage-walls pattern (mid)"
```

---

### Task 10: Create poison-zone pattern (mid)

**Files:**
- Create: `app/(canvas)/kustom/_lib/patterns/poison-zone.ts`
- Modify: `app/(canvas)/kustom/_lib/boss.ts` (add import)

**Step 1: Create pattern file**

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { BULLET_RADIUS, BULLET_COLOR, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';
import { renderProjectiles } from '../renderer';

const ZONE_COUNT = 3;
const ZONE_SIZE_MIN = 100;
const ZONE_SIZE_MAX = 140;
const ZONE_WARNING = 1.2;
const ZONE_ACTIVE = 4.0;
const SHOT_DELAY = 1.5;
const SHOT_SPEED = 220;
const PATTERN_DURATION = ZONE_WARNING + ZONE_ACTIVE + 0.5;

const poisonZone: TPattern = {
  name: 'poison-zone',
  tier: 'mid',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2, playerPos: TVector2): TPatternState {
    const zones = [];
    const margin = ZONE_SIZE_MAX;

    for (let i = 0; i < ZONE_COUNT; i++) {
      const w = ZONE_SIZE_MIN + Math.random() * (ZONE_SIZE_MAX - ZONE_SIZE_MIN);
      const h = ZONE_SIZE_MIN + Math.random() * (ZONE_SIZE_MAX - ZONE_SIZE_MIN);
      const offsetX = (Math.random() - 0.5) * 300;
      const offsetY = (Math.random() - 0.5) * 300;
      const x = Math.max(0, Math.min(CANVAS_WIDTH - w, playerPos.x + offsetX - w / 2));
      const y = Math.max(0, Math.min(CANVAS_HEIGHT - h, playerPos.y + offsetY - h / 2));

      zones.push({
        x,
        y,
        width: w,
        height: h,
        warningTimer: ZONE_WARNING,
        activeTimer: ZONE_ACTIVE,
        isActive: false,
        type: 'slow' as const,
      });
    }

    // Aimed shots come after zones activate
    const dx = playerPos.x - bossPos.x;
    const dy = playerPos.y - bossPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      walls: [],
      zones,
      custom: {
        bossX: bossPos.x,
        bossY: bossPos.y,
        dirX: dx / dist,
        dirY: dy / dist,
        shotsFired: 0,
        maxShots: 2,
        nextShotTime: ZONE_WARNING + SHOT_DELAY,
      },
    };
  },

  update(state: TPatternState, dt: number, playerPos: TVector2): void {
    state.elapsed += dt;

    // Update zones
    for (const zone of state.zones) {
      if (zone.warningTimer > 0) {
        zone.warningTimer -= dt;
        if (zone.warningTimer <= 0) {
          zone.isActive = true;
        }
      } else if (zone.isActive) {
        zone.activeTimer -= dt;
        if (zone.activeTimer <= 0) {
          zone.isActive = false;
        }
      }
    }

    // Fire aimed shots
    const c = state.custom as {
      bossX: number; bossY: number;
      dirX: number; dirY: number;
      shotsFired: number; maxShots: number;
      nextShotTime: number;
    };

    if (c.shotsFired < c.maxShots && state.elapsed >= c.nextShotTime) {
      // Re-aim at current player position
      const dx = playerPos.x - c.bossX;
      const dy = playerPos.y - c.bossY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      state.projectiles.push({
        x: c.bossX,
        y: c.bossY,
        vx: (dx / dist) * SHOT_SPEED,
        vy: (dy / dist) * SHOT_SPEED,
        radius: BULLET_RADIUS,
        color: '#aa44ff',
      });
      c.shotsFired++;
      c.nextShotTime = state.elapsed + SHOT_DELAY;
    }

    // Update projectiles
    for (const p of state.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    state.projectiles = state.projectiles.filter(
      (p) => p.x > -50 && p.x < CANVAS_WIDTH + 50 && p.y > -50 && p.y < CANVAS_HEIGHT + 50,
    );

    if (state.elapsed >= PATTERN_DURATION && state.projectiles.length === 0) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    // Zones are rendered by renderZones in boss.ts
    renderProjectiles(ctx, state.projectiles, state.elapsed);
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(poisonZone);
export default poisonZone;
```

**Step 2: Add import in boss.ts**

```typescript
import './patterns/poison-zone';
```

**Step 3: Build check & Commit**

```bash
npx tsc --noEmit
git add app/(canvas)/kustom/_lib/patterns/poison-zone.ts app/(canvas)/kustom/_lib/boss.ts
git commit -m "feat(kustom): add poison-zone pattern (mid)"
```

---

### Task 11: Create sweeping-laser pattern (mid)

**Files:**
- Create: `app/(canvas)/kustom/_lib/patterns/sweeping-laser.ts`
- Modify: `app/(canvas)/kustom/_lib/boss.ts` (add import)

**Step 1: Create pattern file**

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const WARNING_DURATION = 1.2;
const SWEEP_DURATION = 1.5;
const LASER_WIDTH = 18;
const SWEEP_ANGLE = Math.PI; // 180 degrees
const PATTERN_DURATION = WARNING_DURATION + SWEEP_DURATION + 0.3;

const sweepingLaser: TPattern = {
  name: 'sweeping-laser',
  tier: 'mid',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2, playerPos: TVector2): TPatternState {
    // Start angle toward player, sweep 180 degrees
    const dx = playerPos.x - bossPos.x;
    const dy = playerPos.y - bossPos.y;
    const startAngle = Math.atan2(dy, dx) - SWEEP_ANGLE / 2;
    const clockwise = Math.random() < 0.5;

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      walls: [],
      zones: [],
      custom: {
        bossX: bossPos.x,
        bossY: bossPos.y,
        startAngle,
        clockwise,
        currentAngle: startAngle,
        phase: 'warning',
      },
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;
    const c = state.custom as {
      bossX: number; bossY: number;
      startAngle: number; clockwise: boolean;
      currentAngle: number; phase: string;
    };

    if (state.elapsed < WARNING_DURATION) {
      c.phase = 'warning';
      c.currentAngle = c.startAngle;
    } else if (state.elapsed < WARNING_DURATION + SWEEP_DURATION) {
      c.phase = 'active';
      const sweepProgress = (state.elapsed - WARNING_DURATION) / SWEEP_DURATION;
      const direction = c.clockwise ? 1 : -1;
      c.currentAngle = c.startAngle + direction * SWEEP_ANGLE * sweepProgress;

      // Update laser position
      const maxDist = Math.sqrt(CANVAS_WIDTH * CANVAS_WIDTH + CANVAS_HEIGHT * CANVAS_HEIGHT);
      const endX = c.bossX + Math.cos(c.currentAngle) * maxDist;
      const endY = c.bossY + Math.sin(c.currentAngle) * maxDist;

      state.lasers = [{
        x1: c.bossX,
        y1: c.bossY,
        x2: endX,
        y2: endY,
        width: LASER_WIDTH,
        warningTimer: 0,
        activeTimer: SWEEP_DURATION - (state.elapsed - WARNING_DURATION),
        isActive: true,
      }];
    } else {
      c.phase = 'done';
      state.lasers = [];
    }

    if (state.elapsed >= PATTERN_DURATION) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const c = state.custom as {
      bossX: number; bossY: number;
      startAngle: number; clockwise: boolean;
      currentAngle: number; phase: string;
    };

    if (c.phase === 'warning') {
      const progress = state.elapsed / WARNING_DURATION;
      const maxDist = Math.sqrt(CANVAS_WIDTH * CANVAS_WIDTH + CANVAS_HEIGHT * CANVAS_HEIGHT);

      // Show sweep area preview
      ctx.save();
      ctx.globalAlpha = 0.1 + progress * 0.15;
      ctx.fillStyle = '#ff2222';
      ctx.beginPath();
      ctx.moveTo(c.bossX, c.bossY);
      const direction = c.clockwise ? 1 : -1;
      const startA = c.startAngle;
      const endA = c.startAngle + direction * SWEEP_ANGLE;
      ctx.arc(c.bossX, c.bossY, maxDist,
        direction > 0 ? startA : endA,
        direction > 0 ? endA : startA,
      );
      ctx.closePath();
      ctx.fill();

      // Warning line at start position
      ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + progress * 0.4})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(c.bossX, c.bossY);
      ctx.lineTo(
        c.bossX + Math.cos(c.startAngle) * maxDist,
        c.bossY + Math.sin(c.startAngle) * maxDist,
      );
      ctx.stroke();
      ctx.restore();
    } else if (c.phase === 'active') {
      // Render active laser
      for (const laser of state.lasers) {
        ctx.save();
        ctx.strokeStyle = '#ff2222';
        ctx.lineWidth = laser.width;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(laser.x1, laser.y1);
        ctx.lineTo(laser.x2, laser.y2);
        ctx.stroke();
        ctx.strokeStyle = '#ff8888';
        ctx.lineWidth = laser.width * 0.3;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(laser.x1, laser.y1);
        ctx.lineTo(laser.x2, laser.y2);
        ctx.stroke();
        ctx.restore();
      }
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(sweepingLaser);
export default sweepingLaser;
```

**Step 2: Add import in boss.ts**

```typescript
import './patterns/sweeping-laser';
```

**Step 3: Build check & Commit**

```bash
npx tsc --noEmit
git add app/(canvas)/kustom/_lib/patterns/sweeping-laser.ts app/(canvas)/kustom/_lib/boss.ts
git commit -m "feat(kustom): add sweeping-laser pattern (mid)"
```

---

### Task 12: Create corridor pattern (advanced)

**Files:**
- Create: `app/(canvas)/kustom/_lib/patterns/corridor.ts`
- Modify: `app/(canvas)/kustom/_lib/boss.ts` (add import)

**Step 1: Create pattern file**

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const WALL_THICKNESS = 600;
const GAP_HEIGHT = 80;
const MOVE_SPEED = 100;
const WARNING_DURATION = 1.5;
const PATTERN_DURATION = WARNING_DURATION + CANVAS_WIDTH / MOVE_SPEED + 1.0;

const corridor: TPattern = {
  name: 'corridor',
  tier: 'advanced',
  duration: PATTERN_DURATION,

  init(): TPatternState {
    const fromLeft = Math.random() < 0.5;
    const gapY = GAP_HEIGHT + Math.random() * (CANVAS_HEIGHT - GAP_HEIGHT * 3);
    const startX = fromLeft ? -CANVAS_WIDTH : CANVAS_WIDTH;
    const vx = fromLeft ? MOVE_SPEED : -MOVE_SPEED;

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      walls: [],
      zones: [],
      custom: {
        gapY,
        startX,
        vx,
        currentX: startX,
        fromLeft,
        phase: 'warning',
      },
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;
    const c = state.custom as {
      gapY: number; startX: number; vx: number;
      currentX: number; fromLeft: boolean; phase: string;
    };

    if (state.elapsed < WARNING_DURATION) {
      c.phase = 'warning';
    } else {
      c.phase = 'active';
      c.currentX += c.vx * dt;

      // Top wall (above gap)
      const topWall = {
        x: c.currentX,
        y: -10,
        width: CANVAS_WIDTH,
        height: c.gapY + 10,
        vx: 0,
        vy: 0,
        warningTimer: 0,
        activeTimer: PATTERN_DURATION,
        isActive: true,
      };

      // Bottom wall (below gap)
      const bottomWall = {
        x: c.currentX,
        y: c.gapY + GAP_HEIGHT,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT - c.gapY - GAP_HEIGHT + 10,
        vx: 0,
        vy: 0,
        warningTimer: 0,
        activeTimer: PATTERN_DURATION,
        isActive: true,
      };

      state.walls = [topWall, bottomWall];

      // Check if walls have passed through
      if (c.fromLeft && c.currentX > CANVAS_WIDTH + 50) {
        state.finished = true;
      } else if (!c.fromLeft && c.currentX + CANVAS_WIDTH < -50) {
        state.finished = true;
      }
    }

    if (state.elapsed >= PATTERN_DURATION) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const c = state.custom as {
      gapY: number; startX: number; vx: number;
      currentX: number; fromLeft: boolean; phase: string;
    };

    if (c.phase === 'warning') {
      const progress = state.elapsed / WARNING_DURATION;

      // Show gap indicator
      ctx.save();
      ctx.fillStyle = `rgba(0, 255, 100, ${0.1 + progress * 0.2})`;
      ctx.fillRect(0, c.gapY, CANVAS_WIDTH, GAP_HEIGHT);
      ctx.strokeStyle = `rgba(0, 255, 100, ${0.3 + progress * 0.4})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(0, c.gapY, CANVAS_WIDTH, GAP_HEIGHT);

      // Arrow showing direction
      const arrowX = c.fromLeft ? 40 : CANVAS_WIDTH - 40;
      ctx.fillStyle = `rgba(255, 100, 50, ${0.5 + progress * 0.4})`;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.fromLeft ? '>>>' : '<<<', arrowX, c.gapY + GAP_HEIGHT / 2);

      ctx.restore();
    }
    // Active walls rendered by renderWalls
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(corridor);
export default corridor;
```

**Step 2: Add import in boss.ts**

```typescript
import './patterns/corridor';
```

**Step 3: Build check & Commit**

```bash
npx tsc --noEmit
git add app/(canvas)/kustom/_lib/patterns/corridor.ts app/(canvas)/kustom/_lib/boss.ts
git commit -m "feat(kustom): add corridor pattern (advanced)"
```

---

### Task 13: Create checkerboard pattern (advanced)

**Files:**
- Create: `app/(canvas)/kustom/_lib/patterns/checkerboard.ts`
- Modify: `app/(canvas)/kustom/_lib/boss.ts` (add import)

**Step 1: Create pattern file**

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const COLS = 4;
const ROWS = 3;
const WARNING_DURATION = 1.5;
const PHASE_DURATION = 1.0;
const PHASE_COUNT = 3; // toggle 3 times
const PATTERN_DURATION = WARNING_DURATION + PHASE_DURATION * PHASE_COUNT + 0.5;

const checkerboard: TPattern = {
  name: 'checkerboard',
  tier: 'advanced',
  duration: PATTERN_DURATION,

  init(): TPatternState {
    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      walls: [],
      zones: [],
      custom: {
        phase: 'warning',
        currentPhase: 0,
        inverted: false,
      },
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;
    const c = state.custom as {
      phase: string; currentPhase: number; inverted: boolean;
    };

    if (state.elapsed < WARNING_DURATION) {
      c.phase = 'warning';
    } else {
      c.phase = 'active';
      const activeTime = state.elapsed - WARNING_DURATION;
      const phaseIndex = Math.floor(activeTime / PHASE_DURATION);

      if (phaseIndex !== c.currentPhase && phaseIndex < PHASE_COUNT) {
        c.currentPhase = phaseIndex;
        c.inverted = !c.inverted;
      }

      // Build damage zones
      const cellW = CANVAS_WIDTH / COLS;
      const cellH = CANVAS_HEIGHT / ROWS;
      state.zones = [];

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const isChecked = (row + col) % 2 === 0;
          const isDanger = c.inverted ? !isChecked : isChecked;

          if (isDanger) {
            state.zones.push({
              x: col * cellW,
              y: row * cellH,
              width: cellW,
              height: cellH,
              warningTimer: 0,
              activeTimer: PHASE_DURATION,
              isActive: true,
              type: 'damage',
            });
          }
        }
      }
    }

    if (state.elapsed >= PATTERN_DURATION) {
      state.zones = [];
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const c = state.custom as {
      phase: string; currentPhase: number; inverted: boolean;
    };

    if (c.phase === 'warning') {
      const progress = state.elapsed / WARNING_DURATION;
      const cellW = CANVAS_WIDTH / COLS;
      const cellH = CANVAS_HEIGHT / ROWS;

      ctx.save();
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const isChecked = (row + col) % 2 === 0;
          if (isChecked) {
            ctx.fillStyle = `rgba(255, 30, 30, ${0.05 + progress * 0.15})`;
            ctx.fillRect(col * cellW, row * cellH, cellW, cellH);
          }
        }
      }

      // Grid lines
      ctx.strokeStyle = `rgba(255, 50, 50, ${0.2 + progress * 0.3})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (let col = 1; col < COLS; col++) {
        ctx.beginPath();
        ctx.moveTo(col * cellW, 0);
        ctx.lineTo(col * cellW, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let row = 1; row < ROWS; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * cellH);
        ctx.lineTo(CANVAS_WIDTH, row * cellH);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Active zones rendered by renderZones
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(checkerboard);
export default checkerboard;
```

**Step 2: Add import in boss.ts**

```typescript
import './patterns/checkerboard';
```

**Step 3: Build check & Commit**

```bash
npx tsc --noEmit
git add app/(canvas)/kustom/_lib/patterns/checkerboard.ts app/(canvas)/kustom/_lib/boss.ts
git commit -m "feat(kustom): add checkerboard pattern (advanced)"
```

---

### Task 14: Create minefield pattern (advanced)

**Files:**
- Create: `app/(canvas)/kustom/_lib/patterns/minefield.ts`
- Modify: `app/(canvas)/kustom/_lib/boss.ts` (add import)

**Step 1: Create pattern file**

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_RADIUS } from '../config';
import { registerPattern } from './registry';

const MINE_COUNT_MIN = 6;
const MINE_COUNT_MAX = 8;
const MINE_RADIUS = 15;
const DETECTION_RADIUS = 60;
const MINE_WARNING_DURATION = 0.6;
const MINE_ACTIVE_DURATION = 0.3;
const EXPLOSION_RADIUS = 70;
const PATTERN_DURATION = 8.0;

type TMine = {
  x: number;
  y: number;
  state: 'idle' | 'triggered' | 'exploding' | 'done';
  triggerTimer: number;
  explosionTimer: number;
};

const minefield: TPattern = {
  name: 'minefield',
  tier: 'advanced',
  duration: PATTERN_DURATION,

  init(): TPatternState {
    const count = MINE_COUNT_MIN + Math.floor(Math.random() * (MINE_COUNT_MAX - MINE_COUNT_MIN + 1));
    const mines: TMine[] = [];
    const margin = 60;

    for (let i = 0; i < count; i++) {
      mines.push({
        x: margin + Math.random() * (CANVAS_WIDTH - margin * 2),
        y: margin + Math.random() * (CANVAS_HEIGHT - margin * 2),
        state: 'idle',
        triggerTimer: 0,
        explosionTimer: 0,
      });
    }

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      walls: [],
      zones: [],
      custom: { mines },
    };
  },

  update(state: TPatternState, dt: number, playerPos: TVector2): void {
    state.elapsed += dt;
    const mines = state.custom.mines as TMine[];

    // Clear areas each frame and rebuild from exploding mines
    state.areas = [];

    for (const mine of mines) {
      if (mine.state === 'idle') {
        // Check proximity to player
        const dx = playerPos.x - mine.x;
        const dy = playerPos.y - mine.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < DETECTION_RADIUS) {
          mine.state = 'triggered';
          mine.triggerTimer = MINE_WARNING_DURATION;
        }
      } else if (mine.state === 'triggered') {
        mine.triggerTimer -= dt;
        if (mine.triggerTimer <= 0) {
          mine.state = 'exploding';
          mine.explosionTimer = MINE_ACTIVE_DURATION;

          // Chain reaction: trigger nearby idle mines
          for (const other of mines) {
            if (other.state === 'idle') {
              const dx = other.x - mine.x;
              const dy = other.y - mine.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < EXPLOSION_RADIUS + DETECTION_RADIUS * 0.5) {
                other.state = 'triggered';
                other.triggerTimer = MINE_WARNING_DURATION * 0.4;
              }
            }
          }
        }
      } else if (mine.state === 'exploding') {
        mine.explosionTimer -= dt;

        // Add active area for collision
        state.areas.push({
          x: mine.x,
          y: mine.y,
          radius: EXPLOSION_RADIUS,
          warningTimer: 0,
          activeTimer: mine.explosionTimer,
          isActive: true,
        });

        if (mine.explosionTimer <= 0) {
          mine.state = 'done';
        }
      }
    }

    const allDone = mines.every((m) => m.state === 'done');
    if ((allDone && state.elapsed > 1.0) || state.elapsed >= PATTERN_DURATION) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const mines = state.custom.mines as TMine[];

    for (const mine of mines) {
      ctx.save();

      if (mine.state === 'idle') {
        // Mine body
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, MINE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(80, 80, 80, 0.7)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Detection radius hint
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, DETECTION_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();

        // X mark
        ctx.strokeStyle = 'rgba(255, 60, 60, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        const s = MINE_RADIUS * 0.5;
        ctx.beginPath();
        ctx.moveTo(mine.x - s, mine.y - s);
        ctx.lineTo(mine.x + s, mine.y + s);
        ctx.moveTo(mine.x + s, mine.y - s);
        ctx.lineTo(mine.x - s, mine.y + s);
        ctx.stroke();
      } else if (mine.state === 'triggered') {
        const flash = Math.floor(mine.triggerTimer * 12) % 2 === 0;
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, MINE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = flash ? 'rgba(255, 60, 0, 0.8)' : 'rgba(80, 80, 80, 0.7)';
        ctx.fill();

        // Warning circle
        const progress = 1 - mine.triggerTimer / MINE_WARNING_DURATION;
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, EXPLOSION_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 50, 0, ${0.1 + progress * 0.2})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 80, 0, ${0.5 + progress * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (mine.state === 'exploding') {
        const fade = mine.explosionTimer / MINE_ACTIVE_DURATION;
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, EXPLOSION_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 100, 0, ${0.6 * fade})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 200, 50, ${0.8 * fade})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.restore();
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(minefield);
export default minefield;
```

**Step 2: Add import in boss.ts**

```typescript
import './patterns/minefield';
```

**Step 3: Build check & Commit**

```bash
npx tsc --noEmit
git add app/(canvas)/kustom/_lib/patterns/minefield.ts app/(canvas)/kustom/_lib/boss.ts
git commit -m "feat(kustom): add minefield pattern (advanced)"
```

---

### Task 15: Final build verification and manual test

**Step 1: Full build check**

Run: `npx tsc --noEmit`
Expected: PASS (zero errors)

**Step 2: Dev server check**

Run: `yarn dev`
Navigate to kustom game and play through to verify:
- Basic patterns (ground-spike, falling-rocks) appear at start
- Mid patterns (cage-walls, poison-zone, sweeping-laser) unlock at 15s
- Advanced patterns (corridor, checkerboard, minefield) unlock at 30s
- Slow zones reduce player speed
- Wall collisions deal damage
- Zone damage works correctly
- All patterns render correctly with warning/active phases

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(kustom): complete 8 new boss patterns with wall/zone system"
```
