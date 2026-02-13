# Kustom Boss Patterns Expansion Design

## Goal
Add 8 new terrain/trap-focused boss patterns across all tiers to increase gameplay variety.

## New Types

### TWall
Rectangular obstacle with optional movement. Used for falling rocks, cage walls, corridors.
- AABB collision with player circle
- Active state deals damage on contact

### TZone
Rectangular zone with effect type (damage | slow).
- `damage`: hurts player when active and inside
- `slow`: reduces player speed to 50% while inside

### TPatternState Changes
Add `walls: TWall[]` and `zones: TZone[]` fields. Existing 7 patterns return empty arrays.

## New Patterns (8)

### Basic Tier
1. **ground-spike** - Sequential circular spike traps (3-4) at player position with staggered timing
2. **falling-rocks** - Rectangular rocks (TWall) fall from top at random x positions with warning lines

### Mid Tier
3. **cage-walls** - 4 walls close in around boss, one wall has a gap for escape
4. **poison-zone** - 2-3 slow zones near player + 1-2 aimed projectiles
5. **sweeping-laser** - Laser rotates 180 degrees from boss position, must dash through

### Advanced Tier
6. **corridor** - Two moving walls create narrow safe passage that traverses the screen
7. **checkerboard** - 4x3 grid damage zones activate in checkerboard pattern, then invert
8. **minefield** - 6-8 proximity mines with detection radius, chain explosions on approach

## Modified Files

| File | Change |
|------|--------|
| `types.ts` | Add TWall, TZone, update TPatternState |
| `renderer.ts` | Add renderWalls(), renderZones() |
| `boss.ts` | Import 8 new pattern files |
| `player.ts` | Add wall/zone collision detection |
| `game.ts` | Apply slow speed modifier from zones |
| Existing 7 patterns | Add `walls: [], zones: []` to init return |
| 8 new pattern files | New files in patterns/ directory |

## Collision Detection

- **TWall**: Circle vs AABB when wall.isActive — deals damage
- **TZone damage**: Point-in-rect when zone.isActive — deals damage
- **TZone slow**: Point-in-rect when zone.isActive — speed *= 0.5 for that frame

## Slow Effect Implementation
- Checked each frame in game.ts update loop
- Applied as speed multiplier before player movement
- Instant recovery when leaving zone
