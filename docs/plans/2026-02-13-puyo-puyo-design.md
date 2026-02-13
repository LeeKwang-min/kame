# Puyo Puyo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Canvas 기반 Puyo Puyo(뿌요뿌요) 퍼즐 게임을 기존 Kame 프로젝트 패턴에 맞게 구현한다.

**Architecture:** 6×12(+1 히든) 그리드에서 2개 한 쌍의 뿌요가 떨어지고, 같은 색 4개 이상 연결 시 터지는 낙하 퍼즐. 연쇄 콤보 시스템이 핵심 메카닉. 기존 테트리스의 그리드/낙하 패턴과 fruitninja의 HUD/콜백 패턴을 결합.

**Tech Stack:** Next.js, Canvas 2D API, TypeScript, 기존 lib/game HUD 시스템

---

## Task 1: 타입 정의 (types.ts)

**Files:**
- Create: `app/(canvas)/puyopuyo/_lib/types.ts`

**Step 1: 타입 파일 작성**

```typescript
export type TPuyoColor = 'red' | 'green' | 'blue' | 'yellow';

export type TCell = TPuyoColor | null;

export type TBoard = TCell[][];

// 떨어지는 뿌요 쌍 (pivot + child)
export type TPuyoPair = {
  pivot: { row: number; col: number; color: TPuyoColor };
  child: { row: number; col: number; color: TPuyoColor };
  rotation: number; // 0=위, 1=오른쪽, 2=아래, 3=왼쪽
};

export type TParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
};

export type TFloatingText = {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
};

export type TGameState = 'start' | 'loading' | 'playing' | 'dropping' | 'popping' | 'paused' | 'gameover';
```

**Step 2: 커밋**

```bash
git add app/(canvas)/puyopuyo/_lib/types.ts
git commit -m "feat(puyopuyo): add type definitions"
```

---

## Task 2: 게임 설정 (config.ts)

**Files:**
- Create: `app/(canvas)/puyopuyo/_lib/config.ts`

**Step 1: 설정 파일 작성**

```typescript
import { TPuyoColor } from './types';

// 그리드 설정
export const COLS = 6;
export const ROWS = 12;
export const HIDDEN_ROWS = 1;
export const TOTAL_ROWS = ROWS + HIDDEN_ROWS;

// 셀 크기
export const CELL_SIZE = 40;
export const CELL_GAP = 1;

// 캔버스 설정
export const BOARD_WIDTH = COLS * CELL_SIZE;
export const BOARD_HEIGHT = ROWS * CELL_SIZE;
export const SIDE_PANEL_WIDTH = 160;
export const CANVAS_WIDTH = BOARD_WIDTH + SIDE_PANEL_WIDTH;
export const CANVAS_HEIGHT = BOARD_HEIGHT;
export const BOARD_OFFSET_X = 0;
export const BOARD_OFFSET_Y = 0;

// 낙하 속도 (초 단위)
export const BASE_DROP_INTERVAL = 1.0;
export const MIN_DROP_INTERVAL = 0.15;
export const SPEED_INCREASE_PER_PUYO = 0.002; // 놓을 때마다 약간 빨라짐
export const SOFT_DROP_INTERVAL = 0.05;

// 게임 오버 열 (3번째 = index 2)
export const DEATH_COL = 2;

// 매칭
export const MIN_MATCH = 4;

// 점수
export const SCORE_PER_PUYO = 10;
export const CHAIN_MULTIPLIER = [0, 1, 4, 8, 16, 32, 64, 128, 256, 512]; // index = chain수

// 애니메이션 타이밍
export const POP_ANIMATION_DURATION = 0.4; // 터지는 애니메이션 (초)
export const DROP_ANIMATION_SPEED = 800; // 떨어지는 속도 (px/s)

// 파티클
export const PARTICLE_COUNT = 6;
export const PARTICLE_LIFE = 0.5;

// 플로팅 텍스트
export const FLOATING_TEXT_LIFE = 1.5;

// 뿌요 색상
export const PUYO_COLORS: Record<TPuyoColor, { body: string; highlight: string; shadow: string; eye: string }> = {
  red: { body: '#FF4444', highlight: '#FF8888', shadow: '#CC2222', eye: '#FFFFFF' },
  green: { body: '#44BB44', highlight: '#88DD88', shadow: '#228822', eye: '#FFFFFF' },
  blue: { body: '#4488FF', highlight: '#88BBFF', shadow: '#2266CC', eye: '#FFFFFF' },
  yellow: { body: '#FFCC00', highlight: '#FFEE66', shadow: '#CC9900', eye: '#FFFFFF' },
};

export const PUYO_COLOR_LIST: TPuyoColor[] = ['red', 'green', 'blue', 'yellow'];

// 다음 뿌요 미리보기 수
export const NEXT_PREVIEW_COUNT = 2;
```

**Step 2: 커밋**

```bash
git add app/(canvas)/puyopuyo/_lib/config.ts
git commit -m "feat(puyopuyo): add game configuration"
```

---

## Task 3: 게임 로직 (game.ts) — 핵심 구현

**Files:**
- Create: `app/(canvas)/puyopuyo/_lib/game.ts`

**Step 1: game.ts 작성**

이 파일은 가장 크고 핵심적인 파일. 반드시 기존 패턴(fruitninja, tetris)을 따른다.

구현할 주요 함수/로직:
1. `setupPuyoPuyo(canvas, callbacks)` — 메인 셋업 함수 (cleanup 반환)
2. 보드 초기화 — `TOTAL_ROWS × COLS` null 2D 배열
3. 뿌요 쌍 생성 — 랜덤 색 2개, pivot(row=0,col=2) + child(row=-1,col=2)
4. 뿌요 쌍 이동 — 좌/우 이동, 충돌 체크
5. 뿌요 쌍 회전 — 시계 방향, 벽 킥
6. 소프트 드롭 / 하드 드롭
7. 뿌요 착지 (lock) — 보드에 고정
8. 매칭 탐지 — BFS/Flood Fill로 같은 색 4+ 연결 찾기
9. 터지기 — 매칭된 뿌요 제거 + 파티클 + 점수 계산
10. 중력 — 빈 칸 위의 뿌요를 아래로 떨어뜨림
11. 연쇄 — 중력 후 다시 매칭 체크 → 반복
12. 게임 오버 체크 — `board[HIDDEN_ROWS][DEATH_COL]`이 차면 종료
13. 다음 뿌요 큐 관리
14. HUD 렌더링 — 점수, 연쇄 표시, 다음 뿌요
15. 게임 상태 관리 — start/loading/playing/dropping/popping/paused/gameover
16. 키보드 이벤트 — `e.code` 사용 필수
17. 게임 루프 — `requestAnimationFrame` + dt 기반

**핵심 게임 상태 흐름:**
```
start → (S키) → loading → playing
playing: 뿌요 쌍 낙하 중 (유저 조작 가능)
  → 착지(lock) → 매칭 체크
    → 매칭 있으면 → popping (터지기 애니메이션)
      → dropping (중력으로 떨어짐)
        → 다시 매칭 체크 (연쇄)
    → 매칭 없으면 → 게임오버 체크 → 새 뿌요 쌍 생성 → playing
gameover: gameOverHud 표시
```

**HUD 패턴 (fruitninja 기준):**
```typescript
import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';

// createGameOverHud 사용:
const gameOverCallbacks: TGameOverCallbacks = {
  onScoreSave: callbacks.onScoreSave,
  onRestart: () => { resetGame(); },
};
const gameOverHud = createGameOverHud(canvas, ctx, 'puyopuyo', gameOverCallbacks, { isLoggedIn: callbacks.isLoggedIn });

// 키 핸들러에서:
if (state === 'gameover') {
  if (gameOverHud.onKeyDown(e, score)) return;
}

// 렌더에서:
if (state === 'gameover') { gameOverHud.render(score); }
if (state === 'start') { gameStartHud(canvas, ctx); }
if (state === 'loading') { gameLoadingHud(canvas, ctx); }
if (state === 'paused') { gamePauseHud(canvas, ctx); }
```

**키보드 핸들러 패턴:**
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.repeat) return;
  if (state === 'gameover') {
    if (gameOverHud.onKeyDown(e, score)) return;
  }
  switch (e.code) {
    case 'KeyS': // 시작/재개
    case 'KeyP': // 일시정지
    case 'KeyR': // 재시작
    case 'ArrowLeft': // 좌 이동
    case 'ArrowRight': // 우 이동
    case 'ArrowUp': // 회전
    case 'KeyZ': // 회전
    case 'ArrowDown': // 소프트 드롭
    case 'Space': // 하드 드롭
  }
};
```

**뿌요 렌더링 (귀여운 스타일):**
- 원형 몸체 (body 색상)
- 하이라이트 (좌상단 작은 원)
- 그림자 (하단 반원)
- 눈 (흰 원 2개 + 검은 눈동자)
- 연결된 뿌요 사이에 연결부 그리기 (같은 색 인접 시)

**Step 2: 커밋**

```bash
git add app/(canvas)/puyopuyo/_lib/game.ts
git commit -m "feat(puyopuyo): implement core game logic with chain combo system"
```

---

## Task 4: React 컴포넌트 (PuyoPuyo.tsx)

**Files:**
- Create: `app/(canvas)/puyopuyo/_components/PuyoPuyo.tsx`

**Step 1: 컴포넌트 작성**

fruitninja의 FruitNinja.tsx를 그대로 따라가되 게임명만 변경:
- `useCreateScore('puyopuyo')`, `useGameSession('puyopuyo')`
- `setupPuyoPuyo(canvas, callbacks)` 호출
- canvas 크기: `CANVAS_WIDTH × CANVAS_HEIGHT` (config에서 import)
- className에 touch-none 포함

**Step 2: 커밋**

```bash
git add app/(canvas)/puyopuyo/_components/PuyoPuyo.tsx
git commit -m "feat(puyopuyo): add React canvas component"
```

---

## Task 5: 페이지 & 레이아웃

**Files:**
- Create: `app/(canvas)/puyopuyo/page.tsx`
- Create: `app/(canvas)/puyopuyo/layout.tsx`

**Step 1: layout.tsx 작성**

```typescript
import KameHeader from '@/components/common/KameHeader';

function PuyoPuyoLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      <KameHeader title="Puyo Puyo" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default PuyoPuyoLayout;
```

**Step 2: page.tsx 작성**

```typescript
'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import PuyoPuyo from './_components/PuyoPuyo';

const controls = [
  { key: '←→', action: '좌우 이동' },
  { key: '↑ / Z', action: '회전' },
  { key: '↓', action: '소프트 드롭' },
  { key: 'Space', action: '하드 드롭' },
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
];

function PuyoPuyoPage() {
  const { data: scores = [], isLoading } = useGetScores('puyopuyo');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[400px]">
        <PuyoPuyo />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default PuyoPuyoPage;
```

**Step 3: 커밋**

```bash
git add app/(canvas)/puyopuyo/page.tsx app/(canvas)/puyopuyo/layout.tsx
git commit -m "feat(puyopuyo): add page and layout"
```

---

## Task 6: 게임 등록 (6개 파일 수정)

**Files:**
- Modify: `@types/scores.ts` — `TGameType`에 `'puyopuyo'` 추가
- Modify: `lib/config.ts` — `MENU_LIST`에 뿌요뿌요 추가 (Puzzle 카테고리)
- Modify: `components/common/GameCard.tsx` — `/puyopuyo` 아이콘 추가 (Puzzle 아이콘)
- Modify: `app/api/game-session/route.ts` — `VALID_GAME_TYPES`에 `'puyopuyo'` 추가
- Modify: `app/api/scores/route.ts` — `VALID_GAME_TYPES`에 `'puyopuyo'` 추가
- Modify: `lib/game-security/config.ts` — 보안 설정 추가

**Step 1: @types/scores.ts**
`| 'randomdefense'` 뒤에 `| 'puyopuyo'` 추가

**Step 2: lib/config.ts**
Puzzle 카테고리 끝(maze 뒤)에 추가:
```typescript
{
  name: { kor: '뿌요뿌요', eng: 'Puyo Puyo' },
  href: '/puyopuyo',
  category: 'Puzzle',
},
```

**Step 3: components/common/GameCard.tsx**
import에 `Grip` 추가, GAME_ICONS에 `'/puyopuyo': Grip` 추가

**Step 4: app/api/game-session/route.ts**
`VALID_GAME_TYPES` 배열에 `'puyopuyo'` 추가

**Step 5: app/api/scores/route.ts**
`VALID_GAME_TYPES` 배열에 `'puyopuyo'` 추가

**Step 6: lib/game-security/config.ts**
```typescript
puyopuyo: { maxScore: 999999, minPlayTimeSeconds: 10 },
```

**Step 7: 커밋**

```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat(puyopuyo): register game in all 6 config files"
```

---

## Task 7: 테스트 및 검증

**Step 1: 빌드 확인**
```bash
yarn build
```
Expected: 빌드 성공, 에러 없음

**Step 2: 로컬 테스트**
```bash
yarn dev
```
- `/puyopuyo` 페이지 접속 확인
- S키로 게임 시작
- 뿌요 낙하, 좌우 이동, 회전 동작 확인
- 4개 매칭 시 터지는 효과 확인
- 연쇄 콤보 점수 확인
- 게임 오버 시 HUD 표시 확인
- 메인 페이지에서 게임 카드 표시 확인

**Step 3: 최종 커밋**

모든 문제 수정 후:
```bash
git add -A
git commit -m "feat: add Puyo Puyo puzzle game with chain combo system"
```
