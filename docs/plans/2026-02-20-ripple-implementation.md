# Ripple (리플) 퍼즐 게임 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 물에 돌을 던져 파문을 만들고, 모든 셀의 목표 숫자를 맞추는 새로운 로직 퍼즐 게임을 KAME 프로젝트에 프로토타입으로 구현한다.

**Architecture:** KAME의 기존 `(canvas-mobile)` 패턴을 따른다. Canvas 2D로 렌더링하고, CSS transform으로 모바일 스케일링을 처리한다. Queens 게임의 구조를 기반으로 하되, 리플 고유의 파문 계산 로직과 스테이지 진행 시스템을 추가한다.

**Tech Stack:** Next.js, Canvas 2D API, TypeScript, KAME 공통 HUD 라이브러리

**Design Doc:** `docs/plans/2026-02-20-ripple-design.md`

---

## Task 1: 게임 등록 (6개 설정 파일)

**Files:**
- Modify: `@types/scores.ts` — `TGameType`에 `'ripple'` 추가
- Modify: `lib/config.ts` — `MENU_LIST`에 리플 메뉴 추가
- Modify: `components/common/GameCard.tsx` — 아이콘 추가
- Modify: `app/api/game-session/route.ts` — `VALID_GAME_TYPES`에 추가
- Modify: `app/api/scores/route.ts` — `VALID_GAME_TYPES`에 추가
- Modify: `lib/game-security/config.ts` — 보안 설정 추가

**Step 1: `@types/scores.ts` 수정**

`TGameType` 유니온 타입의 마지막에 `'ripple'` 추가:

```typescript
  | 'queens'
  | 'ripple';
```

**Step 2: `lib/config.ts` 수정**

Queens 항목 바로 뒤에 추가:

```typescript
{
  name: {
    kor: '리플',
    eng: 'Ripple',
  },
  href: '/ripple',
  category: 'Puzzle',
  platform: 'both',
},
```

**Step 3: `components/common/GameCard.tsx` 수정**

import 블록에 `Waves` 아이콘 추가:

```typescript
import {
  // ... 기존 import들 ...
  Waves,
} from 'lucide-react';
```

`GAME_ICONS` 객체에 추가:

```typescript
'/ripple': Waves,
```

**Step 4: `app/api/game-session/route.ts` 수정**

```typescript
  'queens',
  'ripple',
];
```

**Step 5: `app/api/scores/route.ts` 수정**

```typescript
  'queens',
  'ripple',
];
```

**Step 6: `lib/game-security/config.ts` 수정**

Queens 항목 뒤에 추가. Expert 최대 점수 = 5 × 300 = 1500:

```typescript
  queens: { maxScore: 1800, minPlayTimeSeconds: 15 },
  ripple: { maxScore: 1500, minPlayTimeSeconds: 10 },
```

**Step 7: 커밋**

```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx \
  app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat: register ripple game in all 6 required config files"
```

---

## Task 2: 타입 정의 (`types.ts`)

**Files:**
- Create: `app/(canvas-mobile)/ripple/_lib/types.ts`

**Step 1: 타입 파일 작성**

```typescript
// ── Difficulty ──
export type TDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type TDifficultyConfig = {
  size: number | [number, number]; // 단일 값 또는 [min, max] 범위
  stones: [number, number];       // [min, max] 돌 개수 범위
  hintRatio: [number, number];    // [min, max] 힌트 셀 공개 비율
  baseTime: number;               // 기본 시간 (초)
  multiplier: number;             // 점수 배율
  hints: number;                  // 사용 가능한 힌트 수
  maxAttempts: number;            // 퍼즐 생성 최대 시도 횟수
};

// ── Cell & Board ──
export type TCell = {
  value: number;     // 파문 합산값 (정답)
  revealed: boolean; // 목표 숫자 공개 여부
  hasStone: boolean; // 플레이어가 놓은 돌 여부
  isError: boolean;  // 검증 시 오류 표시
  isHinted: boolean; // 힌트로 공개된 돌 위치
};

export type TBoard = TCell[][];

// ── Puzzle ──
export type TPuzzle = {
  size: number;
  board: TBoard;
  stonePositions: [number, number][]; // 정답 돌 위치들
  stoneCount: number;                 // 필요한 돌 개수
};

// ── Animation ──
export type TCellAnim = {
  rippleTime: number;  // 파문 애니메이션 진행 시간
  rippleActive: boolean;
  scale: number;
  opacity: number;
  shakeX: number;
  shakeTime: number;
  glowTime: number;    // 정답 확인 글로우
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
  type: 'drop' | 'ring' | 'sparkle';
};

export type TCelebration = {
  active: boolean;
  time: number;
  rippleIndex: number; // 순차 파문 확산 인덱스
};
```

**Step 2: 커밋**

```bash
git add app/\(canvas-mobile\)/ripple/_lib/types.ts
git commit -m "feat(ripple): add type definitions"
```

---

## Task 3: 게임 설정 (`config.ts`)

**Files:**
- Create: `app/(canvas-mobile)/ripple/_lib/config.ts`

**Step 1: 설정 파일 작성**

```typescript
import { TGameMeta } from '@/@types/game-meta';
import { TDifficulty, TDifficultyConfig } from './types';

export const GAME_META: TGameMeta = {
  id: 'ripple',
  title: '리플',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'puzzle',
  difficulty: 'progressive',
};

export const CANVAS_WIDTH = 620;
export const CANVAS_HEIGHT = 700;

export const HUD_HEIGHT = 80;
export const GRID_PADDING = 20;
export const HINT_PENALTY_SECONDS = 30;

// 파문 값: 거리 0=3, 거리 1=2, 거리 2=1
export const RIPPLE_VALUES = [3, 2, 1] as const;
export const RIPPLE_MAX_DISTANCE = RIPPLE_VALUES.length - 1; // 2

export const DIFFICULTY_CONFIG: Record<TDifficulty, TDifficultyConfig> = {
  easy: {
    size: 5,
    stones: [2, 3],
    hintRatio: [0.6, 0.7],
    baseTime: 60,
    multiplier: 1,
    hints: 3,
    maxAttempts: 200,
  },
  normal: {
    size: 6,
    stones: [3, 4],
    hintRatio: [0.45, 0.55],
    baseTime: 120,
    multiplier: 2,
    hints: 2,
    maxAttempts: 500,
  },
  hard: {
    size: 7,
    stones: [4, 6],
    hintRatio: [0.3, 0.4],
    baseTime: 180,
    multiplier: 3,
    hints: 1,
    maxAttempts: 1000,
  },
  expert: {
    size: [8, 9],
    stones: [5, 8],
    hintRatio: [0.2, 0.3],
    baseTime: 300,
    multiplier: 5,
    hints: 1,
    maxAttempts: 2000,
  },
};

// 스테이지 → 난이도 매핑
export function getStageDifficulty(stage: number): TDifficulty {
  if (stage <= 20) return 'easy';
  if (stage <= 50) return 'normal';
  if (stage <= 100) return 'hard';
  return 'expert';
}

// ── 색상 팔레트 (물/파문 테마) ──
export const COLORS = {
  // 배경
  canvasBg: '#F0F8FF',      // 연한 앨리스 블루
  hudBg: '#E6F2FF',         // 연한 스카이
  gridBg: '#FFFFFF',        // 흰색

  // 텍스트
  text: '#2C3E6B',          // 진한 네이비
  textLight: '#6B85B0',     // 연한 네이비
  textWhite: '#FFFFFF',

  // 강조
  accent: '#4A90D9',        // 물빛 블루
  accentLight: '#7BB3E8',   // 연한 물빛
  accentDark: '#2E6AB0',    // 진한 물빛

  // 상태
  error: '#FF6B6B',         // 산호 빨강
  errorLight: '#FFE0E0',
  success: '#4ECDC4',       // 민트 그린
  successLight: '#E0FFF8',
  hint: '#9B59B6',          // 보라

  // 셀
  cellBorder: '#D0E0F0',    // 연한 보더
  cellHover: '#E8F4FD',     // 호버 배경
  cellRevealed: '#F5FAFF',  // 숫자 셀 배경
  cellEmpty: '#FAFEFF',     // 빈 셀 배경

  // 돌 & 파문
  stone: '#3A7BD5',         // 돌 색상
  stoneHighlight: '#5A9BE5',
  ripple1: 'rgba(74, 144, 217, 0.3)',  // 거리 1 파문
  ripple2: 'rgba(74, 144, 217, 0.15)', // 거리 2 파문

  // 버튼
  buttonBg: '#4A90D9',
  buttonText: '#FFFFFF',
  buttonDisabled: '#B0C4DE',
} as const;
```

**Step 2: 커밋**

```bash
git add app/\(canvas-mobile\)/ripple/_lib/config.ts
git commit -m "feat(ripple): add game configuration and color palette"
```

---

## Task 4: 퍼즐 생성기 (`generator.ts`)

**Files:**
- Create: `app/(canvas-mobile)/ripple/_lib/generator.ts`

**Step 1: 파문 값 계산 유틸리티 작성**

이 함수들은 generator와 game 양쪽에서 사용됨.

```typescript
import { RIPPLE_VALUES, RIPPLE_MAX_DISTANCE } from './config';
import { TBoard, TCell, TPuzzle } from './types';

// 맨해튼 거리 (상하좌우 직선 거리가 아닌, 체스판 거리도 아닌 맨해튼)
// 파문은 "상하좌우"로 퍼지므로 맨해튼 거리를 사용
function manhattanDistance(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

// 한 돌이 특정 셀에 미치는 파문 값 계산
function getRippleValue(stoneRow: number, stoneCol: number, cellRow: number, cellCol: number): number {
  const dist = manhattanDistance(stoneRow, stoneCol, cellRow, cellCol);
  if (dist > RIPPLE_MAX_DISTANCE) return 0;
  return RIPPLE_VALUES[dist];
}

// 돌 배치에 대한 전체 보드 파문 합산 값 계산
export function computeRippleBoard(
  size: number,
  stonePositions: [number, number][],
): number[][] {
  const values: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  for (const [sr, sc] of stonePositions) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        values[r][c] += getRippleValue(sr, sc, r, c);
      }
    }
  }
  return values;
}
```

**Step 2: 유일해 검증 솔버 작성**

```typescript
// 백트래킹 솔버: 주어진 힌트(공개된 숫자)만으로 유일한 해가 있는지 검증
// 2개 이상의 해를 찾으면 즉시 false 반환
function hasUniqueSolution(
  size: number,
  revealedValues: Map<string, number>, // "r,c" → 목표 값
  stoneCount: number,
): boolean {
  let solutionCount = 0;

  function backtrack(
    placed: [number, number][],
    startIdx: number,
  ): boolean {
    if (placed.length === stoneCount) {
      // 현재 배치가 모든 공개된 값과 일치하는지 확인
      const values = computeRippleBoard(size, placed);
      for (const [key, target] of revealedValues) {
        const [r, c] = key.split(',').map(Number);
        if (values[r][c] !== target) return false;
      }
      solutionCount++;
      return solutionCount >= 2; // 2개 찾으면 중단
    }

    const totalCells = size * size;
    for (let idx = startIdx; idx < totalCells; idx++) {
      const r = Math.floor(idx / size);
      const c = idx % size;
      const key = `${r},${c}`;

      // 공개된 셀에는 돌을 놓을 수 없음 (돌이 놓인 셀의 값은 최소 3)
      // → 실제로는 돌 셀도 공개될 수 있으므로 제한 없음
      placed.push([r, c]);

      // 조기 가지치기: 현재까지의 배치가 이미 공개된 값을 초과하는지
      const currentValues = computeRippleBoard(size, placed);
      let valid = true;
      for (const [vkey, target] of revealedValues) {
        const [vr, vc] = vkey.split(',').map(Number);
        if (currentValues[vr][vc] > target) {
          valid = false;
          break;
        }
      }

      if (valid) {
        if (backtrack(placed, idx + 1)) return true;
      }

      placed.pop();
    }
    return false;
  }

  backtrack([], 0);
  return solutionCount === 1;
}
```

**Step 3: 퍼즐 생성 메인 함수 작성**

```typescript
export async function generatePuzzle(
  size: number,
  stoneRange: [number, number],
  hintRatioRange: [number, number],
  maxAttempts: number,
): Promise<TPuzzle> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const batchSize = size <= 6 ? 100 : 50;

    function processBatch() {
      for (let i = 0; i < batchSize && attempts < maxAttempts; i++, attempts++) {
        const puzzle = tryGenerate(size, stoneRange, hintRatioRange);
        if (puzzle) {
          resolve(puzzle);
          return;
        }
      }

      if (attempts >= maxAttempts) {
        reject(new Error(`Failed to generate puzzle after ${maxAttempts} attempts`));
        return;
      }

      setTimeout(processBatch, 0);
    }

    processBatch();
  });
}

function tryGenerate(
  size: number,
  stoneRange: [number, number],
  hintRatioRange: [number, number],
): TPuzzle | null {
  // 1. 랜덤 돌 개수 결정
  const stoneCount =
    stoneRange[0] + Math.floor(Math.random() * (stoneRange[1] - stoneRange[0] + 1));

  // 2. 랜덤 돌 위치 생성
  const allPositions: [number, number][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      allPositions.push([r, c]);
    }
  }
  shuffle(allPositions);
  const stonePositions = allPositions.slice(0, stoneCount);

  // 3. 파문 값 계산
  const values = computeRippleBoard(size, stonePositions);

  // 4. 보드 생성 (모든 셀 공개)
  const board: TBoard = values.map((row) =>
    row.map((val) => ({
      value: val,
      revealed: true,
      hasStone: false,
      isError: false,
      isHinted: false,
    })),
  );

  // 돌 위치에 hasStone 표시 (정답용, 실제 게임에서는 false로 시작)
  // stonePositions는 정답 데이터로 별도 보관

  // 5. 힌트 비율에 맞게 셀 가리기
  const totalCells = size * size;
  const targetHintRatio =
    hintRatioRange[0] + Math.random() * (hintRatioRange[1] - hintRatioRange[0]);
  const targetRevealed = Math.floor(totalCells * targetHintRatio);

  // 셀을 랜덤 순서로 가리면서 유일해 유지
  const cellIndices: [number, number][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cellIndices.push([r, c]);
    }
  }
  shuffle(cellIndices);

  const revealedSet = new Map<string, number>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      revealedSet.set(`${r},${c}`, values[r][c]);
    }
  }

  let currentRevealed = totalCells;

  for (const [r, c] of cellIndices) {
    if (currentRevealed <= targetRevealed) break;

    const key = `${r},${c}`;
    const val = revealedSet.get(key)!;
    revealedSet.delete(key);

    if (hasUniqueSolution(size, revealedSet, stoneCount)) {
      board[r][c].revealed = false;
      currentRevealed--;
    } else {
      // 유일해가 깨지면 다시 공개
      revealedSet.set(key, val);
    }
  }

  // 목표 비율에 너무 못 미치면 실패
  const actualRatio = currentRevealed / totalCells;
  if (actualRatio > hintRatioRange[1] + 0.1) return null;

  return {
    size,
    board,
    stonePositions,
    stoneCount,
  };
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
```

**Step 4: 커밋**

```bash
git add app/\(canvas-mobile\)/ripple/_lib/generator.ts
git commit -m "feat(ripple): add puzzle generator with unique solution verification"
```

---

## Task 5: 게임 로직 — 상태 관리 & 핵심 로직 (`game.ts` Part 1)

**Files:**
- Create: `app/(canvas-mobile)/ripple/_lib/game.ts`

이 파일은 크므로 Task 5~7에 걸쳐 작성한다. Task 5에서는 import, 상태 변수, 핵심 게임 로직 함수를 작성한다.

**Step 1: import & export 타입, setupRipple 함수 시그니처 작성**

```typescript
import {
  createGameOverHud,
  gameLoadingHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HUD_HEIGHT,
  GRID_PADDING,
  HINT_PENALTY_SECONDS,
  DIFFICULTY_CONFIG,
  COLORS,
  RIPPLE_VALUES,
  RIPPLE_MAX_DISTANCE,
  getStageDifficulty,
} from './config';
import {
  TDifficulty,
  TCell,
  TBoard,
  TPuzzle,
  TCellAnim,
  TParticle,
  TCelebration,
} from './types';
import { generatePuzzle, computeRippleBoard } from './generator';

export type TRippleCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export function setupRipple(
  canvas: HTMLCanvasElement,
  callbacks?: TRippleCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;

  // DPR 리사이즈 (Queens 패턴)
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
```

**Step 2: 게임 상태 변수**

```typescript
  // ── 게임 상태 ──
  let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' = 'start';
  let animationId = 0;
  let lastTime = 0;

  // ── 스테이지 & 난이도 ──
  let currentStage = 1;
  let currentDifficulty: TDifficulty = 'easy';
  let totalScore = 0;

  // ── 퍼즐 데이터 ──
  let puzzle: TPuzzle | null = null;
  let board: TBoard = [];
  let gridSize = 5;

  // ── 플레이 상태 ──
  let placedStones: [number, number][] = [];
  let elapsedTime = 0;
  let score = 0;
  let hintsRemaining = 3;
  let hintPenalty = 0;

  // ── 커서 (키보드용) ──
  let cursorRow = 0;
  let cursorCol = 0;

  // ── 애니메이션 ──
  let cellAnims: TCellAnim[][] = [];
  let particles: TParticle[] = [];
  let celebration: TCelebration = { active: false, time: 0, rippleIndex: 0 };

  // ── 게임오버 HUD ──
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      if (callbacks?.onScoreSave) return callbacks.onScoreSave(finalScore);
      return { saved: false };
    },
    onRestart: () => {
      // 게임오버에서 재시작 → 스테이지 1부터
      currentStage = 1;
      totalScore = 0;
      startStage();
    },
  };

  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'ripple',
    gameOverCallbacks,
    { isLoggedIn: callbacks?.isLoggedIn ?? false },
  );
```

**Step 3: 핵심 게임 로직 함수들**

```typescript
  // ── 좌표 변환 ──
  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };
  const getTouchPos = (touch: Touch) => getCanvasPos(touch.clientX, touch.clientY);

  // ── 그리드 좌표 계산 ──
  function getGridMetrics() {
    const gridTop = HUD_HEIGHT + GRID_PADDING;
    const gridArea = Math.min(
      CANVAS_WIDTH - GRID_PADDING * 2,
      CANVAS_HEIGHT - HUD_HEIGHT - GRID_PADDING * 2 - 80, // 80 = 하단 버튼 영역
    );
    const cellSize = gridArea / gridSize;
    const gridLeft = (CANVAS_WIDTH - cellSize * gridSize) / 2;
    return { gridTop, gridLeft, cellSize, gridArea };
  }

  function getCellFromPos(x: number, y: number): [number, number] | null {
    const { gridTop, gridLeft, cellSize } = getGridMetrics();
    const col = Math.floor((x - gridLeft) / cellSize);
    const row = Math.floor((y - gridTop) / cellSize);
    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return null;
    return [row, col];
  }

  // ── 셀 애니메이션 초기화 ──
  function initCellAnims(size: number) {
    cellAnims = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({
        rippleTime: 0,
        rippleActive: false,
        scale: 1,
        opacity: 1,
        shakeX: 0,
        shakeTime: 0,
        glowTime: 0,
      })),
    );
  }

  // ── 돌 배치/제거 ──
  function toggleStone(row: number, col: number) {
    if (state !== 'playing' || !puzzle) return;
    const cell = board[row][col];

    if (cell.hasStone) {
      // 돌 제거
      cell.hasStone = false;
      placedStones = placedStones.filter(([r, c]) => r !== row || c !== col);
      cellAnims[row][col].scale = 0.8;
    } else {
      // 빈 셀에만 돌 배치 가능 (공개된 숫자 셀에도 배치 가능)
      cell.hasStone = true;
      placedStones.push([row, col]);
      // 돌 배치 애니메이션
      cellAnims[row][col].scale = 1.3;
      cellAnims[row][col].rippleActive = true;
      cellAnims[row][col].rippleTime = 0;
      // 파문 파티클
      spawnRippleParticles(row, col);
    }

    // 에러 상태 리셋
    clearErrors();

    // 자동 클리어 체크
    if (placedStones.length === puzzle.stoneCount) {
      checkWin();
    }
  }

  // ── 파문 파티클 생성 ──
  function spawnRippleParticles(row: number, col: number) {
    const { gridTop, gridLeft, cellSize } = getGridMetrics();
    const cx = gridLeft + col * cellSize + cellSize / 2;
    const cy = gridTop + row * cellSize + cellSize / 2;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * 60,
        vy: Math.sin(angle) * 60,
        life: 1,
        maxLife: 1,
        size: 3 + Math.random() * 3,
        color: COLORS.accent,
        type: 'drop',
      });
    }
  }

  // ── 에러 클리어 ──
  function clearErrors() {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        board[r][c].isError = false;
      }
    }
  }

  // ── 검증 ──
  function validateBoard(): boolean {
    if (!puzzle) return false;
    const currentValues = computeRippleBoard(gridSize, placedStones);
    let hasError = false;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c].revealed && currentValues[r][c] !== board[r][c].value) {
          board[r][c].isError = true;
          cellAnims[r][c].shakeTime = 0.4;
          hasError = true;
        }
      }
    }
    return !hasError;
  }

  // ── 승리 체크 ──
  function checkWin() {
    if (!puzzle) return;
    if (placedStones.length !== puzzle.stoneCount) return;

    const currentValues = computeRippleBoard(gridSize, placedStones);

    // 모든 셀의 값이 정답과 일치하는지
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (currentValues[r][c] !== board[r][c].value) return;
      }
    }

    // 승리!
    const config = DIFFICULTY_CONFIG[currentDifficulty];
    const timeUsed = elapsedTime + hintPenalty;
    score = Math.floor(config.multiplier * Math.max(0, config.baseTime - timeUsed));
    totalScore += score;

    celebration = { active: true, time: 0, rippleIndex: 0 };
    state = 'gameover';
    gameOverHud.reset();
  }

  // ── 힌트 ──
  function useHint() {
    if (!puzzle || hintsRemaining <= 0) return;

    // 아직 놓이지 않은 정답 돌 위치 중 랜덤 선택
    const unplaced = puzzle.stonePositions.filter(
      ([r, c]) => !board[r][c].hasStone,
    );
    if (unplaced.length === 0) return;

    const [hr, hc] = unplaced[Math.floor(Math.random() * unplaced.length)];
    board[hr][hc].hasStone = true;
    board[hr][hc].isHinted = true;
    placedStones.push([hr, hc]);
    hintsRemaining--;
    hintPenalty += HINT_PENALTY_SECONDS;

    // 애니메이션
    cellAnims[hr][hc].scale = 1.3;
    cellAnims[hr][hc].rippleActive = true;
    cellAnims[hr][hc].rippleTime = 0;
    spawnRippleParticles(hr, hc);

    // 자동 클리어 체크
    if (placedStones.length === puzzle.stoneCount) {
      checkWin();
    }
  }

  // ── 리셋 (현재 스테이지 재시작) ──
  function resetBoard() {
    if (!puzzle) return;
    // 힌트로 놓인 돌만 유지? 아니면 전체 리셋?
    // 전체 리셋으로 처리
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        board[r][c].hasStone = false;
        board[r][c].isError = false;
        board[r][c].isHinted = false;
      }
    }
    placedStones = [];
    clearErrors();
    initCellAnims(gridSize);
    particles = [];
  }

  // ── 스테이지 시작 ──
  async function startStage() {
    state = 'loading';
    currentDifficulty = getStageDifficulty(currentStage);
    const config = DIFFICULTY_CONFIG[currentDifficulty];

    // 그리드 사이즈 결정
    if (Array.isArray(config.size)) {
      gridSize = config.size[0] + Math.floor(Math.random() * (config.size[1] - config.size[0] + 1));
    } else {
      gridSize = config.size;
    }

    hintsRemaining = config.hints;
    hintPenalty = 0;
    elapsedTime = 0;
    score = 0;
    placedStones = [];
    cursorRow = 0;
    cursorCol = 0;
    celebration = { active: false, time: 0, rippleIndex: 0 };
    gameOverHud.reset();
    initCellAnims(gridSize);
    particles = [];

    try {
      if (callbacks?.onGameStart) {
        await callbacks.onGameStart();
      }

      puzzle = await generatePuzzle(
        gridSize,
        config.stones,
        config.hintRatio,
        config.maxAttempts,
      );
      board = puzzle.board.map((row) =>
        row.map((cell) => ({ ...cell, hasStone: false, isError: false, isHinted: false })),
      );
      state = 'playing';
      lastTime = performance.now();
    } catch {
      // 생성 실패 시 난이도 하나 낮춰서 재시도
      if (currentDifficulty !== 'easy') {
        const fallback: Record<TDifficulty, TDifficulty> = {
          expert: 'hard',
          hard: 'normal',
          normal: 'easy',
          easy: 'easy',
        };
        currentDifficulty = fallback[currentDifficulty];
        startStage();
      }
    }
  }
```

**Step 4: 커밋 (아직 파일이 완전하지 않으므로 Task 7 완료 후 커밋)**

→ Task 7에서 함께 커밋

---

## Task 6: 게임 로직 — 렌더링 (`game.ts` Part 2)

**Files:**
- Modify: `app/(canvas-mobile)/ripple/_lib/game.ts` (이어서 작성)

**Step 1: 스타트 스크린 렌더링**

```typescript
  // ── 렌더링: 스타트 스크린 ──
  function renderStartScreen() {
    // 배경
    ctx.fillStyle = COLORS.canvasBg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 타이틀
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌊 Ripple', CANVAS_WIDTH / 2, 120);

    // 부제목
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '18px sans-serif';
    ctx.fillText('파문으로 숫자를 맞추는 퍼즐', CANVAS_WIDTH / 2, 170);

    // 시작 안내
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Tap or Press S to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    // 스테이지 정보
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '16px sans-serif';
    ctx.fillText(`Stage ${currentStage} · ${getStageDifficulty(currentStage).toUpperCase()}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

    // 총 점수
    if (totalScore > 0) {
      ctx.fillText(`Total Score: ${totalScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
    }

    // 규칙 요약
    const rules = [
      '돌을 배치하면 파문이 퍼집니다',
      '파문 값: 돌=3, 거리1=2, 거리2=1',
      '파문이 겹치면 값이 합산됩니다',
      '모든 숫자가 맞으면 클리어!',
    ];
    ctx.font = '14px sans-serif';
    ctx.fillStyle = COLORS.textLight;
    rules.forEach((rule, i) => {
      ctx.fillText(rule, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 160 + i * 24);
    });

    // 키보드 안내
    ctx.font = '12px sans-serif';
    ctx.fillStyle = COLORS.cellBorder;
    ctx.fillText('S: Start  |  P: Pause  |  R: Reset  |  H: Hint', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);
  }
```

**Step 2: HUD 렌더링**

```typescript
  // ── 렌더링: HUD ──
  function renderHud() {
    // HUD 배경
    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
    ctx.strokeStyle = COLORS.cellBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HUD_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, HUD_HEIGHT);
    ctx.stroke();

    // 왼쪽: 스테이지 & 난이도
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Stage ${currentStage}`, 16, 28);

    ctx.fillStyle = COLORS.accentDark;
    ctx.font = '14px sans-serif';
    ctx.fillText(currentDifficulty.toUpperCase(), 16, 52);

    // 중앙: 타이머
    const timeDisplay = Math.max(0, Math.floor(elapsedTime));
    const minutes = Math.floor(timeDisplay / 60);
    const seconds = timeDisplay % 60;
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      CANVAS_WIDTH / 2,
      28,
    );

    // 중앙 아래: 돌 배치 현황
    ctx.font = '13px sans-serif';
    ctx.fillStyle = COLORS.textLight;
    ctx.fillText(
      `돌: ${placedStones.length} / ${puzzle?.stoneCount ?? 0}`,
      CANVAS_WIDTH / 2,
      52,
    );

    // 오른쪽: 힌트 버튼
    const hintBtnX = CANVAS_WIDTH - 80;
    const hintBtnY = 15;
    const hintBtnW = 64;
    const hintBtnH = 50;

    ctx.fillStyle = hintsRemaining > 0 ? COLORS.hint : COLORS.buttonDisabled;
    ctx.beginPath();
    ctx.roundRect(hintBtnX, hintBtnY, hintBtnW, hintBtnH, 8);
    ctx.fill();

    ctx.fillStyle = COLORS.textWhite;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💡', hintBtnX + hintBtnW / 2, hintBtnY + 18);
    ctx.font = '12px sans-serif';
    ctx.fillText(`${hintsRemaining}`, hintBtnX + hintBtnW / 2, hintBtnY + 38);
  }
```

**Step 3: 그리드 렌더링**

```typescript
  // ── 렌더링: 그리드 ──
  function renderGrid() {
    const { gridTop, gridLeft, cellSize } = getGridMetrics();

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cell = board[r][c];
        const anim = cellAnims[r][c];
        const x = gridLeft + c * cellSize;
        const y = gridTop + r * cellSize;

        // 셀 배경
        let bgColor = cell.revealed ? COLORS.cellRevealed : COLORS.cellEmpty;
        if (cell.isError) bgColor = COLORS.errorLight;
        if (cell.hasStone && !cell.isError) bgColor = COLORS.accentLight;

        const shakeOffset = anim.shakeTime > 0
          ? Math.sin(anim.shakeTime * 30) * 4
          : 0;

        ctx.save();
        ctx.translate(shakeOffset, 0);

        // 셀 그리기
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 4);
        ctx.fill();

        // 셀 테두리
        ctx.strokeStyle = cell.isError ? COLORS.error : COLORS.cellBorder;
        ctx.lineWidth = cell.isError ? 2 : 1;
        ctx.stroke();

        // 커서 표시 (키보드 네비게이션)
        if (r === cursorRow && c === cursorCol && state === 'playing') {
          ctx.strokeStyle = COLORS.accent;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 4);
          ctx.stroke();
        }

        // 돌 표시
        if (cell.hasStone) {
          const stoneScale = Math.min(anim.scale, 1.3);
          const stoneR = (cellSize * 0.3) * stoneScale;
          const cx = x + cellSize / 2;
          const cy = y + cellSize / 2;

          // 돌 원
          ctx.fillStyle = cell.isHinted ? COLORS.hint : COLORS.stone;
          ctx.beginPath();
          ctx.arc(cx, cy, stoneR, 0, Math.PI * 2);
          ctx.fill();

          // 돌 하이라이트
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.arc(cx - stoneR * 0.2, cy - stoneR * 0.2, stoneR * 0.4, 0, Math.PI * 2);
          ctx.fill();

          // 파문 링 애니메이션
          if (anim.rippleActive) {
            for (let ring = 0; ring < 3; ring++) {
              const t = anim.rippleTime - ring * 0.15;
              if (t < 0 || t > 0.8) continue;
              const progress = t / 0.8;
              const ringR = stoneR + progress * cellSize * 0.5;
              const alpha = 1 - progress;
              ctx.strokeStyle = `rgba(74, 144, 217, ${alpha * 0.5})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }

        // 숫자 표시 (공개된 셀)
        if (cell.revealed && !cell.hasStone) {
          ctx.fillStyle = cell.isError ? COLORS.error : COLORS.text;
          ctx.font = `bold ${cellSize * 0.45}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            String(cell.value),
            x + cellSize / 2,
            y + cellSize / 2,
          );
        }

        // 비공개 빈 셀: 점 표시
        if (!cell.revealed && !cell.hasStone) {
          ctx.fillStyle = COLORS.cellBorder;
          ctx.beginPath();
          ctx.arc(x + cellSize / 2, y + cellSize / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    // 파문 범위 오버레이 (배치된 돌 주변)
    for (const [sr, sc] of placedStones) {
      const { gridTop: gt, gridLeft: gl, cellSize: cs } = getGridMetrics();
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (r === sr && c === sc) continue;
          const dist = Math.abs(r - sr) + Math.abs(c - sc);
          if (dist === 1) {
            ctx.fillStyle = COLORS.ripple1;
            ctx.fillRect(gl + c * cs + 1, gt + r * cs + 1, cs - 2, cs - 2);
          } else if (dist === 2) {
            ctx.fillStyle = COLORS.ripple2;
            ctx.fillRect(gl + c * cs + 1, gt + r * cs + 1, cs - 2, cs - 2);
          }
        }
      }
    }
  }
```

**Step 4: 하단 버튼 & 파티클 & 메인 render 함수**

```typescript
  // ── 렌더링: 하단 버튼 ──
  function renderBottomButtons() {
    const btnY = CANVAS_HEIGHT - 60;
    const btnH = 40;
    const btnW = 80;
    const gap = 20;
    const totalW = btnW * 3 + gap * 2;
    const startX = (CANVAS_WIDTH - totalW) / 2;

    const buttons = [
      { label: '검증', enabled: placedStones.length > 0 },
      { label: '리셋', enabled: placedStones.length > 0 },
    ];

    buttons.forEach((btn, i) => {
      const bx = startX + (btnW + gap) * (i + 0.5);
      ctx.fillStyle = btn.enabled ? COLORS.buttonBg : COLORS.buttonDisabled;
      ctx.beginPath();
      ctx.roundRect(bx, btnY, btnW, btnH, 8);
      ctx.fill();

      ctx.fillStyle = COLORS.textWhite;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, bx + btnW / 2, btnY + btnH / 2);
    });
  }

  // ── 렌더링: 파티클 ──
  function renderParticles() {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'drop') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // sparkle
        const s = p.size;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 3);
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── 메인 render ──
  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = COLORS.canvasBg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (state === 'playing' || state === 'paused' || state === 'gameover') {
      renderGrid();
      renderParticles();
      renderHud();
      renderBottomButtons();
    }

    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
    } else if (state === 'start') {
      renderStartScreen();
    } else if (state === 'paused') {
      gamePauseHud(canvas, ctx);
    } else if (state === 'gameover') {
      gameOverHud.render(score);
    }
  }
```

**Step 5: 커밋 → Task 7에서 함께**

---

## Task 7: 게임 로직 — 입력 처리 & 게임 루프 (`game.ts` Part 3)

**Files:**
- Modify: `app/(canvas-mobile)/ripple/_lib/game.ts` (완성)

**Step 1: 애니메이션 업데이트**

```typescript
  // ── 애니메이션 업데이트 ──
  function updateAnimations(dt: number) {
    // 셀 애니메이션
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const a = cellAnims[r][c];

        // 스케일 복원
        if (a.scale !== 1) {
          a.scale += (1 - a.scale) * dt * 8;
          if (Math.abs(a.scale - 1) < 0.01) a.scale = 1;
        }

        // 흔들림 감소
        if (a.shakeTime > 0) {
          a.shakeTime -= dt;
          if (a.shakeTime < 0) a.shakeTime = 0;
        }

        // 파문 링 애니메이션
        if (a.rippleActive) {
          a.rippleTime += dt;
          if (a.rippleTime > 1) {
            a.rippleActive = false;
            a.rippleTime = 0;
          }
        }

        // 글로우
        if (a.glowTime > 0) {
          a.glowTime -= dt;
        }
      }
    }

    // 파티클
    particles = particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt; // 중력
      p.life -= dt;
      return p.life > 0;
    });

    // 축하 시퀀스
    if (celebration.active) {
      celebration.time += dt;
    }

    // 타이머 업데이트
    if (state === 'playing') {
      elapsedTime += dt;
    }
  }
```

**Step 2: 키보드 핸들러**

```typescript
  // ── 키보드 핸들러 ──
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (state === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    switch (e.code) {
      case 'KeyS':
        if (state === 'start') {
          startStage();
        } else if (state === 'paused') {
          state = 'playing';
          lastTime = performance.now();
        }
        break;

      case 'KeyP':
        if (state === 'playing') {
          state = 'paused';
        } else if (state === 'paused') {
          state = 'playing';
          lastTime = performance.now();
        }
        break;

      case 'KeyR':
        if (state === 'playing') {
          resetBoard();
        }
        break;

      case 'KeyH':
        if (state === 'playing') {
          useHint();
        }
        break;

      case 'KeyV':
        if (state === 'playing') {
          validateBoard();
        }
        break;

      case 'ArrowUp':
        if (state === 'playing') {
          cursorRow = Math.max(0, cursorRow - 1);
        }
        break;

      case 'ArrowDown':
        if (state === 'playing') {
          cursorRow = Math.min(gridSize - 1, cursorRow + 1);
        }
        break;

      case 'ArrowLeft':
        if (state === 'playing') {
          cursorCol = Math.max(0, cursorCol - 1);
        }
        break;

      case 'ArrowRight':
        if (state === 'playing') {
          cursorCol = Math.min(gridSize - 1, cursorCol + 1);
        }
        break;

      case 'Space':
      case 'Enter':
        if (state === 'playing') {
          toggleStone(cursorRow, cursorCol);
        }
        break;
    }
  };
```

**Step 3: 터치 핸들러**

```typescript
  // ── 터치 핸들러 ──
  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getTouchPos(touch);

    if (state === 'gameover') {
      gameOverHud.onTouchStart(pos.x, pos.y, score);
      return;
    }

    if (state === 'start') {
      startStage();
      return;
    }

    if (state === 'loading') return;

    if (state === 'paused') {
      state = 'playing';
      lastTime = performance.now();
      return;
    }

    // playing 상태
    // 힌트 버튼 체크
    const hintBtnX = CANVAS_WIDTH - 80;
    const hintBtnY = 15;
    if (
      pos.x >= hintBtnX && pos.x <= hintBtnX + 64 &&
      pos.y >= hintBtnY && pos.y <= hintBtnY + 50
    ) {
      useHint();
      return;
    }

    // 하단 버튼 체크
    const btnY = CANVAS_HEIGHT - 60;
    const btnH = 40;
    const btnW = 80;
    const gap = 20;
    const totalW = btnW * 2 + gap;
    const startX = (CANVAS_WIDTH - totalW) / 2;

    // 검증 버튼
    const validateBtnX = startX + (btnW + gap) * 0.5;
    if (
      pos.x >= validateBtnX && pos.x <= validateBtnX + btnW &&
      pos.y >= btnY && pos.y <= btnY + btnH
    ) {
      validateBoard();
      return;
    }

    // 리셋 버튼
    const resetBtnX = startX + (btnW + gap) * 1.5;
    if (
      pos.x >= resetBtnX && pos.x <= resetBtnX + btnW &&
      pos.y >= btnY && pos.y <= btnY + btnH
    ) {
      resetBoard();
      return;
    }

    // 그리드 셀 탭
    const cell = getCellFromPos(pos.x, pos.y);
    if (cell) {
      const [row, col] = cell;
      toggleStone(row, col);
    }
  }

  // 마우스 클릭 (데스크탑)
  function handleClick(e: MouseEvent) {
    const pos = getCanvasPos(e.clientX, e.clientY);

    if (state !== 'playing') return;

    // 힌트 버튼
    const hintBtnX = CANVAS_WIDTH - 80;
    const hintBtnY = 15;
    if (
      pos.x >= hintBtnX && pos.x <= hintBtnX + 64 &&
      pos.y >= hintBtnY && pos.y <= hintBtnY + 50
    ) {
      useHint();
      return;
    }

    // 하단 버튼
    const btnY = CANVAS_HEIGHT - 60;
    const btnH = 40;
    const btnW = 80;
    const gap = 20;
    const totalW = btnW * 2 + gap;
    const startX = (CANVAS_WIDTH - totalW) / 2;

    const validateBtnX = startX + (btnW + gap) * 0.5;
    if (pos.x >= validateBtnX && pos.x <= validateBtnX + btnW && pos.y >= btnY && pos.y <= btnY + btnH) {
      validateBoard();
      return;
    }

    const resetBtnX = startX + (btnW + gap) * 1.5;
    if (pos.x >= resetBtnX && pos.x <= resetBtnX + btnW && pos.y >= btnY && pos.y <= btnY + btnH) {
      resetBoard();
      return;
    }

    // 그리드 셀 클릭
    const cell = getCellFromPos(pos.x, pos.y);
    if (cell) {
      toggleStone(cell[0], cell[1]);
    }
  }
```

**Step 4: 게임 루프 & 이벤트 등록 & cleanup**

```typescript
  // ── 게임 루프 ──
  function gameLoop(timestamp: number) {
    const dt = lastTime > 0 ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0;
    lastTime = timestamp;

    if (state === 'playing' || state === 'gameover') {
      updateAnimations(dt);
    }

    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  // ── 이벤트 등록 ──
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', resize);
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // ── cleanup ──
  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', resize);
  };
} // end setupRipple
```

**Step 5: 커밋**

```bash
git add app/\(canvas-mobile\)/ripple/_lib/game.ts
git commit -m "feat(ripple): add game logic, rendering, and input handling"
```

---

## Task 8: React 컴포넌트 (`ripple.tsx`)

**Files:**
- Create: `app/(canvas-mobile)/ripple/_components/ripple.tsx`

**Step 1: 컴포넌트 작성**

```typescript
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupRipple, TRippleCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../_lib/config';

function Ripple() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('ripple');
  const { mutateAsync: createSession } = useGameSession('ripple');
  const isLoggedIn = !!session;

  const updateScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const container = wrapper.parentElement;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scaleX = containerWidth / CANVAS_WIDTH;
    const scaleY = containerHeight / CANVAS_HEIGHT;
    const scale = Math.min(scaleX, scaleY, 1);
    wrapper.style.transform = `scale(${scale})`;
    wrapper.style.transformOrigin = 'top center';
    wrapper.style.height = `${CANVAS_HEIGHT * scale}px`;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TRippleCallbacks = {
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
          gameType: 'ripple',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupRipple(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  return (
    <div className="w-full h-full flex justify-center">
      <div
        ref={wrapperRef}
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <canvas
          ref={canvasRef}
          className="border border-white/20 rounded-2xl shadow-lg touch-none"
        />
      </div>
    </div>
  );
}

export default Ripple;
```

**Step 2: 커밋**

```bash
git add app/\(canvas-mobile\)/ripple/_components/ripple.tsx
git commit -m "feat(ripple): add React canvas component with scaling"
```

---

## Task 9: 레이아웃 & 페이지

**Files:**
- Create: `app/(canvas-mobile)/ripple/layout.tsx`
- Create: `app/(canvas-mobile)/ripple/page.tsx`

**Step 1: layout.tsx 작성**

```typescript
import KameHeader from '@/components/common/KameHeader';

function RippleLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 xl:px-6 py-4 flex flex-col gap-4 xl:gap-10 items-center">
      <KameHeader title="Ripple" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default RippleLayout;
```

**Step 2: page.tsx 작성**

Queens 페이지 패턴을 따름. Tailwind `xl:` 반응형 + Sheet 햄버거 메뉴.

```typescript
'use client';

import { Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import UserProfile from '@/components/auth/UserProfile';
import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useGetScores } from '@/service/scores';
import Ripple from './_components/ripple';

const controls = [
  { key: 'Arrow Keys', action: '셀 이동' },
  { key: 'Space', action: '돌 배치 / 제거' },
  { key: 'V', action: '검증' },
  { key: 'H', action: '힌트 사용' },
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '리셋' },
];

function RipplePage() {
  const { data: session, status } = useSession();
  const { data: scores = [], isLoading } = useGetScores('ripple');

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
          <SheetContent
            side="right"
            className="bg-arcade-bg border-arcade-border overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle className="text-arcade-text">Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-6 p-4">
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">
                  Player
                </h3>
                {status === 'loading' ? (
                  <div className="h-9 bg-arcade-border rounded animate-pulse" />
                ) : session?.user ? (
                  <UserProfile user={session.user} />
                ) : (
                  <GoogleLoginButton />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">
                  Controls
                </h3>
                <ControlInfoTable controls={controls} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">
                  Ranking
                </h3>
                <RankBoard data={scores} isLoading={isLoading} showCountry />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* 데스크탑: 왼쪽 사이드 */}
      <aside className="hidden xl:block shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>

      {/* 게임 캔버스 */}
      <div className="w-full flex-1 min-h-0 xl:flex-initial max-w-[620px]">
        <Ripple />
      </div>

      {/* 데스크탑: 오른쪽 사이드 */}
      <aside className="hidden xl:block shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default RipplePage;
```

**Step 3: 커밋**

```bash
git add app/\(canvas-mobile\)/ripple/layout.tsx app/\(canvas-mobile\)/ripple/page.tsx
git commit -m "feat(ripple): add layout and page with responsive mobile layout"
```

---

## Task 10: 통합 테스트 & 검증

**Step 1: 빌드 확인**

```bash
yarn build
```

Expected: 빌드 성공, 에러 없음

**Step 2: 로컬 실행**

```bash
yarn dev
```

**Step 3: 수동 검증 체크리스트**

데스크탑:
- [ ] `/ripple` 접속 시 스타트 스크린 표시
- [ ] `S` 키로 게임 시작 → 로딩 → 그리드 표시
- [ ] 그리드에 목표 숫자와 빈 셀이 적절히 분포
- [ ] 화살표 키로 커서 이동
- [ ] Space로 돌 배치/제거
- [ ] 돌 배치 시 파문 애니메이션 재생
- [ ] 파문 범위 오버레이 표시 (거리1: 진한, 거리2: 연한)
- [ ] `V` 키로 검증 → 틀린 셀 빨간 하이라이트 + 흔들림
- [ ] `H` 키로 힌트 → 정답 돌 하나 자동 배치
- [ ] `R` 키로 리셋 → 모든 돌 제거
- [ ] `P` 키로 일시정지/재개
- [ ] 모든 돌 정확히 배치 시 → 게임오버 화면
- [ ] 점수 저장/SKIP 동작
- [ ] HUD에 스테이지 번호, 타이머, 힌트 수 표시

모바일:
- [ ] 반응형 스케일링 (CSS transform)
- [ ] 셀 탭으로 돌 배치/제거
- [ ] 햄버거 메뉴에서 로그인/조작법/랭킹 접근 가능
- [ ] 터치로 힌트/검증/리셋 버튼 작동
- [ ] 게임오버 시 터치로 SAVE/SKIP 동작

**Step 4: 이슈 수정 후 최종 커밋**

발견된 이슈를 수정한 후:

```bash
git add -A
git commit -m "fix(ripple): address integration testing issues"
```

---

## 요약

| Task | 설명 | 예상 파일 |
|------|------|----------|
| 1 | 게임 등록 (6개 설정 파일) | 6개 기존 파일 수정 |
| 2 | 타입 정의 | `types.ts` 생성 |
| 3 | 게임 설정 | `config.ts` 생성 |
| 4 | 퍼즐 생성기 | `generator.ts` 생성 |
| 5 | 게임 로직: 상태 & 핵심 | `game.ts` 생성 (Part 1) |
| 6 | 게임 로직: 렌더링 | `game.ts` (Part 2) |
| 7 | 게임 로직: 입력 & 루프 | `game.ts` (Part 3) |
| 8 | React 컴포넌트 | `ripple.tsx` 생성 |
| 9 | 레이아웃 & 페이지 | `layout.tsx`, `page.tsx` 생성 |
| 10 | 통합 테스트 | 수동 검증 |
