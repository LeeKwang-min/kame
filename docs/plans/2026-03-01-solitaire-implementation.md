# Klondike Solitaire Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Klondike Solitaire (Draw 1/3 지원) — Canvas 2D + 모바일 터치 지원, 시간 기반 점수

**Architecture:** `(canvas-mobile)` 라우트 그룹에 Canvas 2D 엔진으로 구현. 탭 조작으로 카드 자동 이동. 기존 공유 HUD(gameStartHud, gamePauseHud, createGameOverHud) 재사용. CSS transform 스케일링으로 모바일 반응형.

**Tech Stack:** Next.js, Canvas 2D API, TypeScript, next-auth, react-query

---

## Task 1: 게임 등록 (6개 필수 파일 수정)

**Files:**
- Modify: `@types/scores.ts` — TGameType에 `'solitaire'` 추가
- Modify: `lib/config.ts` — MENU_LIST에 솔리테어 메뉴 추가
- Modify: `components/common/GameCard.tsx` — 아이콘 매핑 추가
- Modify: `app/api/game-session/route.ts` — VALID_GAME_TYPES에 추가
- Modify: `app/api/scores/route.ts` — VALID_GAME_TYPES에 추가
- Modify: `lib/game-security/config.ts` — 보안 설정 추가

**Step 1: TGameType에 'solitaire' 추가**

`@types/scores.ts`의 TGameType 유니온에 `'solitaire'` 추가 (알파벳순).

**Step 2: MENU_LIST에 메뉴 추가**

`lib/config.ts`의 MENU_LIST Puzzle 섹션에 추가:
```typescript
{
  name: { kor: '솔리테어', eng: 'Solitaire' },
  href: '/solitaire',
  category: 'Puzzle',
  platform: 'both',
},
```

**Step 3: GameCard 아이콘 추가**

`components/common/GameCard.tsx`에 lucide-react의 `Spade` 아이콘 import 후 매핑 추가:
```typescript
'/solitaire': Spade,
```

**Step 4: API 라우트 VALID_GAME_TYPES 추가**

`app/api/game-session/route.ts`와 `app/api/scores/route.ts` 두 파일 모두에 `'solitaire'` 추가.

**Step 5: 보안 설정 추가**

`lib/game-security/config.ts`에 추가:
```typescript
solitaire: { maxScore: 10000, minPlayTimeSeconds: 30 },
```

**Step 6: 커밋**

```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat(solitaire): register solitaire game in 6 config files"
```

---

## Task 2: 게임 설정 및 타입 정의

**Files:**
- Create: `app/(canvas-mobile)/solitaire/_lib/config.ts`
- Create: `app/(canvas-mobile)/solitaire/_lib/types.ts`

**Step 1: config.ts 작성**

```typescript
import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'solitaire',
  title: '솔리테어',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'puzzle',
  difficulty: 'selectable',
};

// Canvas
export const CANVAS_WIDTH = 620;
export const CANVAS_HEIGHT = 900;

// Card
export const CARD_WIDTH = 70;
export const CARD_HEIGHT = 100;
export const CARD_GAP = 8;
export const CARD_OVERLAP_Y = 25;         // 태블로 뒤집힌 카드 겹침
export const CARD_OVERLAP_FACE_Y = 35;    // 태블로 앞면 카드 겹침
export const CARD_RADIUS = 6;

// Layout
export const TOP_ROW_Y = 20;
export const TABLEAU_Y = 150;
export const PILE_START_X = 15;

// Scoring
export const BASE_SCORE = 10000;
export const PENALTY_PER_SEC = 2;

// Draw mode
export type TDrawMode = 1 | 3;
export const DEFAULT_DRAW_MODE: TDrawMode = 1;

// Colors
export const TABLE_COLOR = '#1a472a';
export const CARD_BACK_COLOR = '#1a3a5c';
export const CARD_BACK_PATTERN_COLOR = '#245080';
export const CARD_FRONT_COLOR = '#ffffff';
export const CARD_BORDER_COLOR = '#cccccc';
export const RED_SUIT_COLOR = '#dc2626';
export const BLACK_SUIT_COLOR = '#1a1a1a';
export const HIGHLIGHT_COLOR = '#fbbf24';
export const EMPTY_PILE_COLOR = 'rgba(255,255,255,0.1)';
```

**Step 2: types.ts 작성**

```typescript
export type TSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type TRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export type TCard = {
  suit: TSuit;
  rank: TRank;
  faceUp: boolean;
  id: number;
};

export type TPileType = 'stock' | 'waste' | 'foundation' | 'tableau';

export type TPile = {
  type: TPileType;
  index: number;
  cards: TCard[];
};

export type TAnimation = {
  card: TCard;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  duration: number;
  onComplete?: () => void;
};
```

**Step 3: 커밋**

```bash
git add app/\(canvas-mobile\)/solitaire/_lib/config.ts app/\(canvas-mobile\)/solitaire/_lib/types.ts
git commit -m "feat(solitaire): add config and type definitions"
```

---

## Task 3: 게임 핵심 로직 (game.ts) — 초기화 및 덱 관리

**Files:**
- Create: `app/(canvas-mobile)/solitaire/_lib/game.ts`

**Step 1: 기존 패턴 참고 파일 읽기**

구현 전 반드시 읽어야 할 파일:
- `app/(canvas-mobile)/dodge/_lib/game.ts` — setupGame 패턴, HUD 사용법
- `lib/game.ts` 또는 `lib/game/index.ts` — createGameOverHud, gameStartHud 등 공유 HUD 함수 시그니처

**Step 2: game.ts 기본 구조 작성**

`setupSolitaire` 함수 — 상태 변수, 덱 생성, 셔플, 초기 배분(tableau 7열 + stock 24장), 게임 상태 관리. 아래 구조를 따름:

```typescript
import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { /* 모든 config 상수 */ } from './config';
import { TCard, TPile, TSuit, TRank, TAnimation } from './types';

export type TSolitaireCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn: boolean;
};

export function setupSolitaire(
  canvas: HTMLCanvasElement,
  callbacks: TSolitaireCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;

  // 상태 변수
  let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' = 'start';
  let drawMode: TDrawMode = DEFAULT_DRAW_MODE;
  let stock: TCard[] = [];
  let waste: TCard[] = [];
  let foundations: TCard[][] = [[], [], [], []];
  let tableau: TCard[][] = [[], [], [], [], [], [], []];
  let score = 0;
  let startTime = 0;
  let elapsedTime = 0;
  let lastTime = 0;
  let animationId: number;
  let animations: TAnimation[] = [];

  // 덱 생성
  function createDeck(): TCard[] { /* 52장 카드 생성 */ }
  function shuffleDeck(deck: TCard[]): TCard[] { /* Fisher-Yates 셔플 */ }
  function dealCards(): void { /* tableau 7열 + stock 배분 */ }

  // HUD 초기화
  const gameOverHud = createGameOverHud(canvas, ctx, 'solitaire', {
    onScoreSave: (s) => callbacks.onScoreSave(s),
    onRestart: () => resetGame(),
  }, { isLoggedIn: callbacks.isLoggedIn });

  // 게임 시작/리셋
  async function startGame() { /* ... */ }
  function resetGame() { /* ... */ }

  // 카드 이동 규칙
  function getRankValue(rank: TRank): number { /* A=1, 2=2, ..., K=13 */ }
  function isRed(suit: TSuit): boolean { /* hearts/diamonds = red */ }
  function canPlaceOnFoundation(card: TCard, foundation: TCard[]): boolean { /* ... */ }
  function canPlaceOnTableau(card: TCard, tableauPile: TCard[]): boolean { /* ... */ }

  // 탭 처리: 카드 위치 계산 + 자동 이동
  function getCardPosition(pile, pileIdx, cardIdx): {x,y} { /* ... */ }
  function findClickedCard(x, y): {source, pileIdx, cardIdx} | null { /* ... */ }
  function handleCardTap(source, pileIdx, cardIdx): void { /* 자동 이동 로직 */ }
  function handleStockTap(): void { /* draw 1/3 */ }

  // 렌더링
  function drawCard(card, x, y, highlighted): void { /* 카드 그리기 */ }
  function drawEmptyPile(x, y): void { /* 빈 파일 자리 */ }
  function render(): void { /* 전체 보드 렌더링 */ }
  function drawHud(): void { /* 시간, 점수, drawMode 표시 */ }

  // 게임 루프
  function gameLoop(currentTime: number): void {
    update(currentTime);
    render();
    drawHud();
    animationId = requestAnimationFrame(gameLoop);
  }

  // 키보드/터치 이벤트
  function handleKeyDown(e: KeyboardEvent): void { /* e.code 사용 */ }
  function handleClick(e: MouseEvent): void { /* 데스크탑 클릭 */ }
  function handleTouchStart(e: TouchEvent): void { /* 모바일 탭 */ }

  // 이벤트 등록
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  // DPR 설정 + 초기 렌더
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(CANVAS_WIDTH * dpr);
  canvas.height = Math.round(CANVAS_HEIGHT * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  animationId = requestAnimationFrame(gameLoop);

  // cleanup
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('touchstart', handleTouchStart);
    cancelAnimationFrame(animationId);
  };
}
```

**핵심 구현 세부사항:**

1. **덱 생성**: 4 suits x 13 ranks = 52장, 고유 id 부여
2. **dealCards**: tableau[0]=1장, tableau[1]=2장, ..., tableau[6]=7장 (맨 위만 faceUp), 나머지 24장은 stock
3. **카드 위치 계산**: pile 타입과 인덱스로 x,y 좌표 결정
4. **자동 이동 우선순위**: 파운데이션 > 태블로 (빈 열에는 K만)
5. **Stock 탭**: drawMode에 따라 1장/3장 넘기기, stock 소진 시 waste를 뒤집어 stock으로 재활용
6. **승리 판정**: 4개 foundation 모두 13장이면 승리
7. **점수 계산**: `max(0, BASE_SCORE - elapsedSeconds * PENALTY_PER_SEC)`
8. **drawMode 전환**: 게임 시작 전 D키 또는 drawMode 표시 영역 탭으로 전환

**Step 3: 커밋**

```bash
git add app/\(canvas-mobile\)/solitaire/_lib/game.ts
git commit -m "feat(solitaire): implement core game logic with tap auto-move"
```

---

## Task 4: React 컴포넌트 (Solitaire.tsx)

**Files:**
- Create: `app/(canvas-mobile)/solitaire/_components/Solitaire.tsx`

**Step 1: 기존 패턴 참고**

`app/(canvas-mobile)/dodge/_components/Dodge.tsx` 읽기 — CSS transform 스케일링 패턴 확인

**Step 2: Solitaire.tsx 작성**

기존 dodge 컴포넌트 패턴을 따름:
- `canvasRef` + `wrapperRef` 사용
- `updateScale()` — CSS transform으로 반응형 처리
- `useEffect`에서 `setupSolitaire(canvas, callbacks)` 호출, cleanup 반환
- `useSession`, `useCreateScore('solitaire')`, `useGameSession('solitaire')` 훅 사용
- 캔버스에 `touch-none` 클래스 필수

**주의**: CANVAS_HEIGHT가 CANVAS_WIDTH와 다르므로 스케일링 시 height 계산 주의:
```typescript
wrapper.style.height = `${CANVAS_HEIGHT * scale}px`;
```

**Step 3: 커밋**

```bash
git add app/\(canvas-mobile\)/solitaire/_components/Solitaire.tsx
git commit -m "feat(solitaire): add React component with responsive scaling"
```

---

## Task 5: 페이지 및 레이아웃

**Files:**
- Create: `app/(canvas-mobile)/solitaire/page.tsx`
- Create: `app/(canvas-mobile)/solitaire/layout.tsx`

**Step 1: 기존 패턴 참고**

`app/(canvas-mobile)/dodge/page.tsx`와 `layout.tsx` 읽기

**Step 2: layout.tsx 작성**

dodge의 layout.tsx와 동일 패턴, title만 '솔리테어'로 변경.

**Step 3: page.tsx 작성**

dodge의 page.tsx 패턴을 따름:
- 모바일: Sheet 햄버거 메뉴 (로그인/프로필, 조작법, 랭킹)
- 데스크탑: 3칼럼 레이아웃 (ControlInfoTable | Solitaire | RankBoard)
- `useIsMobile()` 훅 사용

조작법 테이블:
```typescript
const controls = [
  { key: 'S / 화면 탭', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
  { key: 'D / Draw 탭', action: 'Draw 1 ↔ Draw 3 전환' },
  { key: '카드 탭/클릭', action: '카드 자동 이동' },
  { key: '덱 탭/클릭', action: '카드 넘기기' },
];
```

**Step 4: 커밋**

```bash
git add app/\(canvas-mobile\)/solitaire/page.tsx app/\(canvas-mobile\)/solitaire/layout.tsx
git commit -m "feat(solitaire): add page and layout with mobile responsive design"
```

---

## Task 6: 통합 테스트 및 버그 수정

**Step 1: 개발 서버 실행 및 확인**

```bash
yarn dev
```

브라우저에서 `/solitaire` 접속 후 확인:

**Step 2: 데스크탑 테스트**
- [ ] 게임 시작 화면 표시 (S키로 시작)
- [ ] 카드 배분 정상 (7열 태블로 + stock)
- [ ] 카드 클릭 시 자동 이동 동작
- [ ] Stock 클릭 시 Draw 1/3 전환 동작
- [ ] D키로 Draw 모드 전환
- [ ] 시간/점수 HUD 표시
- [ ] P키로 일시정지/재개
- [ ] R키로 재시작
- [ ] 게임 오버 HUD (승리 시 점수 저장)
- [ ] 3칼럼 레이아웃 정상

**Step 3: 모바일 테스트 (개발자 도구 반응형 모드)**
- [ ] 캔버스 스케일링 정상 (오버플로우 없음)
- [ ] 화면 탭으로 게임 시작
- [ ] 카드 탭으로 자동 이동
- [ ] Stock 탭으로 카드 넘기기
- [ ] 게임 오버 화면 터치 (SAVE/SKIP)
- [ ] Sheet 햄버거 메뉴 동작

**Step 4: 버그 수정 후 최종 커밋**

```bash
git add -A
git commit -m "feat(solitaire): complete Klondike Solitaire implementation"
```

---

## 참고: 반드시 읽어야 할 기존 파일

| 파일 | 용도 |
|------|------|
| `app/(canvas-mobile)/dodge/_lib/game.ts` | setupGame 패턴, HUD 사용법, 터치/키보드 이벤트 |
| `app/(canvas-mobile)/dodge/_components/Dodge.tsx` | CSS transform 스케일링 패턴 |
| `app/(canvas-mobile)/dodge/page.tsx` | 모바일 Sheet 메뉴 + 3칼럼 레이아웃 |
| `lib/game.ts` (또는 `lib/game/index.ts`) | createGameOverHud, gameStartHud 등 시그니처 |
| `app/(canvas)/highlow/_lib/game.ts` | 카드 렌더링 참고 (suit/rank 표시) |
| `hooks/use-mobile.ts` | useIsMobile 훅 |
