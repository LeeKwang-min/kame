# Super Hexagon Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Super Hexagon 클론 게임을 canvas-mobile 라우트 그룹에 추가. 중앙 육각형 주위를 도는 플레이어가 좁아지는 벽을 피하며 생존하는 액션 게임. 데스크탑은 가로 화면, 모바일은 CSS rotate(90deg)로 가로모드 경험 제공.

**Architecture:** Canvas 2D 엔진, 극좌표 기반 게임 로직, 프리셋 벽 패턴 10~15개, progressive 난이도. 캔버스 논리 크기 800x500(가로형). 모바일에서 CSS `transform: rotate(90deg) scale(...)` 로 세로 화면에서 가로 게임 경험. 터치 좌표는 회전 변환 처리.

**Tech Stack:** Next.js App Router, Canvas 2D API, TypeScript, Tailwind CSS, next-auth (세션), ShadCN Sheet (모바일 메뉴)

---

### Task 1: 게임 타입 등록 (6개 파일 수정)

**Files:**
- Modify: `@types/scores.ts` — TGameType에 'superhexagon' 추가
- Modify: `lib/config.ts` — MENU_LIST에 메뉴 항목 추가
- Modify: `components/common/GameCard.tsx` — GAME_ICONS에 아이콘 추가
- Modify: `app/api/game-session/route.ts` — VALID_GAME_TYPES에 추가
- Modify: `app/api/scores/route.ts` — VALID_GAME_TYPES에 추가
- Modify: `lib/game-security/config.ts` — 보안 설정 추가

**Step 1: TGameType에 추가**

`@types/scores.ts`에서 TGameType 유니온의 마지막 항목 뒤에 추가:
```typescript
  | 'superhexagon';
```

**Step 2: MENU_LIST에 추가**

`lib/config.ts`의 MENU_LIST 배열에서 Action 카테고리 게임들 뒤에 추가:
```typescript
{
  name: {
    kor: '슈퍼 헥사곤',
    eng: 'Super Hexagon',
  },
  href: '/superhexagon',
  category: 'Action',
  platform: 'both',
},
```

**Step 3: GameCard 아이콘 추가**

`components/common/GameCard.tsx`의 GAME_ICONS 객체에 추가. Hexagon 아이콘을 import하고:
```typescript
'/superhexagon': Hexagon,
```

**Step 4: game-session API에 추가**

`app/api/game-session/route.ts`의 VALID_GAME_TYPES 배열에 `'superhexagon'` 추가.

**Step 5: scores API에 추가**

`app/api/scores/route.ts`의 VALID_GAME_TYPES 배열에 `'superhexagon'` 추가.

**Step 6: 보안 설정 추가**

`lib/game-security/config.ts`에 추가:
```typescript
superhexagon: { maxScore: 100000, minPlayTimeSeconds: 3 },
```

**Step 7: Commit**
```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat(superhexagon): register game type in 6 config files"
```

---

### Task 2: config.ts + types.ts + patterns.ts 작성

**Files:**
- Create: `app/(canvas-mobile)/superhexagon/_lib/config.ts`
- Create: `app/(canvas-mobile)/superhexagon/_lib/types.ts`
- Create: `app/(canvas-mobile)/superhexagon/_lib/patterns.ts`

**Step 1: config.ts 작성**

```typescript
import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'superhexagon',
  title: 'Super Hexagon',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'landscape',
  category: 'action',
  difficulty: 'progressive',
};

// Canvas (가로형)
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;
export const CENTER_X = CANVAS_WIDTH / 2;
export const CENTER_Y = CANVAS_HEIGHT / 2;

// Hexagon
export const HEX_SIDES = 6;
export const HEX_RADIUS = 36;

// Player
export const PLAYER_DISTANCE = 52;
export const PLAYER_SIZE = 10;
export const PLAYER_SPEED = 4.8; // rad/s

// Walls
export const WALL_THICKNESS = 40;
export const WALL_SPAWN_DISTANCE = 420;
export const WALL_SPEED_INITIAL = 150;
export const WALL_SPEED_MAX = 350;

// Map rotation
export const MAP_ROTATION_SPEED_INITIAL = 0.5;
export const MAP_ROTATION_SPEED_MAX = 1.5;

// Difficulty phases
export const PHASES = [
  { time: 0,  wallSpeed: 150, rotSpeed: 0.5,  palette: 'cyan' },
  { time: 10, wallSpeed: 200, rotSpeed: 0.7,  palette: 'magenta' },
  { time: 20, wallSpeed: 250, rotSpeed: 0.9,  palette: 'yellow' },
  { time: 30, wallSpeed: 300, rotSpeed: 1.1,  palette: 'green' },
  { time: 45, wallSpeed: 350, rotSpeed: 1.3,  palette: 'red' },
] as const;

// Color palettes (네온 스타일)
export const PALETTES: Record<string, { bg1: string; bg2: string; wall1: string; wall2: string; hex: string; player: string }> = {
  cyan:    { bg1: '#0a1628', bg2: '#0d2040', wall1: '#00e5ff', wall2: '#0097a7', hex: '#00bcd4', player: '#ffffff' },
  magenta: { bg1: '#1a0a28', bg2: '#2d0d40', wall1: '#ff4081', wall2: '#c51162', hex: '#e91e63', player: '#ffffff' },
  yellow:  { bg1: '#1a1a0a', bg2: '#2d2d0d', wall1: '#ffea00', wall2: '#ffc400', hex: '#ffd600', player: '#ffffff' },
  green:   { bg1: '#0a1a0a', bg2: '#0d2d0d', wall1: '#69f0ae', wall2: '#00c853', hex: '#00e676', player: '#ffffff' },
  red:     { bg1: '#1a0a0a', bg2: '#2d0d0d', wall1: '#ff5252', wall2: '#d50000', hex: '#ff1744', player: '#ffffff' },
};

// Score
export const SCORE_PER_SEC = 100;
```

**Step 2: types.ts 작성**

```typescript
export type TWall = {
  side: number;       // 0~5 (hexagon face)
  distance: number;   // distance from center (decreases over time)
  thickness: number;  // wall thickness
};

export type TPattern = {
  walls: { side: number; offset: number }[]; // offset = relative distance stagger
};

export type TGameState = 'start' | 'loading' | 'playing' | 'paused' | 'gameover';
```

**Step 3: patterns.ts 작성**

프리셋 벽 패턴 12개. 각 패턴은 어떤 면(side)이 막혀있는지 정의. 열린 면 = gap.

```typescript
import { TPattern } from './types';

// 각 패턴: walls 배열에 포함된 side가 막힌 면, 나머지가 열린 면
// offset: 같은 패턴 내에서 벽들의 거리 차이 (연속 벽 표현)
export const PATTERNS: TPattern[] = [
  // 1. 한 면만 열림 (간단)
  { walls: [{ side: 0, offset: 0 }, { side: 1, offset: 0 }, { side: 2, offset: 0 }, { side: 3, offset: 0 }, { side: 4, offset: 0 }] },
  // 2. 반대편 두 면 열림
  { walls: [{ side: 0, offset: 0 }, { side: 1, offset: 0 }, { side: 3, offset: 0 }, { side: 4, offset: 0 }] },
  // 3. 인접 두 면 열림
  { walls: [{ side: 0, offset: 0 }, { side: 1, offset: 0 }, { side: 2, offset: 0 }, { side: 3, offset: 0 }] },
  // 4. 나선형 (한 면씩 열리면서 회전)
  { walls: [{ side: 1, offset: 0 }, { side: 2, offset: 0 }, { side: 3, offset: 0 }, { side: 4, offset: 0 }, { side: 5, offset: 0 },
            { side: 0, offset: 80 }, { side: 2, offset: 80 }, { side: 3, offset: 80 }, { side: 4, offset: 80 }, { side: 5, offset: 80 },
            { side: 0, offset: 160 }, { side: 1, offset: 160 }, { side: 3, offset: 160 }, { side: 4, offset: 160 }, { side: 5, offset: 160 }] },
  // 5. 반반 (3면 막힘)
  { walls: [{ side: 0, offset: 0 }, { side: 1, offset: 0 }, { side: 2, offset: 0 }] },
  // 6. 교차 (짝수면 막힘)
  { walls: [{ side: 0, offset: 0 }, { side: 2, offset: 0 }, { side: 4, offset: 0 }] },
  // 7. 교차 (홀수면 막힘)
  { walls: [{ side: 1, offset: 0 }, { side: 3, offset: 0 }, { side: 5, offset: 0 }] },
  // 8. 좁은 통로 (1면만 열림, 이중 벽)
  { walls: [{ side: 0, offset: 0 }, { side: 1, offset: 0 }, { side: 2, offset: 0 }, { side: 3, offset: 0 }, { side: 4, offset: 0 },
            { side: 0, offset: 80 }, { side: 1, offset: 80 }, { side: 3, offset: 80 }, { side: 4, offset: 80 }, { side: 5, offset: 80 }] },
  // 9. 전면 교차 더블
  { walls: [{ side: 0, offset: 0 }, { side: 2, offset: 0 }, { side: 4, offset: 0 },
            { side: 1, offset: 80 }, { side: 3, offset: 80 }, { side: 5, offset: 80 }] },
  // 10. 나선형 긴 버전
  { walls: [{ side: 1, offset: 0 }, { side: 2, offset: 0 }, { side: 3, offset: 0 }, { side: 4, offset: 0 }, { side: 5, offset: 0 },
            { side: 0, offset: 60 }, { side: 2, offset: 60 }, { side: 3, offset: 60 }, { side: 4, offset: 60 }, { side: 5, offset: 60 },
            { side: 0, offset: 120 }, { side: 1, offset: 120 }, { side: 3, offset: 120 }, { side: 4, offset: 120 }, { side: 5, offset: 120 },
            { side: 0, offset: 180 }, { side: 1, offset: 180 }, { side: 2, offset: 180 }, { side: 4, offset: 180 }, { side: 5, offset: 180 },
            { side: 0, offset: 240 }, { side: 1, offset: 240 }, { side: 2, offset: 240 }, { side: 3, offset: 240 }, { side: 5, offset: 240 },
            { side: 0, offset: 300 }, { side: 1, offset: 300 }, { side: 2, offset: 300 }, { side: 3, offset: 300 }, { side: 4, offset: 300 }] },
  // 11. 한 면만 열림 (다른 면)
  { walls: [{ side: 0, offset: 0 }, { side: 1, offset: 0 }, { side: 3, offset: 0 }, { side: 4, offset: 0 }, { side: 5, offset: 0 }] },
  // 12. 더블 좁은 통로 교차
  { walls: [{ side: 0, offset: 0 }, { side: 1, offset: 0 }, { side: 2, offset: 0 }, { side: 4, offset: 0 }, { side: 5, offset: 0 },
            { side: 0, offset: 80 }, { side: 1, offset: 80 }, { side: 2, offset: 80 }, { side: 3, offset: 80 }, { side: 5, offset: 80 }] },
];
```

**Step 4: Commit**
```bash
git add app/(canvas-mobile)/superhexagon/_lib/
git commit -m "feat(superhexagon): add config, types, and wall patterns"
```

---

### Task 3: game.ts 핵심 로직 구현

**Files:**
- Create: `app/(canvas-mobile)/superhexagon/_lib/game.ts`

**Reference:** `app/(canvas-mobile)/dodge/_lib/game.ts` 패턴을 정확히 따름.

**핵심 구현 포인트:**

1. **극좌표 시스템**: 모든 게임 요소(플레이어, 벽)를 `(angle, distance)`로 관리
2. **렌더링**: `ctx.translate(CENTER_X, CENTER_Y)` → `ctx.rotate(mapRotation)` → 요소 그리기
3. **벽 이동**: 매 프레임 `wall.distance -= wallSpeed * dt`, distance가 PLAYER_DISTANCE 이하면 충돌 체크
4. **충돌 감지**: 플레이어 각도가 벽의 side 범위 안에 있고, distance가 겹치면 게임 오버
5. **패턴 스폰**: 현재 패턴의 벽이 모두 지나가면 다음 패턴을 랜덤 선택하여 스폰
6. **난이도 진행**: `PHASES` 배열에서 현재 생존 시간에 맞는 속도/회전/팔레트 적용
7. **배경**: 6등분 삼각형으로 방사형 패턴 그리기 (교차 색상)

**game.ts 구조:**

```typescript
import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, CENTER_X, CENTER_Y,
  HEX_SIDES, HEX_RADIUS, PLAYER_DISTANCE, PLAYER_SIZE, PLAYER_SPEED,
  WALL_THICKNESS, WALL_SPAWN_DISTANCE,
  PHASES, PALETTES, SCORE_PER_SEC,
} from './config';
import { TWall, TGameState } from './types';
import { PATTERNS } from './patterns';

export type TSuperHexagonCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn: boolean;
};

export function setupSuperHexagon(
  canvas: HTMLCanvasElement,
  callbacks: TSuperHexagonCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;

  // 상태 변수들
  let state: TGameState = 'start';
  let score = 0;
  let sec = 0;
  let lastTime = 0;
  let playerAngle = 0;
  let mapRotation = 0;
  let rotationDirection = 1;
  let walls: TWall[] = [];
  let patternQueue: TWall[] = [];
  let currentPhaseIndex = 0;
  let pulsePhase = 0;

  // 입력 상태
  const keys = { left: false, right: false };
  let touchLeft = false;
  let touchRight = false;

  // 초기화, resize, gameOverHud 등 dodge 패턴 그대로 따름
  // ...

  // 키보드: e.code 사용 필수
  // ArrowLeft/KeyA = 반시계, ArrowRight/KeyD = 시계
  // KeyS = 시작/재개, KeyP = 일시정지, KeyR = 재시작

  // 터치: canvas 좌반 = 반시계, 우반 = 시계
  // getTouchPos()에서 CSS rotate 고려한 좌표 변환

  // gameLoop: update(dt) → render() → drawHud()
  // update: 벽 이동, 충돌 체크, 난이도 진행, 패턴 스폰
  // render: 배경 → 벽 → 중앙 헥사곤 → 플레이어 → HUD

  // cleanup 반환 필수
}
```

**주요 함수들:**

- `getCurrentPhase(sec)`: PHASES에서 현재 난이도 단계 반환
- `spawnPattern()`: PATTERNS에서 랜덤 선택 → TWall[] 생성
- `updateWalls(dt)`: 모든 벽의 distance 감소, 화면 밖 벽 제거
- `checkCollision()`: 플레이어 각도와 벽 위치 비교
- `drawBackground()`: 6등분 방사형 교차 색상 삼각형
- `drawHexagon()`: 중앙 육각형 (펄스 효과)
- `drawWalls()`: 벽들을 사다리꼴로 렌더링
- `drawPlayer()`: 플레이어 삼각형

**Step 1: 전체 game.ts 구현** (dodge 패턴 준수)

**Step 2: 로컬에서 빌드 확인**
```bash
yarn build
```

**Step 3: Commit**
```bash
git add app/(canvas-mobile)/superhexagon/_lib/game.ts
git commit -m "feat(superhexagon): implement core game logic with hexagonal mechanics"
```

---

### Task 4: React 컴포넌트 (SuperHexagon.tsx) — CSS rotate 스케일링 포함

**Files:**
- Create: `app/(canvas-mobile)/superhexagon/_components/SuperHexagon.tsx`

**핵심: 기존 Dodge 컴포넌트와 다른 점**

1. 캔버스가 정사각형(620x620)이 아닌 직사각형(800x500)
2. 모바일에서 CSS `rotate(90deg)`를 적용하여 가로모드처럼 보이게 함
3. `updateScale()`이 데스크탑/모바일 별로 다른 transform 적용

```typescript
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupSuperHexagon, TSuperHexagonCallbacks } from '../_lib/game';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../_lib/config';
import { useCreateScore, useGameSession } from '@/service/scores';
import { useIsMobile } from '@/hooks/use-mobile';

function SuperHexagon() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('superhexagon');
  const { mutateAsync: createSession } = useGameSession('superhexagon');
  const isLoggedIn = !!session;
  const isMobile = useIsMobile();

  const updateScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const container = wrapper.parentElement;
    if (!container) return;

    if (isMobile) {
      // 모바일: 90도 회전하여 800px이 세로, 500px이 가로
      const availableWidth = container.clientWidth;
      const availableHeight = container.clientHeight || window.innerHeight * 0.75;
      const scale = Math.min(
        availableHeight / CANVAS_WIDTH,  // 800px → 세로에 맞춤
        availableWidth / CANVAS_HEIGHT,  // 500px → 가로에 맞춤
        1,
      );
      wrapper.style.transform = `rotate(90deg) scale(${scale})`;
      wrapper.style.transformOrigin = 'center center';
      // 회전 후 실제 차지하는 공간 조절
      wrapper.style.width = `${CANVAS_WIDTH}px`;
      wrapper.style.height = `${CANVAS_HEIGHT}px`;
      // wrapper 부모에 실제 공간 할당
      wrapper.style.marginTop = `${(CANVAS_WIDTH * scale - CANVAS_HEIGHT * scale) / 2}px`;
    } else {
      // 데스크탑: 가로 방향 그대로
      const containerWidth = container.clientWidth;
      const scale = Math.min(containerWidth / CANVAS_WIDTH, 1);
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.transformOrigin = 'top center';
      wrapper.style.height = `${CANVAS_HEIGHT * scale}px`;
      wrapper.style.width = `${CANVAS_WIDTH}px`;
      wrapper.style.marginTop = '0px';
    }
  }, [isMobile]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TSuperHexagonCallbacks = {
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
          gameType: 'superhexagon',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupSuperHexagon(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center items-center">
      <div
        ref={wrapperRef}
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <canvas
          ref={canvasRef}
          className="border border-white/20 rounded-2xl shadow-lg touch-none"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        />
      </div>
    </div>
  );
}

export default SuperHexagon;
```

**Step 1: 컴포넌트 파일 작성**

**Step 2: Commit**
```bash
git add app/(canvas-mobile)/superhexagon/_components/SuperHexagon.tsx
git commit -m "feat(superhexagon): add canvas component with CSS rotate mobile scaling"
```

---

### Task 5: layout.tsx + page.tsx 작성

**Files:**
- Create: `app/(canvas-mobile)/superhexagon/layout.tsx`
- Create: `app/(canvas-mobile)/superhexagon/page.tsx`

**layout.tsx**: dodge 패턴 그대로 따름.

```typescript
import KameHeader from '@/components/common/KameHeader';

function SuperHexagonLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 xl:px-6 py-4 flex flex-col gap-4 xl:gap-10 items-center">
      <KameHeader title="Super Hexagon" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default SuperHexagonLayout;
```

**page.tsx**: dodge 패턴 따름. 모바일 햄버거 메뉴 + 데스크탑 3칼럼.

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
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import SuperHexagon from './_components/SuperHexagon';
import { useIsMobile } from '@/hooks/use-mobile';

const controls = [
  { key: '← / A / Tap Left', action: '반시계 방향 회전' },
  { key: '→ / D / Tap Right', action: '시계 방향 회전' },
  { key: 'S / Tap', action: '시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
];

function SuperHexagonPage() {
  const isMobile = useIsMobile();
  const { data: session, status } = useSession();
  const { data: scores = [], isLoading } = useGetScores('superhexagon');

  if (isMobile) {
    return (
      <section className="w-full h-full flex flex-col items-center">
        <div className="w-full flex justify-end px-2 pb-2">
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
                  <RankBoard data={scores} isLoading={isLoading} showCountry />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex-1 w-full">
          <SuperHexagon />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="hidden xl:block shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[800px]">
        <SuperHexagon />
      </div>
      <aside className="hidden xl:block shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default SuperHexagonPage;
```

**Step 1: layout.tsx, page.tsx 작성**

**Step 2: 빌드 확인**
```bash
yarn build
```

**Step 3: Commit**
```bash
git add app/(canvas-mobile)/superhexagon/layout.tsx app/(canvas-mobile)/superhexagon/page.tsx
git commit -m "feat(superhexagon): add layout and page with mobile hamburger menu"
```

---

### Task 6: 게임 플레이 테스트 및 튜닝

**Step 1: 로컬 서버 실행**
```bash
yarn dev
```

**Step 2: 데스크탑 테스트**
- http://localhost:3000/superhexagon 접속
- S키로 시작 → ←→ 키로 조작 → 벽 패턴 확인
- P키로 일시정지 → S키로 재개
- 게임 오버 시 R키로 재시작
- 점수 저장 확인 (로그인 필요)

**Step 3: 모바일 테스트 (Chrome DevTools)**
- DevTools > 모바일 뷰포트(375x667) 설정
- CSS rotate가 적용되어 가로모드로 보이는지 확인
- 화면 좌/우 터치로 조작 확인
- 게임 오버 시 터치로 SAVE/SKIP/재시작 확인
- 햄버거 메뉴 열기 → 로그인/조작법/랭킹 표시 확인

**Step 4: 난이도 밸런스 조정**
- 10초/20초/30초/45초 단계별 속도 전환이 자연스러운지 확인
- 벽 패턴이 항상 통과 가능한지 확인
- 필요 시 config.ts 상수 미세 조정

**Step 5: Commit**
```bash
git add -A
git commit -m "feat(superhexagon): complete Super Hexagon game implementation"
```

---

## Task Dependencies

```
Task 1 (등록) ──→ Task 2 (config/types) ──→ Task 3 (game.ts) ──→ Task 4 (component) ──→ Task 5 (layout/page) ──→ Task 6 (테스트)
```

모든 Task는 순차적 의존성이 있음. Task 1~5까지 완료하면 빌드 가능, Task 6에서 실제 플레이 테스트.
