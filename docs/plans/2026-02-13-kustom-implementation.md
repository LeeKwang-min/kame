# Kustom (보스전 액션 닷지) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 보스의 다양한 공격 패턴을 회피하며 생존 시간을 겨루는 보스전 액션 닷지 게임 구현

**Architecture:** Canvas 2D 기반 게임. 확장 가능한 패턴 레지스트리 시스템으로 보스 공격 패턴을 모듈화. game.ts가 메인 루프를 관리하고, player.ts/boss.ts/patterns/가 각각 독립적으로 동작. 기존 프로젝트의 HUD 시스템(gameStartHud, gamePauseHud, createGameOverHud) 재사용.

**Tech Stack:** Next.js, TypeScript, Canvas 2D API, 기존 프로젝트 HUD/세션 시스템

---

## Task 1: 게임 등록 (6개 파일 수정)

**Files:**
- Modify: `@types/scores.ts` — TGameType union에 'kustom' 추가
- Modify: `lib/config.ts` — MENU_LIST에 게임 추가
- Modify: `components/common/GameCard.tsx` — GAME_ICONS에 아이콘 추가
- Modify: `app/api/game-session/route.ts` — VALID_GAME_TYPES에 추가
- Modify: `app/api/scores/route.ts` — VALID_GAME_TYPES에 추가
- Modify: `lib/game-security/config.ts` — 보안 설정 추가

**Step 1: @types/scores.ts에 'kustom' 추가**

`TGameType` union의 마지막 항목 `'jewelcrush'` 뒤에 추가:

```typescript
  | 'jewelcrush'
  | 'kustom';
```

**Step 2: lib/config.ts — MENU_LIST에 추가**

Action 카테고리의 마지막 항목(towerblocks) 뒤에 추가:

```typescript
  {
    name: {
      kor: '커스텀',
      eng: 'Kustom',
    },
    href: '/kustom',
    category: 'Action',
  },
```

**Step 3: components/common/GameCard.tsx — 아이콘 추가**

import에 `Swords` 추가 (lucide-react에서), GAME_ICONS에 추가:

```typescript
  '/kustom': Swords,
```

**Step 4: app/api/game-session/route.ts — VALID_GAME_TYPES에 추가**

배열 마지막에 추가:

```typescript
  'kustom',
```

**Step 5: app/api/scores/route.ts — VALID_GAME_TYPES에 추가**

배열 마지막에 추가:

```typescript
  'kustom',
```

**Step 6: lib/game-security/config.ts — 보안 설정 추가**

`jewelcrush` 항목 뒤에 추가:

```typescript
  kustom: { maxScore: 9999, minPlayTimeSeconds: 5 },
```

**Step 7: Commit**

```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat(kustom): register kustom game in 6 config files"
```

---

## Task 2: config.ts & types.ts 작성

**Files:**
- Create: `app/(canvas)/kustom/_lib/config.ts`
- Create: `app/(canvas)/kustom/_lib/types.ts`

**Step 1: config.ts 작성**

```typescript
// Canvas
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Player
export const PLAYER_RADIUS = 12;
export const PLAYER_SPEED = 200;
export const PLAYER_COLOR = '#00d4ff';
export const PLAYER_MAX_HP = 3;
export const DASH_SPEED_MULTIPLIER = 3;
export const DASH_DURATION = 0.2;
export const DASH_COOLDOWN = 1.5;
export const HIT_INVINCIBLE_DURATION = 1.0;

// Boss
export const BOSS_X = CANVAS_WIDTH / 2;
export const BOSS_Y = 80;
export const BOSS_RADIUS = 40;
export const BOSS_COLOR = '#8b0000';
export const BOSS_ROTATION_SPEED = 0.3; // rad/s

// Attack scheduling
export const BASE_ATTACK_INTERVAL = 3.0;
export const MIN_ATTACK_INTERVAL = 1.5;
export const ATTACK_INTERVAL_DECREASE_RATE = 0.02; // per second

// Pattern tiers (unlock time in seconds)
export const TIER_BASIC_TIME = 0;
export const TIER_MID_TIME = 15;
export const TIER_ADVANCED_TIME = 30;
export const TIER_EXTREME_TIME = 60;

// Projectile defaults
export const BULLET_RADIUS = 5;
export const BULLET_COLOR = '#ff4444';

// Visual
export const BG_COLOR = '#111118';
export const GRID_COLOR = 'rgba(255,255,255,0.03)';
export const GRID_SPACING = 40;

// HUD
export const HP_HEART_SIZE = 20;
export const HP_HEART_GAP = 6;
export const HP_HEART_Y = 20;
export const HP_HEART_X = 20;
```

**Step 2: types.ts 작성**

```typescript
export type TVector2 = {
  x: number;
  y: number;
};

export type TPlayer = {
  x: number;
  y: number;
  hp: number;
  isDashing: boolean;
  dashTimer: number;
  dashCooldown: number;
  isInvincible: boolean;
  invincibleTimer: number;
  dashDirX: number;
  dashDirY: number;
  trails: TTrail[];
};

export type TTrail = {
  x: number;
  y: number;
  alpha: number;
};

export type TProjectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
};

export type TLaser = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  warningTimer: number;
  activeTimer: number;
  isActive: boolean;
};

export type TAreaHazard = {
  x: number;
  y: number;
  radius: number;
  warningTimer: number;
  activeTimer: number;
  isActive: boolean;
};

export type TPatternTier = 'basic' | 'mid' | 'advanced';

export type TPatternState = {
  elapsed: number;
  finished: boolean;
  projectiles: TProjectile[];
  lasers: TLaser[];
  areas: TAreaHazard[];
  custom: Record<string, unknown>;
};

export type TPattern = {
  name: string;
  tier: TPatternTier;
  duration: number;
  init: (bossPos: TVector2, playerPos: TVector2) => TPatternState;
  update: (state: TPatternState, dt: number, playerPos: TVector2, bossPos: TVector2) => void;
  render: (state: TPatternState, ctx: CanvasRenderingContext2D) => void;
  isFinished: (state: TPatternState) => boolean;
};

export type TGameState = 'start' | 'loading' | 'playing' | 'paused' | 'gameover';
```

**Step 3: Commit**

```bash
git add app/(canvas)/kustom/_lib/config.ts app/(canvas)/kustom/_lib/types.ts
git commit -m "feat(kustom): add config and types"
```

---

## Task 3: 패턴 시스템 — registry.ts 및 기본 패턴 2개

**Files:**
- Create: `app/(canvas)/kustom/_lib/patterns/registry.ts`
- Create: `app/(canvas)/kustom/_lib/patterns/aimed-shot.ts`
- Create: `app/(canvas)/kustom/_lib/patterns/radial-burst.ts`

**Step 1: registry.ts 작성**

패턴을 등록하고 시간대에 맞는 패턴을 선택하는 시스템:

```typescript
import { TPattern, TPatternTier } from '../types';
import { TIER_BASIC_TIME, TIER_MID_TIME, TIER_ADVANCED_TIME } from '../config';

const patterns: TPattern[] = [];

export function registerPattern(pattern: TPattern): void {
  patterns.push(pattern);
}

export function getAvailablePatterns(elapsedTime: number): TPattern[] {
  return patterns.filter((p) => {
    if (p.tier === 'basic') return elapsedTime >= TIER_BASIC_TIME;
    if (p.tier === 'mid') return elapsedTime >= TIER_MID_TIME;
    if (p.tier === 'advanced') return elapsedTime >= TIER_ADVANCED_TIME;
    return false;
  });
}

export function pickRandomPattern(elapsedTime: number): TPattern | null {
  const available = getAvailablePatterns(elapsedTime);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function getAllPatterns(): TPattern[] {
  return [...patterns];
}
```

**Step 2: aimed-shot.ts 작성**

직선 탄막 패턴: 플레이어 방향으로 3~5발 연사

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { BULLET_RADIUS, BULLET_COLOR, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const SHOT_COUNT_MIN = 3;
const SHOT_COUNT_MAX = 5;
const SHOT_SPEED = 250;
const SHOT_INTERVAL = 0.15;
const PATTERN_DURATION = 2.0;

const aimedShot: TPattern = {
  name: 'aimed-shot',
  tier: 'basic',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2, playerPos: TVector2): TPatternState {
    const dx = playerPos.x - bossPos.x;
    const dy = playerPos.y - bossPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;
    const shotCount = SHOT_COUNT_MIN + Math.floor(Math.random() * (SHOT_COUNT_MAX - SHOT_COUNT_MIN + 1));

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      custom: {
        dirX,
        dirY,
        shotCount,
        shotsFired: 0,
        nextShotTime: 0,
        bossX: bossPos.x,
        bossY: bossPos.y,
      },
    };
  },

  update(state: TPatternState, dt: number, _playerPos: TVector2): void {
    state.elapsed += dt;
    const { dirX, dirY, shotCount, bossX, bossY } = state.custom as {
      dirX: number; dirY: number; shotCount: number; bossX: number; bossY: number;
      shotsFired: number; nextShotTime: number;
    };

    if ((state.custom.shotsFired as number) < shotCount && state.elapsed >= (state.custom.nextShotTime as number)) {
      state.projectiles.push({
        x: bossX,
        y: bossY,
        vx: dirX * SHOT_SPEED,
        vy: dirY * SHOT_SPEED,
        radius: BULLET_RADIUS,
        color: BULLET_COLOR,
      });
      (state.custom.shotsFired as number)++;
      (state.custom.nextShotTime as number) = state.elapsed + SHOT_INTERVAL;
    }

    // Move projectiles
    for (const p of state.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Remove off-screen projectiles
    state.projectiles = state.projectiles.filter(
      (p) => p.x > -50 && p.x < CANVAS_WIDTH + 50 && p.y > -50 && p.y < CANVAS_HEIGHT + 50,
    );

    if (state.projectiles.length === 0 && (state.custom.shotsFired as number) >= shotCount) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    for (const p of state.projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(aimedShot);
export default aimedShot;
```

**Step 3: radial-burst.ts 작성**

방사형 탄막 패턴: 360도 동시 발사

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { BULLET_RADIUS, BULLET_COLOR, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const BULLET_COUNT_MIN = 8;
const BULLET_COUNT_MAX = 12;
const BULLET_SPEED = 200;
const PATTERN_DURATION = 3.0;

const radialBurst: TPattern = {
  name: 'radial-burst',
  tier: 'basic',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2): TPatternState {
    const count = BULLET_COUNT_MIN + Math.floor(Math.random() * (BULLET_COUNT_MAX - BULLET_COUNT_MIN + 1));
    const projectiles = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      projectiles.push({
        x: bossPos.x,
        y: bossPos.y,
        vx: Math.cos(angle) * BULLET_SPEED,
        vy: Math.sin(angle) * BULLET_SPEED,
        radius: BULLET_RADIUS,
        color: BULLET_COLOR,
      });
    }

    return {
      elapsed: 0,
      finished: false,
      projectiles,
      lasers: [],
      areas: [],
      custom: {},
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;

    for (const p of state.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    state.projectiles = state.projectiles.filter(
      (p) => p.x > -50 && p.x < CANVAS_WIDTH + 50 && p.y > -50 && p.y < CANVAS_HEIGHT + 50,
    );

    if (state.projectiles.length === 0 && state.elapsed > 0.5) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    for (const p of state.projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(radialBurst);
export default radialBurst;
```

**Step 4: Commit**

```bash
git add app/(canvas)/kustom/_lib/patterns/
git commit -m "feat(kustom): add pattern registry and basic patterns (aimed-shot, radial-burst)"
```

---

## Task 4: 중급 패턴 2개 (레이저 빔, 장판 공격)

**Files:**
- Create: `app/(canvas)/kustom/_lib/patterns/laser-beam.ts`
- Create: `app/(canvas)/kustom/_lib/patterns/area-hazard.ts`

**Step 1: laser-beam.ts 작성**

1초 경고선 → 0.5초 레이저 발사 패턴:

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const WARNING_DURATION = 1.0;
const ACTIVE_DURATION = 0.5;
const LASER_WIDTH = 20;
const PATTERN_DURATION = WARNING_DURATION + ACTIVE_DURATION + 0.3;

const laserBeam: TPattern = {
  name: 'laser-beam',
  tier: 'mid',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2, playerPos: TVector2): TPatternState {
    const dx = playerPos.x - bossPos.x;
    const dy = playerPos.y - bossPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Extend laser to canvas edge
    const maxDist = Math.sqrt(CANVAS_WIDTH * CANVAS_WIDTH + CANVAS_HEIGHT * CANVAS_HEIGHT);

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [{
        x1: bossPos.x,
        y1: bossPos.y,
        x2: bossPos.x + dirX * maxDist,
        y2: bossPos.y + dirY * maxDist,
        width: LASER_WIDTH,
        warningTimer: WARNING_DURATION,
        activeTimer: 0,
        isActive: false,
      }],
      areas: [],
      custom: {},
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;

    for (const laser of state.lasers) {
      if (laser.warningTimer > 0) {
        laser.warningTimer -= dt;
        if (laser.warningTimer <= 0) {
          laser.isActive = true;
          laser.activeTimer = ACTIVE_DURATION;
        }
      } else if (laser.isActive) {
        laser.activeTimer -= dt;
        if (laser.activeTimer <= 0) {
          laser.isActive = false;
        }
      }
    }

    if (state.elapsed >= PATTERN_DURATION) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    for (const laser of state.lasers) {
      if (laser.warningTimer > 0) {
        // Warning line
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(laser.x1, laser.y1);
        ctx.lineTo(laser.x2, laser.y2);
        ctx.stroke();
        ctx.restore();
      } else if (laser.isActive) {
        // Active laser
        ctx.save();
        ctx.strokeStyle = '#ff2222';
        ctx.lineWidth = laser.width;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(laser.x1, laser.y1);
        ctx.lineTo(laser.x2, laser.y2);
        ctx.stroke();
        // Inner bright core
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

registerPattern(laserBeam);
export default laserBeam;
```

**Step 2: area-hazard.ts 작성**

원형 위험 지역 경고 → 폭발 패턴:

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_RADIUS } from '../config';
import { registerPattern } from './registry';

const WARNING_DURATION = 1.5;
const ACTIVE_DURATION = 0.5;
const AREA_COUNT_MIN = 2;
const AREA_COUNT_MAX = 3;
const AREA_RADIUS_MIN = 60;
const AREA_RADIUS_MAX = 80;
const PATTERN_DURATION = WARNING_DURATION + ACTIVE_DURATION + 0.3;

const areaHazard: TPattern = {
  name: 'area-hazard',
  tier: 'mid',
  duration: PATTERN_DURATION,

  init(_bossPos: TVector2, playerPos: TVector2): TPatternState {
    const count = AREA_COUNT_MIN + Math.floor(Math.random() * (AREA_COUNT_MAX - AREA_COUNT_MIN + 1));
    const areas = [];
    const margin = AREA_RADIUS_MAX;

    for (let i = 0; i < count; i++) {
      const radius = AREA_RADIUS_MIN + Math.random() * (AREA_RADIUS_MAX - AREA_RADIUS_MIN);
      // Place areas around player's current position with some randomness
      const offsetX = (Math.random() - 0.5) * 200;
      const offsetY = (Math.random() - 0.5) * 200;
      const x = Math.max(margin, Math.min(CANVAS_WIDTH - margin, playerPos.x + offsetX));
      const y = Math.max(margin, Math.min(CANVAS_HEIGHT - margin, playerPos.y + offsetY));

      areas.push({
        x,
        y,
        radius,
        warningTimer: WARNING_DURATION,
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
        // Warning circle
        const progress = 1 - area.warningTimer / WARNING_DURATION;
        ctx.save();
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 140, 0, ${0.1 + progress * 0.2})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 140, 0, ${0.3 + progress * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      } else if (area.isActive) {
        // Explosion
        const fade = area.activeTimer / ACTIVE_DURATION;
        ctx.save();
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 100, 0, ${0.6 * fade})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 200, 0, ${0.8 * fade})`;
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

registerPattern(areaHazard);
export default areaHazard;
```

**Step 3: Commit**

```bash
git add app/(canvas)/kustom/_lib/patterns/laser-beam.ts app/(canvas)/kustom/_lib/patterns/area-hazard.ts
git commit -m "feat(kustom): add mid-tier patterns (laser-beam, area-hazard)"
```

---

## Task 5: 고급 패턴 3개 (안/밖, 나선형, 벽 탄막)

**Files:**
- Create: `app/(canvas)/kustom/_lib/patterns/in-out.ts`
- Create: `app/(canvas)/kustom/_lib/patterns/spiral.ts`
- Create: `app/(canvas)/kustom/_lib/patterns/bullet-wall.ts`

**Step 1: in-out.ts 작성**

보스 중심 반지름 기준 안/밖 위험 지역:

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const WARNING_DURATION = 1.5;
const ACTIVE_DURATION = 0.6;
const DANGER_RADIUS = 150;
const PATTERN_DURATION = WARNING_DURATION + ACTIVE_DURATION + 0.3;

const inOut: TPattern = {
  name: 'in-out',
  tier: 'advanced',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2): TPatternState {
    const isInner = Math.random() < 0.5; // true = inner dangerous, false = outer dangerous

    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [{
        x: bossPos.x,
        y: bossPos.y,
        radius: DANGER_RADIUS,
        warningTimer: WARNING_DURATION,
        activeTimer: 0,
        isActive: false,
      }],
      custom: { isInner },
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;
    const area = state.areas[0];

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

    if (state.elapsed >= PATTERN_DURATION) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    const area = state.areas[0];
    const isInner = state.custom.isInner as boolean;

    if (area.warningTimer > 0) {
      const progress = 1 - area.warningTimer / WARNING_DURATION;
      ctx.save();

      if (isInner) {
        // Inner danger - fill inner circle
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 0, ${0.05 + progress * 0.15})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + progress * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Outer danger - fill everything outside circle
        ctx.fillStyle = `rgba(255, 0, 0, ${0.05 + progress * 0.15})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Clear safe inner circle
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Draw boundary
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 0, ${0.3 + progress * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + progress * 0.3})`;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isInner ? 'GET OUT!' : 'GET IN!', area.x, area.y - area.radius - 20);

      ctx.restore();
    } else if (area.isActive) {
      const fade = area.activeTimer / ACTIVE_DURATION;
      ctx.save();

      if (isInner) {
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 50, 0, ${0.5 * fade})`;
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255, 50, 0, ${0.5 * fade})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(inOut);
export default inOut;
```

**Step 2: spiral.ts 작성**

나선형 회전 탄막:

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { BULLET_RADIUS, BULLET_COLOR, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const BULLET_SPEED = 180;
const ROTATION_SPEED = 3.0; // rad/s
const FIRE_RATE = 0.08; // seconds between shots
const PATTERN_DURATION = 3.0;
const ARM_COUNT = 2;

const spiral: TPattern = {
  name: 'spiral',
  tier: 'advanced',
  duration: PATTERN_DURATION,

  init(bossPos: TVector2): TPatternState {
    return {
      elapsed: 0,
      finished: false,
      projectiles: [],
      lasers: [],
      areas: [],
      custom: {
        bossX: bossPos.x,
        bossY: bossPos.y,
        nextFireTime: 0,
        angle: 0,
      },
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;
    const { bossX, bossY } = state.custom as { bossX: number; bossY: number };

    (state.custom.angle as number) += ROTATION_SPEED * dt;

    // Fire bullets while within duration
    if (state.elapsed < PATTERN_DURATION && state.elapsed >= (state.custom.nextFireTime as number)) {
      const baseAngle = state.custom.angle as number;
      for (let arm = 0; arm < ARM_COUNT; arm++) {
        const angle = baseAngle + (Math.PI * 2 * arm) / ARM_COUNT;
        state.projectiles.push({
          x: bossX,
          y: bossY,
          vx: Math.cos(angle) * BULLET_SPEED,
          vy: Math.sin(angle) * BULLET_SPEED,
          radius: BULLET_RADIUS,
          color: '#ff6644',
        });
      }
      (state.custom.nextFireTime as number) = state.elapsed + FIRE_RATE;
    }

    // Move projectiles
    for (const p of state.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Remove off-screen
    state.projectiles = state.projectiles.filter(
      (p) => p.x > -50 && p.x < CANVAS_WIDTH + 50 && p.y > -50 && p.y < CANVAS_HEIGHT + 50,
    );

    if (state.elapsed >= PATTERN_DURATION + 1.0 && state.projectiles.length === 0) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    for (const p of state.projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(spiral);
export default spiral;
```

**Step 3: bullet-wall.ts 작성**

화면 가로로 이동하는 탄환 벽 (빈 틈 있음):

```typescript
import { TPattern, TPatternState, TVector2 } from '../types';
import { BULLET_RADIUS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { registerPattern } from './registry';

const WALL_SPEED = 150;
const BULLET_SPACING = 30;
const GAP_SIZE = 60; // gap height in px
const GAP_COUNT_MIN = 1;
const GAP_COUNT_MAX = 2;
const PATTERN_DURATION = 6.0;

const bulletWall: TPattern = {
  name: 'bullet-wall',
  tier: 'advanced',
  duration: PATTERN_DURATION,

  init(): TPatternState {
    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -BULLET_RADIUS : CANVAS_WIDTH + BULLET_RADIUS;
    const vx = fromLeft ? WALL_SPEED : -WALL_SPEED;
    const gapCount = GAP_COUNT_MIN + Math.floor(Math.random() * (GAP_COUNT_MAX - GAP_COUNT_MIN + 1));

    // Generate gap positions
    const gaps: number[] = [];
    for (let i = 0; i < gapCount; i++) {
      const gapY = GAP_SIZE + Math.random() * (CANVAS_HEIGHT - GAP_SIZE * 2);
      gaps.push(gapY);
    }
    gaps.sort((a, b) => a - b);

    // Generate bullets for the wall, excluding gap areas
    const projectiles = [];
    for (let y = BULLET_RADIUS; y < CANVAS_HEIGHT; y += BULLET_SPACING) {
      let inGap = false;
      for (const gapY of gaps) {
        if (y > gapY - GAP_SIZE / 2 && y < gapY + GAP_SIZE / 2) {
          inGap = true;
          break;
        }
      }
      if (!inGap) {
        projectiles.push({
          x: startX,
          y,
          vx,
          vy: 0,
          radius: BULLET_RADIUS,
          color: '#ff4488',
        });
      }
    }

    return {
      elapsed: 0,
      finished: false,
      projectiles,
      lasers: [],
      areas: [],
      custom: { gaps, fromLeft },
    };
  },

  update(state: TPatternState, dt: number): void {
    state.elapsed += dt;

    for (const p of state.projectiles) {
      p.x += p.vx * dt;
    }

    state.projectiles = state.projectiles.filter(
      (p) => p.x > -50 && p.x < CANVAS_WIDTH + 50,
    );

    if (state.projectiles.length === 0 && state.elapsed > 0.5) {
      state.finished = true;
    }
  },

  render(state: TPatternState, ctx: CanvasRenderingContext2D): void {
    for (const p of state.projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  },

  isFinished(state: TPatternState): boolean {
    return state.finished;
  },
};

registerPattern(bulletWall);
export default bulletWall;
```

**Step 4: Commit**

```bash
git add app/(canvas)/kustom/_lib/patterns/in-out.ts app/(canvas)/kustom/_lib/patterns/spiral.ts app/(canvas)/kustom/_lib/patterns/bullet-wall.ts
git commit -m "feat(kustom): add advanced patterns (in-out, spiral, bullet-wall)"
```

---

## Task 6: player.ts (플레이어 모듈)

**Files:**
- Create: `app/(canvas)/kustom/_lib/player.ts`

**Step 1: player.ts 작성**

플레이어 이동, 대시, 피격, 충돌 판정, 렌더링:

```typescript
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
  // Dash cooldown
  if (player.dashCooldown > 0) {
    player.dashCooldown -= dt;
  }

  // Dash active
  if (player.isDashing) {
    player.dashTimer -= dt;
    if (player.dashTimer <= 0) {
      player.isDashing = false;
      player.isInvincible = false;
    }
  }

  // Hit invincibility
  if (player.invincibleTimer > 0) {
    player.invincibleTimer -= dt;
    if (player.invincibleTimer <= 0) {
      player.isInvincible = false;
    }
  }

  // Movement direction
  let dx = 0;
  let dy = 0;
  if (keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('ArrowRight')) dx += 1;
  if (keys.has('ArrowUp')) dy -= 1;
  if (keys.has('ArrowDown')) dy += 1;

  // Normalize diagonal
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  // Apply speed
  let speed = PLAYER_SPEED;
  if (player.isDashing) {
    // Use dash direction
    dx = player.dashDirX;
    dy = player.dashDirY;
    speed = PLAYER_SPEED * DASH_SPEED_MULTIPLIER;
  }

  player.x += dx * speed * dt;
  player.y += dy * speed * dt;

  // Clamp to canvas
  player.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, player.x));
  player.y = Math.max(PLAYER_RADIUS, Math.min(CANVAS_HEIGHT - PLAYER_RADIUS, player.y));

  // Dash trail
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

  // Default dash direction: down if no key pressed
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

// Collision checks

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

    // Point-to-line distance
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
      // Inner danger: hit if inside radius
      if (dist < area.radius + PLAYER_RADIUS) return true;
    } else if (isInner === false) {
      // Outer danger: hit if outside radius
      if (dist > area.radius - PLAYER_RADIUS) return true;
    } else {
      // Normal area hazard: hit if inside
      if (dist < area.radius + PLAYER_RADIUS) return true;
    }
  }
  return false;
}

// Rendering

export function renderPlayer(player: TPlayer, ctx: CanvasRenderingContext2D): void {
  // Trails
  for (const trail of player.trails) {
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 212, 255, ${trail.alpha * 0.4})`;
    ctx.fill();
  }

  // Player body
  ctx.save();
  if (player.isInvincible && !player.isDashing) {
    // Blink effect
    const blink = Math.floor(performance.now() / 80) % 2 === 0;
    ctx.globalAlpha = blink ? 0.3 : 0.8;
  }

  ctx.beginPath();
  ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = player.isDashing ? '#66eeff' : PLAYER_COLOR;
  ctx.fill();

  // Inner highlight
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
    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, barWidth, barHeight);
    // Fill
    ctx.fillStyle = 'rgba(0,212,255,0.6)';
    ctx.fillRect(x, y, barWidth * progress, barHeight);
  }
}
```

**Step 2: Commit**

```bash
git add app/(canvas)/kustom/_lib/player.ts
git commit -m "feat(kustom): add player module with movement, dash, collision, rendering"
```

---

## Task 7: boss.ts (보스 모듈 + 패턴 스케줄러)

**Files:**
- Create: `app/(canvas)/kustom/_lib/boss.ts`

**Step 1: boss.ts 작성**

보스 렌더링 + 패턴 스케줄링:

```typescript
import {
  BOSS_X,
  BOSS_Y,
  BOSS_RADIUS,
  BOSS_COLOR,
  BOSS_ROTATION_SPEED,
  BASE_ATTACK_INTERVAL,
  MIN_ATTACK_INTERVAL,
  ATTACK_INTERVAL_DECREASE_RATE,
  TIER_EXTREME_TIME,
} from './config';
import { TPatternState, TVector2 } from './types';
import { pickRandomPattern } from './patterns/registry';

// Import all patterns to trigger registration
import './patterns/aimed-shot';
import './patterns/radial-burst';
import './patterns/laser-beam';
import './patterns/area-hazard';
import './patterns/in-out';
import './patterns/spiral';
import './patterns/bullet-wall';

export type TBoss = {
  x: number;
  y: number;
  rotation: number;
  attackTimer: number;
  activePatterns: TActivePattern[];
};

export type TActivePattern = {
  state: TPatternState;
  pattern: ReturnType<typeof pickRandomPattern>;
};

export function createBoss(): TBoss {
  return {
    x: BOSS_X,
    y: BOSS_Y,
    rotation: 0,
    attackTimer: 2.0, // first attack after 2s
    activePatterns: [],
  };
}

export function getAttackInterval(elapsedTime: number): number {
  const interval = BASE_ATTACK_INTERVAL - elapsedTime * ATTACK_INTERVAL_DECREASE_RATE;
  return Math.max(MIN_ATTACK_INTERVAL, interval);
}

export function updateBoss(
  boss: TBoss,
  dt: number,
  elapsedTime: number,
  playerPos: TVector2,
): void {
  // Rotate boss
  boss.rotation += BOSS_ROTATION_SPEED * dt;

  // Attack timer
  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) {
    // Pick and start a new pattern
    const pattern = pickRandomPattern(elapsedTime);
    if (pattern) {
      const bossPos: TVector2 = { x: boss.x, y: boss.y };
      const state = pattern.init(bossPos, playerPos);

      boss.activePatterns.push({ state, pattern });

      // Extreme mode: fire second pattern simultaneously
      if (elapsedTime >= TIER_EXTREME_TIME && Math.random() < 0.5) {
        const pattern2 = pickRandomPattern(elapsedTime);
        if (pattern2) {
          const state2 = pattern2.init(bossPos, playerPos);
          boss.activePatterns.push({ state: state2, pattern: pattern2 });
        }
      }
    }
    boss.attackTimer = getAttackInterval(elapsedTime);
  }

  // Update active patterns
  const bossPos: TVector2 = { x: boss.x, y: boss.y };
  for (const ap of boss.activePatterns) {
    if (ap.pattern) {
      ap.pattern.update(ap.state, dt, playerPos, bossPos);
    }
  }

  // Remove finished patterns
  boss.activePatterns = boss.activePatterns.filter(
    (ap) => ap.pattern && !ap.pattern.isFinished(ap.state),
  );
}

export function renderBoss(boss: TBoss, ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.rotate(boss.rotation);

  // Octagon
  const sides = 8;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides;
    const px = Math.cos(angle) * BOSS_RADIUS;
    const py = Math.sin(angle) * BOSS_RADIUS;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = BOSS_COLOR;
  ctx.fill();
  ctx.strokeStyle = '#cc0000';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner glow
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides;
    const px = Math.cos(angle) * BOSS_RADIUS * 0.5;
    const py = Math.sin(angle) * BOSS_RADIUS * 0.5;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(200, 0, 0, 0.3)';
  ctx.fill();

  ctx.restore();
}

export function renderPatterns(boss: TBoss, ctx: CanvasRenderingContext2D): void {
  for (const ap of boss.activePatterns) {
    if (ap.pattern) {
      ap.pattern.render(ap.state, ctx);
    }
  }
}
```

**Step 2: Commit**

```bash
git add app/(canvas)/kustom/_lib/boss.ts
git commit -m "feat(kustom): add boss module with pattern scheduler"
```

---

## Task 8: renderer.ts (공통 렌더링 유틸)

**Files:**
- Create: `app/(canvas)/kustom/_lib/renderer.ts`

**Step 1: renderer.ts 작성**

배경, 시간 HUD 등 공통 렌더링:

```typescript
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BG_COLOR,
  GRID_COLOR,
  GRID_SPACING,
} from './config';

export function renderBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Grid
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  for (let x = 0; x < CANVAS_WIDTH; x += GRID_SPACING) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < CANVAS_HEIGHT; y += GRID_SPACING) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }
}

export function renderTimeHud(ctx: CanvasRenderingContext2D, elapsedTime: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`${Math.floor(elapsedTime)}s`, CANVAS_WIDTH - 20, 20);
  ctx.restore();
}
```

**Step 2: Commit**

```bash
git add app/(canvas)/kustom/_lib/renderer.ts
git commit -m "feat(kustom): add renderer module with background and time HUD"
```

---

## Task 9: game.ts (메인 게임 루프)

**Files:**
- Create: `app/(canvas)/kustom/_lib/game.ts`

**Step 1: game.ts 작성**

기존 fruitninja 패턴을 정확히 따르는 메인 게임 파일. HUD 함수 시그니처 준수:
- `gameStartHud(canvas, ctx)`
- `gameLoadingHud(canvas, ctx)`
- `gamePauseHud(canvas, ctx)`
- `createGameOverHud(canvas, ctx, gameType, callbacks, options)` → `{ render(score), onKeyDown(e, score), reset() }`

```typescript
import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config';
import { TGameState } from './types';
import { createPlayer, updatePlayer, startDash, hitPlayer, renderPlayer, renderHP, renderDashCooldown, checkProjectileCollision, checkLaserCollision, checkAreaCollision } from './player';
import { createBoss, updateBoss, renderBoss, renderPatterns } from './boss';
import { renderBackground, renderTimeHud } from './renderer';

export type TKustomCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn: boolean;
};

export function setupKustom(
  canvas: HTMLCanvasElement,
  callbacks: TKustomCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  let state: TGameState = 'start';
  let animationId = 0;
  let lastTime = 0;
  let elapsedTime = 0;

  let player = createPlayer();
  let boss = createBoss();
  const keys = new Set<string>();

  // Game Over HUD
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      return callbacks.onScoreSave(finalScore);
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'kustom',
    gameOverCallbacks,
    { isLoggedIn: callbacks.isLoggedIn },
  );

  function resetGame(): void {
    state = 'start';
    elapsedTime = 0;
    lastTime = 0;
    player = createPlayer();
    boss = createBoss();
    keys.clear();
    gameOverHud.reset();
  }

  async function startGame(): Promise<void> {
    if (state !== 'start' && state !== 'paused') return;

    if (state === 'paused') {
      state = 'playing';
      return;
    }

    state = 'loading';
    if (callbacks.onGameStart) {
      await callbacks.onGameStart();
    }
    state = 'playing';
    lastTime = 0;
  }

  function update(dt: number): void {
    elapsedTime += dt;

    // Update player
    updatePlayer(player, dt, keys);

    // Update boss
    updateBoss(boss, dt, elapsedTime, { x: player.x, y: player.y });

    // Collision detection
    let wasHit = false;
    for (const ap of boss.activePatterns) {
      if (!ap.pattern || wasHit) continue;
      const s = ap.state;

      // Projectile collision
      if (checkProjectileCollision(player, s.projectiles)) {
        wasHit = true;
      }

      // Laser collision
      if (!wasHit && checkLaserCollision(player, s.lasers)) {
        wasHit = true;
      }

      // Area collision
      if (!wasHit && s.areas.length > 0) {
        const isInOutPattern = ap.pattern.name === 'in-out';
        if (isInOutPattern) {
          const isInner = s.custom.isInner as boolean;
          if (checkAreaCollision(player, s.areas, isInner)) {
            wasHit = true;
          }
        } else {
          if (checkAreaCollision(player, s.areas)) {
            wasHit = true;
          }
        }
      }
    }

    if (wasHit) {
      const isDead = hitPlayer(player);
      if (isDead) {
        state = 'gameover';
      }
    }
  }

  function render(): void {
    renderBackground(ctx);

    if (state === 'start') {
      gameStartHud(canvas, ctx);
      return;
    }

    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
      return;
    }

    // Render game elements
    renderPatterns(boss, ctx);
    renderBoss(boss, ctx);
    renderPlayer(player, ctx);

    // HUD
    renderHP(player, ctx);
    renderTimeHud(ctx, elapsedTime);
    renderDashCooldown(player, ctx);

    if (state === 'paused') {
      gamePauseHud(canvas, ctx);
      return;
    }

    if (state === 'gameover') {
      gameOverHud.render(Math.floor(elapsedTime));
      return;
    }
  }

  // Game loop
  function gameLoop(currentTime: number): void {
    if (lastTime === 0) lastTime = currentTime;
    const dt = Math.min((currentTime - lastTime) / 1000, 0.05); // cap dt
    lastTime = currentTime;

    if (state === 'playing') {
      update(dt);
    }

    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  // Keyboard events
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (state === 'gameover') {
      gameOverHud.onKeyDown(e, Math.floor(elapsedTime));
      return;
    }

    switch (e.code) {
      case 'KeyS':
        startGame();
        break;
      case 'KeyP':
        if (state === 'playing') {
          state = 'paused';
        }
        break;
      case 'KeyR':
        resetGame();
        break;
      case 'Space':
        if (state === 'playing') {
          startDash(player, keys);
          e.preventDefault();
        }
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
        keys.add(e.code);
        e.preventDefault();
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
        keys.delete(e.code);
        break;
    }
  };

  // Register events
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    cancelAnimationFrame(animationId);
  };
}
```

**Step 2: Commit**

```bash
git add app/(canvas)/kustom/_lib/game.ts
git commit -m "feat(kustom): add main game loop with HUD integration"
```

---

## Task 10: React 컴포넌트, 페이지, 레이아웃

**Files:**
- Create: `app/(canvas)/kustom/_components/Kustom.tsx`
- Create: `app/(canvas)/kustom/page.tsx`
- Create: `app/(canvas)/kustom/layout.tsx`

**Step 1: Kustom.tsx 작성**

fruitninja의 FruitNinja.tsx 패턴 정확히 따름:

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupKustom, TKustomCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function Kustom() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('kustom');
  const { mutateAsync: createSession } = useGameSession('kustom');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TKustomCallbacks = {
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
          gameType: 'kustom',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupKustom(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[800px] h-[600px] border border-white/20 rounded-2xl shadow-lg"
      />
    </div>
  );
}

export default Kustom;
```

**Step 2: page.tsx 작성**

```typescript
'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import Kustom from './_components/Kustom';

const controls = [
  { key: '←↑↓→', action: '이동' },
  { key: 'Space', action: '대시 (무적)' },
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
];

function KustomPage() {
  const { data: scores = [], isLoading } = useGetScores('kustom');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[800px]">
        <Kustom />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default KustomPage;
```

**Step 3: layout.tsx 작성**

```typescript
import KameHeader from '@/components/common/KameHeader';

function KustomLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      <KameHeader title="Kustom" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default KustomLayout;
```

**Step 4: Commit**

```bash
git add app/(canvas)/kustom/_components/Kustom.tsx app/(canvas)/kustom/page.tsx app/(canvas)/kustom/layout.tsx
git commit -m "feat(kustom): add React component, page, and layout"
```

---

## Task 11: 수동 테스트 및 밸런스 조정

**Step 1: 개발 서버 실행**

```bash
yarn dev
```

**Step 2: 브라우저에서 테스트**

`http://localhost:3000/kustom` 접속 후 다음을 확인:

1. **시작 화면**: "Press 'S' for start" 표시 확인
2. **플레이어 이동**: 화살표키 8방향 이동, 캔버스 밖으로 나가지 않음
3. **대시**: Space로 대시 발동, 잔상 효과, 쿨다운 표시, 대시 중 무적
4. **보스 공격**: 시간대별 패턴 등장 확인 (기본→중급→고급)
5. **피격**: HP 감소, 깜빡임 무적, HP 0 시 게임오버
6. **게임오버 HUD**: 점수 표시, 저장 버튼, R로 재시작
7. **일시정지**: P키로 정지/S키로 재개
8. **조작 안내 테이블**: 좌측에 올바르게 표시
9. **랭크보드**: 우측에 표시

**Step 3: 발견된 이슈 수정 후 Commit**

```bash
git add -A
git commit -m "fix(kustom): balance adjustments after playtesting"
```

---

## Task 12: 최종 커밋

**Step 1: 전체 빌드 확인**

```bash
yarn build
```

빌드 에러 없이 완료되는지 확인.

**Step 2: 최종 커밋 (필요 시)**

빌드 이슈 수정 후:

```bash
git add -A
git commit -m "feat: add kustom boss dodge game with extensible pattern system"
```
