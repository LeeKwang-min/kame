# Block Puzzle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 8x8 그리드에 블록을 드래그 앤 드롭으로 배치하여 줄을 완성하는 퍼즐 게임 구현

**Architecture:** 순수 Canvas 2D 렌더링, 프로젝트 기존 패턴(`setupGame` + cleanup 함수) 준수. 마우스/터치 드래그 앤 드롭으로 블록 배치, 가로/세로 줄 완성 시 삭제.

**Tech Stack:** Next.js, Canvas 2D API, TypeScript

---

### Task 1: 타입 및 설정 파일 생성

**Files:**
- Create: `app/(canvas)/blockpuzzle/_lib/types.ts`
- Create: `app/(canvas)/blockpuzzle/_lib/config.ts`

**Step 1: types.ts 작성**

```typescript
// app/(canvas)/blockpuzzle/_lib/types.ts

export type TBlockShape = number[][];

export type TBlock = {
  shape: TBlockShape;
  color: string;
};

export type TDragging = {
  blockIndex: number;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
};

export type TCellAnimation = {
  row: number;
  col: number;
  progress: number; // 0~1
  color: string;
};

export type TPlaceAnimation = {
  row: number;
  col: number;
  progress: number; // 0~1
  color: string;
};
```

**Step 2: config.ts 작성**

```typescript
// app/(canvas)/blockpuzzle/_lib/config.ts

import { TBlockShape } from './types';

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 700;

export const GRID_SIZE = 8;
export const CELL_SIZE = 56;
export const GRID_PADDING = 16;
export const GRID_OFFSET_X = (CANVAS_WIDTH - GRID_SIZE * CELL_SIZE - GRID_PADDING * 2) / 2;
export const GRID_OFFSET_Y = 70;
export const GRID_WIDTH = GRID_SIZE * CELL_SIZE + GRID_PADDING * 2;
export const GRID_HEIGHT = GRID_SIZE * CELL_SIZE + GRID_PADDING * 2;

export const BLOCK_AREA_Y = GRID_OFFSET_Y + GRID_HEIGHT + 20;
export const BLOCK_PREVIEW_SCALE = 0.5;
export const BLOCK_AREA_HEIGHT = CANVAS_HEIGHT - BLOCK_AREA_Y;

export const CLEAR_ANIMATION_DURATION = 0.3; // seconds
export const PLACE_ANIMATION_DURATION = 0.15; // seconds

// 점수
export const SCORE_PER_CELL = 1;
export const SCORE_PER_LINE = 10;
export const COMBO_BONUS = [0, 0, 5, 15, 30, 50, 70, 100]; // index = line count

// 블록 색상 (7종)
export const BLOCK_COLORS = [
  '#e74c3c', // 빨강
  '#e67e22', // 주황
  '#f1c40f', // 노랑
  '#2ecc71', // 초록
  '#3498db', // 파랑
  '#2c3e7a', // 남색
  '#9b59b6', // 보라
];

// 블록 형태 (19종)
export const BLOCK_SHAPES: TBlockShape[] = [
  // 1x1
  [[1]],
  // 1x2
  [[1, 1]],
  // 1x3
  [[1, 1, 1]],
  // 1x4
  [[1, 1, 1, 1]],
  // 1x5
  [[1, 1, 1, 1, 1]],
  // 2x1
  [[1], [1]],
  // 3x1
  [[1], [1], [1]],
  // 4x1
  [[1], [1], [1], [1]],
  // 5x1
  [[1], [1], [1], [1], [1]],
  // 2x2
  [[1, 1], [1, 1]],
  // 3x3
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
  // L
  [[1, 0], [1, 0], [1, 1]],
  // J
  [[0, 1], [0, 1], [1, 1]],
  // T
  [[1, 1, 1], [0, 1, 0]],
  // S
  [[0, 1, 1], [1, 1, 0]],
  // Z
  [[1, 1, 0], [0, 1, 1]],
  // L 역
  [[1, 1], [1, 0], [1, 0]],
  // J 역
  [[1, 1], [0, 1], [0, 1]],
  // T 역
  [[0, 1, 0], [1, 1, 1]],
];
```

**Step 3: 커밋**

```bash
git add app/(canvas)/blockpuzzle/_lib/types.ts app/(canvas)/blockpuzzle/_lib/config.ts
git commit -m "feat(blockpuzzle): add types and config"
```

---

### Task 2: 게임 로직 (game.ts) - 핵심 구조

**Files:**
- Create: `app/(canvas)/blockpuzzle/_lib/game.ts`

**Step 1: game.ts 작성**

fruitninja의 game.ts 패턴을 정확히 따른다. 핵심 구조:

```typescript
// app/(canvas)/blockpuzzle/_lib/game.ts

import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_SIZE,
  CELL_SIZE,
  GRID_PADDING,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  BLOCK_AREA_Y,
  BLOCK_PREVIEW_SCALE,
  BLOCK_AREA_HEIGHT,
  BLOCK_SHAPES,
  BLOCK_COLORS,
  CLEAR_ANIMATION_DURATION,
  PLACE_ANIMATION_DURATION,
  SCORE_PER_CELL,
  SCORE_PER_LINE,
  COMBO_BONUS,
} from './config';
import { TBlock, TDragging, TCellAnimation, TPlaceAnimation } from './types';

export type TBlockPuzzleCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export function setupBlockPuzzle(
  canvas: HTMLCanvasElement,
  callbacks?: TBlockPuzzleCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // --- State ---
  const grid: (string | null)[][] = []; // 8x8 그리드, null = 빈칸, string = 색상
  let currentBlocks: (TBlock | null)[] = []; // 3개의 블록 슬롯
  let score = 0;
  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;
  let dragging: TDragging | null = null;
  let clearAnimations: TCellAnimation[] = [];
  let placeAnimations: TPlaceAnimation[] = [];
  let lastTime = 0;
  let animationId = 0;

  // 그리드 초기화
  function initGrid() {
    grid.length = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      grid.push(new Array(GRID_SIZE).fill(null));
    }
  }
  initGrid();

  // --- Game Over HUD ---
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      if (callbacks?.onScoreSave) {
        return callbacks.onScoreSave(finalScore);
      }
      return { saved: false };
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'blockpuzzle',
    gameOverCallbacks,
    { isLoggedIn: callbacks?.isLoggedIn ?? false },
  );

  // --- Helpers ---
  function randomBlock(): TBlock {
    const shape = BLOCK_SHAPES[Math.floor(Math.random() * BLOCK_SHAPES.length)];
    const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
    return { shape, color };
  }

  function generateBlocks() {
    currentBlocks = [randomBlock(), randomBlock(), randomBlock()];
  }

  // 그리드 내 좌표 변환
  function gridToCanvas(row: number, col: number) {
    return {
      x: GRID_OFFSET_X + GRID_PADDING + col * CELL_SIZE,
      y: GRID_OFFSET_Y + GRID_PADDING + row * CELL_SIZE,
    };
  }

  function canvasToGrid(x: number, y: number) {
    const col = Math.floor((x - GRID_OFFSET_X - GRID_PADDING) / CELL_SIZE);
    const row = Math.floor((y - GRID_OFFSET_Y - GRID_PADDING) / CELL_SIZE);
    return { row, col };
  }

  // 블록 배치 가능 여부 체크
  function canPlace(shape: number[][], row: number, col: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 0) continue;
        const gr = row + r;
        const gc = col + c;
        if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) return false;
        if (grid[gr][gc] !== null) return false;
      }
    }
    return true;
  }

  // 블록이 그리드 어딘가에 배치 가능한지
  function canPlaceAnywhere(shape: number[][]): boolean {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlace(shape, r, c)) return true;
      }
    }
    return false;
  }

  // 블록 배치
  function placeBlock(block: TBlock, row: number, col: number) {
    let cellCount = 0;
    for (let r = 0; r < block.shape.length; r++) {
      for (let c = 0; c < block.shape[r].length; c++) {
        if (block.shape[r][c] === 1) {
          grid[row + r][col + c] = block.color;
          placeAnimations.push({
            row: row + r,
            col: col + c,
            progress: 0,
            color: block.color,
          });
          cellCount++;
        }
      }
    }
    score += cellCount * SCORE_PER_CELL;
  }

  // 완성된 줄 체크 및 삭제
  function checkAndClearLines(): number {
    const rowsToClear: number[] = [];
    const colsToClear: number[] = [];

    // 가로 줄 체크
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r].every((cell) => cell !== null)) {
        rowsToClear.push(r);
      }
    }

    // 세로 줄 체크
    for (let c = 0; c < GRID_SIZE; c++) {
      let full = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (grid[r][c] === null) {
          full = false;
          break;
        }
      }
      if (full) colsToClear.push(c);
    }

    // 삭제 애니메이션 생성
    const cellsToAnimate = new Set<string>();
    for (const r of rowsToClear) {
      for (let c = 0; c < GRID_SIZE; c++) {
        cellsToAnimate.add(`${r},${c}`);
      }
    }
    for (const c of colsToClear) {
      for (let r = 0; r < GRID_SIZE; r++) {
        cellsToAnimate.add(`${r},${c}`);
      }
    }

    for (const key of cellsToAnimate) {
      const [r, c] = key.split(',').map(Number);
      clearAnimations.push({
        row: r,
        col: c,
        progress: 0,
        color: grid[r][c] || '#fff',
      });
    }

    // 실제 삭제
    for (const key of cellsToAnimate) {
      const [r, c] = key.split(',').map(Number);
      grid[r][c] = null;
    }

    const lineCount = rowsToClear.length + colsToClear.length;
    if (lineCount > 0) {
      score += lineCount * SCORE_PER_LINE;
      const bonusIndex = Math.min(lineCount, COMBO_BONUS.length - 1);
      score += COMBO_BONUS[bonusIndex];
    }

    return lineCount;
  }

  // 게임 오버 체크
  function checkGameOver(): boolean {
    for (const block of currentBlocks) {
      if (block === null) continue;
      if (canPlaceAnywhere(block.shape)) return false;
    }
    return true;
  }

  // 하단 블록 영역에서 블록 위치 계산
  function getBlockPreviewPosition(index: number) {
    const slotWidth = CANVAS_WIDTH / 3;
    const centerX = slotWidth * index + slotWidth / 2;
    const centerY = BLOCK_AREA_Y + BLOCK_AREA_HEIGHT / 2;
    return { centerX, centerY };
  }

  // 블록 히트 테스트 (하단 블록 클릭 감지)
  function hitTestBlock(x: number, y: number): number {
    for (let i = 0; i < currentBlocks.length; i++) {
      const block = currentBlocks[i];
      if (!block) continue;
      const { centerX, centerY } = getBlockPreviewPosition(i);
      const rows = block.shape.length;
      const cols = block.shape[0].length;
      const previewCellSize = CELL_SIZE * BLOCK_PREVIEW_SCALE;
      const blockW = cols * previewCellSize;
      const blockH = rows * previewCellSize;
      const bx = centerX - blockW / 2;
      const by = centerY - blockH / 2;

      if (x >= bx && x <= bx + blockW && y >= by && y <= by + blockH) {
        return i;
      }
    }
    return -1;
  }

  // 드래그 중 그리드 스냅 위치 계산
  function getSnapPosition(): { row: number; col: number } | null {
    if (!dragging) return null;
    const block = currentBlocks[dragging.blockIndex];
    if (!block) return null;

    const rows = block.shape.length;
    const cols = block.shape[0].length;
    // 블록 중심을 기준으로 스냅
    const centerX = dragging.currentX;
    const centerY = dragging.currentY;
    const blockPixelW = cols * CELL_SIZE;
    const blockPixelH = rows * CELL_SIZE;
    const topLeftX = centerX - blockPixelW / 2;
    const topLeftY = centerY - blockPixelH / 2;

    const { row, col } = canvasToGrid(topLeftX + CELL_SIZE / 2, topLeftY + CELL_SIZE / 2);
    return { row, col };
  }

  // --- Reset ---
  function resetGame() {
    initGrid();
    currentBlocks = [];
    score = 0;
    isStarted = false;
    isLoading = false;
    isGameOver = false;
    isPaused = false;
    dragging = null;
    clearAnimations = [];
    placeAnimations = [];
    gameOverHud.reset();
  }

  // --- Start ---
  async function startGame() {
    if (isStarted || isLoading) return;
    isLoading = true;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isLoading = false;
    isStarted = true;
    isGameOver = false;
    isPaused = false;
    score = 0;
    initGrid();
    dragging = null;
    clearAnimations = [];
    placeAnimations = [];
    generateBlocks();
  }

  function triggerGameOver() {
    isGameOver = true;
    isStarted = false;
  }

  // --- Canvas 좌표 변환 ---
  function getCanvasPos(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }

  // --- Update ---
  function update(dt: number) {
    if (!isStarted || isPaused) return;

    // 삭제 애니메이션 업데이트
    for (let i = clearAnimations.length - 1; i >= 0; i--) {
      clearAnimations[i].progress += dt / CLEAR_ANIMATION_DURATION;
      if (clearAnimations[i].progress >= 1) {
        clearAnimations.splice(i, 1);
      }
    }

    // 배치 애니메이션 업데이트
    for (let i = placeAnimations.length - 1; i >= 0; i--) {
      placeAnimations[i].progress += dt / PLACE_ANIMATION_DURATION;
      if (placeAnimations[i].progress >= 1) {
        placeAnimations.splice(i, 1);
      }
    }
  }

  // --- Render ---
  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 배경
    drawBackground();

    if (isStarted || isGameOver) {
      // 그리드
      drawGrid();

      // 삭제 애니메이션
      drawClearAnimations();

      // 배치 애니메이션
      drawPlaceAnimations();

      // 드래그 미리보기
      drawDragPreview();

      // 하단 블록 영역
      drawBlockArea();

      // HUD (점수)
      drawHud();
    }

    // 오버레이
    if (isLoading) {
      gameLoadingHud(canvas, ctx);
    } else if (!isStarted && !isGameOver) {
      gameStartHud(canvas, ctx);
    } else if (isPaused) {
      gamePauseHud(canvas, ctx);
    } else if (isGameOver) {
      gameOverHud.render(score);
    }
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function drawGrid() {
    const gx = GRID_OFFSET_X;
    const gy = GRID_OFFSET_Y;

    // 그리드 배경
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.roundRect(gx, gy, GRID_SIZE * CELL_SIZE + GRID_PADDING * 2, GRID_SIZE * CELL_SIZE + GRID_PADDING * 2, 12);
    ctx.fill();

    // 셀 렌더링
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const { x, y } = gridToCanvas(r, c);
        const cellColor = grid[r][c];

        if (cellColor) {
          // 채워진 셀
          ctx.fillStyle = cellColor;
          ctx.beginPath();
          ctx.roundRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
          ctx.fill();

          // 하이라이트
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, CELL_SIZE - 4, (CELL_SIZE - 4) / 2, [4, 4, 0, 0]);
          ctx.fill();
        } else {
          // 빈 셀
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.roundRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
          ctx.stroke();
        }
      }
    }
  }

  function drawClearAnimations() {
    for (const anim of clearAnimations) {
      const { x, y } = gridToCanvas(anim.row, anim.col);
      const progress = anim.progress;

      // 밝게 번쩍이다가 사라짐
      const alpha = 1 - progress;
      const scale = 1 + progress * 0.3;
      const cx = x + CELL_SIZE / 2;
      const cy = y + CELL_SIZE / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(-CELL_SIZE / 2 + 1, -CELL_SIZE / 2 + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPlaceAnimations() {
    for (const anim of placeAnimations) {
      const { x, y } = gridToCanvas(anim.row, anim.col);
      const progress = anim.progress;

      // 약간 확대 후 안착
      const scale = 1 + (1 - progress) * 0.15;
      const cx = x + CELL_SIZE / 2;
      const cy = y + CELL_SIZE / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.globalAlpha = 0.5 * (1 - progress);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(-CELL_SIZE / 2 + 1, -CELL_SIZE / 2 + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawDragPreview() {
    if (!dragging) return;
    const block = currentBlocks[dragging.blockIndex];
    if (!block) return;

    const snap = getSnapPosition();
    const placeable = snap ? canPlace(block.shape, snap.row, snap.col) : false;

    // 그리드 위 미리보기
    if (snap && snap.row >= 0 && snap.col >= 0) {
      for (let r = 0; r < block.shape.length; r++) {
        for (let c = 0; c < block.shape[r].length; c++) {
          if (block.shape[r][c] === 0) continue;
          const gr = snap.row + r;
          const gc = snap.col + c;
          if (gr < 0 || gr >= GRID_SIZE || gc < 0 || gc >= GRID_SIZE) continue;
          const { x, y } = gridToCanvas(gr, gc);

          ctx.globalAlpha = 0.4;
          ctx.fillStyle = placeable ? block.color : '#ff4444';
          ctx.beginPath();
          ctx.roundRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    // 드래그 중인 블록
    const rows = block.shape.length;
    const cols = block.shape[0].length;
    const blockPixelW = cols * CELL_SIZE;
    const blockPixelH = rows * CELL_SIZE;
    const startX = dragging.currentX - blockPixelW / 2;
    const startY = dragging.currentY - blockPixelH / 2;

    ctx.globalAlpha = 0.7;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (block.shape[r][c] === 0) continue;
        const x = startX + c * CELL_SIZE;
        const y = startY + r * CELL_SIZE;
        ctx.fillStyle = block.color;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawBlockArea() {
    // 하단 영역 배경
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.roundRect(20, BLOCK_AREA_Y - 10, CANVAS_WIDTH - 40, BLOCK_AREA_HEIGHT + 5, 12);
    ctx.fill();

    for (let i = 0; i < currentBlocks.length; i++) {
      const block = currentBlocks[i];
      if (!block) continue;
      if (dragging && dragging.blockIndex === i) continue; // 드래그 중인 블록은 제외

      const { centerX, centerY } = getBlockPreviewPosition(i);
      const rows = block.shape.length;
      const cols = block.shape[0].length;
      const previewCellSize = CELL_SIZE * BLOCK_PREVIEW_SCALE;
      const startX = centerX - (cols * previewCellSize) / 2;
      const startY = centerY - (rows * previewCellSize) / 2;

      // 배치 불가 블록은 어둡게
      const canPlaceThis = canPlaceAnywhere(block.shape);
      ctx.globalAlpha = canPlaceThis ? 1 : 0.3;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (block.shape[r][c] === 0) continue;
          const x = startX + c * previewCellSize;
          const y = startY + r * previewCellSize;
          ctx.fillStyle = block.color;
          ctx.beginPath();
          ctx.roundRect(x + 1, y + 1, previewCellSize - 2, previewCellSize - 2, 3);
          ctx.fill();

          // 하이라이트
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, previewCellSize - 4, (previewCellSize - 4) / 2, [3, 3, 0, 0]);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawHud() {
    // 점수
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${score}`, CANVAS_WIDTH / 2, 20);
    ctx.restore();
  }

  // --- Game Loop ---
  function gameLoop(timestamp: number) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render();

    animationId = requestAnimationFrame(gameLoop);
  }

  // --- Mouse Handlers ---
  function handleMouseDown(e: MouseEvent) {
    if (isGameOver || !isStarted || isPaused) return;
    if (clearAnimations.length > 0) return; // 애니메이션 중 입력 무시
    const pos = getCanvasPos(e.clientX, e.clientY);
    const blockIndex = hitTestBlock(pos.x, pos.y);
    if (blockIndex >= 0) {
      dragging = {
        blockIndex,
        offsetX: 0,
        offsetY: 0,
        currentX: pos.x,
        currentY: pos.y - CELL_SIZE * 2, // 손가락/커서 위에 블록 표시
      };
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!dragging || isGameOver || !isStarted || isPaused) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    dragging.currentX = pos.x;
    dragging.currentY = pos.y - CELL_SIZE * 2;
  }

  function handleMouseUp() {
    if (!dragging) return;
    const block = currentBlocks[dragging.blockIndex];
    if (!block) {
      dragging = null;
      return;
    }

    const snap = getSnapPosition();
    if (snap && canPlace(block.shape, snap.row, snap.col)) {
      placeBlock(block, snap.row, snap.col);
      currentBlocks[dragging.blockIndex] = null;
      checkAndClearLines();

      // 3개 다 배치했으면 새 블록 생성
      if (currentBlocks.every((b) => b === null)) {
        generateBlocks();
      }

      // 게임 오버 체크
      if (checkGameOver()) {
        triggerGameOver();
      }
    }
    dragging = null;
  }

  // --- Touch Handlers ---
  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (isGameOver || !isStarted || isPaused) return;
    if (clearAnimations.length > 0) return;
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    const blockIndex = hitTestBlock(pos.x, pos.y);
    if (blockIndex >= 0) {
      dragging = {
        blockIndex,
        offsetX: 0,
        offsetY: 0,
        currentX: pos.x,
        currentY: pos.y - CELL_SIZE * 2,
      };
    }
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (!dragging || isGameOver || !isStarted || isPaused) return;
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    dragging.currentX = pos.x;
    dragging.currentY = pos.y - CELL_SIZE * 2;
  }

  function handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    handleMouseUp(); // 동일한 로직
  }

  // --- Keyboard Handler ---
  function handleKeyDown(e: KeyboardEvent) {
    if (e.repeat) return;

    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    switch (e.code) {
      case 'KeyS':
        if (!isStarted && !isGameOver) {
          startGame();
        } else if (isPaused) {
          isPaused = false;
        }
        break;
      case 'KeyP':
        if (isStarted && !isGameOver) {
          isPaused = !isPaused;
        }
        break;
      case 'KeyR':
        if (!isGameOver) {
          resetGame();
        }
        break;
    }
  }

  // --- Setup ---
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  window.addEventListener('keydown', handleKeyDown);

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('keydown', handleKeyDown);
  };
}
```

**Step 2: 커밋**

```bash
git add app/(canvas)/blockpuzzle/_lib/game.ts
git commit -m "feat(blockpuzzle): add game logic with drag-and-drop"
```

---

### Task 3: React 컴포넌트, 페이지, 레이아웃

**Files:**
- Create: `app/(canvas)/blockpuzzle/_components/BlockPuzzle.tsx`
- Create: `app/(canvas)/blockpuzzle/page.tsx`
- Create: `app/(canvas)/blockpuzzle/layout.tsx`

**Step 1: BlockPuzzle.tsx 작성**

```typescript
// app/(canvas)/blockpuzzle/_components/BlockPuzzle.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupBlockPuzzle, TBlockPuzzleCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function BlockPuzzle() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('blockpuzzle');
  const { mutateAsync: createSession } = useGameSession('blockpuzzle');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TBlockPuzzleCallbacks = {
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
          gameType: 'blockpuzzle',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupBlockPuzzle(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[600px] h-[700px] border border-white/20 rounded-2xl touch-none shadow-lg"
      />
    </div>
  );
}

export default BlockPuzzle;
```

**Step 2: page.tsx 작성**

```typescript
// app/(canvas)/blockpuzzle/page.tsx
'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import BlockPuzzle from './_components/BlockPuzzle';

const controls = [
  { key: 'Mouse Drag', action: '블록 배치' },
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
];

function BlockPuzzlePage() {
  const { data: scores = [], isLoading } = useGetScores('blockpuzzle');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[600px]">
        <BlockPuzzle />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default BlockPuzzlePage;
```

**Step 3: layout.tsx 작성**

```typescript
// app/(canvas)/blockpuzzle/layout.tsx
import KameHeader from '@/components/common/KameHeader';

function BlockPuzzleLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      <KameHeader title="Block Puzzle" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default BlockPuzzleLayout;
```

**Step 4: 커밋**

```bash
git add app/(canvas)/blockpuzzle/_components/BlockPuzzle.tsx app/(canvas)/blockpuzzle/page.tsx app/(canvas)/blockpuzzle/layout.tsx
git commit -m "feat(blockpuzzle): add component, page, and layout"
```

---

### Task 4: 게임 등록 (6개 파일 수정)

**Files:**
- Modify: `@types/scores.ts:45` - TGameType에 'blockpuzzle' 추가
- Modify: `lib/config.ts:267` - MENU_LIST에 메뉴 추가
- Modify: `components/common/GameCard.tsx:46,95` - 아이콘 추가
- Modify: `app/api/game-session/route.ts:50` - VALID_GAME_TYPES에 추가
- Modify: `app/api/scores/route.ts:51` - VALID_GAME_TYPES에 추가
- Modify: `lib/game-security/config.ts:46` - 보안 설정 추가

**Step 1: @types/scores.ts 수정**

`'downwell'` 뒤에 `| 'blockpuzzle'` 추가

**Step 2: lib/config.ts 수정**

Puzzle 카테고리 마지막 (jewelcrush 다음)에 추가:
```typescript
{
  name: {
    kor: '블록 퍼즐',
    eng: 'Block Puzzle',
  },
  href: '/blockpuzzle',
  category: 'Puzzle',
},
```

**Step 3: components/common/GameCard.tsx 수정**

import에 `SquareStack` 추가 (lucide-react에서), GAME_ICONS에 `'/blockpuzzle': SquareStack` 추가.
(SquareStack이 없으면 `Grid3X3` 또는 `LayoutGrid` 사용)

**Step 4: app/api/game-session/route.ts 수정**

`'downwell'` 뒤에 `'blockpuzzle'` 추가

**Step 5: app/api/scores/route.ts 수정**

`'downwell'` 뒤에 `'blockpuzzle'` 추가

**Step 6: lib/game-security/config.ts 수정**

`downwell` 항목 다음에 추가:
```typescript
blockpuzzle: { maxScore: 100000, minPlayTimeSeconds: 10 },
```

**Step 7: 커밋**

```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat(blockpuzzle): register game in 6 config files"
```

---

### Task 5: 빌드 및 수동 테스트

**Step 1: TypeScript 타입 체크**

Run: `yarn tsc --noEmit`
Expected: 에러 없음

**Step 2: 개발 서버 실행 및 수동 테스트**

Run: `yarn dev`

테스트 항목:
- `/blockpuzzle` 접속 시 게임 화면 표시
- `S` 키로 게임 시작
- 하단 블록 드래그 앤 드롭으로 그리드에 배치
- 가로/세로 줄 완성 시 줄 삭제 애니메이션 + 점수 증가
- 3개 블록 모두 배치 시 새 블록 생성
- 배치 불가 시 게임 오버
- `P` 키로 일시정지/재개
- `R` 키로 재시작

**Step 3: 커밋**

```bash
git commit -m "feat(blockpuzzle): complete block puzzle game" --allow-empty
```
