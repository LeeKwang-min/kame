# K-Racing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 탑뷰 싱글 레이싱 게임(K-Racing)을 Canvas 2D + canvas-mobile로 구현한다. 고정 타원형 트랙을 3바퀴 완주하는 시간을 측정하여 랭킹을 매기는 타임어택 방식.

**Architecture:** Canvas 2D 기반의 canvas-mobile 라우트 그룹 게임. 자동 전진 + 좌우 회전 + 브레이크 조작. 드리프트 메커닉 포함. 차량 중심 카메라 + 미니맵 HUD. 점수는 밀리초(ms) 단위 시간 저장, ASC 정렬(낮을수록 상위). 기존 점수 API에 `lowerIsBetter` 지원을 추가해야 함.

**Tech Stack:** Next.js App Router, Canvas 2D, TypeScript, React Query, Prisma

---

## Task 1: 점수 시스템 수정 - lowerIsBetter 지원

K-Racing은 시간이 짧을수록 좋은 게임이므로, 기존 DESC 고정 정렬과 "높은 점수만 저장" 로직을 수정해야 한다.

**Files:**
- Modify: `lib/game-security/config.ts` - lowerIsBetter 필드 추가
- Modify: `app/api/scores/route.ts` - GET 정렬 + POST 비교 로직 수정
- Modify: `components/common/RankBoard.tsx` - formatScore prop 추가

### Step 1: game-security config에 lowerIsBetter 필드 추가

`lib/game-security/config.ts`에서 타입과 config 수정:

```typescript
// 타입 변경
export const GAME_SECURITY_CONFIG: Record<
  TGameType,
  { maxScore: number; minPlayTimeSeconds: number; lowerIsBetter?: boolean }
> = {
  // ... 기존 게임들은 변경 없음 (lowerIsBetter 미설정 = false)
  // kracing 추가 시:
  kracing: { maxScore: 600000, minPlayTimeSeconds: 10, lowerIsBetter: true },
};
```

기존 게임에는 `lowerIsBetter`를 추가하지 않는다. `undefined`는 `false`와 동일하게 처리.

### Step 2: scores API GET - 정렬 로직 수정

`app/api/scores/route.ts`의 GET 핸들러에서:

```typescript
// GAME_SECURITY_CONFIG import 추가
import { GAME_SECURITY_CONFIG, RATE_LIMIT } from '@/lib/game-security/config';

// GET 핸들러 내부 orderBy 수정
const config = GAME_SECURITY_CONFIG[gameType];
const orderDirection = config?.lowerIsBetter ? 'asc' : 'desc';

const scores = await prisma.score.findMany({
  where: { gameType },
  orderBy: { score: orderDirection },
  take: 10,
  select: {
    initials: true,
    score: true,
    country: true,
  },
});
```

### Step 3: scores API POST - 점수 비교 로직 수정

`app/api/scores/route.ts`의 POST 핸들러에서 기존 최고 점수 비교 부분 수정:

```typescript
// 기존 최고 점수 확인 - lowerIsBetter에 따라 정렬 변경
const config = GAME_SECURITY_CONFIG[gameType];
const existingScore = await prisma.score.findFirst({
  where: {
    userId: authSession.user.id,
    gameType,
  },
  orderBy: { score: config.lowerIsBetter ? 'asc' : 'desc' },
});

const newScoreValue = Math.floor(score);

// 점수 비교 로직: lowerIsBetter에 따라 방향 반전
const isNotBetter = config.lowerIsBetter
  ? (newScoreValue >= existingScore.score)  // 시간: 같거나 더 느리면 저장 안 함
  : (newScoreValue <= existingScore.score); // 점수: 같거나 더 낮으면 저장 안 함

if (existingScore && isNotBetter) {
  // 세션은 사용 처리
  await prisma.gameSession.update({
    where: { id: gameSession.id },
    data: { isUsed: true, usedAt: new Date() },
  });

  return Response.json(
    {
      error: 'SCORE_NOT_HIGHER',
      message: config.lowerIsBetter
        ? `Your best time is ${existingScore.score}ms. New time must be faster to save.`
        : `Your best score is ${existingScore.score}. New score must be higher to save.`,
      currentBest: existingScore.score,
    },
    { status: 200 },
  );
}
```

### Step 4: RankBoard에 formatScore prop 추가

`components/common/RankBoard.tsx`에 선택적 `formatScore` prop 추가:

```typescript
interface IProps {
  data: { initials: string; score: number; country?: string | null }[];
  className?: string;
  showCountry?: boolean;
  isLoading?: boolean;
  formatScore?: (score: number) => string; // 추가
}

// 점수 표시 부분에서:
// 기존: {score.toLocaleString()}
// 변경: {formatScore ? formatScore(score) : score.toLocaleString()}
```

### Step 5: Commit

```bash
git add lib/game-security/config.ts app/api/scores/route.ts components/common/RankBoard.tsx
git commit -m "feat: add lowerIsBetter support for time-based games"
```

---

## Task 2: 게임 등록 - 6개 필수 파일 수정

**Files:**
- Modify: `@types/scores.ts` - TGameType에 'kracing' 추가
- Modify: `lib/config.ts` - MENU_LIST에 게임 추가
- Modify: `components/common/GameCard.tsx` - GAME_ICONS에 아이콘 추가
- Modify: `app/api/game-session/route.ts` - VALID_GAME_TYPES에 추가
- Modify: `app/api/scores/route.ts` - VALID_GAME_TYPES에 추가
- Modify: `lib/game-security/config.ts` - 보안 설정 추가 (Task 1에서 이미 처리)

### Step 1: TGameType에 추가

`@types/scores.ts`:
```typescript
// 마지막 항목 'superhexagon' 뒤에 추가:
| 'kracing';
```

### Step 2: MENU_LIST에 추가

`lib/config.ts` - Arcade 카테고리에 추가:
```typescript
{
  name: {
    kor: 'K-레이싱',
    eng: 'K-Racing',
  },
  href: '/kracing',
  category: 'Arcade',
  platform: 'both',
},
```

### Step 3: GAME_ICONS에 추가

`components/common/GameCard.tsx`:
```typescript
// import에 Car 추가
import { ..., Car } from 'lucide-react';

// GAME_ICONS 객체에 추가
'/kracing': Car,
```

### Step 4: VALID_GAME_TYPES에 추가 (두 파일)

`app/api/game-session/route.ts`와 `app/api/scores/route.ts` 모두:
```typescript
// 배열 마지막에 추가
'kracing',
```

### Step 5: game-security config에 추가

`lib/game-security/config.ts` (Task 1에서 이미 추가됨):
```typescript
kracing: { maxScore: 600000, minPlayTimeSeconds: 10, lowerIsBetter: true },
```

### Step 6: Commit

```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat: register kracing game in 6 mandatory files"
```

---

## Task 3: 게임 설정 및 타입 정의

**Files:**
- Create: `app/(canvas-mobile)/kracing/_lib/config.ts`
- Create: `app/(canvas-mobile)/kracing/_lib/types.ts`

### Step 1: config.ts 작성

```typescript
import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'kracing',
  title: 'K-Racing',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'arcade',
  difficulty: 'fixed',
};

// Canvas
export const CANVAS_SIZE = 620;

// Car physics
export const CAR_WIDTH = 12;
export const CAR_HEIGHT = 20;
export const MAX_SPEED = 200;         // px/sec
export const ACCELERATION = 120;      // px/sec²
export const BRAKE_DECELERATION = 300; // px/sec²
export const NATURAL_DECELERATION = 30; // px/sec² (no input)
export const TURN_SPEED = 3.0;         // rad/sec at max speed
export const MIN_TURN_SPEED_RATIO = 0.2; // 최소 속도 비율에서의 회전 비율

// Drift
export const DRIFT_TURN_MULTIPLIER = 1.5;
export const DRIFT_BOOST_MULTIPLIER = 1.1;
export const DRIFT_BOOST_DURATION = 0.5; // sec
export const DRIFT_TRAIL_MAX = 60;       // 타이어 자국 최대 개수

// Track
export const TRACK_WIDTH = 70;         // 트랙 폭
export const TRACK_CENTER_X = 310;     // 트랙 중심 X (CANVAS 중앙)
export const TRACK_CENTER_Y = 310;     // 트랙 중심 Y (CANVAS 중앙)
export const TRACK_RADIUS_X = 220;     // 타원 X 반지름
export const TRACK_RADIUS_Y = 170;     // 타원 Y 반지름
export const TRACK_SEGMENTS = 120;     // 트랙 중심선 세그먼트 수

// Wall collision
export const WALL_SPEED_REDUCTION = 0.3; // 충돌 시 속도의 30%로 감소
export const WALL_PUSH_DISTANCE = 3;     // 벽에서 밀어내는 거리

// Game
export const TOTAL_LAPS = 3;
export const COUNTDOWN_SECONDS = 3;

// Camera
export const CAMERA_ZOOM = 2.0;       // 카메라 줌 레벨

// Minimap
export const MINIMAP_SIZE = 100;
export const MINIMAP_MARGIN = 10;

// Colors
export const COLORS = {
  background: '#1a1a2e',
  track: '#3a3a4a',
  trackBorder: '#ffffff',
  startLine: '#ffffff',
  curb: '#cc3333',
  curbWhite: '#ffffff',
  grass: '#2a5a2a',
  car: '#e74c3c',
  carWindshield: '#7ec8e3',
  carTire: '#222222',
  driftTrail: 'rgba(40, 40, 40, 0.4)',
  speedGauge: '#00ff99',
  speedGaugeBg: 'rgba(255, 255, 255, 0.15)',
  hudText: '#ffffff',
  minimap: 'rgba(0, 0, 0, 0.5)',
  minimapTrack: 'rgba(255, 255, 255, 0.4)',
  minimapCar: '#ff4444',
  countdown: '#ffffff',
};
```

### Step 2: types.ts 작성

```typescript
export type TCarState = {
  x: number;
  y: number;
  angle: number;       // 차량 진행 방향 (라디안)
  speed: number;       // 현재 속도 (px/sec)
  isDrifting: boolean;
  driftBoostTimer: number; // 드리프트 부스트 잔여 시간
};

export type TDriftTrail = {
  x: number;
  y: number;
  alpha: number;       // 투명도 (시간이 지나면 감소)
};

export type TTrackPoint = {
  x: number;
  y: number;
};

export type TGameState =
  | 'start'
  | 'loading'
  | 'countdown'
  | 'racing'
  | 'paused'
  | 'finished';

export type TInput = {
  left: boolean;
  right: boolean;
  brake: boolean;
};

export type TLapData = {
  time: number; // ms
};
```

### Step 3: Commit

```bash
git add app/(canvas-mobile)/kracing/_lib/config.ts app/(canvas-mobile)/kracing/_lib/types.ts
git commit -m "feat: add kracing config and type definitions"
```

---

## Task 4: 트랙 생성 및 충돌 유틸리티

**Files:**
- Create: `app/(canvas-mobile)/kracing/_lib/track.ts`

### Step 1: 트랙 유틸리티 작성

트랙 중심선 생성, 충돌 감지, 랩 카운트 감지를 포함하는 유틸리티.

```typescript
import {
  TRACK_CENTER_X,
  TRACK_CENTER_Y,
  TRACK_RADIUS_X,
  TRACK_RADIUS_Y,
  TRACK_SEGMENTS,
  TRACK_WIDTH,
  WALL_PUSH_DISTANCE,
} from './config';
import { TTrackPoint } from './types';

/** 타원형 트랙 중심선 생성 (시계 방향) */
export function generateTrackCenterline(): TTrackPoint[] {
  const points: TTrackPoint[] = [];
  for (let i = 0; i < TRACK_SEGMENTS; i++) {
    // 시계 방향: 시작점(하단 중앙)에서 시계 방향으로 돌도록
    // angle = 0이 하단 중앙 → Math.PI/2를 시작으로
    const t = (i / TRACK_SEGMENTS) * Math.PI * 2;
    const angle = Math.PI / 2 + t; // 하단 중앙에서 시작, 시계 방향
    points.push({
      x: TRACK_CENTER_X + TRACK_RADIUS_X * Math.cos(angle),
      y: TRACK_CENTER_Y - TRACK_RADIUS_Y * Math.sin(angle),
    });
  }
  return points;
}

/** 주어진 위치에서 가장 가까운 트랙 중심선 점의 인덱스를 반환 */
export function findClosestSegment(
  x: number,
  y: number,
  centerline: TTrackPoint[],
): number {
  let minDist = Infinity;
  let closestIdx = 0;
  for (let i = 0; i < centerline.length; i++) {
    const dx = x - centerline[i].x;
    const dy = y - centerline[i].y;
    const dist = dx * dx + dy * dy; // 제곱근 생략 (비교 용도)
    if (dist < minDist) {
      minDist = dist;
      closestIdx = i;
    }
  }
  return closestIdx;
}

/** 차량 위치에서 트랙 중심선까지의 거리 */
export function distanceToCenter(
  x: number,
  y: number,
  centerline: TTrackPoint[],
  segmentIdx: number,
): number {
  const p = centerline[segmentIdx];
  const dx = x - p.x;
  const dy = y - p.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 벽 충돌 감지 및 밀어내기. 충돌 시 새 위치 반환, 아니면 null */
export function checkWallCollision(
  x: number,
  y: number,
  centerline: TTrackPoint[],
): { x: number; y: number; collided: boolean } {
  const segIdx = findClosestSegment(x, y, centerline);
  const center = centerline[segIdx];
  const dist = distanceToCenter(x, y, centerline, segIdx);
  const halfWidth = TRACK_WIDTH / 2;

  if (dist > halfWidth) {
    // 벽 밖 → 트랙 안으로 밀어냄
    const dx = x - center.x;
    const dy = y - center.y;
    const pushDist = halfWidth - WALL_PUSH_DISTANCE;
    const newX = center.x + (dx / dist) * pushDist;
    const newY = center.y + (dy / dist) * pushDist;
    return { x: newX, y: newY, collided: true };
  }

  return { x, y, collided: false };
}

/** 시작/결승선 통과 감지. segmentIdx가 0 근처를 통과했는지 확인 */
export function checkLapCross(
  prevSegIdx: number,
  currSegIdx: number,
  totalSegments: number,
): boolean {
  // 세그먼트 0을 통과했는지 감지 (시계 방향)
  // 이전 인덱스가 마지막 쿼터에 있고, 현재 인덱스가 첫 쿼터에 있으면 통과
  const threshold = Math.floor(totalSegments / 4);
  return (
    prevSegIdx > totalSegments - threshold &&
    currSegIdx < threshold
  );
}

/** 트랙 외벽/내벽 점 생성 (렌더링용) */
export function generateTrackWalls(centerline: TTrackPoint[]): {
  outer: TTrackPoint[];
  inner: TTrackPoint[];
} {
  const outer: TTrackPoint[] = [];
  const inner: TTrackPoint[] = [];
  const halfWidth = TRACK_WIDTH / 2;

  for (let i = 0; i < centerline.length; i++) {
    const curr = centerline[i];
    const next = centerline[(i + 1) % centerline.length];

    // 진행 방향의 법선 벡터
    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len; // 법선 (왼쪽)
    const ny = dx / len;

    outer.push({
      x: curr.x + nx * halfWidth,
      y: curr.y + ny * halfWidth,
    });
    inner.push({
      x: curr.x - nx * halfWidth,
      y: curr.y - ny * halfWidth,
    });
  }

  return { outer, inner };
}

/** 시작선 위치와 방향 반환 */
export function getStartLinePosition(centerline: TTrackPoint[]): {
  x: number;
  y: number;
  angle: number;
} {
  const start = centerline[0];
  const next = centerline[1];
  const angle = Math.atan2(next.y - start.y, next.x - start.x);
  return { x: start.x, y: start.y, angle };
}
```

### Step 2: Commit

```bash
git add app/(canvas-mobile)/kracing/_lib/track.ts
git commit -m "feat: add track generation and collision utilities"
```

---

## Task 5: 메인 게임 로직 (game.ts)

**Files:**
- Create: `app/(canvas-mobile)/kracing/_lib/game.ts`

### Step 1: game.ts 작성

이 파일이 K-Racing의 핵심이다. Dodge 게임의 패턴을 따르면서 레이싱 메커닉을 구현한다.

**주요 구현 사항:**
- 자동 전진 + 좌우 회전 + 브레이크 조작
- 드리프트 (브레이크+회전 동시 입력)
- 벽 충돌 (감속 + 바운스)
- 3초 카운트다운
- 랩 카운트 (3바퀴)
- 차량 중심 카메라 (ctx.translate 기반)
- 미니맵
- HUD (시간, 랩, 속도 게이지)
- 결과 화면 (총 시간 + 랩별 타임)

**핵심 구조:**
```typescript
import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import * as CFG from './config';
import { TCarState, TDriftTrail, TGameState, TInput, TLapData } from './types';
import {
  generateTrackCenterline,
  generateTrackWalls,
  getStartLinePosition,
  findClosestSegment,
  checkWallCollision,
  checkLapCross,
} from './track';

export type TKRacingCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupKRacing = (
  canvas: HTMLCanvasElement,
  callbacks?: TKRacingCallbacks,
): (() => void) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  // Canvas setup
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(CFG.CANVAS_SIZE * dpr);
  canvas.height = Math.round(CFG.CANVAS_SIZE * dpr);
  canvas.style.width = `${CFG.CANVAS_SIZE}px`;
  canvas.style.height = `${CFG.CANVAS_SIZE}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Track data
  const centerline = generateTrackCenterline();
  const { outer: outerWall, inner: innerWall } = generateTrackWalls(centerline);
  const startPos = getStartLinePosition(centerline);

  // Game state
  let state: TGameState = 'start';
  let totalTime = 0;        // ms
  let countdownTimer = 0;
  let lastTime = 0;

  // Car state
  let car: TCarState = {
    x: startPos.x,
    y: startPos.y,
    angle: startPos.angle,
    speed: 0,
    isDrifting: false,
    driftBoostTimer: 0,
  };

  // Input state
  const input: TInput = { left: false, right: false, brake: false };

  // Lap tracking
  let currentLap = 0;
  let prevSegIdx = 0;
  let lapTimes: TLapData[] = [];
  let lapStartTime = 0;

  // Drift trails
  let driftTrails: TDriftTrail[] = [];

  // Touch state
  let touchLeft = false;
  let touchRight = false;

  // Game Over HUD
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      if (callbacks?.onScoreSave) {
        return callbacks.onScoreSave(finalScore);
      }
      return { saved: false };
    },
    onRestart: () => resetGame(),
  };
  const gameOverHud = createGameOverHud(canvas, ctx, 'kracing', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  // --- Reset ---
  const resetGame = () => {
    state = 'start';
    totalTime = 0;
    countdownTimer = 0;
    lastTime = 0;
    currentLap = 0;
    prevSegIdx = 0;
    lapTimes = [];
    lapStartTime = 0;
    driftTrails = [];
    gameOverHud.reset();

    car = {
      x: startPos.x,
      y: startPos.y,
      angle: startPos.angle,
      speed: 0,
      isDrifting: false,
      driftBoostTimer: 0,
    };

    input.left = false;
    input.right = false;
    input.brake = false;
    touchLeft = false;
    touchRight = false;
  };

  // --- Start game ---
  const startGame = async () => {
    if (state !== 'start') return;
    state = 'loading';
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    state = 'countdown';
    countdownTimer = CFG.COUNTDOWN_SECONDS;
    lastTime = 0;
  };

  // --- Update ---
  const updateCountdown = (dt: number) => {
    countdownTimer -= dt;
    if (countdownTimer <= 0) {
      state = 'racing';
      totalTime = 0;
      lapStartTime = 0;
      currentLap = 1;
    }
  };

  const updateCar = (dt: number) => {
    // Input from keyboard or touch
    const left = input.left || touchLeft;
    const right = input.right || touchRight;
    const brake = input.brake || (touchLeft && touchRight);

    // Drift detection
    const wasDrifting = car.isDrifting;
    car.isDrifting = brake && (left || right) && car.speed > CFG.MAX_SPEED * 0.3;

    // Drift boost on release
    if (wasDrifting && !car.isDrifting) {
      car.driftBoostTimer = CFG.DRIFT_BOOST_DURATION;
    }

    // Speed
    if (brake && !car.isDrifting) {
      car.speed -= CFG.BRAKE_DECELERATION * dt;
    } else {
      let maxSpd = CFG.MAX_SPEED;
      if (car.driftBoostTimer > 0) {
        maxSpd *= CFG.DRIFT_BOOST_MULTIPLIER;
        car.driftBoostTimer -= dt;
      }
      car.speed += CFG.ACCELERATION * dt;
      if (car.speed > maxSpd) car.speed = maxSpd;
    }

    // Natural deceleration
    if (!brake) {
      car.speed -= CFG.NATURAL_DECELERATION * dt;
    }
    if (car.speed < 0) car.speed = 0;

    // Turn
    const speedRatio = car.speed / CFG.MAX_SPEED;
    const turnAmount = Math.max(speedRatio, CFG.MIN_TURN_SPEED_RATIO);
    let turnRate = CFG.TURN_SPEED * turnAmount * dt;
    if (car.isDrifting) turnRate *= CFG.DRIFT_TURN_MULTIPLIER;

    if (left) car.angle -= turnRate;
    if (right) car.angle += turnRate;

    // Move
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;

    // Wall collision
    const collision = checkWallCollision(car.x, car.y, centerline);
    if (collision.collided) {
      car.x = collision.x;
      car.y = collision.y;
      car.speed *= CFG.WALL_SPEED_REDUCTION;
    }

    // Drift trail
    if (car.isDrifting && car.speed > 10) {
      const cos = Math.cos(car.angle);
      const sin = Math.sin(car.angle);
      // 뒷바퀴 두 개의 위치에 자국 추가
      const backOffset = CAR_HEIGHT * 0.35;
      const sideOffset = CAR_WIDTH * 0.4;
      driftTrails.push(
        { x: car.x - cos * backOffset - sin * sideOffset, y: car.y - sin * backOffset + cos * sideOffset, alpha: 1 },
        { x: car.x - cos * backOffset + sin * sideOffset, y: car.y - sin * backOffset - cos * sideOffset, alpha: 1 },
      );
      if (driftTrails.length > CFG.DRIFT_TRAIL_MAX) {
        driftTrails = driftTrails.slice(driftTrails.length - CFG.DRIFT_TRAIL_MAX);
      }
    }

    // Fade trails
    for (const trail of driftTrails) {
      trail.alpha -= dt * 1.5;
    }
    driftTrails = driftTrails.filter(t => t.alpha > 0);

    // Lap detection
    const currSegIdx = findClosestSegment(car.x, car.y, centerline);
    if (checkLapCross(prevSegIdx, currSegIdx, CFG.TRACK_SEGMENTS)) {
      if (currentLap >= 1) {
        lapTimes.push({ time: totalTime - lapStartTime });
        lapStartTime = totalTime;
      }
      if (lapTimes.length >= CFG.TOTAL_LAPS) {
        // 3바퀴 완주!
        state = 'finished';
      } else {
        currentLap = lapTimes.length + 1;
      }
    }
    prevSegIdx = currSegIdx;
  };

  const { CAR_WIDTH, CAR_HEIGHT } = CFG;

  const update = (timestamp: number) => {
    if (state === 'paused' || state === 'start' || state === 'loading' || state === 'finished') return;

    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    dt = Math.min(dt, 0.05);

    if (state === 'countdown') {
      updateCountdown(dt);
      return;
    }

    if (state === 'racing') {
      totalTime += dt * 1000; // ms
      updateCar(dt);
    }
  };

  // --- Render ---

  const renderTrack = () => {
    // 잔디 배경
    ctx.fillStyle = CFG.COLORS.grass;
    ctx.fillRect(
      CFG.TRACK_CENTER_X - CFG.TRACK_RADIUS_X - CFG.TRACK_WIDTH,
      CFG.TRACK_CENTER_Y - CFG.TRACK_RADIUS_Y - CFG.TRACK_WIDTH,
      (CFG.TRACK_RADIUS_X + CFG.TRACK_WIDTH) * 2,
      (CFG.TRACK_RADIUS_Y + CFG.TRACK_WIDTH) * 2,
    );

    // 트랙 (아스팔트)
    ctx.beginPath();
    for (let i = 0; i < outerWall.length; i++) {
      const p = outerWall[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    // 내벽 (반시계 방향으로 구멍 뚫기)
    ctx.moveTo(innerWall[0].x, innerWall[0].y);
    for (let i = innerWall.length - 1; i >= 0; i--) {
      ctx.lineTo(innerWall[i].x, innerWall[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = CFG.COLORS.track;
    ctx.fill();

    // 트랙 경계선 (외벽)
    ctx.beginPath();
    for (let i = 0; i < outerWall.length; i++) {
      const p = outerWall[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.strokeStyle = CFG.COLORS.trackBorder;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 트랙 경계선 (내벽)
    ctx.beginPath();
    for (let i = 0; i < innerWall.length; i++) {
      const p = innerWall[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.strokeStyle = CFG.COLORS.trackBorder;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 시작/결승선 (체크무늬)
    renderStartLine();
  };

  const renderStartLine = () => {
    const p = centerline[0];
    const next = centerline[1];
    const dx = next.x - p.x;
    const dy = next.y - p.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len;
    const ny = dx / len;
    const halfW = CFG.TRACK_WIDTH / 2;
    const checkerSize = 8;
    const checkerCount = Math.floor(CFG.TRACK_WIDTH / checkerSize);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(ny, nx));

    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < checkerCount; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(
          r * checkerSize - checkerSize,
          c * checkerSize - halfW,
          checkerSize,
          checkerSize,
        );
      }
    }
    ctx.restore();
  };

  const renderDriftTrails = () => {
    for (const trail of driftTrails) {
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(40, 40, 40, ${trail.alpha * 0.4})`;
      ctx.fill();
    }
  };

  const renderCar = () => {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    const w = CAR_WIDTH;
    const h = CAR_HEIGHT;

    // 타이어
    ctx.fillStyle = CFG.COLORS.carTire;
    const tireW = 3;
    const tireH = 5;
    // 앞바퀴
    ctx.fillRect(-w / 2 - tireW / 2, -h * 0.3, tireW, tireH);
    ctx.fillRect(w / 2 - tireW / 2, -h * 0.3, tireW, tireH);
    // 뒷바퀴
    ctx.fillRect(-w / 2 - tireW / 2, h * 0.2, tireW, tireH);
    ctx.fillRect(w / 2 - tireW / 2, h * 0.2, tireW, tireH);

    // 몸체
    ctx.fillStyle = CFG.COLORS.car;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    // 윈드실드
    ctx.fillStyle = CFG.COLORS.carWindshield;
    ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 5);

    ctx.restore();
  };

  const renderMinimap = () => {
    const mx = CFG.MINIMAP_MARGIN;
    const my = CFG.MINIMAP_MARGIN;
    const ms = CFG.MINIMAP_SIZE;

    // 배경
    ctx.fillStyle = CFG.COLORS.minimap;
    ctx.fillRect(mx, my, ms, ms);

    // 트랙 축소
    const scaleX = ms / (CFG.TRACK_RADIUS_X * 2 + CFG.TRACK_WIDTH * 2);
    const scaleY = ms / (CFG.TRACK_RADIUS_Y * 2 + CFG.TRACK_WIDTH * 2);
    const scale = Math.min(scaleX, scaleY) * 0.8;
    const offsetX = mx + ms / 2;
    const offsetY = my + ms / 2;

    // 트랙 중심선
    ctx.beginPath();
    for (let i = 0; i < centerline.length; i++) {
      const p = centerline[i];
      const px = offsetX + (p.x - CFG.TRACK_CENTER_X) * scale;
      const py = offsetY + (p.y - CFG.TRACK_CENTER_Y) * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = CFG.COLORS.minimapTrack;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 차량 위치
    const carMx = offsetX + (car.x - CFG.TRACK_CENTER_X) * scale;
    const carMy = offsetY + (car.y - CFG.TRACK_CENTER_Y) * scale;
    ctx.beginPath();
    ctx.arc(carMx, carMy, 3, 0, Math.PI * 2);
    ctx.fillStyle = CFG.COLORS.minimapCar;
    ctx.fill();
  };

  const renderHud = () => {
    // 시간
    const timeStr = formatTime(totalTime);
    ctx.fillStyle = CFG.COLORS.hudText;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(timeStr, CFG.CANVAS_SIZE / 2, 12);

    // LAP
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`LAP ${Math.min(currentLap, CFG.TOTAL_LAPS)}/${CFG.TOTAL_LAPS}`, CFG.CANVAS_SIZE - 12, 12);

    // 속도 게이지
    const gaugeW = 100;
    const gaugeH = 8;
    const gaugeX = CFG.CANVAS_SIZE - gaugeW - 12;
    const gaugeY = CFG.CANVAS_SIZE - gaugeH - 12;
    const speedRatio = car.speed / CFG.MAX_SPEED;

    ctx.fillStyle = CFG.COLORS.speedGaugeBg;
    ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);
    ctx.fillStyle = car.isDrifting ? '#ff6600' : CFG.COLORS.speedGauge;
    ctx.fillRect(gaugeX, gaugeY, gaugeW * Math.min(speedRatio, 1), gaugeH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);
  };

  const renderCountdown = () => {
    const num = Math.ceil(countdownTimer);
    const text = num > 0 ? String(num) : 'GO!';

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CFG.CANVAS_SIZE, CFG.CANVAS_SIZE);

    ctx.fillStyle = CFG.COLORS.countdown;
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, CFG.CANVAS_SIZE / 2, CFG.CANVAS_SIZE / 2);
  };

  const renderFinish = () => {
    // gameOverHud를 사용하되, 커스텀 정보도 표시
    // 먼저 랩 타임 정보를 배경에 그림
    gameOverHud.render(Math.floor(totalTime));
  };

  const render = (timestamp: number) => {
    ctx.clearRect(0, 0, CFG.CANVAS_SIZE, CFG.CANVAS_SIZE);
    ctx.fillStyle = CFG.COLORS.background;
    ctx.fillRect(0, 0, CFG.CANVAS_SIZE, CFG.CANVAS_SIZE);

    if (state === 'start') {
      // 트랙 미리보기 + start hud
      ctx.save();
      const previewScale = CFG.CANVAS_SIZE / (Math.max(CFG.TRACK_RADIUS_X, CFG.TRACK_RADIUS_Y) * 2 + CFG.TRACK_WIDTH * 3);
      ctx.translate(CFG.CANVAS_SIZE / 2, CFG.CANVAS_SIZE / 2);
      ctx.scale(previewScale, previewScale);
      ctx.translate(-CFG.TRACK_CENTER_X, -CFG.TRACK_CENTER_Y);
      renderTrack();
      renderCar();
      ctx.restore();
      gameStartHud(canvas, ctx);
      return;
    }

    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
      return;
    }

    // 카메라: 차량 중심
    ctx.save();
    const camX = CFG.CANVAS_SIZE / 2 - car.x * CFG.CAMERA_ZOOM;
    const camY = CFG.CANVAS_SIZE / 2 - car.y * CFG.CAMERA_ZOOM;
    ctx.translate(CFG.CANVAS_SIZE / 2, CFG.CANVAS_SIZE / 2);
    ctx.scale(CFG.CAMERA_ZOOM, CFG.CAMERA_ZOOM);
    ctx.translate(-car.x, -car.y);

    renderTrack();
    renderDriftTrails();
    renderCar();
    ctx.restore();

    // HUD (화면 좌표)
    if (state === 'countdown') {
      renderMinimap();
      renderCountdown();
      return;
    }

    if (state === 'paused') {
      renderMinimap();
      renderHud();
      gamePauseHud(canvas, ctx);
      return;
    }

    if (state === 'finished') {
      renderMinimap();
      renderHud();
      renderFinish();
      return;
    }

    // racing
    renderMinimap();
    renderHud();
  };

  // --- Keyboard ---

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (e.code === 'KeyS') {
      if (state === 'paused') {
        state = 'racing';
        lastTime = 0;
        return;
      }
      if (state === 'start') {
        startGame();
        return;
      }
    }

    if (e.code === 'KeyP' && state === 'racing') {
      state = 'paused';
      return;
    }

    if (state === 'finished') {
      const handled = gameOverHud.onKeyDown(e, Math.floor(totalTime));
      if (handled) return;
    }

    if (e.code === 'KeyR' && state !== 'finished' && state !== 'paused') {
      resetGame();
      return;
    }

    if (state === 'paused') return;

    if (e.code === 'ArrowLeft') { input.left = true; e.preventDefault(); }
    if (e.code === 'ArrowRight') { input.right = true; e.preventDefault(); }
    if (e.code === 'Space') { input.brake = true; e.preventDefault(); }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ArrowLeft') { input.left = false; e.preventDefault(); }
    if (e.code === 'ArrowRight') { input.right = false; e.preventDefault(); }
    if (e.code === 'Space') { input.brake = false; e.preventDefault(); }
  };

  // --- Touch ---

  const getTouchPos = (touch: Touch) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CFG.CANVAS_SIZE / rect.width;
    const scaleY = CFG.CANVAS_SIZE / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  };

  const updateTouchInput = (e: TouchEvent) => {
    touchLeft = false;
    touchRight = false;
    const halfX = CFG.CANVAS_SIZE / 2;

    for (let i = 0; i < e.touches.length; i++) {
      const pos = getTouchPos(e.touches[i]);
      if (pos.x < halfX) touchLeft = true;
      else touchRight = true;
    }

    // 양쪽 동시 터치 = 브레이크
    input.brake = touchLeft && touchRight;
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const pos = getTouchPos(e.touches[0]);

    if (state === 'start') { startGame(); return; }
    if (state === 'paused') { state = 'racing'; lastTime = 0; return; }
    if (state === 'finished') {
      const handled = gameOverHud.onTouchStart(pos.x, pos.y, Math.floor(totalTime));
      if (handled) return;
    }

    updateTouchInput(e);
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (state === 'racing') updateTouchInput(e);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    updateTouchInput(e);
  };

  // --- Game loop ---

  let raf = 0;
  const gameLoop = (timestamp: number) => {
    update(timestamp);
    render(timestamp);
    raf = requestAnimationFrame(gameLoop);
  };
  raf = requestAnimationFrame(gameLoop);

  // --- Event listeners ---

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);

  // --- Cleanup ---
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
  };
};

// --- Helpers ---

function formatTime(ms: number): string {
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const millis = Math.floor(ms % 1000);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}
```

**참고:** 위 코드는 핵심 구조를 보여주는 것이며, 실제 구현 시 Dodge 게임의 패턴을 정확히 따라야 한다.

### Step 2: Commit

```bash
git add app/(canvas-mobile)/kracing/_lib/game.ts
git commit -m "feat: implement kracing main game logic"
```

---

## Task 6: React 컴포넌트 (Component + Layout + Page)

**Files:**
- Create: `app/(canvas-mobile)/kracing/_components/KRacing.tsx`
- Create: `app/(canvas-mobile)/kracing/layout.tsx`
- Create: `app/(canvas-mobile)/kracing/page.tsx`

### Step 1: KRacing.tsx (Dodge.tsx 패턴 복사)

```typescript
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupKRacing, TKRacingCallbacks } from '../_lib/game';
import { CANVAS_SIZE } from '../_lib/config';
import { useCreateScore, useGameSession } from '@/service/scores';

function KRacing() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('kracing');
  const { mutateAsync: createSession } = useGameSession('kracing');
  const isLoggedIn = !!session;

  const updateScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const container = wrapper.parentElement;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const scale = Math.min(containerWidth / CANVAS_SIZE, 1);
    wrapper.style.transform = `scale(${scale})`;
    wrapper.style.transformOrigin = 'top center';
    wrapper.style.height = `${CANVAS_SIZE * scale}px`;
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TKRacingCallbacks = {
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
          gameType: 'kracing',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupKRacing(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full flex justify-center">
      <div ref={wrapperRef} style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
        <canvas
          ref={canvasRef}
          className="border border-white/20 rounded-2xl shadow-lg touch-none"
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
        />
      </div>
    </div>
  );
}

export default KRacing;
```

### Step 2: layout.tsx

```typescript
import KameHeader from '@/components/common/KameHeader';
import JsonLd from '@/components/common/JsonLd';
import { getGameMetadata, getGameJsonLd } from '@/lib/seo';

export const metadata = getGameMetadata('/kracing');
const jsonLd = getGameJsonLd('/kracing');

function KRacingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 xl:px-6 py-4 flex flex-col gap-4 xl:gap-10 items-center">
      {jsonLd && <JsonLd data={jsonLd} />}
      <KameHeader title="K-Racing" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default KRacingLayout;
```

### Step 3: page.tsx (Dodge page.tsx 패턴 + 시간 포맷팅)

```typescript
'use client';

import { Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import UserProfile from '@/components/auth/UserProfile';
import { useGetScores } from '@/service/scores';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import KRacing from './_components/KRacing';

const controls = [
  { key: '← →', action: '좌/우 회전' },
  { key: 'Space', action: '브레이크' },
  { key: 'Space + ←→', action: '드리프트' },
  { key: 'S / Tap', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
];

function formatTimeScore(ms: number): string {
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const millis = Math.floor(ms % 1000);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function KRacingPage() {
  const { data: session, status } = useSession();
  const { data: scores = [], isLoading } = useGetScores('kracing');

  return (
    <section className="w-full h-full flex flex-col xl:flex-row gap-4 xl:gap-6 items-center xl:items-start justify-center">
      {/* 모바일: 햄버거 메뉴 */}
      <div className="xl:hidden w-full flex justify-end px-2">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 rounded-lg border border-arcade-border bg-arcade-surface text-arcade-text">
              <Menu size={20} />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-arcade-bg border-arcade-border overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-arcade-text">Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-6 p-4">
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">Player</h3>
                {status === 'loading' ? (
                  <div className="h-9 bg-arcade-border rounded animate-pulse" />
                ) : session?.user ? (
                  <UserProfile user={session.user} />
                ) : (
                  <GoogleLoginButton />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">Controls</h3>
                <ControlInfoTable controls={controls} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">Ranking</h3>
                <RankBoard data={scores} isLoading={isLoading} showCountry formatScore={formatTimeScore} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* 데스크탑: 조작법 */}
      <aside className="hidden xl:block shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>

      {/* 게임 캔버스 */}
      <div className="w-full xl:flex-1 max-w-[620px]">
        <KRacing />
      </div>

      {/* 데스크탑: 랭킹 */}
      <aside className="hidden xl:block shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry formatScore={formatTimeScore} />
      </aside>
    </section>
  );
}

export default KRacingPage;
```

### Step 4: Commit

```bash
git add app/(canvas-mobile)/kracing/
git commit -m "feat: add kracing React components, layout, and page"
```

---

## Task 7: 통합 테스트 및 디버깅

### Step 1: 개발 서버 실행

```bash
yarn dev
```

### Step 2: 기능 검증 체크리스트

- [ ] `/kracing` 경로 접속 가능
- [ ] 시작 화면에서 S키 / 터치로 게임 시작
- [ ] 3초 카운트다운 표시 (3, 2, 1, GO!)
- [ ] 차량 자동 전진
- [ ] ←→ 키로 좌우 회전
- [ ] Space로 브레이크
- [ ] Space + 회전으로 드리프트 (타이어 자국 이펙트)
- [ ] 드리프트 후 속도 부스트
- [ ] 벽 충돌 시 감속 + 밀려남
- [ ] 카메라가 차량 중심
- [ ] 미니맵 표시
- [ ] HUD: 시간, LAP, 속도 게이지
- [ ] 3바퀴 완주 후 결과 화면
- [ ] SAVE/SKIP 작동
- [ ] P키로 일시정지
- [ ] R키로 재시작
- [ ] 모바일: 좌/우 터치로 회전
- [ ] 모바일: 양쪽 동시 터치로 브레이크
- [ ] 모바일: 햄버거 메뉴 (로그인, 조작법, 랭킹)
- [ ] 모바일: 캔버스 반응형 스케일링
- [ ] 랭킹 보드에 시간 형식 표시 (00:45.320)
- [ ] 메인 페이지 게임 목록에 K-Racing 표시

### Step 3: 발견된 버그 수정 후 Commit

```bash
git add -A
git commit -m "fix: resolve kracing integration issues"
```

---

## Task 순서 요약

| Task | 설명 | 의존성 |
|------|------|--------|
| 1 | 점수 시스템 lowerIsBetter 지원 | 없음 |
| 2 | 게임 등록 (6개 필수 파일) | Task 1 |
| 3 | config.ts + types.ts | 없음 |
| 4 | track.ts (트랙 유틸리티) | Task 3 |
| 5 | game.ts (메인 게임 로직) | Task 3, 4 |
| 6 | React 컴포넌트 + 페이지 | Task 2, 5 |
| 7 | 통합 테스트 및 디버깅 | Task 1-6 |

Task 1, 3은 독립적으로 병렬 실행 가능.
Task 4는 Task 3에 의존.
Task 5는 Task 3, 4에 의존.
Task 6은 Task 2, 5에 의존.
Task 7은 모든 Task에 의존.
