# Water Sort Puzzle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 비커에 섞인 색상별 물을 정렬하는 퍼즐 게임을 canvas-mobile 라우트에 추가한다.

**Architecture:** Canvas 2D + 모바일 터치 지원. 레벨 기반 점진적 난이도. 퍼즐은 완성 상태에서 역방향 셔플로 생성하여 풀 수 있음을 보장. 점수 = 도달 레벨.

**Tech Stack:** Canvas 2D, React, Next.js, next-auth, CSS transform 스케일링

---

### Task 1: 타입과 설정 상수 정의

**Files:**
- Create: `app/(canvas-mobile)/watersort/_lib/types.ts`
- Create: `app/(canvas-mobile)/watersort/_lib/config.ts`

**Step 1: types.ts 작성**

```typescript
export type TBottle = {
  colors: (number | null)[]; // 인덱스 0 = 바닥, 3 = 꼭대기. null = 빈 칸
};

export type TMove = {
  from: number;
  to: number;
  count: number; // 이동한 칸 수
};

export type TGameState = 'start' | 'loading' | 'playing' | 'paused' | 'levelclear' | 'gameover';
```

**Step 2: config.ts 작성**

```typescript
import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'watersort',
  title: '워터 소트',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'puzzle',
  difficulty: 'progressive',
};

export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 700;

export const SLOTS_PER_BOTTLE = 4;
export const EXTRA_BOTTLES = 2;

// 레벨별 색상 수: 레벨 1=2색, 2=3색, ... 최대 10색
export const getColorsForLevel = (level: number): number =>
  Math.min(level + 1, 10);

// 레벨별 비커 수 = 색상 수 + 빈 비커 2개
export const getBottleCountForLevel = (level: number): number =>
  getColorsForLevel(level) + EXTRA_BOTTLES;

// 색상 팔레트 (최대 10색)
export const COLORS = [
  '#FF6B6B', // 빨강
  '#4ECDC4', // 청록
  '#45B7D1', // 하늘
  '#96CEB4', // 민트
  '#FFEAA7', // 노랑
  '#DDA0DD', // 자주
  '#98D8C8', // 연두
  '#F7DC6F', // 금색
  '#BB8FCE', // 보라
  '#85C1E9', // 파랑
];

// 비커 렌더링 상수
export const BOTTLE_WIDTH = 50;
export const BOTTLE_HEIGHT = 140;
export const BOTTLE_GAP = 16;
export const BOTTLE_INNER_PADDING = 6;
export const SLOT_HEIGHT = 28;
export const BOTTLE_RADIUS = 8;
export const MAX_COLS = 5;
```

**Step 3: 커밋**

```bash
git add app/\(canvas-mobile\)/watersort/_lib/types.ts app/\(canvas-mobile\)/watersort/_lib/config.ts
git commit -m "feat(watersort): add types and config constants"
```

---

### Task 2: 퍼즐 생성 알고리즘

**Files:**
- Create: `app/(canvas-mobile)/watersort/_lib/puzzle.ts`

**Step 1: puzzle.ts 작성**

풀 수 있는 퍼즐을 보장하기 위해 완성 상태에서 역방향 셔플:

```typescript
import { TBottle, TMove } from './types';
import { SLOTS_PER_BOTTLE, getColorsForLevel, getBottleCountForLevel } from './config';

// 완성 상태 생성: 각 비커에 단일 색상 4칸 + 빈 비커 2개
function createSolvedState(level: number): TBottle[] {
  const colorCount = getColorsForLevel(level);
  const bottleCount = getBottleCountForLevel(level);
  const bottles: TBottle[] = [];

  for (let i = 0; i < colorCount; i++) {
    bottles.push({
      colors: Array(SLOTS_PER_BOTTLE).fill(i),
    });
  }

  // 빈 비커 추가
  for (let i = colorCount; i < bottleCount; i++) {
    bottles.push({
      colors: Array(SLOTS_PER_BOTTLE).fill(null),
    });
  }

  return bottles;
}

// 비커의 맨 위 색상 인덱스 (비어있으면 -1)
function getTopIndex(bottle: TBottle): number {
  for (let i = SLOTS_PER_BOTTLE - 1; i >= 0; i--) {
    if (bottle.colors[i] !== null) return i;
  }
  return -1;
}

// 비커의 빈 칸 수
function getEmptySlots(bottle: TBottle): number {
  return bottle.colors.filter((c) => c === null).length;
}

// 합법적 이동인지 확인
export function isValidMove(bottles: TBottle[], from: number, to: number): boolean {
  if (from === to) return false;
  const fromBottle = bottles[from];
  const toBottle = bottles[to];

  const fromTop = getTopIndex(fromBottle);
  if (fromTop === -1) return false; // 소스가 비어있음

  const toTop = getTopIndex(toBottle);
  if (toTop === SLOTS_PER_BOTTLE - 1) return false; // 대상이 가득 참

  // 빈 비커이거나 같은 색상
  if (toTop === -1) return true;
  return fromBottle.colors[fromTop] === toBottle.colors[toTop];
}

// 이동 실행: 맨 위 연속 같은 색상을 한 번에 이동
export function executeMove(bottles: TBottle[], from: number, to: number): TMove | null {
  if (!isValidMove(bottles, from, to)) return null;

  const fromBottle = bottles[from];
  const toBottle = bottles[to];
  const fromTop = getTopIndex(fromBottle);
  const color = fromBottle.colors[fromTop]!;

  // 연속된 같은 색상 개수 계산
  let count = 0;
  for (let i = fromTop; i >= 0; i--) {
    if (fromBottle.colors[i] !== color) break;
    count++;
  }

  // 대상 비커의 빈 공간만큼만 이동
  const space = getEmptySlots(toBottle);
  const moveCount = Math.min(count, space);

  // 이동 실행
  for (let i = 0; i < moveCount; i++) {
    const srcIdx = fromTop - i;
    const dstIdx = getTopIndex(toBottle) + 1 + i;
    // 빈 비커일 때 dstIdx 보정
    const actualDst = toBottle.colors.filter((c) => c !== null).length + i;
    toBottle.colors[actualDst] = color;
    fromBottle.colors[srcIdx] = null;
  }

  return { from, to, count: moveCount };
}

// 이동 되돌리기
export function undoMove(bottles: TBottle[], move: TMove): void {
  const fromBottle = bottles[move.to]; // 되돌리려면 반대로
  const toBottle = bottles[move.from];

  const fromTop = getTopIndex(fromBottle);
  const color = fromBottle.colors[fromTop]!;

  for (let i = 0; i < move.count; i++) {
    const srcIdx = fromTop - i;
    const dstIdx = toBottle.colors.filter((c) => c !== null).length + i;
    toBottle.colors[dstIdx] = color;
    fromBottle.colors[srcIdx] = null;
  }
}

// 클리어 확인: 모든 비커가 단일 색상이거나 비어있음
export function isSolved(bottles: TBottle[]): boolean {
  return bottles.every((bottle) => {
    const nonNull = bottle.colors.filter((c) => c !== null);
    if (nonNull.length === 0) return true;
    if (nonNull.length !== SLOTS_PER_BOTTLE) return false;
    return nonNull.every((c) => c === nonNull[0]);
  });
}

// 퍼즐 생성: 완성 상태에서 역방향 셔플
export function generatePuzzle(level: number): TBottle[] {
  const bottles = createSolvedState(level);
  const colorCount = getColorsForLevel(level);
  const shuffleMoves = 20 + level * 10; // 레벨이 높을수록 더 많이 섞기

  let moves = 0;
  let attempts = 0;
  const maxAttempts = shuffleMoves * 10;

  while (moves < shuffleMoves && attempts < maxAttempts) {
    attempts++;
    const from = Math.floor(Math.random() * bottles.length);
    const to = Math.floor(Math.random() * bottles.length);

    if (isValidMove(bottles, from, to)) {
      executeMove(bottles, from, to);
      moves++;
    }
  }

  // 이미 풀려있으면 다시 생성
  if (isSolved(bottles)) {
    return generatePuzzle(level);
  }

  return bottles;
}

// 깊은 복사
export function cloneBottles(bottles: TBottle[]): TBottle[] {
  return bottles.map((b) => ({ colors: [...b.colors] }));
}
```

**Step 2: 커밋**

```bash
git add app/\(canvas-mobile\)/watersort/_lib/puzzle.ts
git commit -m "feat(watersort): add puzzle generation algorithm"
```

---

### Task 3: 메인 게임 로직 (game.ts)

**Files:**
- Create: `app/(canvas-mobile)/watersort/_lib/game.ts`

**Step 1: game.ts 작성**

```typescript
import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TSaveResult,
} from '@/lib/game';
import { TGameType } from '@/@types/scores';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
  BOTTLE_WIDTH,
  BOTTLE_HEIGHT,
  BOTTLE_GAP,
  BOTTLE_INNER_PADDING,
  SLOT_HEIGHT,
  BOTTLE_RADIUS,
  MAX_COLS,
  getColorsForLevel,
  getBottleCountForLevel,
} from './config';
import { TBottle, TMove, TGameState } from './types';
import {
  generatePuzzle,
  isValidMove,
  executeMove,
  undoMove,
  isSolved,
  cloneBottles,
} from './puzzle';

export type TWaterSortCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn: boolean;
};

export function setupWaterSort(
  canvas: HTMLCanvasElement,
  callbacks: TWaterSortCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // === 게임 상태 ===
  let state: TGameState = 'start';
  let level = 1;
  let bottles: TBottle[] = [];
  let moveHistory: TMove[] = [];
  let selectedBottle: number | null = null;
  let animationId = 0;

  // === Game Over HUD ===
  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'watersort' as TGameType,
    {
      onScoreSave: (score: number) => callbacks.onScoreSave(score),
      onRestart: () => resetGame(),
    },
    { isLoggedIn: callbacks.isLoggedIn },
  );

  // === 비커 위치 계산 ===
  function getBottlePositions(): { x: number; y: number }[] {
    const count = bottles.length;
    const cols = Math.min(count, MAX_COLS);
    const rows = Math.ceil(count / cols);
    const totalWidth = cols * BOTTLE_WIDTH + (cols - 1) * BOTTLE_GAP;
    const totalHeight = rows * BOTTLE_HEIGHT + (rows - 1) * BOTTLE_GAP;
    const startX = (CANVAS_WIDTH - totalWidth) / 2;
    const startY = (CANVAS_HEIGHT - totalHeight) / 2 + 20;

    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const colsInRow = row === rows - 1 ? count - row * cols : cols;
      const rowWidth = colsInRow * BOTTLE_WIDTH + (colsInRow - 1) * BOTTLE_GAP;
      const rowStartX = (CANVAS_WIDTH - rowWidth) / 2;
      const col = i % cols;
      positions.push({
        x: rowStartX + col * (BOTTLE_WIDTH + BOTTLE_GAP),
        y: startY + row * (BOTTLE_HEIGHT + BOTTLE_GAP),
      });
    }
    return positions;
  }

  // === 게임 시작 ===
  async function startGame() {
    state = 'loading';
    if (callbacks.onGameStart) {
      await callbacks.onGameStart();
    }
    level = 1;
    bottles = generatePuzzle(level);
    moveHistory = [];
    selectedBottle = null;
    gameOverHud.reset();
    state = 'playing';
  }

  // === 레벨 클리어 → 다음 레벨 ===
  function nextLevel() {
    level++;
    bottles = generatePuzzle(level);
    moveHistory = [];
    selectedBottle = null;
    state = 'playing';
  }

  // === 스킵 (같은 레벨 새 퍼즐) ===
  function skipPuzzle() {
    bottles = generatePuzzle(level);
    moveHistory = [];
    selectedBottle = null;
  }

  // === 리셋 ===
  function resetGame() {
    state = 'start';
    level = 1;
    bottles = [];
    moveHistory = [];
    selectedBottle = null;
    gameOverHud.reset();
  }

  // === 비커 선택/이동 처리 ===
  function handleBottleSelect(index: number) {
    if (state !== 'playing') return;

    if (selectedBottle === null) {
      // 비어있는 비커는 선택 불가
      const topIdx = bottles[index].colors.findLastIndex((c) => c !== null);
      if (topIdx === -1) return;
      selectedBottle = index;
    } else if (selectedBottle === index) {
      // 같은 비커 다시 클릭 → 선택 해제
      selectedBottle = null;
    } else {
      // 다른 비커 클릭 → 이동 시도
      if (isValidMove(bottles, selectedBottle, index)) {
        const move = executeMove(bottles, selectedBottle, index);
        if (move) {
          moveHistory.push(move);
        }

        // 클리어 확인
        if (isSolved(bottles)) {
          state = 'levelclear';
          setTimeout(() => nextLevel(), 800);
        }
      }
      selectedBottle = null;
    }
  }

  // === Undo ===
  function handleUndo() {
    if (state !== 'playing' || moveHistory.length === 0) return;
    const lastMove = moveHistory.pop()!;
    undoMove(bottles, lastMove);
    selectedBottle = null;
  }

  // === 클릭 좌표로 비커 인덱스 찾기 ===
  function getBottleAtPos(x: number, y: number): number | null {
    const positions = getBottlePositions();
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      if (
        x >= pos.x &&
        x <= pos.x + BOTTLE_WIDTH &&
        y >= pos.y &&
        y <= pos.y + BOTTLE_HEIGHT
      ) {
        return i;
      }
    }
    return null;
  }

  // === 렌더링 ===
  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 배경
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (state === 'start') {
      gameStartHud(canvas, ctx);
      return;
    }
    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
      return;
    }
    if (state === 'paused') {
      renderBottles();
      renderUI();
      gamePauseHud(canvas, ctx);
      return;
    }
    if (state === 'gameover') {
      renderBottles();
      gameOverHud.render(level);
      return;
    }

    // playing / levelclear
    renderBottles();
    renderUI();

    if (state === 'levelclear') {
      renderLevelClear();
    }
  }

  function renderBottles() {
    const positions = getBottlePositions();

    bottles.forEach((bottle, i) => {
      const pos = positions[i];
      const isSelected = selectedBottle === i;
      const drawY = isSelected ? pos.y - 15 : pos.y;

      // 비커 외곽
      ctx.save();
      ctx.strokeStyle = isSelected ? '#FFD700' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = isSelected ? 3 : 2;

      // 둥근 비커 (U자형)
      const bx = pos.x;
      const by = drawY;
      const bw = BOTTLE_WIDTH;
      const bh = BOTTLE_HEIGHT;
      const r = BOTTLE_RADIUS;

      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, by + bh - r);
      ctx.quadraticCurveTo(bx, by + bh, bx + r, by + bh);
      ctx.lineTo(bx + bw - r, by + bh);
      ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw, by + bh - r);
      ctx.lineTo(bx + bw, by);
      ctx.stroke();

      // 물 렌더링 (아래부터)
      const innerX = bx + BOTTLE_INNER_PADDING;
      const innerW = bw - BOTTLE_INNER_PADDING * 2;
      const innerR = r - 2;

      bottle.colors.forEach((colorIdx, slotIdx) => {
        if (colorIdx === null) return;
        const slotY = by + bh - BOTTLE_INNER_PADDING - (slotIdx + 1) * SLOT_HEIGHT;

        ctx.fillStyle = COLORS[colorIdx];

        if (slotIdx === 0) {
          // 바닥 슬롯: 둥근 하단
          ctx.beginPath();
          ctx.moveTo(innerX, slotY + SLOT_HEIGHT);
          ctx.lineTo(innerX, slotY + SLOT_HEIGHT + SLOT_HEIGHT - innerR);
          // 하단 모서리는 비커 바닥에 맞춤
          ctx.quadraticCurveTo(innerX, by + bh - BOTTLE_INNER_PADDING, innerX + innerR, by + bh - BOTTLE_INNER_PADDING);
          ctx.lineTo(innerX + innerW - innerR, by + bh - BOTTLE_INNER_PADDING);
          ctx.quadraticCurveTo(innerX + innerW, by + bh - BOTTLE_INNER_PADDING, innerX + innerW, slotY + SLOT_HEIGHT + SLOT_HEIGHT - innerR);
          ctx.lineTo(innerX + innerW, slotY);
          ctx.lineTo(innerX, slotY);
          ctx.closePath();
          ctx.fill();
        } else {
          // 일반 슬롯: 사각형
          ctx.fillRect(innerX, slotY, innerW, SLOT_HEIGHT);
        }
      });

      ctx.restore();
    });
  }

  function renderUI() {
    ctx.save();

    // 레벨 표시
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Level ${level}`, CANVAS_WIDTH / 2, 15);

    // Undo 버튼
    ctx.font = '14px sans-serif';
    ctx.fillStyle = moveHistory.length > 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'left';
    ctx.fillText('↩ Undo (Z)', 15, 15);

    // Skip 버튼
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('Skip (N) →', CANVAS_WIDTH - 15, 15);

    ctx.restore();
  }

  function renderLevelClear() {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Level Clear!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.restore();
  }

  // === 터치 좌표 변환 ===
  function getTouchPos(touch: Touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  }

  function getMousePos(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  // === Undo/Skip 버튼 히트 테스트 ===
  function isUndoButtonHit(x: number, y: number): boolean {
    return x < 120 && y < 40;
  }

  function isSkipButtonHit(x: number, y: number): boolean {
    return x > CANVAS_WIDTH - 120 && y < 40;
  }

  // === 마우스 이벤트 ===
  function handleClick(e: MouseEvent) {
    const pos = getMousePos(e);

    if (state === 'start') {
      startGame();
      return;
    }
    if (state === 'paused') {
      state = 'playing';
      return;
    }
    if (state === 'gameover') {
      gameOverHud.onTouchStart(pos.x, pos.y, level);
      return;
    }
    if (state !== 'playing') return;

    // Undo 버튼
    if (isUndoButtonHit(pos.x, pos.y)) {
      handleUndo();
      return;
    }
    // Skip 버튼
    if (isSkipButtonHit(pos.x, pos.y)) {
      skipPuzzle();
      return;
    }

    const bottleIdx = getBottleAtPos(pos.x, pos.y);
    if (bottleIdx !== null) {
      handleBottleSelect(bottleIdx);
    }
  }

  // === 터치 이벤트 ===
  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const pos = getTouchPos(touch);

    if (state === 'start') {
      startGame();
      return;
    }
    if (state === 'paused') {
      state = 'playing';
      return;
    }
    if (state === 'gameover') {
      gameOverHud.onTouchStart(pos.x, pos.y, level);
      return;
    }
    if (state !== 'playing') return;

    // Undo 버튼
    if (isUndoButtonHit(pos.x, pos.y)) {
      handleUndo();
      return;
    }
    // Skip 버튼
    if (isSkipButtonHit(pos.x, pos.y)) {
      skipPuzzle();
      return;
    }

    const bottleIdx = getBottleAtPos(pos.x, pos.y);
    if (bottleIdx !== null) {
      handleBottleSelect(bottleIdx);
    }
  }

  // === 키보드 이벤트 ===
  function handleKeyDown(e: KeyboardEvent) {
    if (e.repeat) return;

    if (state === 'gameover') {
      gameOverHud.onKeyDown(e, level);
      return;
    }

    if (e.code === 'KeyS') {
      if (state === 'start') {
        startGame();
        return;
      }
      if (state === 'paused') {
        state = 'playing';
        return;
      }
    }

    if (e.code === 'KeyP' && state === 'playing') {
      state = 'paused';
      return;
    }

    if (e.code === 'KeyR') {
      resetGame();
      return;
    }

    if (e.code === 'KeyZ' && state === 'playing') {
      handleUndo();
      return;
    }

    if (e.code === 'KeyN' && state === 'playing') {
      skipPuzzle();
      return;
    }
  }

  // === 게임 루프 ===
  function gameLoop() {
    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  // === 이벤트 등록 ===
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  animationId = requestAnimationFrame(gameLoop);

  // === Cleanup ===
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('touchstart', handleTouchStart);
    cancelAnimationFrame(animationId);
  };
}
```

**Step 2: 커밋**

```bash
git add app/\(canvas-mobile\)/watersort/_lib/game.ts
git commit -m "feat(watersort): add main game logic with keyboard and touch support"
```

---

### Task 4: React 컴포넌트

**Files:**
- Create: `app/(canvas-mobile)/watersort/_components/WaterSort.tsx`

**Step 1: WaterSort.tsx 작성**

```typescript
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupWaterSort, TWaterSortCallbacks } from '../_lib/game';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../_lib/config';
import { useCreateScore, useGameSession } from '@/service/scores';

function WaterSort() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('watersort');
  const { mutateAsync: createSession } = useGameSession('watersort');
  const isLoggedIn = !!session;

  const updateScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const container = wrapper.parentElement;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const scale = Math.min(containerWidth / CANVAS_WIDTH, 1);
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

    const callbacks: TWaterSortCallbacks = {
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
          gameType: 'watersort',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupWaterSort(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full flex justify-center">
      <div
        ref={wrapperRef}
        style={{ width: CANVAS_WIDTH, minHeight: CANVAS_HEIGHT }}
      >
        <canvas
          ref={canvasRef}
          className="border border-white/20 rounded-2xl shadow-lg touch-none"
        />
      </div>
    </div>
  );
}

export default WaterSort;
```

**Step 2: 커밋**

```bash
git add app/\(canvas-mobile\)/watersort/_components/WaterSort.tsx
git commit -m "feat(watersort): add React component with responsive scaling"
```

---

### Task 5: 레이아웃과 페이지

**Files:**
- Create: `app/(canvas-mobile)/watersort/layout.tsx`
- Create: `app/(canvas-mobile)/watersort/page.tsx`

**Step 1: layout.tsx 작성**

```typescript
import KameHeader from '@/components/common/KameHeader';

function WaterSortLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 sm:px-6 py-4 flex flex-col gap-6 sm:gap-10 items-center">
      <KameHeader title="워터 소트" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default WaterSortLayout;
```

**Step 2: page.tsx 작성**

기존 dodge 게임의 page.tsx 패턴을 따라 모바일 햄버거 메뉴 + 데스크탑 3칼럼 레이아웃:

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
import WaterSort from './_components/WaterSort';

const controls = [
  { key: 'Click / Tap', action: '비커 선택 / 물 붓기' },
  { key: 'S / Tap', action: '시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
  { key: 'Z', action: '되돌리기 (Undo)' },
  { key: 'N', action: '스킵 (새 퍼즐)' },
];

function WaterSortPage() {
  const { data: session, status } = useSession();
  const { data: scores = [], isLoading } = useGetScores('watersort');

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

      {/* 데스크탑: 조작법 */}
      <aside className="hidden xl:block shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>

      {/* 게임 */}
      <div className="w-full xl:flex-1 max-w-[480px]">
        <WaterSort />
      </div>

      {/* 데스크탑: 랭킹 */}
      <aside className="hidden xl:block shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default WaterSortPage;
```

**Step 3: 커밋**

```bash
git add app/\(canvas-mobile\)/watersort/layout.tsx app/\(canvas-mobile\)/watersort/page.tsx
git commit -m "feat(watersort): add layout and page with mobile responsive design"
```

---

### Task 6: 게임 등록 (6개 파일 수정)

**Files:**
- Modify: `@types/scores.ts` — TGameType에 'watersort' 추가
- Modify: `lib/config.ts` — MENU_LIST에 워터 소트 추가
- Modify: `components/common/GameCard.tsx` — 아이콘 매핑 추가
- Modify: `app/api/game-session/route.ts` — VALID_GAME_TYPES에 추가
- Modify: `app/api/scores/route.ts` — VALID_GAME_TYPES에 추가
- Modify: `lib/game-security/config.ts` — 보안 설정 추가

**Step 1: @types/scores.ts**

`TGameType` 유니온에 `| 'watersort'` 추가.

**Step 2: lib/config.ts**

MENU_LIST의 Puzzle 카테고리에 추가:
```typescript
{
  name: { kor: '워터 소트', eng: 'Water Sort' },
  href: '/watersort',
  category: 'Puzzle',
  platform: 'both',
},
```

**Step 3: components/common/GameCard.tsx**

아이콘 매핑에 추가:
```typescript
'/watersort': Droplets, // lucide-react의 Droplets 아이콘
```

**Step 4: app/api/game-session/route.ts**

VALID_GAME_TYPES 배열에 `'watersort'` 추가.

**Step 5: app/api/scores/route.ts**

VALID_GAME_TYPES 배열에 `'watersort'` 추가.

**Step 6: lib/game-security/config.ts**

보안 설정 추가:
```typescript
watersort: { maxScore: 500, minPlayTimeSeconds: 10 },
```
레벨이 점수이므로 maxScore=500은 충분한 상한값.

**Step 7: 커밋**

```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat(watersort): register game in all 6 required files"
```

---

### Task 7: 동작 확인 및 버그 수정

**Step 1: 빌드 확인**

```bash
yarn build
```

빌드 에러가 있으면 수정.

**Step 2: 개발 서버에서 수동 테스트**

```bash
yarn dev
```

확인 사항:
- `/watersort` 접속 가능
- 게임 시작 (S키 / 탭)
- 비커 클릭/탭으로 선택 → 이동
- Undo (Z키) 동작
- Skip (N키) 동작
- 레벨 클리어 시 다음 레벨 진행
- 모바일 반응형 스케일링
- 햄버거 메뉴 동작
- 메인 페이지 메뉴에 게임 표시

**Step 3: 최종 커밋**

수정사항이 있으면 커밋.
