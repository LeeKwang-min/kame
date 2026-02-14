# Helicopter Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Space를 누르면 상승/떼면 하강하는 동굴 비행 무한 러너 게임 구현

**Architecture:** Canvas API 기반 60FPS 게임 루프. 동굴은 세그먼트 단위로 천장/바닥을 절차 생성하며, 시간에 따라 통로가 좁아지고 속도가 증가. 기존 FruitNinja/GeometryDash 패턴(setup함수, HUD, 콜백)을 그대로 따름.

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

**Step 1: 6개 파일에 'helicopter' 등록**

1. `@types/scores.ts` - TGameType에 `| 'helicopter'` 추가
2. `lib/config.ts` - ACTION 카테고리에 추가:
```typescript
{
  name: { kor: '헬리콥터', eng: 'Helicopter' },
  href: '/helicopter',
  category: 'Action',
},
```
3. `components/common/GameCard.tsx` - lucide-react에서 `Plane` import, `'/helicopter': Plane` 추가
4. `app/api/game-session/route.ts` - VALID_GAME_TYPES에 `'helicopter'` 추가
5. `app/api/scores/route.ts` - VALID_GAME_TYPES에 `'helicopter'` 추가
6. `lib/game-security/config.ts` - 추가:
```typescript
helicopter: { maxScore: 100000, minPlayTimeSeconds: 5 },
```

**Step 2: Commit**
```bash
git commit -m "feat(helicopter): register game in 6 config files"
```

---

### Task 2: 타입 및 설정 파일 생성

**Files:**
- Create: `app/(canvas)/helicopter/_lib/types.ts`
- Create: `app/(canvas)/helicopter/_lib/config.ts`

**Step 1: types.ts 생성**

```typescript
export type TCaveSegment = {
  x: number;
  topY: number;
  bottomY: number;
  width: number;
};

export type TPlayer = {
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
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 400;

// Player
export const PLAYER_WIDTH = 35;
export const PLAYER_HEIGHT = 20;
export const PLAYER_X = 120;
export const ASCEND_FORCE = -600;
export const GRAVITY = 400;
export const MAX_VY = 300;

// Cave
export const SEGMENT_WIDTH = 10;
export const INITIAL_GAP = 200;
export const MIN_GAP = 90;
export const GAP_DECREASE_RATE = 0.3;
export const CAVE_ROUGHNESS = 15;
export const CAVE_MARGIN = 30;

// Scrolling
export const BASE_SPEED = 200;
export const MAX_SPEED = 500;
export const SPEED_INCREASE_RATE = 3;

// Particles
export const PARTICLE_COUNT = 12;
export const PARTICLE_LIFE = 0.5;
export const TRAIL_PARTICLE_INTERVAL = 0.03;

// Colors
export const COLORS = {
  bg: '#0a0a1a',
  caveTop: '#1a1a3e',
  caveBottom: '#1a1a3e',
  caveBorder: '#2a4a6a',
  player: '#00d2ff',
  playerGlow: 'rgba(0, 210, 255, 0.3)',
  propeller: '#ffffff',
  trail: '#00d2ff',
  particle: '#00d2ff',
  scoreText: '#ffffff',
  warning: '#ff4444',
};
```

**Step 3: Commit**
```bash
git commit -m "feat(helicopter): add type definitions and config constants"
```

---

### Task 3: 게임 로직 구현 (game.ts)

**Files:**
- Create: `app/(canvas)/helicopter/_lib/game.ts`
- Reference: `app/(canvas)/fruitninja/_lib/game.ts` (처음 100줄 패턴 확인)

**Step 1: game.ts 생성**

핵심 구현 사항:
- `setupHelicopter(canvas, callbacks)` export, cleanup 함수 반환
- `THelicopterCallbacks` 타입 export
- HUD: `gameStartHud(canvas, ctx)`, `gameLoadingHud(canvas, ctx)`, `gamePauseHud(canvas, ctx)`
- GameOverHud: `createGameOverHud(canvas, ctx, 'helicopter', callbacks, { isLoggedIn })`
- 키보드: `e.code` 사용, `e.repeat` 체크

게임 메커니즘:
- **동굴 생성**: SEGMENT_WIDTH 단위로 TCaveSegment 배열 관리. 천장/바닥 높이를 이전 세그먼트 기준 랜덤 변동 (CAVE_ROUGHNESS). 중심점은 서서히 위아래로 흔들림.
- **통로 폭**: `gap = max(MIN_GAP, INITIAL_GAP - elapsedTime * GAP_DECREASE_RATE)`
- **플레이어**: Space keydown시 `vy += ASCEND_FORCE * dt`, keyup시 중력으로 하강. vy 클램프 [-MAX_VY, MAX_VY].
- **충돌**: 플레이어 사각형이 천장/바닥 라인과 겹치는지 체크
- **트레일**: 헬리콥터 뒤에 작은 파티클 트레일 효과
- **렌더링**: 동굴은 fillRect로 천장/바닥 채우기, 경계선 그리기, 그리드 배경

키 입력 (keydown/keyup 둘 다 필요):
```typescript
// keydown
case 'Space':
  e.preventDefault();
  isHolding = true;
  break;

// keyup
case 'Space':
  isHolding = false;
  break;
```

**Step 2: Commit**
```bash
git commit -m "feat(helicopter): implement game logic with cave generation and physics"
```

---

### Task 4: 컴포넌트 및 페이지 생성

**Files:**
- Create: `app/(canvas)/helicopter/_components/Helicopter.tsx`
- Create: `app/(canvas)/helicopter/page.tsx`
- Create: `app/(canvas)/helicopter/layout.tsx`

**Step 1: Helicopter.tsx** - GeometryDash.tsx와 동일 패턴, `setupHelicopter` 사용, canvas 800x400

**Step 2: page.tsx** - controls:
```typescript
const controls = [
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
  { key: 'Space (Hold)', action: '상승' },
];
```

**Step 3: layout.tsx** - `<KameHeader title="Helicopter" />`

**Step 4: Commit**
```bash
git commit -m "feat(helicopter): add component, page, and layout"
```

---

### Task 5: 빌드 검증

**Step 1:** `yarn build` 또는 `npx tsc --noEmit` 으로 TypeScript 에러 확인
**Step 2:** geometrydash 관련 에러가 아닌 helicopter 관련 에러만 확인하여 수정
