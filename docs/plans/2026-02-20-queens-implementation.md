# Queens 퍼즐 게임 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** LinkedIn Queens 스타일의 퍼즐 게임을 canvas-mobile 라우트 그룹으로 구현한다. X 마킹/힌트 시스템을 포함하며, 모바일 터치와 데스크탑 키보드를 모두 지원한다.

**Architecture:** Canvas 2D 기반 NxN 그리드 퍼즐. 퍼즐 생성 알고리즘이 유효한 퍼즐을 자동 생성하고, game.ts에서 키보드+터치 이벤트를 처리한다. 기존 minesweeper 패턴을 그대로 따른다.

**Tech Stack:** Next.js, Canvas 2D API, TypeScript

---

### Task 1: 게임 등록 (6개 파일 수정)

**Files:**
- Modify: `@types/scores.ts:46` — TGameType에 'queens' 추가
- Modify: `lib/config.ts` — MENU_LIST에 Queens 메뉴 추가 (Puzzle 카테고리 마지막, blockpuzzle 뒤)
- Modify: `components/common/GameCard.tsx` — GAME_ICONS에 '/queens' 추가
- Modify: `app/api/game-session/route.ts` — VALID_GAME_TYPES에 'queens' 추가
- Modify: `app/api/scores/route.ts` — VALID_GAME_TYPES에 'queens' 추가
- Modify: `lib/game-security/config.ts` — 보안 설정 추가

**Step 1: TGameType에 추가**

`@types/scores.ts`의 46행 `'blockpuzzle';` 를:
```typescript
  | 'blockpuzzle'
  | 'queens';
```

**Step 2: MENU_LIST에 추가**

`lib/config.ts`의 blockpuzzle 항목 뒤에 추가:
```typescript
  {
    name: {
      kor: '퀸즈',
      eng: 'Queens',
    },
    href: '/queens',
    category: 'Puzzle',
    platform: 'both',
  },
```

**Step 3: GAME_ICONS에 추가**

`components/common/GameCard.tsx`에서:
- import에 `Crown` 추가
- GAME_ICONS에 `'/queens': Crown,` 추가 (blockpuzzle 뒤)

**Step 4: VALID_GAME_TYPES에 추가 (2개 파일)**

`app/api/game-session/route.ts`와 `app/api/scores/route.ts` 모두:
```typescript
  'queens',
```
를 배열 마지막에 추가.

**Step 5: 보안 설정 추가**

`lib/game-security/config.ts`의 blockpuzzle 뒤에:
```typescript
  queens: { maxScore: 1800, minPlayTimeSeconds: 15 },
```
(maxScore = Hard 기준: 3 × max(0, 600 - 0) = 1800)

**Step 6: Commit**

```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat(queens): register game type in 6 required files"
```

---

### Task 2: 타입 정의 (`_lib/types.ts`)

**Files:**
- Create: `app/(canvas-mobile)/queens/_lib/types.ts`

**Step 1: 타입 파일 작성**

```typescript
export type TDifficulty = 'easy' | 'normal' | 'hard';

export type TCellState = 'empty' | 'cross' | 'queen';

export type TCell = {
  region: number;       // 색상 영역 인덱스 (0 ~ N-1)
  state: TCellState;    // 현재 셀 상태
  isError: boolean;     // 충돌 표시
  isHinted: boolean;    // 힌트로 채워진 셀
};

export type TBoard = TCell[][];

export type TSolution = boolean[][]; // true = 퀸 위치

export type TPuzzle = {
  size: number;
  regions: number[][];  // 영역 맵 (각 셀의 영역 인덱스)
  solution: TSolution;  // 정답
};

export type TDifficultyConfig = {
  size: number;
  baseTime: number;
  multiplier: number;
  hints: number;
};
```

**Step 2: Commit**

```bash
git add app/\(canvas-mobile\)/queens/_lib/types.ts
git commit -m "feat(queens): add type definitions"
```

---

### Task 3: 게임 설정 (`_lib/config.ts`)

**Files:**
- Create: `app/(canvas-mobile)/queens/_lib/config.ts`

**Step 1: 설정 파일 작성**

```typescript
import { TGameMeta } from '@/@types/game-meta';
import { TDifficulty, TDifficultyConfig } from './types';

export const GAME_META: TGameMeta = {
  id: 'queens',
  title: 'Queens',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'puzzle',
  difficulty: 'selectable',
};

export const CANVAS_WIDTH = 620;
export const CANVAS_HEIGHT = 700;

export const HUD_HEIGHT = 80;
export const GRID_PADDING = 20;
export const HINT_PENALTY_SECONDS = 30;

export const DIFFICULTY_CONFIG: Record<TDifficulty, TDifficultyConfig> = {
  easy: { size: 5, baseTime: 120, multiplier: 1, hints: 3 },
  normal: { size: 7, baseTime: 300, multiplier: 2, hints: 2 },
  hard: { size: 9, baseTime: 600, multiplier: 3, hints: 1 },
};

// 파스텔 톤 영역 색상 (최대 9개 영역)
export const REGION_COLORS = [
  '#A8D8EA', // 하늘
  '#FFB7B2', // 핑크
  '#B5EAD7', // 민트
  '#FFDAC1', // 살구
  '#E2B6CF', // 라벤더
  '#C7CEEA', // 퍼플블루
  '#F3E8A3', // 레몬
  '#D4A5A5', // 로즈
  '#A0E7E5', // 틸
];
```

**Step 2: Commit**

```bash
git add app/\(canvas-mobile\)/queens/_lib/config.ts
git commit -m "feat(queens): add game configuration and constants"
```

---

### Task 4: 퍼즐 생성 알고리즘 (`_lib/generator.ts`)

**Files:**
- Create: `app/(canvas-mobile)/queens/_lib/generator.ts`

**Step 1: 생성기 작성**

```typescript
import { TPuzzle } from './types';

// 인접 불가 조건 포함 N-Queens 배치 생성
function generateQueenPlacement(n: number): [number, number][] | null {
  const cols = new Array(n).fill(-1); // cols[row] = col

  function isValid(row: number, col: number): boolean {
    for (let r = 0; r < row; r++) {
      const c = cols[r];
      // 같은 열
      if (c === col) return false;
      // 대각선 (체스 퀸 이동)
      if (Math.abs(r - row) === Math.abs(c - col)) return false;
      // 인접 (8방향) — 바로 이전 행만 체크하면 됨
      if (row - r === 1 && Math.abs(c - col) <= 1) return false;
    }
    return true;
  }

  // 랜덤 백트래킹
  function solve(row: number): boolean {
    if (row === n) return true;
    const order = shuffle([...Array(n)].map((_, i) => i));
    for (const col of order) {
      if (isValid(row, col)) {
        cols[row] = col;
        if (solve(row + 1)) return true;
        cols[row] = -1;
      }
    }
    return false;
  }

  if (!solve(0)) return null;
  return cols.map((col, row) => [row, col] as [number, number]);
}

// Fisher-Yates 셔플
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 퀸 위치를 시드로 Flood-fill 영역 생성
function generateRegions(n: number, queens: [number, number][]): number[][] {
  const regions: number[][] = Array.from({ length: n }, () => new Array(n).fill(-1));

  // 각 퀸 위치를 해당 영역의 시드로 설정
  queens.forEach(([r, c], idx) => {
    regions[r][c] = idx;
  });

  // BFS로 영역 확장 (모든 영역 동시 확장)
  const queues: [number, number][][] = queens.map(([r, c]) => [[r, c]]);
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  let hasUnfilled = true;
  while (hasUnfilled) {
    hasUnfilled = false;
    const order = shuffle([...Array(n)].map((_, i) => i));
    for (const idx of order) {
      if (queues[idx].length === 0) continue;
      const nextQueue: [number, number][] = [];
      const shuffledQueue = shuffle([...queues[idx]]);
      for (const [r, c] of shuffledQueue) {
        const shuffledDirs = shuffle([...dirs]);
        for (const [dr, dc] of shuffledDirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr][nc] === -1) {
            regions[nr][nc] = idx;
            nextQueue.push([nr, nc]);
          }
        }
      }
      queues[idx] = nextQueue;
      if (nextQueue.length > 0) hasUnfilled = true;
    }
    // 아직 빈 칸이 있는지 확인
    if (!hasUnfilled) {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (regions[r][c] === -1) {
            hasUnfilled = true;
            break;
          }
        }
        if (hasUnfilled) break;
      }
      if (hasUnfilled) {
        // 빈 칸이 남았지만 큐가 비었으면 인접한 영역에 할당
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            if (regions[r][c] === -1) {
              for (const [dr, dc] of dirs) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr][nc] !== -1) {
                  regions[r][c] = regions[nr][nc];
                  queues[regions[nr][nc]].push([r, c]);
                  break;
                }
              }
            }
          }
        }
      }
    }
  }

  return regions;
}

// 유일해 검증 (백트래킹)
function hasUniqueSolution(n: number, regions: number[][]): boolean {
  let solutionCount = 0;
  const cols = new Array(n).fill(-1);
  const usedCols = new Set<number>();
  const usedRegions = new Set<number>();

  function isValid(row: number, col: number): boolean {
    if (usedCols.has(col)) return false;
    if (usedRegions.has(regions[row][col])) return false;
    // 인접 체크 (이전 행)
    if (row > 0) {
      const prevCol = cols[row - 1];
      if (Math.abs(prevCol - col) <= 1) return false;
    }
    return true;
  }

  function solve(row: number): boolean {
    if (row === n) {
      solutionCount++;
      return solutionCount > 1; // 2개 이상이면 조기 종료
    }
    for (let col = 0; col < n; col++) {
      if (isValid(row, col)) {
        cols[row] = col;
        usedCols.add(col);
        usedRegions.add(regions[row][col]);
        if (solve(row + 1)) return true;
        usedCols.delete(col);
        usedRegions.delete(regions[row][col]);
        cols[row] = -1;
      }
    }
    return false;
  }

  solve(0);
  return solutionCount === 1;
}

// 메인 퍼즐 생성 함수
export function generatePuzzle(size: number): TPuzzle {
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const queens = generateQueenPlacement(size);
    if (!queens) continue;

    // 영역 생성을 여러 번 시도
    for (let regionAttempt = 0; regionAttempt < 5; regionAttempt++) {
      const regions = generateRegions(size, queens);

      // 모든 셀이 채워졌는지 확인
      let allFilled = true;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (regions[r][c] === -1) { allFilled = false; break; }
        }
        if (!allFilled) break;
      }
      if (!allFilled) continue;

      // 유일해 검증
      if (hasUniqueSolution(size, regions)) {
        const solution: boolean[][] = Array.from({ length: size }, () =>
          new Array(size).fill(false)
        );
        queens.forEach(([r, c]) => { solution[r][c] = true; });
        return { size, regions, solution };
      }
    }
  }

  // 폴백: 계속 시도
  return generatePuzzle(size);
}
```

**Step 2: Commit**

```bash
git add app/\(canvas-mobile\)/queens/_lib/generator.ts
git commit -m "feat(queens): add puzzle generation algorithm"
```

---

### Task 5: 게임 로직 (`_lib/game.ts`)

**Files:**
- Create: `app/(canvas-mobile)/queens/_lib/game.ts`

**주의: 이 파일은 가장 크고 핵심적인 파일입니다. 반드시 기존 minesweeper/game.ts 패턴을 따라야 합니다.**

**Step 1: game.ts 작성**

파일이 길므로 주요 구조만 기술합니다. 반드시 다음 순서를 따르세요:

```typescript
import {
  createGameOverHud,
  gameLoadingHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { CANVAS_WIDTH, CANVAS_HEIGHT, HUD_HEIGHT, GRID_PADDING, DIFFICULTY_CONFIG, REGION_COLORS, HINT_PENALTY_SECONDS } from './config';
import { TDifficulty, TCell, TBoard, TCellState } from './types';
import { generatePuzzle } from './generator';

export type TQueensCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export function setupQueens(
  canvas: HTMLCanvasElement,
  callbacks?: TQueensCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;

  // 1. DPR resize
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  // 2. 게임 상태
  let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' = 'start';
  let difficulty: TDifficulty = 'easy';
  let board: TBoard = [];
  let puzzle = generatePuzzle(DIFFICULTY_CONFIG[difficulty].size);
  let score = 0;
  let elapsedTime = 0;
  let lastTime = 0;
  let hintsRemaining = DIFFICULTY_CONFIG[difficulty].hints;
  let hintPenalty = 0;
  let cursorRow = 0;
  let cursorCol = 0;
  let animationId = 0;

  // 3. gameOverHud 초기화
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      if (callbacks?.onScoreSave) return callbacks.onScoreSave(finalScore);
      return { saved: false };
    },
    onRestart: () => resetGame(),
  };
  const gameOverHud = createGameOverHud(canvas, ctx, 'queens', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  // 4. 보드 초기화
  function initBoard() {
    const config = DIFFICULTY_CONFIG[difficulty];
    puzzle = generatePuzzle(config.size);
    board = Array.from({ length: config.size }, (_, r) =>
      Array.from({ length: config.size }, (_, c) => ({
        region: puzzle.regions[r][c],
        state: 'empty' as TCellState,
        isError: false,
        isHinted: false,
      }))
    );
    hintsRemaining = config.hints;
    hintPenalty = 0;
    elapsedTime = 0;
    lastTime = 0;
    cursorRow = 0;
    cursorCol = 0;
  }
  initBoard();

  // 5. 좌표 변환 헬퍼
  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };
  const getTouchPos = (touch: Touch) => getCanvasPos(touch.clientX, touch.clientY);

  // 6. 그리드 좌표 계산
  function getGridMetrics() {
    const config = DIFFICULTY_CONFIG[difficulty];
    const n = config.size;
    const gridSize = Math.min(CANVAS_WIDTH - GRID_PADDING * 2, CANVAS_HEIGHT - HUD_HEIGHT - GRID_PADDING * 2);
    const cellSize = gridSize / n;
    const gridX = (CANVAS_WIDTH - gridSize) / 2;
    const gridY = HUD_HEIGHT + (CANVAS_HEIGHT - HUD_HEIGHT - gridSize) / 2;
    return { n, gridSize, cellSize, gridX, gridY };
  }

  // 7. 캔버스 좌표 → 셀 인덱스
  function getCellFromPos(px: number, py: number): { row: number; col: number } | null {
    const { n, cellSize, gridX, gridY } = getGridMetrics();
    const col = Math.floor((px - gridX) / cellSize);
    const row = Math.floor((py - gridY) / cellSize);
    if (row < 0 || row >= n || col < 0 || col >= n) return null;
    return { row, col };
  }

  // 8. 셀 토글 (empty → cross → queen → empty)
  function toggleCell(row: number, col: number) {
    if (state !== 'playing') return;
    const cell = board[row][col];
    if (cell.isHinted) return; // 힌트된 셀은 변경 불가

    const next: Record<TCellState, TCellState> = {
      empty: 'cross',
      cross: 'queen',
      queen: 'empty',
    };
    cell.state = next[cell.state];
    cell.isError = false;

    if (cell.state === 'queen') {
      validateAndCheckWin();
    }
  }

  // 9. 유효성 검사 + 승리 조건 체크
  function validateAndCheckWin() {
    const { n } = getGridMetrics();
    let hasError = false;

    // 모든 에러 초기화
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        board[r][c].isError = false;
      }
    }

    // 퀸 위치 수집
    const queens: [number, number][] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c].state === 'queen') queens.push([r, c]);
      }
    }

    // 충돌 검사
    for (let i = 0; i < queens.length; i++) {
      for (let j = i + 1; j < queens.length; j++) {
        const [r1, c1] = queens[i];
        const [r2, c2] = queens[j];
        let conflict = false;

        // 같은 행
        if (r1 === r2) conflict = true;
        // 같은 열
        if (c1 === c2) conflict = true;
        // 같은 영역
        if (board[r1][c1].region === board[r2][c2].region) conflict = true;
        // 인접 (8방향)
        if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1) conflict = true;

        if (conflict) {
          board[r1][c1].isError = true;
          board[r2][c2].isError = true;
          hasError = true;
        }
      }
    }

    // 승리 조건: 에러 없고 퀸 N개 배치
    if (!hasError && queens.length === n) {
      handleWin();
    }
  }

  // 10. 승리 처리
  function handleWin() {
    const config = DIFFICULTY_CONFIG[difficulty];
    const totalTime = elapsedTime + hintPenalty;
    score = Math.floor(config.multiplier * Math.max(0, config.baseTime - totalTime));
    state = 'gameover';
  }

  // 11. 힌트
  function useHint() {
    if (state !== 'playing' || hintsRemaining <= 0) return;
    const { n } = getGridMetrics();

    // 아직 올바르게 채워지지 않은 셀 중 하나를 랜덤 선택
    const candidates: [number, number][] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c].isHinted) continue;
        const shouldBeQueen = puzzle.solution[r][c];
        if (shouldBeQueen && board[r][c].state !== 'queen') {
          candidates.push([r, c]);
        } else if (!shouldBeQueen && board[r][c].state !== 'cross') {
          candidates.push([r, c]);
        }
      }
    }

    if (candidates.length === 0) return;

    const [hr, hc] = candidates[Math.floor(Math.random() * candidates.length)];
    board[hr][hc].state = puzzle.solution[hr][hc] ? 'queen' : 'cross';
    board[hr][hc].isHinted = true;
    board[hr][hc].isError = false;
    hintsRemaining--;
    hintPenalty += HINT_PENALTY_SECONDS;

    validateAndCheckWin();
  }

  // 12. 게임 시작/리셋
  async function startGame() {
    state = 'loading';
    if (callbacks?.onGameStart) {
      try { await callbacks.onGameStart(); } catch (e) { console.error(e); }
    }
    initBoard();
    state = 'playing';
  }

  function resetGame() {
    gameOverHud.reset();
    score = 0;
    state = 'start';
    initBoard();
  }

  // 13. 난이도 선택 화면의 버튼 영역
  function getDifficultyButtonBounds() {
    const btnWidth = 120;
    const btnHeight = 40;
    const gap = 20;
    const totalWidth = btnWidth * 3 + gap * 2;
    const startX = (CANVAS_WIDTH - totalWidth) / 2;
    const y = CANVAS_HEIGHT / 2 - 20;
    return (['easy', 'normal', 'hard'] as TDifficulty[]).map((d, i) => ({
      difficulty: d,
      x: startX + i * (btnWidth + gap),
      y,
      width: btnWidth,
      height: btnHeight,
    }));
  }

  // HUD 힌트 버튼 영역
  function getHintButtonBounds() {
    return { x: CANVAS_WIDTH - 120, y: 15, width: 100, height: 36 };
  }

  // 14. 이벤트 핸들러
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (state === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    switch (e.code) {
      case 'KeyS':
        if (state === 'start') startGame();
        else if (state === 'paused') { state = 'playing'; lastTime = 0; }
        break;
      case 'KeyP':
        if (state === 'playing') state = 'paused';
        break;
      case 'KeyR':
        resetGame();
        break;
      case 'KeyH':
        useHint();
        break;
      case 'ArrowUp':
        if (state === 'playing') cursorRow = Math.max(0, cursorRow - 1);
        break;
      case 'ArrowDown':
        if (state === 'playing') cursorRow = Math.min(DIFFICULTY_CONFIG[difficulty].size - 1, cursorRow + 1);
        break;
      case 'ArrowLeft':
        if (state === 'playing') cursorCol = Math.max(0, cursorCol - 1);
        break;
      case 'ArrowRight':
        if (state === 'playing') cursorCol = Math.min(DIFFICULTY_CONFIG[difficulty].size - 1, cursorCol + 1);
        break;
      case 'Space':
        e.preventDefault();
        if (state === 'playing') toggleCell(cursorRow, cursorCol);
        break;
      case 'Digit1':
        if (state === 'start') { difficulty = 'easy'; initBoard(); startGame(); }
        break;
      case 'Digit2':
        if (state === 'start') { difficulty = 'normal'; initBoard(); startGame(); }
        break;
      case 'Digit3':
        if (state === 'start') { difficulty = 'hard'; initBoard(); startGame(); }
        break;
    }
  };

  function handleClick(e: MouseEvent) {
    const pos = getCanvasPos(e.clientX, e.clientY);

    if (state === 'start') {
      const buttons = getDifficultyButtonBounds();
      for (const btn of buttons) {
        if (pos.x >= btn.x && pos.x <= btn.x + btn.width &&
            pos.y >= btn.y && pos.y <= btn.y + btn.height) {
          difficulty = btn.difficulty;
          startGame();
          return;
        }
      }
      return;
    }

    if (state === 'playing') {
      // 힌트 버튼 체크
      const hint = getHintButtonBounds();
      if (pos.x >= hint.x && pos.x <= hint.x + hint.width &&
          pos.y >= hint.y && pos.y <= hint.y + hint.height) {
        useHint();
        return;
      }

      // 셀 클릭
      const cell = getCellFromPos(pos.x, pos.y);
      if (cell) {
        cursorRow = cell.row;
        cursorCol = cell.col;
        toggleCell(cell.row, cell.col);
      }
    }
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getTouchPos(touch);

    if (state === 'gameover') {
      gameOverHud.onTouchStart(pos.x, pos.y, score);
      return;
    }

    if (state === 'start') {
      const buttons = getDifficultyButtonBounds();
      for (const btn of buttons) {
        if (pos.x >= btn.x && pos.x <= btn.x + btn.width &&
            pos.y >= btn.y && pos.y <= btn.y + btn.height) {
          difficulty = btn.difficulty;
          startGame();
          return;
        }
      }
      return;
    }

    if (state === 'loading') return;

    if (state === 'paused') {
      state = 'playing';
      lastTime = 0;
      return;
    }

    if (state === 'playing') {
      // 힌트 버튼 체크
      const hint = getHintButtonBounds();
      if (pos.x >= hint.x && pos.x <= hint.x + hint.width &&
          pos.y >= hint.y && pos.y <= hint.y + hint.height) {
        useHint();
        return;
      }

      // 셀 탭
      const cell = getCellFromPos(pos.x, pos.y);
      if (cell) {
        cursorRow = cell.row;
        cursorCol = cell.col;
        toggleCell(cell.row, cell.col);
      }
    }
  }

  // 15. 렌더링
  function renderStartScreen() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 타이틀
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Queens', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Select difficulty to start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 45);

    // 난이도 버튼
    const buttons = getDifficultyButtonBounds();
    const labels = ['Easy (5x5)', 'Normal (7x7)', 'Hard (9x9)'];
    buttons.forEach((btn, i) => {
      ctx.fillStyle = btn.difficulty === difficulty ? '#00fff5' : '#2a2a4a';
      ctx.strokeStyle = '#00fff5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = btn.difficulty === difficulty ? '#1a1a2e' : 'white';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], btn.x + btn.width / 2, btn.y + btn.height / 2);
    });

    // 키보드 안내
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('1: Easy  2: Normal  3: Hard', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    ctx.fillText('Arrow keys + Space to play', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
  }

  function renderHud() {
    // 배경
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);

    // 타이머
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = Math.floor(elapsedTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    ctx.fillStyle = 'white';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⏱ ${timeStr}`, 20, HUD_HEIGHT / 2);

    // 난이도 표시
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#00fff5';
    ctx.textAlign = 'center';
    ctx.fillText(difficulty.toUpperCase(), CANVAS_WIDTH / 2, HUD_HEIGHT / 2);

    // 힌트 버튼
    const hint = getHintButtonBounds();
    ctx.fillStyle = hintsRemaining > 0 ? '#2a2a4a' : '#1a1a1a';
    ctx.strokeStyle = hintsRemaining > 0 ? '#00fff5' : '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(hint.x, hint.y, hint.width, hint.height, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = hintsRemaining > 0 ? 'white' : '#555';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`💡 Hint (${hintsRemaining})`, hint.x + hint.width / 2, hint.y + hint.height / 2);

    // 하단 구분선
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HUD_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, HUD_HEIGHT);
    ctx.stroke();
  }

  function renderGrid() {
    const { n, cellSize, gridX, gridY } = getGridMetrics();

    // 셀 그리기
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cell = board[r][c];
        const x = gridX + c * cellSize;
        const y = gridY + r * cellSize;

        // 영역 색상 배경
        ctx.fillStyle = cell.isError ? '#ff4444' : REGION_COLORS[cell.region % REGION_COLORS.length];
        ctx.fillRect(x, y, cellSize, cellSize);

        // 셀 테두리
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);

        // 셀 내용
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;

        if (cell.state === 'cross') {
          // X 마킹
          ctx.strokeStyle = cell.isHinted ? '#0088ff' : 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 2;
          const padding = cellSize * 0.3;
          ctx.beginPath();
          ctx.moveTo(x + padding, y + padding);
          ctx.lineTo(x + cellSize - padding, y + cellSize - padding);
          ctx.moveTo(x + cellSize - padding, y + padding);
          ctx.lineTo(x + padding, y + cellSize - padding);
          ctx.stroke();
        } else if (cell.state === 'queen') {
          // 퀸 (원형 마커)
          ctx.fillStyle = cell.isHinted ? '#0088ff' : cell.isError ? 'white' : '#1a1a2e';
          ctx.beginPath();
          ctx.arc(cx, cy, cellSize * 0.28, 0, Math.PI * 2);
          ctx.fill();

          // 퀸 내부에 작은 왕관 표시
          ctx.fillStyle = cell.isError ? '#ff4444' : 'white';
          ctx.font = `${cellSize * 0.35}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('♛', cx, cy);
        }

        // 커서 하이라이트 (데스크탑)
        if (r === cursorRow && c === cursorCol && state === 'playing') {
          ctx.strokeStyle = '#00fff5';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 1.5, y + 1.5, cellSize - 3, cellSize - 3);
        }
      }
    }

    // 영역 경계선 (두꺼운 선)
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2.5;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const x = gridX + c * cellSize;
        const y = gridY + r * cellSize;
        const region = board[r][c].region;
        // 오른쪽 이웃과 다른 영역이면 세로 경계
        if (c < n - 1 && board[r][c + 1].region !== region) {
          ctx.beginPath();
          ctx.moveTo(x + cellSize, y);
          ctx.lineTo(x + cellSize, y + cellSize);
          ctx.stroke();
        }
        // 아래 이웃과 다른 영역이면 가로 경계
        if (r < n - 1 && board[r + 1][c].region !== region) {
          ctx.beginPath();
          ctx.moveTo(x, y + cellSize);
          ctx.lineTo(x + cellSize, y + cellSize);
          ctx.stroke();
        }
      }
    }

    // 외곽 테두리
    const { gridSize } = getGridMetrics();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(gridX, gridY, gridSize, gridSize);
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (state === 'start') {
      renderStartScreen();
      return;
    }

    // 게임 배경
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    renderHud();
    renderGrid();

    if (state === 'loading') gameLoadingHud(canvas, ctx);
    else if (state === 'paused') gamePauseHud(canvas, ctx);
    else if (state === 'gameover') gameOverHud.render(score);
  }

  // 16. 게임 루프
  function gameLoop(timestamp: number) {
    if (state === 'playing') {
      if (lastTime === 0) lastTime = timestamp;
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      elapsedTime += dt;
    }

    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  // 17. 이벤트 등록
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', resize);
  animationId = requestAnimationFrame(gameLoop);

  // 18. cleanup
  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', resize);
  };
}
```

**Step 2: Commit**

```bash
git add app/\(canvas-mobile\)/queens/_lib/game.ts
git commit -m "feat(queens): add main game logic with keyboard and touch support"
```

---

### Task 6: 게임 컴포넌트 (`_components/queens.tsx`)

**Files:**
- Create: `app/(canvas-mobile)/queens/_components/queens.tsx`

**Step 1: 컴포넌트 작성**

```typescript
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupQueens, TQueensCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../_lib/config';

function Queens() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('queens');
  const { mutateAsync: createSession } = useGameSession('queens');
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
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TQueensCallbacks = {
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
          gameType: 'queens',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupQueens(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

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

export default Queens;
```

**Step 2: Commit**

```bash
git add app/\(canvas-mobile\)/queens/_components/queens.tsx
git commit -m "feat(queens): add game component with CSS transform scaling"
```

---

### Task 7: 레이아웃 및 페이지 (`layout.tsx`, `page.tsx`)

**Files:**
- Create: `app/(canvas-mobile)/queens/layout.tsx`
- Create: `app/(canvas-mobile)/queens/page.tsx`

**Step 1: layout.tsx 작성**

```typescript
import KameHeader from '@/components/common/KameHeader';

function QueensLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 xl:px-6 py-4 flex flex-col gap-4 xl:gap-10 items-center">
      <KameHeader title="Queens" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default QueensLayout;
```

**Step 2: page.tsx 작성**

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { Menu } from 'lucide-react';
import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import UserProfile from '@/components/auth/UserProfile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useGetScores } from '@/service/scores';
import Queens from './_components/queens';

const controls = [
  { key: '1 / 2 / 3', action: '난이도 선택' },
  { key: 'Arrow Keys', action: '셀 이동' },
  { key: 'Space', action: 'X → 퀸 → 비우기' },
  { key: 'H', action: '힌트 사용' },
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
];

function QueensPage() {
  const { data: session, status } = useSession();
  const { data: scores = [], isLoading } = useGetScores('queens');

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
        <Queens />
      </div>

      {/* 데스크탑: 오른쪽 사이드 */}
      <aside className="hidden xl:block shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default QueensPage;
```

**Step 3: Commit**

```bash
git add app/\(canvas-mobile\)/queens/layout.tsx app/\(canvas-mobile\)/queens/page.tsx
git commit -m "feat(queens): add layout and page with responsive mobile menu"
```

---

### Task 8: 통합 테스트 및 수정

**Step 1: 개발 서버 실행 및 확인**

```bash
yarn dev
```

브라우저에서 `/queens` 접속하여 확인:
- [ ] 시작 화면에 난이도 선택 버튼 3개 표시
- [ ] 각 난이도 클릭 시 해당 크기 그리드 생성
- [ ] 셀 클릭으로 X → 퀸 → 빈칸 순환
- [ ] 잘못된 퀸 배치 시 빨간색 표시
- [ ] 퀸 N개 올바르게 배치 시 게임 오버 (점수 표시)
- [ ] 힌트 버튼 동작
- [ ] 키보드 조작 (방향키 + Space)
- [ ] 타이머 동작
- [ ] 게임 오버 시 SAVE/SKIP 버튼 동작
- [ ] 모바일 뷰에서 터치 동작
- [ ] 모바일 햄버거 메뉴 동작
- [ ] 메인 메뉴에서 Queens 카드 표시

**Step 2: 발견된 버그 수정**

**Step 3: 최종 Commit**

```bash
git add -A
git commit -m "feat(queens): fix integration issues"
```
