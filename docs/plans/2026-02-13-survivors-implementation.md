# Survivors Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Vampire Survivors 스타일의 풀 스케일 로그라이크 서바이벌 게임을 KAME 프로젝트에 추가한다.

**Architecture:** 순수 Canvas API 기반. 무한 맵 + 카메라 시스템, 오브젝트 풀링, 공간 해싱으로 성능 최적화. 10종 무기(자동 공격) + 10종 패시브 + 진화 시스템. 6종 적 + 시간 기반 웨이브. 레벨업 UI는 Canvas 내 렌더링.

**Tech Stack:** Canvas 2D API, TypeScript, Next.js App Router, KAME HUD 시스템 (gameStartHud, gamePauseHud, createGameOverHud)

**Design Doc:** `docs/plans/2026-02-13-survivors-design.md`

---

## Task 1: Game Registration

6개 파일을 수정하여 survivors 게임을 KAME에 등록한다.

**Files:**
- Modify: `@types/scores.ts` - TGameType에 `'survivors'` 추가
- Modify: `lib/config.ts` - MENU_LIST Action 카테고리에 추가
- Modify: `components/common/GameCard.tsx` - 아이콘 매핑 추가
- Modify: `app/api/game-session/route.ts` - VALID_GAME_TYPES에 추가
- Modify: `app/api/scores/route.ts` - VALID_GAME_TYPES에 추가
- Modify: `lib/game-security/config.ts` - 보안 설정 추가

**Step 1: TGameType에 추가**

`@types/scores.ts`에서 `'kustom'` 뒤에 추가:
```typescript
| 'survivors';
```

**Step 2: MENU_LIST에 추가**

`lib/config.ts`에서 kustom 항목 뒤에 추가:
```typescript
{
  name: {
    kor: '서바이버스',
    eng: 'Survivors',
  },
  href: '/survivors',
  category: 'Action',
},
```

**Step 3: GameCard 아이콘 추가**

`components/common/GameCard.tsx`의 GAME_ICONS에 추가:
```typescript
'/survivors': Shield,
```
필요시 `Shield`를 lucide-react에서 import 추가.

**Step 4: game-session VALID_GAME_TYPES에 추가**

`app/api/game-session/route.ts`에서 `'kustom'` 뒤에 추가:
```typescript
'survivors',
```

**Step 5: scores VALID_GAME_TYPES에 추가**

`app/api/scores/route.ts`에서 `'kustom'` 뒤에 추가:
```typescript
'survivors',
```

**Step 6: 보안 설정 추가**

`lib/game-security/config.ts`에서 kustom 뒤에 추가:
```typescript
survivors: { maxScore: 660, minPlayTimeSeconds: 30 },
```
(최대 660초 = 11분, 최소 30초 플레이)

**Step 7: Commit**

```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat(survivors): register game in 6 config files"
```

---

## Task 2: Types & Config

모든 타입 정의와 게임 상수를 작성한다.

**Files:**
- Create: `app/(canvas)/survivors/_lib/types.ts`
- Create: `app/(canvas)/survivors/_lib/config.ts`

**Step 1: types.ts 작성**

```typescript
// 기본 타입
export type TVector2 = { x: number; y: number };
export type TDirection = 'up' | 'down' | 'left' | 'right';
export type TGameState = 'start' | 'loading' | 'playing' | 'paused' | 'gameover' | 'levelup';

// 카메라
export type TCamera = { x: number; y: number };

// 플레이어
export type TPlayer = {
  x: number; y: number;
  hp: number; maxHp: number;
  speed: number;
  pickupRange: number;
  direction: TDirection;
  animFrame: number; animTimer: number;
  isInvincible: boolean; invincibleTimer: number;
  weapons: TWeaponInstance[];
  passives: TPassiveInstance[];
  exp: number; level: number; expToNext: number;
  kills: number;
};

// 무기
export type TWeaponId = 'magic_wand' | 'knife' | 'axe' | 'cross' | 'fire_wand'
  | 'garlic' | 'holy_water' | 'whip' | 'lightning_ring' | 'runetracer';

export type TEvolvedWeaponId = 'holy_wand' | 'thousand_edge' | 'death_spiral'
  | 'heaven_sword' | 'hellfire' | 'soul_eater' | 'blessed_water'
  | 'bloody_tear' | 'thunder_loop' | 'no_future';

export type TWeaponInstance = {
  id: TWeaponId | TEvolvedWeaponId;
  level: number;
  cooldownTimer: number;
  isEvolved: boolean;
};

export type TWeaponDef = {
  id: TWeaponId;
  name: string;
  description: string;
  baseCooldown: number;
  baseDamage: number;
  baseProjectiles: number;
  evolvesWith: TPassiveId;
  evolvesInto: TEvolvedWeaponId;
  evolvedName: string;
  icon: number[][]; // pixel art icon (8x8)
};

// 패시브
export type TPassiveId = 'spinach' | 'armor' | 'hollow_heart' | 'pummarola'
  | 'empty_tome' | 'bracer' | 'clover' | 'attractorb' | 'duplicator' | 'candelabrador';

export type TPassiveInstance = {
  id: TPassiveId;
  level: number;
};

export type TPassiveDef = {
  id: TPassiveId;
  name: string;
  description: string;
  effectPerLevel: number;
  icon: number[][]; // pixel art icon (8x8)
};

// 투사체
export type TProjectile = {
  active: boolean;
  x: number; y: number;
  vx: number; vy: number;
  damage: number;
  radius: number;
  lifetime: number;
  maxLifetime: number;
  piercing: number; // 0 = 관통 없음, -1 = 무한 관통
  weaponId: TWeaponId | TEvolvedWeaponId;
  // 무기별 특수 속성
  returning?: boolean; // cross 부메랑
  originX?: number; originY?: number; // cross 원점
  auraRadius?: number; // garlic 오라 반경
  zoneTimer?: number; // holy_water 영역 지속시간
  bounces?: number; // runetracer 반사 횟수
};

// 적
export type TEnemyType = 'bat' | 'zombie' | 'skeleton' | 'mummy' | 'witch' | 'boss';

export type TEnemy = {
  active: boolean;
  type: TEnemyType;
  x: number; y: number;
  hp: number; maxHp: number;
  speed: number;
  damage: number;
  exp: number;
  radius: number;
  animFrame: number; animTimer: number;
  hitFlashTimer: number;
  // witch 전용
  shootTimer?: number;
  shootCooldown?: number;
};

export type TEnemyDef = {
  type: TEnemyType;
  hp: number;
  speed: number;
  damage: number;
  exp: number;
  radius: number;
  color: string;
};

// 아이템 (경험치 젬)
export type TGem = {
  active: boolean;
  x: number; y: number;
  value: number;
  radius: number;
  magnetized: boolean; // 자석 효과로 끌려오는 중
};

// 레벨업 선택지
export type TLevelUpChoice = {
  type: 'weapon' | 'passive';
  id: TWeaponId | TPassiveId;
  name: string;
  description: string;
  level: number; // 획득 시 레벨 (1 = 새로 획득, 2+ = 강화)
  icon: number[][];
};

// 웨이브 이벤트
export type TWaveEvent = {
  time: number; // 초
  enemyType: TEnemyType;
  count: number;
  interval: number; // 스폰 간격
  hpMultiplier: number;
  speedMultiplier: number;
};

// 장식물
export type TDecoration = {
  x: number; y: number;
  type: 'tree' | 'rock' | 'bush';
  sprite: number[][];
};
```

**Step 2: config.ts 작성**

```typescript
import { TEnemyDef, TWeaponDef, TPassiveDef, TWaveEvent } from './types';

// ========== Canvas ==========
export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 720;

// ========== Game ==========
export const GAME_DURATION = 600; // 10분 (초)
export const MAX_ENEMIES = 300;
export const MAX_PROJECTILES = 500;
export const MAX_GEMS = 200;
export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;

// ========== Player ==========
export const PLAYER_SPEED = 150;
export const PLAYER_HP = 3;
export const PLAYER_MAX_HP = 5;
export const PLAYER_PICKUP_RANGE = 30;
export const PLAYER_INVINCIBLE_TIME = 1.0;
export const PLAYER_SIZE = 12; // collision radius
export const PLAYER_RENDER_SIZE = 32; // visual size

// ========== Tile Map ==========
export const TILE_SIZE = 64;
export const CHUNK_SIZE = 256;
export const BG_COLOR = '#1a2a1a';
export const TILE_COLOR_1 = '#1e3320';
export const TILE_COLOR_2 = '#1a2e1c';

// ========== Spatial Hash ==========
export const HASH_CELL_SIZE = 128;

// ========== Experience ==========
export const BASE_EXP_TO_LEVEL = 5;
export const EXP_INCREMENT = 10; // 레벨당 필요 경험치 증가량

// ========== Colors ==========
export const COLORS = {
  player: '#00d4ff',
  playerDamaged: '#ff4444',
  expGem: '#22ee44',
  hpGem: '#ff4444',
  hud: '#ffffff',
  hudBg: 'rgba(0,0,0,0.6)',
  levelUpBg: 'rgba(0,0,0,0.85)',
  cardBg: '#1e1e2e',
  cardBorder: '#00d4ff',
  cardHover: '#2e2e4e',
};

// ========== Enemy Definitions ==========
export const ENEMY_DEFS: Record<string, TEnemyDef> = {
  bat: { type: 'bat', hp: 1, speed: 120, damage: 1, exp: 1, radius: 8, color: '#8844aa' },
  zombie: { type: 'zombie', hp: 3, speed: 50, damage: 1, exp: 2, radius: 10, color: '#44aa44' },
  skeleton: { type: 'skeleton', hp: 5, speed: 80, damage: 1, exp: 3, radius: 10, color: '#cccccc' },
  mummy: { type: 'mummy', hp: 10, speed: 40, damage: 2, exp: 5, radius: 14, color: '#ccaa66' },
  witch: { type: 'witch', hp: 7, speed: 70, damage: 1, exp: 5, radius: 10, color: '#aa44cc' },
  boss: { type: 'boss', hp: 100, speed: 30, damage: 3, exp: 50, radius: 32, color: '#ff2244' },
};

// ========== Weapon Definitions ==========
// (각 무기의 baseCooldown, baseDamage, baseProjectiles, 진화 정보 포함)
// 무기 정의는 weapons.ts에서 상세 구현

// ========== Wave Schedule ==========
export const WAVE_SCHEDULE: TWaveEvent[] = [
  // 0:00~1:00 - Bat 소량
  { time: 0, enemyType: 'bat', count: 5, interval: 2.0, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 30, enemyType: 'bat', count: 8, interval: 1.5, hpMultiplier: 1, speedMultiplier: 1 },
  // 1:00~3:00 - Bat + Zombie
  { time: 60, enemyType: 'bat', count: 10, interval: 1.2, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 60, enemyType: 'zombie', count: 5, interval: 2.0, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 120, enemyType: 'bat', count: 15, interval: 1.0, hpMultiplier: 1.2, speedMultiplier: 1 },
  { time: 120, enemyType: 'zombie', count: 8, interval: 1.5, hpMultiplier: 1, speedMultiplier: 1 },
  // 3:00~5:00 - Skeleton + Mummy 추가
  { time: 180, enemyType: 'skeleton', count: 8, interval: 1.5, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 180, enemyType: 'zombie', count: 12, interval: 1.0, hpMultiplier: 1.2, speedMultiplier: 1 },
  { time: 240, enemyType: 'mummy', count: 5, interval: 2.0, hpMultiplier: 1, speedMultiplier: 1 },
  { time: 240, enemyType: 'skeleton', count: 12, interval: 1.0, hpMultiplier: 1.2, speedMultiplier: 1 },
  // 5:00 - Boss #1
  { time: 300, enemyType: 'boss', count: 1, interval: 0, hpMultiplier: 1, speedMultiplier: 1 },
  // 5:00~7:00 - Witch 추가, 전체 강화
  { time: 300, enemyType: 'witch', count: 5, interval: 2.0, hpMultiplier: 1.5, speedMultiplier: 1.1 },
  { time: 360, enemyType: 'bat', count: 20, interval: 0.8, hpMultiplier: 1.5, speedMultiplier: 1.2 },
  { time: 360, enemyType: 'skeleton', count: 15, interval: 1.0, hpMultiplier: 1.5, speedMultiplier: 1.1 },
  { time: 420, enemyType: 'witch', count: 8, interval: 1.5, hpMultiplier: 1.5, speedMultiplier: 1.1 },
  // 7:00~9:00 - 대량 스폰
  { time: 420, enemyType: 'zombie', count: 25, interval: 0.5, hpMultiplier: 2, speedMultiplier: 1.2 },
  { time: 420, enemyType: 'mummy', count: 10, interval: 1.0, hpMultiplier: 2, speedMultiplier: 1.1 },
  // 8:00 - Boss #2
  { time: 480, enemyType: 'boss', count: 1, interval: 0, hpMultiplier: 2, speedMultiplier: 1.2 },
  { time: 480, enemyType: 'skeleton', count: 30, interval: 0.4, hpMultiplier: 2, speedMultiplier: 1.3 },
  // 9:00~10:00 - 최종 러시
  { time: 540, enemyType: 'bat', count: 50, interval: 0.3, hpMultiplier: 2.5, speedMultiplier: 1.5 },
  { time: 540, enemyType: 'witch', count: 15, interval: 0.8, hpMultiplier: 2, speedMultiplier: 1.2 },
  { time: 540, enemyType: 'mummy', count: 15, interval: 0.5, hpMultiplier: 2.5, speedMultiplier: 1.2 },
];
```

**Step 3: Commit**

```bash
git add app/(canvas)/survivors/_lib/types.ts app/(canvas)/survivors/_lib/config.ts
git commit -m "feat(survivors): add type definitions and game config"
```

---

## Task 3: Object Pool & Spatial Hash

성능 최적화를 위한 오브젝트 풀과 공간 해싱 유틸리티를 구현한다.

**Files:**
- Create: `app/(canvas)/survivors/_lib/pool.ts`
- Create: `app/(canvas)/survivors/_lib/collision.ts`

**Step 1: pool.ts 작성**

오브젝트 풀은 `active` 플래그로 활성/비활성 관리. GC를 방지하기 위해 사전 할당.

```typescript
// 제네릭 오브젝트 풀
// T는 반드시 { active: boolean } 을 포함해야 함
export function createPool<T extends { active: boolean }>(
  size: number,
  factory: () => T,
): T[] {
  return Array.from({ length: size }, factory);
}

export function acquire<T extends { active: boolean }>(pool: T[]): T | null {
  for (const obj of pool) {
    if (!obj.active) {
      obj.active = true;
      return obj;
    }
  }
  return null; // 풀 소진
}

export function deactivate<T extends { active: boolean }>(obj: T): void {
  obj.active = false;
}

export function forEachActive<T extends { active: boolean }>(
  pool: T[],
  fn: (obj: T) => void,
): void {
  for (const obj of pool) {
    if (obj.active) fn(obj);
  }
}

export function countActive<T extends { active: boolean }>(pool: T[]): number {
  let count = 0;
  for (const obj of pool) {
    if (obj.active) count++;
  }
  return count;
}
```

**Step 2: collision.ts 작성**

공간 해싱 기반 충돌 감지. 128px 셀 그리드로 분할.

```typescript
import { HASH_CELL_SIZE } from './config';

// 공간 해시 그리드
type SpatialHash<T> = Map<string, T[]>;

function cellKey(x: number, y: number): string {
  const cx = Math.floor(x / HASH_CELL_SIZE);
  const cy = Math.floor(y / HASH_CELL_SIZE);
  return `${cx},${cy}`;
}

export function buildSpatialHash<T extends { active: boolean; x: number; y: number }>(
  objects: T[],
): SpatialHash<T> {
  const hash: SpatialHash<T> = new Map();
  for (const obj of objects) {
    if (!obj.active) continue;
    const key = cellKey(obj.x, obj.y);
    const cell = hash.get(key);
    if (cell) cell.push(obj);
    else hash.set(key, [obj]);
  }
  return hash;
}

export function queryNearby<T extends { active: boolean; x: number; y: number }>(
  hash: SpatialHash<T>,
  x: number,
  y: number,
  range: number,
): T[] {
  const results: T[] = [];
  const minCx = Math.floor((x - range) / HASH_CELL_SIZE);
  const maxCx = Math.floor((x + range) / HASH_CELL_SIZE);
  const minCy = Math.floor((y - range) / HASH_CELL_SIZE);
  const maxCy = Math.floor((y + range) / HASH_CELL_SIZE);

  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const cell = hash.get(`${cx},${cy}`);
      if (cell) results.push(...cell);
    }
  }
  return results;
}

// 원형 충돌 감지
export function circleCollision(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number,
): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const dist = dx * dx + dy * dy;
  const radii = r1 + r2;
  return dist < radii * radii;
}

// 두 점 간 거리 제곱
export function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

// 가장 가까운 활성 객체 찾기
export function findNearest<T extends { active: boolean; x: number; y: number }>(
  pool: T[],
  x: number,
  y: number,
): T | null {
  let nearest: T | null = null;
  let minDist = Infinity;
  for (const obj of pool) {
    if (!obj.active) continue;
    const d = distSq(obj.x, obj.y, x, y);
    if (d < minDist) {
      minDist = d;
      nearest = obj;
    }
  }
  return nearest;
}
```

**Step 3: Commit**

```bash
git add app/(canvas)/survivors/_lib/pool.ts app/(canvas)/survivors/_lib/collision.ts
git commit -m "feat(survivors): add object pool and spatial hash collision"
```

---

## Task 4: Sprites

픽셀 아트 스프라이트 데이터를 정의한다. 8x8 또는 16x16 그리드로 숫자 배열 사용.

**Files:**
- Create: `app/(canvas)/survivors/_lib/sprites.ts`

**Step 1: sprites.ts 작성**

kustom 게임의 스프라이트 패턴을 참조하여 플레이어, 적 6종, 아이템, 무기 아이콘을 정의한다.

각 스프라이트는 `number[][]` 형태이며, 0은 투명, 숫자는 color palette index.

```typescript
// Color palette (index → color)
export const PALETTE: Record<number, string> = {
  0: 'transparent',
  1: '#ffffff', // white
  2: '#00d4ff', // cyan (player)
  3: '#22ee44', // green (gem)
  4: '#ff4444', // red (damage)
  5: '#8844aa', // purple (bat)
  6: '#44aa44', // green (zombie)
  7: '#cccccc', // gray (skeleton)
  8: '#ccaa66', // tan (mummy)
  9: '#aa44cc', // violet (witch)
  10: '#ff2244', // boss red
  11: '#ffcc00', // gold (exp)
  12: '#4488ff', // blue (water)
  13: '#ff8800', // orange (fire)
  14: '#88ff88', // light green
  15: '#1e3320', // dark green (tile)
};

// 스프라이트 렌더 헬퍼
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: number[][],
  x: number,
  y: number,
  scale: number,
  flipX?: boolean,
): void {
  const h = sprite.length;
  const w = sprite[0].length;
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const colorIdx = sprite[row][col];
      if (colorIdx === 0) continue;
      const color = PALETTE[colorIdx];
      if (!color || color === 'transparent') continue;
      ctx.fillStyle = color;
      const px = flipX ? x + (w - 1 - col) * scale : x + col * scale;
      const py = y + row * scale;
      ctx.fillRect(px, py, scale, scale);
    }
  }
}

// ===== Player Sprites (16x16, 4 directions x 2 frames) =====
export const PLAYER_SPRITES: Record<string, number[][][]> = {
  down: [/* 2 frames */],
  up: [/* 2 frames */],
  left: [/* 2 frames */],
  right: [/* 2 frames */],
};
// (구현 시 16x16 픽셀 아트 데이터 채움)

// ===== Enemy Sprites (각 타입별 16x16, 2 frames) =====
export const ENEMY_SPRITES: Record<string, number[][][]> = {
  bat: [/* 2 frames */],
  zombie: [/* 2 frames */],
  skeleton: [/* 2 frames */],
  mummy: [/* 2 frames */],
  witch: [/* 2 frames */],
  boss: [/* 2 frames, 32x32 */],
};

// ===== Item Sprites (8x8) =====
export const GEM_SPRITE: number[][] = [/* 8x8 */];
export const HEART_SPRITE: number[][] = [/* 8x8 */];

// ===== Weapon Icons (8x8, 레벨업 UI용) =====
export const WEAPON_ICONS: Record<string, number[][]> = {
  magic_wand: [/* 8x8 */],
  knife: [/* 8x8 */],
  axe: [/* 8x8 */],
  cross: [/* 8x8 */],
  fire_wand: [/* 8x8 */],
  garlic: [/* 8x8 */],
  holy_water: [/* 8x8 */],
  whip: [/* 8x8 */],
  lightning_ring: [/* 8x8 */],
  runetracer: [/* 8x8 */],
};

// ===== Passive Icons (8x8, 레벨업 UI용) =====
export const PASSIVE_ICONS: Record<string, number[][]> = {
  spinach: [/* 8x8 */],
  armor: [/* 8x8 */],
  hollow_heart: [/* 8x8 */],
  pummarola: [/* 8x8 */],
  empty_tome: [/* 8x8 */],
  bracer: [/* 8x8 */],
  clover: [/* 8x8 */],
  attractorb: [/* 8x8 */],
  duplicator: [/* 8x8 */],
  candelabrador: [/* 8x8 */],
};

// ===== Decoration Sprites (trees, rocks, bushes) =====
export const DECORATION_SPRITES: Record<string, number[][]> = {
  tree: [/* 16x16 */],
  rock: [/* 8x8 */],
  bush: [/* 8x8 */],
};
```

> **구현 노트:** 각 스프라이트의 실제 number[][] 데이터는 구현 시 채운다.
> kustom 게임의 `_lib/sprites.ts`를 참조하여 동일한 스타일로 만든다.

**Step 2: Commit**

```bash
git add app/(canvas)/survivors/_lib/sprites.ts
git commit -m "feat(survivors): add pixel art sprite definitions"
```

---

## Task 5: Camera System

플레이어를 추적하는 카메라 시스템을 구현한다.

**Files:**
- Create: `app/(canvas)/survivors/_lib/camera.ts`

**Step 1: camera.ts 작성**

```typescript
import { TCamera, TPlayer } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config';

export function createCamera(): TCamera {
  return { x: 0, y: 0 };
}

// 플레이어를 화면 중앙에 유지
export function updateCamera(camera: TCamera, player: TPlayer): void {
  camera.x = player.x - CANVAS_WIDTH / 2;
  camera.y = player.y - CANVAS_HEIGHT / 2;
}

// 월드 좌표 → 스크린 좌표
export function worldToScreen(worldX: number, worldY: number, camera: TCamera): { x: number; y: number } {
  return {
    x: worldX - camera.x,
    y: worldY - camera.y,
  };
}

// 뷰포트 내에 있는지 확인 (margin은 여유 영역)
export function isInViewport(
  worldX: number, worldY: number, camera: TCamera, margin: number = 100,
): boolean {
  const sx = worldX - camera.x;
  const sy = worldY - camera.y;
  return sx > -margin && sx < CANVAS_WIDTH + margin
      && sy > -margin && sy < CANVAS_HEIGHT + margin;
}
```

**Step 2: Commit**

```bash
git add app/(canvas)/survivors/_lib/camera.ts
git commit -m "feat(survivors): add camera system"
```

---

## Task 6: Player System

플레이어 이동, 입력 처리, 렌더링을 구현한다.

**Files:**
- Create: `app/(canvas)/survivors/_lib/player.ts`

**Step 1: player.ts 작성**

```typescript
import { TPlayer, TDirection } from './types';
import {
  PLAYER_SPEED, PLAYER_HP, PLAYER_MAX_HP,
  PLAYER_PICKUP_RANGE, PLAYER_INVINCIBLE_TIME,
  PLAYER_SIZE, PLAYER_RENDER_SIZE,
  BASE_EXP_TO_LEVEL, EXP_INCREMENT, COLORS,
} from './config';
import { TCamera } from './types';
import { drawSprite, PLAYER_SPRITES, PALETTE } from './sprites';

export function createPlayer(): TPlayer {
  return {
    x: 0, y: 0,
    hp: PLAYER_HP, maxHp: PLAYER_HP,
    speed: PLAYER_SPEED,
    pickupRange: PLAYER_PICKUP_RANGE,
    direction: 'down',
    animFrame: 0, animTimer: 0,
    isInvincible: false, invincibleTimer: 0,
    weapons: [],
    passives: [],
    exp: 0, level: 1,
    expToNext: BASE_EXP_TO_LEVEL,
    kills: 0,
  };
}

// 이동 (WASD + 화살표)
export function updatePlayer(
  player: TPlayer,
  keys: Set<string>,
  dt: number,
): void {
  let dx = 0;
  let dy = 0;

  if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;

  // 대각선 정규화
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  // 방향 업데이트 (이동 중일 때만)
  if (dx !== 0 || dy !== 0) {
    if (Math.abs(dx) > Math.abs(dy)) {
      player.direction = dx > 0 ? 'right' : 'left';
    } else {
      player.direction = dy > 0 ? 'down' : 'up';
    }

    // 애니메이션
    player.animTimer += dt;
    if (player.animTimer >= 0.15) {
      player.animTimer = 0;
      player.animFrame = (player.animFrame + 1) % 2;
    }
  }

  player.x += dx * player.speed * dt;
  player.y += dy * player.speed * dt;

  // 무적 타이머
  if (player.isInvincible) {
    player.invincibleTimer -= dt;
    if (player.invincibleTimer <= 0) {
      player.isInvincible = false;
    }
  }
}

// 데미지 처리
export function damagePlayer(player: TPlayer, damage: number): boolean {
  if (player.isInvincible) return false;

  // armor 패시브 적용
  const armorPassive = player.passives.find(p => p.id === 'armor');
  const armorReduction = armorPassive ? armorPassive.level : 0;
  const finalDamage = Math.max(1, damage - armorReduction);

  player.hp -= finalDamage;
  player.isInvincible = true;
  player.invincibleTimer = PLAYER_INVINCIBLE_TIME;

  return player.hp <= 0;
}

// 경험치 추가, 레벨업 체크
export function addExp(player: TPlayer, amount: number): boolean {
  player.exp += amount;
  if (player.exp >= player.expToNext) {
    player.exp -= player.expToNext;
    player.level++;
    player.expToNext = BASE_EXP_TO_LEVEL + (player.level - 1) * EXP_INCREMENT;
    return true; // 레벨업!
  }
  return false;
}

// 패시브 보너스 계산 헬퍼
export function getPassiveBonus(player: TPlayer, passiveId: string): number {
  const passive = player.passives.find(p => p.id === passiveId);
  return passive ? passive.level : 0;
}

// 렌더링
export function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: TPlayer,
  camera: TCamera,
): void {
  const sx = player.x - camera.x;
  const sy = player.y - camera.y;

  // 무적 깜빡임
  if (player.isInvincible && Math.floor(player.invincibleTimer * 10) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  // 픽셀 아트 스프라이트 렌더링
  const sprites = PLAYER_SPRITES[player.direction];
  if (sprites && sprites[player.animFrame]) {
    const halfSize = PLAYER_RENDER_SIZE / 2;
    drawSprite(ctx, sprites[player.animFrame], sx - halfSize, sy - halfSize, 2);
  } else {
    // 폴백: 단순 원
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(sx, sy, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}
```

**Step 2: Commit**

```bash
git add app/(canvas)/survivors/_lib/player.ts
git commit -m "feat(survivors): add player system"
```

---

## Task 7: Enemy System

적 6종의 스폰, AI, 업데이트, 렌더링, 오브젝트 풀을 구현한다.

**Files:**
- Create: `app/(canvas)/survivors/_lib/enemies.ts`

**Step 1: enemies.ts 작성**

핵심 구현:
- `createEnemyPool(MAX_ENEMIES)` - 사전 할당 풀
- `spawnEnemy(pool, type, spawnX, spawnY, hpMult, speedMult)` - 풀에서 acquire하여 초기화
- `updateEnemies(pool, playerX, playerY, dt)` - 모든 활성 적 AI 업데이트 (플레이어 추적)
- `renderEnemies(pool, ctx, camera)` - 뷰포트 내 적만 렌더링
- `getSpawnPosition(playerX, playerY, cameraW, cameraH)` - 화면 밖 랜덤 위치 계산

**주요 로직:**
- 모든 적은 플레이어를 향해 이동 (단순 추적 AI)
- witch는 일정 거리 유지 + 투사체 발사
- boss는 크기가 크고 HP 바 표시
- 피격 시 hitFlashTimer로 하얀색 깜빡임
- 사망 시 deactivate (풀 반환)

**Step 2: Commit**

```bash
git add app/(canvas)/survivors/_lib/enemies.ts
git commit -m "feat(survivors): add enemy system with 6 types"
```

---

## Task 8: Weapon System

10종 무기의 자동 공격 로직과 투사체 관리를 구현한다.

**Files:**
- Create: `app/(canvas)/survivors/_lib/weapons.ts`

**Step 1: weapons.ts 작성**

핵심 구현:
- `WEAPON_DEFS: Record<TWeaponId, TWeaponDef>` - 10종 무기 정의
- `PASSIVE_DEFS: Record<TPassiveId, TPassiveDef>` - 10종 패시브 정의
- `createProjectilePool(MAX_PROJECTILES)` - 투사체 풀
- `updateWeapons(player, enemies, projectiles, dt)` - 모든 보유 무기의 쿨타임 체크 및 자동 발사
- `updateProjectiles(projectiles, dt, camera)` - 투사체 이동 + 수명 관리
- `renderProjectiles(projectiles, ctx, camera)` - 투사체 렌더링

**무기별 공격 패턴:**
1. **magic_wand**: 가장 가까운 적 방향으로 투사체 1발
2. **knife**: player.direction 방향으로 빠른 투사체 다수
3. **axe**: 위로 발사 후 포물선 (vy에 중력 적용)
4. **cross**: 바라보는 방향으로 나갔다가 returning=true로 돌아옴
5. **fire_wand**: 랜덤 방향, piercing=-1 (무한 관통)
6. **garlic**: 투사체 대신 player 주변 원형 오라, auraRadius 사용
7. **holy_water**: 랜덤 위치에 영역 데미지, zoneTimer로 지속
8. **whip**: player 전방 부채꼴 범위 즉발 데미지 (투사체 없음, 직접 적 HP 감소)
9. **lightning_ring**: 화면 내 랜덤 적에게 즉발 데미지 (시각 효과만 투사체)
10. **runetracer**: 뷰포트 경계에서 반사, bounces 카운트

**패시브 적용:**
- empty_tome: cooldown 감소
- bracer: 투사체 속도 증가
- spinach: damage 증가
- duplicator: projectile 수 증가
- candelabrador: range/radius 증가
- clover: 크리티컬 (2배 데미지) 확률

**무기 진화:**
- `checkEvolution(player)` - 무기 Lv8 + 대응 패시브 보유 시 진화
- 진화 시 damage/cooldown/projectiles 대폭 강화

**Step 2: Commit**

```bash
git add app/(canvas)/survivors/_lib/weapons.ts
git commit -m "feat(survivors): add weapon system with 10 weapons + passives"
```

---

## Task 9: Items & Experience

경험치 젬 드롭, 자석 픽업, 아이템 풀을 구현한다.

**Files:**
- Create: `app/(canvas)/survivors/_lib/items.ts`

**Step 1: items.ts 작성**

핵심 구현:
- `createGemPool(MAX_GEMS)` - 젬 오브젝트 풀
- `spawnGem(pool, x, y, value)` - 적 처치 위치에 젬 생성
- `updateGems(pool, player, dt)` - 젬 업데이트:
  - pickupRange 내 젬은 magnetized=true
  - magnetized 젬은 플레이어에게 빠르게 이동
  - 플레이어와 충돌 시 경험치 추가 + deactivate
- `renderGems(pool, ctx, camera)` - 뷰포트 내 젬 렌더링 (녹색 다이아몬드 형태)

**자석 효과:**
- attractorb 패시브 레벨에 따라 pickupRange 증가
- magnetized 젬의 이동 속도: 400px/s (플레이어 속도의 ~2.5배)

**Step 2: Commit**

```bash
git add app/(canvas)/survivors/_lib/items.ts
git commit -m "feat(survivors): add gem drop and pickup system"
```

---

## Task 10: Wave Scheduler

시간 기반 웨이브 스케줄러를 구현한다.

**Files:**
- Create: `app/(canvas)/survivors/_lib/waves.ts`

**Step 1: waves.ts 작성**

핵심 구현:
- `createWaveManager()` - 웨이브 상태 초기화
- `updateWaves(manager, elapsed, enemyPool, playerX, playerY, cameraW, cameraH)`:
  - WAVE_SCHEDULE에서 현재 시간에 활성화된 이벤트 확인
  - 각 이벤트의 interval마다 적 스폰
  - hpMultiplier, speedMultiplier 적용
  - 10분(600초) 도달 시 Death 적 스폰

**웨이브 매니저 상태:**
```typescript
type TWaveManager = {
  activeWaves: {
    event: TWaveEvent;
    spawnTimer: number;
    spawned: number;
  }[];
  deathSpawned: boolean;
};
```

**Step 2: Commit**

```bash
git add app/(canvas)/survivors/_lib/waves.ts
git commit -m "feat(survivors): add wave scheduler"
```

---

## Task 11: Level-Up System

레벨업 선택지 생성과 Canvas UI를 구현한다.

**Files:**
- Create: `app/(canvas)/survivors/_lib/levelup.ts`

**Step 1: levelup.ts 작성**

핵심 구현:
- `generateChoices(player, count=3): TLevelUpChoice[]`:
  - 무기 슬롯 여유 있으면: 미보유 무기 중 랜덤 추가
  - 보유 무기 중 Lv8 미만: 강화 선택지 추가
  - 패시브 슬롯 여유 있으면: 미보유 패시브 추가
  - 보유 패시브 중 Lv5 미만: 강화 선택지 추가
  - 3개 랜덤 선택 (중복 없음)

- `applyChoice(player, choice)`:
  - 무기 새 획득: weapons 배열에 push
  - 무기 강화: level++
  - 패시브 새 획득: passives 배열에 push
  - 패시브 강화: level++
  - 적용 후 checkEvolution 호출

- `renderLevelUpUI(ctx, choices, selectedIndex, canvasW, canvasH)`:
  - 반투명 검은 오버레이
  - "LEVEL UP!" 텍스트
  - 3개 카드 (200x280px) 가로 배치
  - 각 카드: 아이콘 (drawSprite) + 이름 + 레벨 + 설명
  - 선택된 카드 하이라이트 (cyan 테두리)
  - 하단: "1, 2, 3 키로 선택" 안내

- `handleLevelUpInput(e: KeyboardEvent, choices): number | -1`:
  - Digit1 → 0, Digit2 → 1, Digit3 → 2 반환
  - 마우스 클릭도 처리할 수 있도록 별도 함수 제공

**Step 2: Commit**

```bash
git add app/(canvas)/survivors/_lib/levelup.ts
git commit -m "feat(survivors): add level-up system and UI"
```

---

## Task 12: Renderer

타일맵 배경, 장식물, HUD를 구현한다.

**Files:**
- Create: `app/(canvas)/survivors/_lib/renderer.ts`

**Step 1: renderer.ts 작성**

핵심 구현:

**배경 렌더링:**
- `renderBackground(ctx, camera)`:
  - 카메라 뷰포트에 맞는 타일만 렌더링
  - 64x64 타일 반복, 체커보드 패턴 (2색 풀밭)

**장식물:**
- `generateDecorations(chunkX, chunkY)` - 시드 기반 의사난수로 장식물 생성
  - 시드 = `chunkX * 73856093 ^ chunkY * 19349663` (해시 기반)
  - 청크당 3~8개 장식물
- `renderDecorations(ctx, camera)` - 활성 청크 내 장식물 렌더링

**HUD:**
- `renderHUD(ctx, player, elapsed, canvasW, canvasH)`:
  - 좌상단: 경과 시간 (mm:ss 포맷)
  - 좌상단 아래: HP 하트 아이콘
  - 상단 중앙: 경험치 바 (현재/필요, 레벨 숫자)
  - 좌하단: 보유 무기 아이콘 (8x8 스프라이트, 3배 스케일)
  - 우하단: 보유 패시브 아이콘
  - 우상단: 처치 수

**Step 2: Commit**

```bash
git add app/(canvas)/survivors/_lib/renderer.ts
git commit -m "feat(survivors): add renderer with tilemap, decorations, and HUD"
```

---

## Task 13: Main Game Loop

`setupSurvivors` 메인 함수를 구현한다. KAME 게임 패턴을 정확히 따른다.

**Files:**
- Create: `app/(canvas)/survivors/_lib/game.ts`

**Step 1: game.ts 작성**

**반드시 참조:** `app/(canvas)/fruitninja/_lib/game.ts`의 패턴을 그대로 따른다.

핵심 구조:
```typescript
import {
  createGameOverHud, gameLoadingHud, gameStartHud, gamePauseHud,
  TGameOverCallbacks, TSaveResult,
} from '@/lib/game';
// ... 모든 모듈 import

export type TSurvivorsCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export function setupSurvivors(
  canvas: HTMLCanvasElement,
  callbacks?: TSurvivorsCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // 상태
  let state: TGameState = 'start';
  let animationId = 0;
  let lastTime = 0;
  let elapsed = 0; // 게임 경과 시간 (초)

  // 게임 오브젝트
  const player = createPlayer();
  const camera = createCamera();
  const enemyPool = createEnemyPool(MAX_ENEMIES);
  const projectilePool = createProjectilePool(MAX_PROJECTILES);
  const gemPool = createGemPool(MAX_GEMS);
  const waveManager = createWaveManager();
  let levelUpChoices: TLevelUpChoice[] = [];

  // 입력
  const keys = new Set<string>();

  // Game Over HUD (fruitninja 패턴과 동일)
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (score) => {
      if (callbacks?.onScoreSave) return callbacks.onScoreSave(score);
      return { saved: false };
    },
    onRestart: () => resetGame(),
  };
  const gameOverHud = createGameOverHud(
    canvas, ctx, 'survivors', gameOverCallbacks,
    { isLoggedIn: callbacks?.isLoggedIn ?? false },
  );

  // 키보드 핸들러 (e.code 필수!)
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (state === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, Math.floor(elapsed));
      if (handled) return;
    }

    switch (e.code) {
      case 'KeyS':
        if (state === 'start') startGame();
        else if (state === 'paused') state = 'playing';
        break;
      case 'KeyP':
        if (state === 'playing') state = 'paused';
        break;
      case 'KeyR':
        if (state !== 'gameover') resetGame();
        break;
      // 레벨업 선택
      case 'Digit1': if (state === 'levelup') selectChoice(0); break;
      case 'Digit2': if (state === 'levelup') selectChoice(1); break;
      case 'Digit3': if (state === 'levelup') selectChoice(2); break;
    }

    // 이동 키는 keys Set에 추가 (playing 상태에서만 사용)
    keys.add(e.code);
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };

  // 게임 시작
  async function startGame() {
    state = 'loading';
    if (callbacks?.onGameStart) await callbacks.onGameStart();
    state = 'playing';
  }

  // 게임 리셋
  function resetGame() {
    Object.assign(player, createPlayer());
    // 풀 초기화, 타이머 초기화
    elapsed = 0;
    gameOverHud.reset();
    state = 'start';
  }

  // 레벨업 선택 적용
  function selectChoice(index: number) {
    if (index < levelUpChoices.length) {
      applyChoice(player, levelUpChoices[index]);
      state = 'playing';
    }
  }

  // 메인 업데이트
  function update(dt: number) {
    if (state !== 'playing') return;

    elapsed += dt;

    // 플레이어 업데이트
    updatePlayer(player, keys, dt);
    updateCamera(camera, player);

    // HP 회복 (pummarola)
    // ...

    // 웨이브 스포너
    updateWaves(waveManager, elapsed, enemyPool, player.x, player.y);

    // 적 업데이트
    updateEnemies(enemyPool, player.x, player.y, dt);

    // 무기 업데이트 (자동 공격)
    updateWeapons(player, enemyPool, projectilePool, dt);

    // 투사체 업데이트
    updateProjectiles(projectilePool, dt, camera);

    // 충돌: 투사체 vs 적
    checkProjectileEnemyCollisions(projectilePool, enemyPool, gemPool, player);

    // 충돌: 적 vs 플레이어
    checkEnemyPlayerCollisions(enemyPool, player);

    // 아이템 업데이트
    const leveledUp = updateGems(gemPool, player, dt);
    if (leveledUp) {
      levelUpChoices = generateChoices(player);
      state = 'levelup';
    }

    // 게임 오버 체크
    if (player.hp <= 0) {
      state = 'gameover';
    }
  }

  // 메인 렌더
  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (state === 'playing' || state === 'paused' || state === 'levelup' || state === 'gameover') {
      renderBackground(ctx, camera);
      renderDecorations(ctx, camera);
      renderGems(gemPool, ctx, camera);
      renderEnemies(enemyPool, ctx, camera);
      renderProjectiles(projectilePool, ctx, camera);
      renderPlayer(ctx, player, camera);
      renderHUD(ctx, player, elapsed, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // 오버레이
    if (state === 'loading') gameLoadingHud(canvas, ctx);
    else if (state === 'start') gameStartHud(canvas, ctx);
    else if (state === 'paused') gamePauseHud(canvas, ctx);
    else if (state === 'levelup') renderLevelUpUI(ctx, levelUpChoices, CANVAS_WIDTH, CANVAS_HEIGHT);
    else if (state === 'gameover') gameOverHud.render(Math.floor(elapsed));
  }

  // 게임 루프
  function gameLoop(timestamp: number) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render();

    animationId = requestAnimationFrame(gameLoop);
  }

  // 이벤트 등록 + 시작
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup 반환
  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}
```

**Step 2: Verify**

`yarn dev` 실행 후 `/survivors` 접속 → 시작 화면 표시 확인.

**Step 3: Commit**

```bash
git add app/(canvas)/survivors/_lib/game.ts
git commit -m "feat(survivors): add main game loop with full game flow"
```

---

## Task 14: React Integration

Component, Page, Layout을 작성하여 게임을 Next.js에 연결한다.

**Files:**
- Create: `app/(canvas)/survivors/_components/Survivors.tsx`
- Create: `app/(canvas)/survivors/page.tsx`
- Create: `app/(canvas)/survivors/layout.tsx`

**Step 1: Survivors.tsx 작성**

fruitninja 컴포넌트 패턴 그대로 따른다:
```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupSurvivors, TSurvivorsCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function Survivors() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('survivors');
  const { mutateAsync: createSession } = useGameSession('survivors');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TSurvivorsCallbacks = {
      onGameStart: async () => {
        try {
          const gameSession = await createSession();
          sessionTokenRef.current = gameSession.token;
        } catch (error) {
          console.error('Failed to create game session:', error);
        }
      },
      onScoreSave: async (score) => {
        if (!sessionTokenRef.current) return { saved: false };
        const result = await saveScore({
          gameType: 'survivors',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupSurvivors(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[1080px] h-[720px] border border-white/20 rounded-2xl shadow-lg"
      />
    </div>
  );
}

export default Survivors;
```

**Step 2: page.tsx 작성**

```typescript
'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import Survivors from './_components/Survivors';

const controls = [
  { key: 'WASD / Arrow', action: '이동' },
  { key: '1, 2, 3', action: '레벨업 선택' },
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
];

function SurvivorsPage() {
  const { data: scores = [], isLoading } = useGetScores('survivors');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[1080px]">
        <Survivors />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default SurvivorsPage;
```

**Step 3: layout.tsx 작성**

```typescript
import KameHeader from '@/components/common/KameHeader';

function SurvivorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      <KameHeader title="Survivors" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default SurvivorsLayout;
```

**Step 4: Verify**

`yarn dev` → `http://localhost:3000/survivors` 접속:
- KameHeader "Survivors" 표시
- ControlInfoTable에 컨트롤 목록 표시
- 캔버스에 시작 화면 ("Press 'S' for start") 표시
- RankBoard에 리더보드 표시 (빈 상태)

**Step 5: Commit**

```bash
git add app/(canvas)/survivors/
git commit -m "feat(survivors): add React integration (component, page, layout)"
```

---

## Task 순서 및 의존성

```
Task 1 (등록) ──────────────────────────────────┐
Task 2 (Types/Config) ─┬── Task 3 (Pool/Collision) │
                        ├── Task 4 (Sprites)        │
                        ├── Task 5 (Camera)         │
                        └── Task 6 (Player)         │
                              │                     │
Task 3 + Task 6 ──────── Task 7 (Enemies)          │
Task 3 + Task 6 ──────── Task 8 (Weapons)          │
Task 3 + Task 6 ──────── Task 9 (Items)            │
Task 7 ───────────────── Task 10 (Waves)            │
Task 6 + Task 8 ──────── Task 11 (Level-up)        │
Task 5 + Task 4 ──────── Task 12 (Renderer)        │
                              │                     │
All Tasks 3-12 ──────── Task 13 (Game Loop) ────────┤
Task 1 + Task 13 ────── Task 14 (React Integration) │
```

**추천 구현 순서:** 1 → 2 → 3, 4, 5 (병렬) → 6 → 7, 8, 9 (병렬) → 10, 11, 12 (병렬) → 13 → 14
