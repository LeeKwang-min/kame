# Downwell Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 수직 하강하며 적을 밟거나 슈팅으로 처치하는 액션 게임 구현

**Architecture:** Canvas API 기반 60FPS 게임 루프. 플랫폼과 적이 절차 생성되어 위로 스크롤. 플레이어는 좌우 이동 + 공중 슈팅. HP 시스템. 기존 FruitNinja/GeometryDash 패턴(setup함수, HUD, 콜백)을 그대로 따름.

**Tech Stack:** Canvas API, TypeScript, requestAnimationFrame

---

### Task 1: 게임 등록 (6개 설정 파일 수정)

**Files:**
- Modify: `@types/scores.ts`
- Modify: `lib/config.ts`
- Modify: `components/common/GameCard.tsx`
- Modify: `app/api/game-session/route.ts`
- Modify: `app/api/scores/route.ts`
- Modify: `lib/game-security/config.ts`

**Step 1: 6개 파일에 'downwell' 등록**

1. `@types/scores.ts` - TGameType에 `| 'downwell'` 추가
2. `lib/config.ts` - ACTION 카테고리에 추가:
```typescript
{
  name: { kor: '다운웰', eng: 'Downwell' },
  href: '/downwell',
  category: 'Action',
},
```
3. `components/common/GameCard.tsx` - lucide-react에서 `ArrowDownToLine` import, `'/downwell': ArrowDownToLine` 추가
4. `app/api/game-session/route.ts` - VALID_GAME_TYPES에 `'downwell'` 추가
5. `app/api/scores/route.ts` - VALID_GAME_TYPES에 `'downwell'` 추가
6. `lib/game-security/config.ts` - 추가:
```typescript
downwell: { maxScore: 100000, minPlayTimeSeconds: 5 },
```

**Step 2: Commit**
```bash
git commit -m "feat(downwell): register game in 6 config files"
```

---

### Task 2: 타입 및 설정 파일 생성

**Files:**
- Create: `app/(canvas)/downwell/_lib/types.ts`
- Create: `app/(canvas)/downwell/_lib/config.ts`

**Step 1: types.ts 생성**

```typescript
export type TPlayer = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  isGrounded: boolean;
  isFacingRight: boolean;
  invincibleTimer: number;
};

export type TPlatform = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TEnemy = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  hp: number;
  type: 'walker' | 'flyer';
};

export type TBullet = {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
};

export type TParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};
```

**Step 2: config.ts 생성**

```typescript
// Canvas
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;

// Player
export const PLAYER_WIDTH = 20;
export const PLAYER_HEIGHT = 24;
export const PLAYER_SPEED = 250;
export const PLAYER_MAX_HP = 3;
export const PLAYER_MAX_AMMO = 8;
export const JUMP_VELOCITY = -400;
export const STOMP_BOUNCE = -350;
export const GRAVITY = 800;
export const INVINCIBLE_DURATION = 1.5;

// Bullets
export const BULLET_WIDTH = 6;
export const BULLET_HEIGHT = 12;
export const BULLET_SPEED = 500;

// Platforms
export const PLATFORM_HEIGHT = 12;
export const PLATFORM_MIN_WIDTH = 60;
export const PLATFORM_MAX_WIDTH = 140;
export const PLATFORM_SPACING_Y = 80;
export const WALL_WIDTH = 20;

// Enemies
export const ENEMY_SIZE = 20;
export const ENEMY_SPEED = 60;
export const ENEMY_SPAWN_CHANCE = 0.4;
export const FLYER_CHANCE = 0.2;
export const ENEMY_KILL_SCORE = 50;

// Scrolling
export const BASE_SCROLL_SPEED = 60;
export const MAX_SCROLL_SPEED = 200;
export const SCROLL_SPEED_INCREASE = 1;

// Particles
export const PARTICLE_COUNT = 10;
export const PARTICLE_LIFE = 0.4;

// Scoring
export const DEPTH_SCORE_RATE = 10;

// Colors
export const COLORS = {
  bg: '#0a0a0a',
  wall: '#2a2a2a',
  wallBorder: '#3a3a3a',
  platform: '#f0f0f0',
  player: '#f0f0f0',
  playerDamaged: '#ff4444',
  bullet: '#ffdd00',
  bulletFlash: 'rgba(255, 221, 0, 0.3)',
  enemyWalker: '#e94560',
  enemyFlyer: '#d946ef',
  hp: '#e94560',
  hpEmpty: '#333333',
  ammo: '#ffdd00',
  ammoEmpty: '#333333',
  particle: '#f0f0f0',
  scoreText: '#ffffff',
  depthText: '#888888',
};
```

**Step 3: Commit**
```bash
git commit -m "feat(downwell): add type definitions and config constants"
```

---

### Task 3: 게임 로직 구현 (game.ts)

**Files:**
- Create: `app/(canvas)/downwell/_lib/game.ts`
- Reference: `app/(canvas)/fruitninja/_lib/game.ts` (처음 100줄 패턴 확인)

**Step 1: game.ts 생성**

핵심 구현 사항:
- `setupDownwell(canvas, callbacks)` export, cleanup 함수 반환
- `TDownwellCallbacks` 타입 export
- HUD: `gameStartHud(canvas, ctx)`, `gameLoadingHud(canvas, ctx)`, `gamePauseHud(canvas, ctx)`
- GameOverHud: `createGameOverHud(canvas, ctx, 'downwell', callbacks, { isLoggedIn })`
- 키보드: `e.code` 사용, `e.repeat` 체크

게임 메커니즘:
- **스크롤**: 화면이 자동으로 위로 스크롤 (플레이어가 내려가는 느낌). 플레이어는 화면 중앙 근처에 고정, 세계가 위로 이동.
- **플랫폼 생성**: PLATFORM_SPACING_Y 간격으로 랜덤 배치. 양쪽 벽(WALL_WIDTH) 존재. 플레이어가 플랫폼 위에 착지하면 isGrounded=true, 탄약 충전.
- **적 생성**: 플랫폼 생성 시 ENEMY_SPAWN_CHANCE 확률로 walker 적 배치. FLYER_CHANCE 확률로 공중 flyer.
- **walker**: 플랫폼 위에서 좌우 이동, 플랫폼 끝에서 방향 전환
- **flyer**: 공중에서 좌우로 느리게 이동
- **슈팅**: 공중에서 Space 누르면 아래로 총알 발사 (ammo 소모). 총알이 적에 맞으면 처치.
- **밟기**: 플레이어가 적 위에서 착지하면 처치 + STOMP_BOUNCE로 바운스
- **HP**: 적 측면 충돌 시 -1, invincibleTimer 동안 무적
- **점수**: depth (하강 거리) * DEPTH_SCORE_RATE + 적 처치 * ENEMY_KILL_SCORE

키 입력 (keydown/keyup 둘 다):
```typescript
// keydown
case 'ArrowLeft':
  keys.left = true; break;
case 'ArrowRight':
  keys.right = true; break;
case 'Space':
  e.preventDefault();
  if (!player.isGrounded && player.ammo > 0) { shoot(); }
  break;

// keyup
case 'ArrowLeft':
  keys.left = false; break;
case 'ArrowRight':
  keys.right = false; break;
```

렌더링:
- 배경: 검정
- 양쪽 벽: 어두운 회색
- 플랫폼: 흰색
- 플레이어: 흰색 사각형 (피격 시 빨간색 깜빡임)
- 적: walker=빨강, flyer=보라
- 총알: 노란색
- UI: 좌측 상단 HP 바, 우측 상단 탄약 표시, 점수

**Step 2: Commit**
```bash
git commit -m "feat(downwell): implement game logic with platforming, shooting, and enemies"
```

---

### Task 4: 컴포넌트 및 페이지 생성

**Files:**
- Create: `app/(canvas)/downwell/_components/Downwell.tsx`
- Create: `app/(canvas)/downwell/page.tsx`
- Create: `app/(canvas)/downwell/layout.tsx`

**Step 1: Downwell.tsx** - GeometryDash.tsx와 동일 패턴, `setupDownwell` 사용, canvas 400x600

**Step 2: page.tsx** - controls:
```typescript
const controls = [
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
  { key: '← / →', action: '좌우 이동' },
  { key: 'Space', action: '슈팅 (공중)' },
];
```
canvas max-width: 400px

**Step 3: layout.tsx** - `<KameHeader title="Downwell" />`

**Step 4: Commit**
```bash
git commit -m "feat(downwell): add component, page, and layout"
```

---

### Task 5: 빌드 검증

**Step 1:** `npx tsc --noEmit` 으로 TypeScript 에러 확인
**Step 2:** helicopter/downwell 관련 에러만 확인하여 수정
