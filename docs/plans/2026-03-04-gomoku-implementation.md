# Gomoku (오목) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 렌주 규칙이 적용된 15x15 오목 게임을 싱글 AI 대전 + 멀티플레이어 WebSocket 대전으로 구현한다.

**Architecture:** 공유 라이브러리(`lib/gomoku/`)에 보드 로직, 렌주 규칙, AI 엔진을 분리하고, 싱글(`(canvas-mobile)/gomoku`)과 멀티(`(multi)/gomoku-online`)가 이를 공유한다. 기존 canvas-mobile 패턴(CSS transform 스케일링, 터치 이벤트, 햄버거 메뉴)과 멀티플레이어 패턴(Socket.IO, Room/RoomManager)을 그대로 따른다.

**Tech Stack:** Next.js 15 (App Router), Canvas 2D, Socket.IO, TypeScript, Tailwind CSS

**Design Doc:** `docs/plans/2026-03-04-gomoku-design.md`

---

## Phase 1: 공유 라이브러리 (lib/gomoku/)

### Task 1: 타입 & 상수 정의

**Files:**
- Create: `lib/gomoku/types.ts`
- Create: `lib/gomoku/constants.ts`

**Step 1: 공유 타입 작성**

```typescript
// lib/gomoku/types.ts
export type TStone = 0 | 1 | 2; // 0: 빈칸, 1: 흑, 2: 백
export type TBoard = TStone[][];
export type TPosition = { x: number; y: number };
export type TMove = TPosition & { stone: TStone };
export type TGameResult = {
  winner: TStone; // 0: 진행중/무승부, 1: 흑 승, 2: 백 승
  winLine: TPosition[] | null;
};
export type TDifficulty = 'beginner' | 'easy' | 'medium' | 'hard';
export type TDirection = [number, number]; // [dx, dy]
```

**Step 2: 상수 작성**

```typescript
// lib/gomoku/constants.ts
export const BOARD_SIZE = 15;
export const WIN_COUNT = 5;
export const DIRECTIONS: [number, number][] = [
  [1, 0],  // 가로
  [0, 1],  // 세로
  [1, 1],  // 대각선 ↘
  [1, -1], // 대각선 ↗
];
// 화점 좌표 (표준 오목 화점)
export const STAR_POINTS: [number, number][] = [
  [3, 3], [3, 11], [7, 7], [11, 3], [11, 11],
];
```

**Step 3: Commit**

```bash
git add lib/gomoku/types.ts lib/gomoku/constants.ts
git commit -m "feat(gomoku): add shared types and constants"
```

---

### Task 2: 보드 로직 (board.ts)

**Files:**
- Create: `lib/gomoku/board.ts`

**Step 1: 보드 유틸리티 구현**

```typescript
// lib/gomoku/board.ts
import { TBoard, TStone, TPosition, TGameResult } from './types';
import { BOARD_SIZE, WIN_COUNT, DIRECTIONS } from './constants';

/** 빈 보드 생성 */
export function createBoard(): TBoard {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(0) as TStone[]
  );
}

/** 보드 범위 내인지 확인 */
export function isInBounds(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

/** 돌 놓기 (유효성 검사 포함) */
export function placeStone(board: TBoard, x: number, y: number, stone: TStone): boolean {
  if (!isInBounds(x, y) || board[y][x] !== 0 || stone === 0) return false;
  board[y][x] = stone;
  return true;
}

/** 특정 방향으로 연속된 같은 돌 수 세기 */
export function countInDirection(
  board: TBoard, x: number, y: number, dx: number, dy: number, stone: TStone
): number {
  let count = 0;
  let cx = x + dx;
  let cy = y + dy;
  while (isInBounds(cx, cy) && board[cy][cx] === stone) {
    count++;
    cx += dx;
    cy += dy;
  }
  return count;
}

/** 승리 판정 - 5목 이상 확인 (백은 6목 이상도 승리) */
export function checkWin(board: TBoard, x: number, y: number): TGameResult {
  const stone = board[y][x];
  if (stone === 0) return { winner: 0, winLine: null };

  for (const [dx, dy] of DIRECTIONS) {
    const count1 = countInDirection(board, x, y, dx, dy, stone);
    const count2 = countInDirection(board, x, y, -dx, -dy, stone);
    const total = count1 + count2 + 1;

    if (stone === 1 && total === WIN_COUNT) {
      // 흑: 정확히 5목만 승리 (장목은 금수 → renju.ts에서 처리)
      const line = buildWinLine(x, y, dx, dy, count1, count2);
      return { winner: 1, winLine: line };
    }
    if (stone === 2 && total >= WIN_COUNT) {
      // 백: 5목 이상 승리
      const line = buildWinLine(x, y, dx, dy, count1, count2);
      return { winner: 2, winLine: line };
    }
  }
  return { winner: 0, winLine: null };
}

/** 승리 라인 좌표 배열 생성 */
function buildWinLine(
  x: number, y: number, dx: number, dy: number, count1: number, count2: number
): TPosition[] {
  const line: TPosition[] = [];
  for (let i = -count2; i <= count1; i++) {
    line.push({ x: x + dx * i, y: y + dy * i });
  }
  return line;
}

/** 무승부 판정 (빈 칸이 없으면 무승부) */
export function isDraw(board: TBoard): boolean {
  return board.every(row => row.every(cell => cell !== 0));
}

/** 빈 칸 목록 반환 */
export function getEmptyPositions(board: TBoard): TPosition[] {
  const positions: TPosition[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === 0) positions.push({ x, y });
    }
  }
  return positions;
}
```

**Step 2: Commit**

```bash
git add lib/gomoku/board.ts
git commit -m "feat(gomoku): add board logic with win detection"
```

---

### Task 3: 렌주 규칙 (renju.ts)

**Files:**
- Create: `lib/gomoku/renju.ts`

**Step 1: 렌주 규칙 구현**

렌주 규칙은 흑돌에만 적용되며, 3가지 금수를 감지한다:
- **3-3 금수**: 두 개의 열린 3이 동시에 형성
- **4-4 금수**: 두 개의 4가 동시에 형성
- **장목 금수**: 6목 이상 형성

핵심 함수:
```typescript
// lib/gomoku/renju.ts
import { TBoard, TPosition } from './types';
import { BOARD_SIZE, DIRECTIONS } from './constants';
import { isInBounds, countInDirection } from './board';

/** 해당 위치가 흑돌의 금수인지 판정 */
export function isForbidden(board: TBoard, x: number, y: number): boolean {
  if (board[y][x] !== 0) return false;

  // 임시로 흑돌 배치
  board[y][x] = 1;
  const forbidden = isOverline(board, x, y) ||
                    isDoubleFour(board, x, y) ||
                    isDoubleThree(board, x, y);
  board[y][x] = 0; // 복원
  return forbidden;
}

/** 장목 (6목 이상) 판정 */
function isOverline(board: TBoard, x: number, y: number): boolean {
  for (const [dx, dy] of DIRECTIONS) {
    const c1 = countInDirection(board, x, y, dx, dy, 1);
    const c2 = countInDirection(board, x, y, -dx, -dy, 1);
    if (c1 + c2 + 1 >= 6) return true;
  }
  return false;
}

/** 4-4 금수 판정 */
function isDoubleFour(board: TBoard, x: number, y: number): boolean {
  let fourCount = 0;
  for (const [dx, dy] of DIRECTIONS) {
    if (isFourInDirection(board, x, y, dx, dy)) fourCount++;
    if (fourCount >= 2) return true;
  }
  return false;
}

/** 특정 방향에서 4 형성 여부 */
function isFourInDirection(
  board: TBoard, x: number, y: number, dx: number, dy: number
): boolean {
  // 연속 4 또는 빈칸 포함 4 검사
  const c1 = countInDirection(board, x, y, dx, dy, 1);
  const c2 = countInDirection(board, x, y, -dx, -dy, 1);
  const total = c1 + c2 + 1;
  if (total === 4) return true;
  if (total > 4) return false;

  // 중간에 빈칸이 있는 4 (예: ●●_●●)
  return checkBrokenFour(board, x, y, dx, dy);
}

function checkBrokenFour(
  board: TBoard, x: number, y: number, dx: number, dy: number
): boolean {
  // 양방향으로 패턴 분석하여 깨진 4 검출
  const line = getLinePattern(board, x, y, dx, dy, 1);
  return hasFourPattern(line);
}

/** 3-3 금수 판정 */
function isDoubleThree(board: TBoard, x: number, y: number): boolean {
  let threeCount = 0;
  for (const [dx, dy] of DIRECTIONS) {
    if (isOpenThreeInDirection(board, x, y, dx, dy)) threeCount++;
    if (threeCount >= 2) return true;
  }
  return false;
}

/** 특정 방향에서 열린 3 형성 여부 */
function isOpenThreeInDirection(
  board: TBoard, x: number, y: number, dx: number, dy: number
): boolean {
  // 열린 3: 양쪽 끝이 비어있고 4로 만들 수 있는 3
  const c1 = countInDirection(board, x, y, dx, dy, 1);
  const c2 = countInDirection(board, x, y, -dx, -dy, 1);
  const total = c1 + c2 + 1;

  if (total !== 3) return false;

  // 양 끝이 비어있는지 확인
  const endX1 = x + dx * (c1 + 1);
  const endY1 = y + dy * (c1 + 1);
  const endX2 = x - dx * (c2 + 1);
  const endY2 = y - dy * (c2 + 1);

  const open1 = isInBounds(endX1, endY1) && board[endY1][endX1] === 0;
  const open2 = isInBounds(endX2, endY2) && board[endY2][endX2] === 0;

  if (!open1 || !open2) return false;

  // 이 3을 4로 확장할 때 그것이 금수가 아닌지 확인
  // (재귀적 금수 판정 - 4를 만드는 수가 또 다른 금수면 진짜 3이 아님)
  return true;
}

/** 보드 위의 모든 금수 위치 반환 (UI 표시용) */
export function getAllForbiddenPositions(board: TBoard): TPosition[] {
  const forbidden: TPosition[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === 0 && isForbidden(board, x, y)) {
        forbidden.push({ x, y });
      }
    }
  }
  return forbidden;
}

/** 라인 패턴 추출 (평가용) */
function getLinePattern(
  board: TBoard, x: number, y: number, dx: number, dy: number, stone: number
): number[] {
  const pattern: number[] = [];
  // 역방향 4칸
  for (let i = -4; i <= 4; i++) {
    const nx = x + dx * i;
    const ny = y + dy * i;
    if (!isInBounds(nx, ny)) {
      pattern.push(-1); // 벽
    } else {
      pattern.push(board[ny][nx]);
    }
  }
  return pattern;
}

function hasFourPattern(line: number[]): boolean {
  // 연속 패턴에서 4가 되는 경우 탐지
  // 간단한 패턴 매칭 구현
  const center = 4; // line[4]가 착수 위치
  let stoneCount = 0;
  let gapCount = 0;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === 1) stoneCount++;
  }

  return stoneCount >= 4 && gapCount <= 1;
}
```

**주의**: 렌주 규칙의 정확한 구현은 복잡하다. 위 코드는 기본 프레임워크이며, 구현 시 edge case들을 꼼꼼히 테스트해야 한다. 특히 "깨진 4" 패턴과 재귀적 금수 판정이 핵심.

**Step 2: Commit**

```bash
git add lib/gomoku/renju.ts
git commit -m "feat(gomoku): add renju rules (forbidden moves detection)"
```

---

### Task 4: 보드 평가 함수 (evaluate.ts)

**Files:**
- Create: `lib/gomoku/evaluate.ts`

**Step 1: 패턴 기반 평가 함수 구현**

AI가 보드 상태의 좋고 나쁨을 판단하는 점수 체계.

```typescript
// lib/gomoku/evaluate.ts
import { TBoard, TStone } from './types';
import { BOARD_SIZE, DIRECTIONS } from './constants';
import { isInBounds } from './board';

// 패턴별 점수 가중치
const SCORES = {
  FIVE: 1000000,       // 5목 (승리)
  OPEN_FOUR: 100000,   // 열린 4 (막을 수 없음)
  FOUR: 10000,         // 닫힌 4 (한쪽 차단)
  OPEN_THREE: 5000,    // 열린 3
  THREE: 500,          // 닫힌 3
  OPEN_TWO: 200,       // 열린 2
  TWO: 50,             // 닫힌 2
  ONE: 10,             // 1개
};

/** 전체 보드 평가 (양수: 흑 유리, 음수: 백 유리) */
export function evaluateBoard(board: TBoard, aiStone: TStone): number {
  let score = 0;
  const opponent: TStone = aiStone === 1 ? 2 : 1;

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === aiStone) {
        score += evaluatePosition(board, x, y, aiStone);
      } else if (board[y][x] === opponent) {
        score -= evaluatePosition(board, x, y, opponent);
      }
    }
  }

  return score;
}

/** 특정 위치에서의 패턴 점수 계산 */
function evaluatePosition(board: TBoard, x: number, y: number, stone: TStone): number {
  let total = 0;
  for (const [dx, dy] of DIRECTIONS) {
    total += evaluateDirection(board, x, y, dx, dy, stone);
  }
  return total;
}

/** 한 방향에서의 패턴 점수 */
function evaluateDirection(
  board: TBoard, x: number, y: number, dx: number, dy: number, stone: TStone
): number {
  // 양방향으로 연속 돌 + 빈칸 분석
  let count = 1;
  let openEnds = 0;

  // 정방향
  let i = 1;
  while (isInBounds(x + dx * i, y + dy * i) && board[y + dy * i][x + dx * i] === stone) {
    count++;
    i++;
  }
  if (isInBounds(x + dx * i, y + dy * i) && board[y + dy * i][x + dx * i] === 0) {
    openEnds++;
  }

  // 역방향
  i = 1;
  while (isInBounds(x - dx * i, y - dy * i) && board[y - dy * i][x - dx * i] === stone) {
    count++;
    i++;
  }
  if (isInBounds(x - dx * i, y - dy * i) && board[y - dy * i][x - dx * i] === 0) {
    openEnds++;
  }

  if (count >= 5) return SCORES.FIVE;
  if (count === 4 && openEnds === 2) return SCORES.OPEN_FOUR;
  if (count === 4 && openEnds === 1) return SCORES.FOUR;
  if (count === 3 && openEnds === 2) return SCORES.OPEN_THREE;
  if (count === 3 && openEnds === 1) return SCORES.THREE;
  if (count === 2 && openEnds === 2) return SCORES.OPEN_TWO;
  if (count === 2 && openEnds === 1) return SCORES.TWO;
  if (count === 1 && openEnds > 0) return SCORES.ONE;

  return 0;
}
```

**Step 2: Commit**

```bash
git add lib/gomoku/evaluate.ts
git commit -m "feat(gomoku): add board evaluation function for AI"
```

---

### Task 5: AI 엔진 (ai.ts)

**Files:**
- Create: `lib/gomoku/ai.ts`

**Step 1: Minimax + Alpha-Beta Pruning 구현**

```typescript
// lib/gomoku/ai.ts
import { TBoard, TStone, TPosition, TDifficulty } from './types';
import { BOARD_SIZE } from './constants';
import { checkWin, getEmptyPositions, isDraw, placeStone } from './board';
import { evaluateBoard } from './evaluate';
import { isForbidden } from './renju';

const DIFFICULTY_CONFIG: Record<TDifficulty, {
  depth: number;
  randomRate: number;
  delayMs: number;
}> = {
  beginner: { depth: 1, randomRate: 0.3, delayMs: 0 },
  easy: { depth: 2, randomRate: 0.15, delayMs: 500 },
  medium: { depth: 4, randomRate: 0.05, delayMs: 1000 },
  hard: { depth: 6, randomRate: 0, delayMs: 1500 },
};

/** AI 수 결정 (메인 함수) */
export function getAIMove(
  board: TBoard,
  aiStone: TStone,
  difficulty: TDifficulty
): TPosition | null {
  const config = DIFFICULTY_CONFIG[difficulty];

  // 랜덤 수 확률
  if (Math.random() < config.randomRate) {
    return getRandomMove(board, aiStone);
  }

  // 후보 수 생성 (기존 돌 주변만 탐색하여 성능 최적화)
  const candidates = getCandidateMoves(board, aiStone);
  if (candidates.length === 0) {
    // 첫 수: 중앙 근처
    return { x: 7, y: 7 };
  }

  let bestMove: TPosition | null = null;
  let bestScore = -Infinity;

  for (const pos of candidates) {
    board[pos.y][pos.x] = aiStone;
    const score = minimax(board, config.depth - 1, -Infinity, Infinity, false, aiStone);
    board[pos.y][pos.x] = 0;

    if (score > bestScore) {
      bestScore = score;
      bestMove = pos;
    }
  }

  return bestMove;
}

/** AI 반응 딜레이 (ms) */
export function getAIDelay(difficulty: TDifficulty): number {
  return DIFFICULTY_CONFIG[difficulty].delayMs;
}

/** Minimax with Alpha-Beta Pruning */
function minimax(
  board: TBoard,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiStone: TStone
): number {
  // 종료 조건: 깊이 0 또는 게임 종료
  if (depth === 0) return evaluateBoard(board, aiStone);

  const candidates = getCandidateMoves(board, isMaximizing ? aiStone : (aiStone === 1 ? 2 : 1));
  if (candidates.length === 0) return evaluateBoard(board, aiStone);

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const pos of candidates) {
      board[pos.y][pos.x] = aiStone;
      const result = checkWin(board, pos.x, pos.y);
      if (result.winner === aiStone) {
        board[pos.y][pos.x] = 0;
        return 10000000;
      }
      const score = minimax(board, depth - 1, alpha, beta, false, aiStone);
      board[pos.y][pos.x] = 0;
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    const opponent: TStone = aiStone === 1 ? 2 : 1;
    let minScore = Infinity;
    for (const pos of candidates) {
      board[pos.y][pos.x] = opponent;
      const result = checkWin(board, pos.x, pos.y);
      if (result.winner === opponent) {
        board[pos.y][pos.x] = 0;
        return -10000000;
      }
      const score = minimax(board, depth - 1, alpha, beta, true, aiStone);
      board[pos.y][pos.x] = 0;
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

/** 후보 수 생성 - 기존 돌 주변 2칸 내 빈 칸만 탐색 */
function getCandidateMoves(board: TBoard, stone: TStone): TPosition[] {
  const candidates = new Set<string>();
  const RANGE = 2;

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] !== 0) {
        for (let dy = -RANGE; dy <= RANGE; dy++) {
          for (let dx = -RANGE; dx <= RANGE; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[ny][nx] === 0) {
              // 흑돌이면 금수 위치 제외
              if (stone === 1 && isForbidden(board, nx, ny)) continue;
              candidates.add(`${nx},${ny}`);
            }
          }
        }
      }
    }
  }

  return Array.from(candidates).map(s => {
    const [x, y] = s.split(',').map(Number);
    return { x, y };
  });
}

/** 랜덤 수 선택 (유효한 빈 칸 중) */
function getRandomMove(board: TBoard, stone: TStone): TPosition | null {
  const empty = getEmptyPositions(board).filter(
    p => !(stone === 1 && isForbidden(board, p.x, p.y))
  );
  if (empty.length === 0) return null;
  return empty[Math.floor(Math.random() * empty.length)];
}
```

**Step 2: Commit**

```bash
git add lib/gomoku/ai.ts
git commit -m "feat(gomoku): add AI engine with minimax alpha-beta pruning"
```

---

### Task 6: 공유 라이브러리 인덱스

**Files:**
- Create: `lib/gomoku/index.ts`

**Step 1: 인덱스 파일 생성**

```typescript
// lib/gomoku/index.ts
export * from './types';
export * from './constants';
export * from './board';
export * from './renju';
export * from './evaluate';
export * from './ai';
```

**Step 2: Commit**

```bash
git add lib/gomoku/index.ts
git commit -m "feat(gomoku): add shared library index"
```

---

## Phase 2: 싱글 AI 대전 (canvas-mobile)

### Task 7: 게임 설정 & 타입

**Files:**
- Create: `app/(canvas-mobile)/gomoku/_lib/config.ts`
- Create: `app/(canvas-mobile)/gomoku/_lib/types.ts`

**Step 1: config.ts 작성**

```typescript
// app/(canvas-mobile)/gomoku/_lib/config.ts
import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'gomoku',
  title: '오목',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'puzzle',
  difficulty: 'selectable',
};

export const CANVAS_SIZE = 620;
export const BOARD_PADDING = 30;
export const CELL_SIZE = (CANVAS_SIZE - BOARD_PADDING * 2) / 14; // 14 간격 (15개 점)
export const STONE_RADIUS = CELL_SIZE * 0.42;

// 보드 색상
export const COLORS = {
  BOARD_BG: '#DEB887',
  BOARD_GRID: '#4A3728',
  BLACK_STONE: '#1a1a1a',
  BLACK_STONE_HIGHLIGHT: '#333333',
  WHITE_STONE: '#f5f5f5',
  WHITE_STONE_SHADOW: '#cccccc',
  LAST_MOVE_DOT: '#e74c3c',
  FORBIDDEN_MARK: 'rgba(231, 76, 60, 0.5)',
  HOVER_PREVIEW: 'rgba(0, 0, 0, 0.3)',
  WIN_LINE: 'rgba(231, 76, 60, 0.8)',
  STAR_POINT: '#4A3728',
};
```

**Step 2: types.ts 작성**

```typescript
// app/(canvas-mobile)/gomoku/_lib/types.ts
import { TDifficulty } from '@/lib/gomoku/types';

export type TGomokuState = 'start' | 'loading' | 'playing' | 'paused' | 'gameover';

export type TGomokuStats = {
  blackCount: number;
  whiteCount: number;
  currentTurn: 1 | 2; // 1: 흑, 2: 백
  difficulty: TDifficulty;
  moveCount: number;
};
```

**Step 3: Commit**

```bash
git add app/\(canvas-mobile\)/gomoku/_lib/config.ts app/\(canvas-mobile\)/gomoku/_lib/types.ts
git commit -m "feat(gomoku): add single-player config and types"
```

---

### Task 8: 게임 로직 (game.ts)

**Files:**
- Create: `app/(canvas-mobile)/gomoku/_lib/game.ts`

**Step 1: 메인 게임 로직 구현**

기존 dodge 게임의 패턴을 정확히 따름:
- `setupGomoku(canvas, callbacks)` 함수
- HUD 함수 사용: `gameStartHud`, `gameLoadingHud`, `gamePauseHud`, `createGameOverHud`
- 키보드: `e.code` 사용
- 터치: `getTouchPos`, `handleTouchStart`, `gameOverHud.onTouchStart`
- cleanup 함수 반환

**참조할 기존 파일:**
- `app/(canvas-mobile)/dodge/_lib/game.ts` - setup 함수 패턴
- `lib/game.ts` - HUD 함수 시그니처

핵심 구현 포인트:
1. 보드 렌더링 (나무결 배경, 격자선, 화점, 돌)
2. 클릭/탭 → 교차점 좌표 변환 → 렌주 검증 → 착수
3. AI 차례: setTimeout으로 딜레이 → getAIMove → 착수
4. 금수 위치 표시 (매 턴 갱신)
5. 승리 시 5목 라인 하이라이트
6. 난이도 선택 UI (게임 시작 전)

**Step 2: Commit**

```bash
git add app/\(canvas-mobile\)/gomoku/_lib/game.ts
git commit -m "feat(gomoku): add canvas game loop with AI integration"
```

---

### Task 9: 캔버스 컴포넌트 (gomoku.tsx)

**Files:**
- Create: `app/(canvas-mobile)/gomoku/_components/gomoku.tsx`

**Step 1: 캔버스 컴포넌트 구현**

기존 dodge 컴포넌트 패턴 그대로:
- `canvasRef`, `wrapperRef` 사용
- CSS transform 스케일링 (`updateScale`)
- `useCreateScore('gomoku')`, `useGameSession('gomoku')`
- callbacks: `onGameStart`, `onScoreSave`, `isLoggedIn`
- cleanup 반환하는 `useEffect`

**Step 2: Commit**

```bash
git add app/\(canvas-mobile\)/gomoku/_components/gomoku.tsx
git commit -m "feat(gomoku): add canvas component with session management"
```

---

### Task 10: 페이지 & 레이아웃

**Files:**
- Create: `app/(canvas-mobile)/gomoku/page.tsx`
- Create: `app/(canvas-mobile)/gomoku/layout.tsx`

**Step 1: page.tsx 구현**

dodge page.tsx 패턴 그대로:
- 모바일: 햄버거 메뉴 (Sheet) + 게임
- 데스크탑: 3칼럼 (Controls | Game | Ranking)
- controls 배열: 클릭/착수, R/재시작, P/일시정지, M/음소거

```typescript
const controls = [
  { key: 'Click / Tap', action: '착수' },
  { key: 'S / Tap', action: '게임 시작' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
  { key: 'M', action: '음소거' },
];
```

**Step 2: layout.tsx 구현**

dodge layout.tsx 패턴 그대로 (KameHeader, JsonLd).

**Step 3: Commit**

```bash
git add app/\(canvas-mobile\)/gomoku/page.tsx app/\(canvas-mobile\)/gomoku/layout.tsx
git commit -m "feat(gomoku): add page and layout with responsive design"
```

---

## Phase 3: 게임 등록 (6개 파일)

### Task 11: 게임 등록

**Files:**
- Modify: `@types/scores.ts` - TGameType에 `'gomoku'` 추가
- Modify: `lib/config.ts` - MENU_LIST에 오목 메뉴 추가
- Modify: `components/common/GameCard.tsx` - GAME_ICONS에 아이콘 추가
- Modify: `app/api/game-session/route.ts` - VALID_GAME_TYPES에 추가
- Modify: `app/api/scores/route.ts` - VALID_GAME_TYPES에 추가
- Modify: `lib/game-security/config.ts` - 보안 설정 추가

**Step 1: 6개 파일 모두 수정**

각 파일에서 기존 패턴을 따라 `'gomoku'` 항목 추가.

보안 설정:
```typescript
gomoku: { maxScore: 1000, minPlayTimeSeconds: 30 },
// maxScore: 1000 (승률 100% = 1000)
// minPlayTime: 30초 (오목 한 판 최소 시간)
```

MENU_LIST:
```typescript
{
  name: { kor: '오목', eng: 'Gomoku' },
  href: '/gomoku',
  category: 'Puzzle',
  platform: 'both',
},
```

**Step 2: Commit**

```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx \
  app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat(gomoku): register game in 6 required files"
```

---

## Phase 4: 멀티플레이어 (WebSocket)

### Task 12: 공유 타입 확장

**Files:**
- Modify: `shared/types/room.ts` - TMultiGameType에 `'gomoku'` 추가
- Create: `shared/types/gomoku.ts` - 오목 멀티 전용 타입

**Step 1: 멀티 타입 추가**

```typescript
// shared/types/gomoku.ts
export type TGomokuGameState = {
  board: number[][];
  turn: 1 | 2;
  moveHistory: { x: number; y: number; stone: 1 | 2 }[];
  winner: null | 1 | 2;
  winLine: { x: number; y: number }[] | null;
};

export type TGomokuPlacePayload = { x: number; y: number };
export type TGomokuPlacedPayload = {
  x: number; y: number; stone: 1 | 2; turnPlayer: string;
};
export type TGomokuGameOverPayload = {
  winner: 1 | 2; winLine: { x: number; y: number }[];
  winnerName: string;
};
```

**Step 2: room.ts의 TMultiGameType 수정**

```typescript
export type TMultiGameType = 'whiteboard' | 'tetris' | 'racing' | 'gomoku';
```

**Step 3: Commit**

```bash
git add shared/types/room.ts shared/types/gomoku.ts
git commit -m "feat(gomoku): add multiplayer shared types"
```

---

### Task 13: 서버 핸들러

**Files:**
- Create: `server/src/socket/handlers/gomoku.ts`
- Modify: `server/src/socket/index.ts` - gomoku 핸들러 등록

**Step 1: 오목 소켓 핸들러 구현**

기존 whiteboard 핸들러 패턴을 따르되, 오목 게임 로직 추가:
- `gomoku:place` - 착수 처리 (차례 검증, 렌주 검증, 승리 판정)
- `gomoku:surrender` - 항복 처리
- `gomoku:restart` - 재시작 (호스트만)
- `gomoku:request-sync` - 상태 동기화

서버에서 `lib/gomoku/` 공유 로직을 import하여 규칙 검증.

**Step 2: index.ts에 핸들러 등록**

```typescript
import { registerGomokuHandlers } from './handlers/gomoku';
// ...
registerGomokuHandlers(io, socket, roomManager);
```

**Step 3: Commit**

```bash
git add server/src/socket/handlers/gomoku.ts server/src/socket/index.ts
git commit -m "feat(gomoku): add multiplayer server handlers"
```

---

### Task 14: 멀티 로비 UI

**Files:**
- Create: `app/(multi)/gomoku-online/_lib/config.ts`
- Create: `app/(multi)/gomoku-online/_lib/types.ts`
- Create: `app/(multi)/gomoku-online/_components/gomoku-lobby.tsx`
- Create: `app/(multi)/gomoku-online/page.tsx`
- Create: `app/(multi)/gomoku-online/layout.tsx`

**Step 1: 로비 구현**

기존 whiteboard 로비 패턴을 따라:
- 방 목록 3초 간격 폴링
- 방 만들기 + 입장 UI
- Socket.IO 이벤트 리스닝 (room:created, room:joined, room:error)
- 로그인 필수

**Step 2: Commit**

```bash
git add app/\(multi\)/gomoku-online/
git commit -m "feat(gomoku): add multiplayer lobby page"
```

---

### Task 15: 멀티 게임 방 UI

**Files:**
- Create: `app/(multi)/gomoku-online/_components/gomoku-board.tsx`
- Create: `app/(multi)/gomoku-online/_components/player-info.tsx`
- Create: `app/(multi)/gomoku-online/[roomId]/page.tsx`

**Step 1: 게임 보드 캔버스 구현**

싱글 보드 렌더링 로직을 공유하되, 터치/클릭 시 소켓 이벤트 emit.
- `gomoku:placed` 수신 → 보드 업데이트
- `gomoku:gameover` 수신 → 승리 연출
- 항복/나가기 버튼

**Step 2: 플레이어 정보 컴포넌트**

상대 이름, 돌 색상, 현재 차례 표시.

**Step 3: 게임 방 페이지**

whiteboard [roomId]/page.tsx 패턴:
- room:join emit → room:joined 수신
- gomoku:request-sync로 초기 상태 동기화
- disconnect 시 room:leave

**Step 4: Commit**

```bash
git add app/\(multi\)/gomoku-online/
git commit -m "feat(gomoku): add multiplayer game room"
```

---

## Phase 5: 메뉴에 멀티 오목 추가

### Task 16: 멀티 오목 메뉴 등록

**Files:**
- Modify: `lib/config.ts` - MENU_LIST에 멀티 오목 추가

**Step 1: 메뉴 항목 추가**

```typescript
{
  name: { kor: '오목 온라인', eng: 'Gomoku Online' },
  href: '/gomoku-online',
  category: 'Puzzle',
  platform: 'both',
},
```

**Step 2: Commit**

```bash
git add lib/config.ts
git commit -m "feat(gomoku): add multiplayer gomoku to menu"
```

---

## Phase 6: 최종 검증

### Task 17: 통합 테스트 & 검증

**Step 1: 빌드 확인**
```bash
yarn build
```

**Step 2: 싱글 플레이 테스트**
- 4개 난이도별 AI 동작 확인
- 렌주 금수 표시 확인
- 승리/패배/무승부 확인
- 모바일 터치 동작 확인
- 스코어 저장 확인

**Step 3: 멀티플레이 테스트**
- 방 생성/입장/나가기
- 2인 대전 동작
- 항복/재시작
- 소켓 연결 해제 복구

**Step 4: 최종 Commit**

```bash
git add .
git commit -m "feat(gomoku): complete gomoku game with single and multiplayer"
```
