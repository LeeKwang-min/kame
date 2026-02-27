# Tutorial System & Queens Logic Solver Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Queens 퍼즐에 단계별 튜토리얼을 추가하고, Queens & Ripple 시작 화면에 "가이드" 버튼을 상시 노출하며, Queens 퍼즐 생성 시 논리적 풀이만으로 해결 가능한 퍼즐을 보장한다.

**Architecture:** 게임별 독립 구현 방식. 각 게임의 game.ts에서 `'tutorial'` state를 관리하고, 시작 화면에 가이드 버튼을 추가. Queens generator.ts에 constraint propagation 기반 논리 풀이 검증 함수를 추가.

**Tech Stack:** Canvas 2D, TypeScript, Next.js

---

## Task 1: Queens 논리적 풀이 검증 함수 추가

**Files:**
- Modify: `app/(canvas-mobile)/queens/_lib/generator.ts`

**Step 1: `canSolveLogically()` 함수 추가**

`findUniqueSolution()` 함수 뒤(라인 122 이후)에 constraint propagation 기반 논리 풀이 검증 함수를 추가한다.

```typescript
/**
 * Check if the puzzle can be solved purely by logical deduction
 * (no guessing/backtracking needed).
 * Uses iterative constraint propagation: hidden singles in rows, columns, and regions.
 */
function canSolveLogically(n: number, regions: number[][]): boolean {
  // candidates[r][c] = true means a queen can still go here
  const candidates: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    candidates[r] = [];
    for (let c = 0; c < n; c++) {
      candidates[r][c] = true;
    }
  }

  const placed: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    placed[r] = [];
    for (let c = 0; c < n; c++) {
      placed[r][c] = false;
    }
  }

  let placedCount = 0;

  function eliminate(pr: number, pc: number): void {
    // Remove candidates in same row
    for (let c = 0; c < n; c++) {
      candidates[pr][c] = false;
    }
    // Remove candidates in same column
    for (let r = 0; r < n; r++) {
      candidates[r][pc] = false;
    }
    // Remove candidates in same region
    const reg = regions[pr][pc];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (regions[r][c] === reg) {
          candidates[r][c] = false;
        }
      }
    }
    // Remove candidates in 8-adjacent cells
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = pr + dr;
        const nc = pc + dc;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
          candidates[nr][nc] = false;
        }
      }
    }
    // The placed cell itself is not a candidate anymore (already handled above)
  }

  function placeQueen(r: number, c: number): void {
    placed[r][c] = true;
    placedCount++;
    eliminate(r, c);
  }

  let progress = true;
  while (progress && placedCount < n) {
    progress = false;

    // Hidden single in rows
    for (let r = 0; r < n; r++) {
      // Skip rows that already have a queen
      let hasQueen = false;
      for (let c = 0; c < n; c++) {
        if (placed[r][c]) { hasQueen = true; break; }
      }
      if (hasQueen) continue;

      let count = 0;
      let lastCol = -1;
      for (let c = 0; c < n; c++) {
        if (candidates[r][c]) {
          count++;
          lastCol = c;
        }
      }
      if (count === 1) {
        placeQueen(r, lastCol);
        progress = true;
      } else if (count === 0) {
        return false; // contradiction
      }
    }

    // Hidden single in columns
    for (let c = 0; c < n; c++) {
      let hasQueen = false;
      for (let r = 0; r < n; r++) {
        if (placed[r][c]) { hasQueen = true; break; }
      }
      if (hasQueen) continue;

      let count = 0;
      let lastRow = -1;
      for (let r = 0; r < n; r++) {
        if (candidates[r][c]) {
          count++;
          lastRow = r;
        }
      }
      if (count === 1) {
        placeQueen(lastRow, c);
        progress = true;
      } else if (count === 0) {
        return false;
      }
    }

    // Hidden single in regions
    for (let reg = 0; reg < n; reg++) {
      let hasQueen = false;
      for (let r = 0; r < n && !hasQueen; r++) {
        for (let c = 0; c < n && !hasQueen; c++) {
          if (regions[r][c] === reg && placed[r][c]) hasQueen = true;
        }
      }
      if (hasQueen) continue;

      let count = 0;
      let lastR = -1;
      let lastC = -1;
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (regions[r][c] === reg && candidates[r][c]) {
            count++;
            lastR = r;
            lastC = c;
          }
        }
      }
      if (count === 1) {
        placeQueen(lastR, lastC);
        progress = true;
      } else if (count === 0) {
        return false;
      }
    }
  }

  return placedCount === n;
}
```

**Step 2: `generatePuzzle()`에 논리 풀이 검증 추가**

기존 `findUniqueSolution()` 호출 후에 `canSolveLogically()` 검증을 추가한다.

현재 코드 (generator.ts 라인 ~140-145):
```typescript
const solution = findUniqueSolution(size, regions);
if (solution) {
  return { size, regions, solution };
}
```

변경:
```typescript
const solution = findUniqueSolution(size, regions);
if (solution && canSolveLogically(size, regions)) {
  return { size, regions, solution };
}
```

**Step 3: 커밋**

```bash
git add app/(canvas-mobile)/queens/_lib/generator.ts
git commit -m "feat(queens): add logical solvability validation to puzzle generator"
```

---

## Task 2: Ripple 시작 화면에 가이드 버튼 추가 & 자동 튜토리얼 제거

**Files:**
- Modify: `app/(canvas-mobile)/ripple/_lib/game.ts`

**Step 1: localStorage 자동 트리거 관련 코드 제거**

라인 84의 `TUTORIAL_STORAGE_KEY` 상수, 라인 96-101의 `isTutorialDone()`, `markTutorialDone()` 함수를 삭제한다.

라인 552-558의 `advanceTutorial()`에서 `markTutorialDone()` 호출을 제거하고 단순히 state를 'start'로 전환하도록 수정:

```typescript
function advanceTutorial(): void {
  tutorialStep++;
  if (tutorialStep >= TUTORIAL_MESSAGES.length) {
    state = 'start';
  }
}
```

**Step 2: KeyS 처리에서 튜토리얼 체크 제거**

라인 1362-1363 근처의 KeyS 처리를 변경:

기존:
```typescript
if (state === 'start') {
  if (!isTutorialDone()) { startTutorial(); } else { startStage(); }
}
```

변경:
```typescript
if (state === 'start') {
  startStage();
}
```

클릭 이벤트(라인 1444-1446)에서도 동일하게 변경.

**Step 3: 시작 화면에 가이드 버튼 추가**

`renderStartScreen()` 함수(라인 835-960)에서 "탭 또는 S키를 눌러 시작" 텍스트(라인 925-933) 위에 가이드 버튼을 추가한다.

기존 "탭 또는 S키를 눌러 시작" (라인 929-933)의 y좌표가 `CANVAS_HEIGHT - 80`이므로, 가이드 버튼을 그 위에 배치.

가이드 버튼 영역을 저장할 변수를 추가:
```typescript
let guideButton = { x: 0, y: 0, w: 0, h: 0 };
```

renderStartScreen()에 가이드 버튼 렌더링 추가 (시작 프롬프트 위):
```typescript
// Guide button
const guideBtnW = 140;
const guideBtnH = 36;
const guideBtnX = CANVAS_WIDTH / 2 - guideBtnW / 2;
const guideBtnY = CANVAS_HEIGHT - 130;
guideButton = { x: guideBtnX, y: guideBtnY, w: guideBtnW, h: guideBtnH };

ctx.fillStyle = COLORS.hudBg;
ctx.beginPath();
ctx.roundRect(guideBtnX, guideBtnY, guideBtnW, guideBtnH, 8);
ctx.fill();

ctx.strokeStyle = COLORS.accent;
ctx.lineWidth = 1;
ctx.beginPath();
ctx.roundRect(guideBtnX, guideBtnY, guideBtnW, guideBtnH, 8);
ctx.stroke();

ctx.fillStyle = COLORS.accent;
ctx.font = 'bold 14px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('📖 가이드', CANVAS_WIDTH / 2, guideBtnY + guideBtnH / 2);
```

하단 키보드 안내에 G키 추가:
```typescript
ctx.fillText(
  'S: 시작 | P: 일시정지 | R: 리셋 | G: 가이드',
  CANVAS_WIDTH / 2,
  CANVAS_HEIGHT - 25,
);
```

**Step 4: KeyG 이벤트 핸들러 추가**

handleKeyDown에서 state === 'start'일 때 KeyG 처리 추가:
```typescript
case 'KeyG':
  if (state === 'start') {
    startTutorial();
  }
  break;
```

**Step 5: 클릭/터치 이벤트에서 가이드 버튼 처리 추가**

클릭 이벤트에서 state === 'start'일 때 가이드 버튼 영역 체크:
```typescript
if (state === 'start') {
  if (x >= guideButton.x && x <= guideButton.x + guideButton.w &&
      y >= guideButton.y && y <= guideButton.y + guideButton.h) {
    startTutorial();
    return;
  }
  // 기존 시작 로직...
  startStage();
  return;
}
```

터치 이벤트에서도 동일하게 추가.

**Step 6: 커밋**

```bash
git add app/(canvas-mobile)/ripple/_lib/game.ts
git commit -m "feat(ripple): replace auto-tutorial with always-accessible guide button"
```

---

## Task 3: Queens 튜토리얼 상태 및 데이터 추가

**Files:**
- Modify: `app/(canvas-mobile)/queens/_lib/game.ts`

**Step 1: 튜토리얼 상수/변수 추가**

game.ts의 state 변수 선언부(라인 ~44-65) 근처에 튜토리얼 관련 상수와 변수를 추가한다.

```typescript
// Tutorial state
let tutorialStep = 0;
let tutorialBlinkTime = 0;
const TUTORIAL_GRID_SIZE = 4;
const TUTORIAL_MESSAGES = [
  '각 행에 퀸을 1개씩 배치하세요',
  '각 열에도 퀸은 1개만!',
  '같은 색 영역에도 퀸은 1개만!',
  '퀸은 대각선으로 인접할 수 없습니다',
  '직접 풀어보세요!',
  '준비 완료!\n이제 진짜 퍼즐을 풀어봅시다 🎉',
];

// Fixed tutorial puzzle (4x4, logically solvable)
const TUTORIAL_REGIONS = [
  [0, 0, 1, 1],
  [0, 2, 2, 1],
  [3, 2, 2, 1],
  [3, 3, 3, 2],
];
const TUTORIAL_SOLUTION = [
  [false, false, true, false],
  [true, false, false, false],
  [false, false, false, true],
  [false, true, false, false],
];

// Tutorial demo boards for each rule step (pre-built examples showing violations)
const TUTORIAL_DEMOS = [
  // Step 0: row violation - 2 queens in row 0
  { queens: [[0, 0], [0, 2]], errorPairs: [[0, 0], [0, 2]], highlight: 'row' },
  // Step 1: col violation - 2 queens in col 1
  { queens: [[0, 1], [2, 1]], errorPairs: [[0, 1], [2, 1]], highlight: 'col' },
  // Step 2: region violation - 2 queens in same region
  { queens: [[0, 0], [1, 0]], errorPairs: [[0, 0], [1, 0]], highlight: 'region' },
  // Step 3: adjacency violation - diagonal adjacent
  { queens: [[0, 0], [1, 1]], errorPairs: [[0, 0], [1, 1]], highlight: 'adjacent' },
];

let tutorialBoard: TCellState[][] = [];
let tutorialPlacedCount = 0;
```

**Step 2: state 타입에 'tutorial' 추가**

기존 state 변수(라인 ~44):
```typescript
let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' = 'start';
```

변경:
```typescript
let state: 'start' | 'loading' | 'playing' | 'paused' | 'gameover' | 'tutorial' = 'start';
```

**Step 3: 가이드 버튼 영역 변수 추가**

```typescript
let guideButton = { x: 0, y: 0, w: 0, h: 0 };
```

**Step 4: 커밋**

```bash
git add app/(canvas-mobile)/queens/_lib/game.ts
git commit -m "feat(queens): add tutorial state variables and demo data"
```

---

## Task 4: Queens 튜토리얼 시작/진행 로직 구현

**Files:**
- Modify: `app/(canvas-mobile)/queens/_lib/game.ts`

**Step 1: `startTutorial()` 함수 추가**

`resetGame()` 함수(라인 484-495) 뒤에 추가:

```typescript
function startTutorial(): void {
  state = 'tutorial';
  tutorialStep = 0;
  tutorialBlinkTime = 0;
  tutorialPlacedCount = 0;

  // Initialize tutorial board (empty 4x4)
  tutorialBoard = [];
  for (let r = 0; r < TUTORIAL_GRID_SIZE; r++) {
    tutorialBoard[r] = [];
    for (let c = 0; c < TUTORIAL_GRID_SIZE; c++) {
      tutorialBoard[r][c] = 'empty';
    }
  }
}

function advanceTutorial(): void {
  tutorialStep++;
  if (tutorialStep >= TUTORIAL_MESSAGES.length) {
    state = 'start';
  }
  // Reset tutorial board when entering practice step
  if (tutorialStep === 4) {
    tutorialPlacedCount = 0;
    for (let r = 0; r < TUTORIAL_GRID_SIZE; r++) {
      for (let c = 0; c < TUTORIAL_GRID_SIZE; c++) {
        tutorialBoard[r][c] = 'empty';
      }
    }
  }
}

function handleTutorialTap(row?: number, col?: number): void {
  if (tutorialStep === 4) {
    // Practice puzzle - toggle cell
    if (row !== undefined && col !== undefined &&
        row >= 0 && row < TUTORIAL_GRID_SIZE &&
        col >= 0 && col < TUTORIAL_GRID_SIZE) {
      const current = tutorialBoard[row][col];
      if (current === 'empty') {
        tutorialBoard[row][col] = 'cross';
      } else if (current === 'cross') {
        tutorialBoard[row][col] = 'queen';
        tutorialPlacedCount++;
      } else {
        tutorialBoard[row][col] = 'empty';
        tutorialPlacedCount--;
      }

      // Check if puzzle is solved
      if (tutorialPlacedCount === TUTORIAL_GRID_SIZE) {
        let correct = true;
        for (let r = 0; r < TUTORIAL_GRID_SIZE; r++) {
          for (let c = 0; c < TUTORIAL_GRID_SIZE; c++) {
            if (TUTORIAL_SOLUTION[r][c] && tutorialBoard[r][c] !== 'queen') {
              correct = false;
            }
            if (!TUTORIAL_SOLUTION[r][c] && tutorialBoard[r][c] === 'queen') {
              correct = false;
            }
          }
        }
        if (correct) {
          advanceTutorial(); // move to step 5 (completion)
        }
      }
    }
  } else {
    advanceTutorial();
  }
}
```

**Step 2: 커밋**

```bash
git add app/(canvas-mobile)/queens/_lib/game.ts
git commit -m "feat(queens): implement tutorial start, advance, and tap handling logic"
```

---

## Task 5: Queens 튜토리얼 렌더링 구현

**Files:**
- Modify: `app/(canvas-mobile)/queens/_lib/game.ts`

**Step 1: `renderTutorial()` 함수 추가**

`renderStartScreen()` 함수 바로 앞에 추가한다.

```typescript
function renderTutorial(): void {
  ctx.fillStyle = COLORS.canvasBg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Title
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('튜토리얼', CANVAS_WIDTH / 2, 40);

  // Grid setup
  const cellSize = 80;
  const gridW = TUTORIAL_GRID_SIZE * cellSize;
  const gridLeft = (CANVAS_WIDTH - gridW) / 2;
  const gridTop = 80;

  // Draw grid cells
  for (let r = 0; r < TUTORIAL_GRID_SIZE; r++) {
    for (let c = 0; c < TUTORIAL_GRID_SIZE; c++) {
      const x = gridLeft + c * cellSize;
      const y = gridTop + r * cellSize;
      const region = TUTORIAL_REGIONS[r][c];

      // Cell background (region color)
      ctx.fillStyle = REGION_COLORS[region];
      ctx.globalAlpha = 0.4;
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.globalAlpha = 1;

      // Cell border
      ctx.strokeStyle = COLORS.cardBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellSize, cellSize);

      // Demo steps (0-3): show pre-built violation examples
      if (tutorialStep < 4) {
        const demo = TUTORIAL_DEMOS[tutorialStep];
        const isQueen = demo.queens.some(([qr, qc]) => qr === r && qc === c);
        const isError = demo.errorPairs.some(([er, ec]) => er === r && ec === c);

        if (isQueen) {
          // Draw queen (pixel crown)
          if (isError) {
            // Error shake animation
            const shakeX = Math.sin(tutorialBlinkTime * 15) * 3 *
              Math.max(0, 1 - (tutorialBlinkTime % 2));
            drawPixelCrown(x + cellSize / 2 - 12 + shakeX, y + cellSize / 2 - 8, 12, COLORS.error);
          } else {
            drawPixelCrown(x + cellSize / 2 - 12, y + cellSize / 2 - 8, 12, COLORS.accent);
          }
        }

        // Highlight the violation type
        if (demo.highlight === 'row' && demo.errorPairs.some(([er]) => er === r)) {
          ctx.strokeStyle = `rgba(255,68,102,${0.3 + 0.3 * Math.sin(tutorialBlinkTime * 4)})`;
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        }
        if (demo.highlight === 'col' && demo.errorPairs.some(([, ec]) => ec === c)) {
          ctx.strokeStyle = `rgba(255,68,102,${0.3 + 0.3 * Math.sin(tutorialBlinkTime * 4)})`;
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
        }
        if (demo.highlight === 'region') {
          const demoRegion = TUTORIAL_REGIONS[demo.errorPairs[0][0]][demo.errorPairs[0][1]];
          if (region === demoRegion) {
            ctx.strokeStyle = `rgba(255,68,102,${0.3 + 0.3 * Math.sin(tutorialBlinkTime * 4)})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          }
        }
        if (demo.highlight === 'adjacent') {
          // Highlight the adjacent cells between the two queens
          const [q1r, q1c] = demo.errorPairs[0];
          const [q2r, q2c] = demo.errorPairs[1];
          if ((r === q1r && c === q1c) || (r === q2r && c === q2c)) {
            ctx.strokeStyle = `rgba(255,68,102,${0.3 + 0.3 * Math.sin(tutorialBlinkTime * 4)})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          }
        }
      }

      // Practice step (4): interactive board
      if (tutorialStep === 4) {
        const cellState = tutorialBoard[r][c];
        if (cellState === 'queen') {
          drawPixelCrown(x + cellSize / 2 - 12, y + cellSize / 2 - 8, 12, COLORS.accent);
        } else if (cellState === 'cross') {
          ctx.strokeStyle = COLORS.textSecondary;
          ctx.lineWidth = 2;
          const pad = cellSize * 0.3;
          ctx.beginPath();
          ctx.moveTo(x + pad, y + pad);
          ctx.lineTo(x + cellSize - pad, y + cellSize - pad);
          ctx.moveTo(x + cellSize - pad, y + pad);
          ctx.lineTo(x + pad, y + cellSize - pad);
          ctx.stroke();
        }

        // Pulse hint on first correct empty cell (optional guidance)
        if (cellState === 'empty' && TUTORIAL_SOLUTION[r][c]) {
          // Check if this is the first unhinted queen position
          let isFirstHint = true;
          outer: for (let hr = 0; hr < TUTORIAL_GRID_SIZE; hr++) {
            for (let hc = 0; hc < TUTORIAL_GRID_SIZE; hc++) {
              if (hr === r && hc === c) break outer;
              if (TUTORIAL_SOLUTION[hr][hc] && tutorialBoard[hr][hc] !== 'queen') {
                isFirstHint = false;
                break outer;
              }
            }
          }
          if (isFirstHint) {
            const pulse = 0.2 + 0.4 * Math.abs(Math.sin(tutorialBlinkTime * 3));
            ctx.strokeStyle = `rgba(255,107,157,${pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(x + 4, y + 4, cellSize - 8, cellSize - 8, 5);
            ctx.stroke();
          }
        }
      }
    }
  }

  // Draw region borders (thicker borders between different regions)
  ctx.strokeStyle = COLORS.textPrimary;
  ctx.lineWidth = 2.5;
  for (let r = 0; r < TUTORIAL_GRID_SIZE; r++) {
    for (let c = 0; c < TUTORIAL_GRID_SIZE; c++) {
      const x = gridLeft + c * cellSize;
      const y = gridTop + r * cellSize;
      if (c < TUTORIAL_GRID_SIZE - 1 && TUTORIAL_REGIONS[r][c] !== TUTORIAL_REGIONS[r][c + 1]) {
        ctx.beginPath();
        ctx.moveTo(x + cellSize, y);
        ctx.lineTo(x + cellSize, y + cellSize);
        ctx.stroke();
      }
      if (r < TUTORIAL_GRID_SIZE - 1 && TUTORIAL_REGIONS[r][c] !== TUTORIAL_REGIONS[r + 1][c]) {
        ctx.beginPath();
        ctx.moveTo(x, y + cellSize);
        ctx.lineTo(x + cellSize, y + cellSize);
        ctx.stroke();
      }
    }
  }

  // Outer border
  ctx.strokeStyle = COLORS.textPrimary;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(gridLeft, gridTop, gridW, gridW);

  // Message bubble
  const msgY = gridTop + gridW + 30;
  const msgW = 400;
  const msgH = 100;
  const msgX = CANVAS_WIDTH / 2 - msgW / 2;

  ctx.fillStyle = COLORS.cardBg;
  ctx.beginPath();
  ctx.roundRect(msgX, msgY, msgW, msgH, 12);
  ctx.fill();

  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(msgX, msgY, msgW, msgH, 12);
  ctx.stroke();

  // Message text
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  const msg = TUTORIAL_MESSAGES[tutorialStep];
  const lines = msg.split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_WIDTH / 2, msgY + 30 + i * 24);
  });

  // Prompt text
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '13px sans-serif';
  if (tutorialStep === 4) {
    ctx.fillText('퀸을 올바른 위치에 놓아보세요', CANVAS_WIDTH / 2, msgY + msgH - 15);
  } else {
    ctx.fillText('탭하여 계속 ▶', CANVAS_WIDTH / 2, msgY + msgH - 15);
  }

  // Progress indicator
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px sans-serif';
  ctx.fillText(
    `${tutorialStep + 1} / ${TUTORIAL_MESSAGES.length}`,
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT - 30,
  );
}
```

**Step 2: `render()` 함수에 tutorial state 분기 추가**

기존 render() 함수(라인 ~1188-1208)에서 state별 분기에 'tutorial' 케이스 추가:

```typescript
if (state === 'tutorial') {
  renderTutorial();
  return;
}
```

**Step 3: 게임루프에서 tutorial state의 애니메이션 업데이트**

게임루프(라인 ~1210-1219)에서 tutorialBlinkTime 업데이트 추가:

```typescript
if (state === 'tutorial') {
  tutorialBlinkTime += dt;
}
```

**Step 4: 커밋**

```bash
git add app/(canvas-mobile)/queens/_lib/game.ts
git commit -m "feat(queens): implement tutorial rendering with rule visualization"
```

---

## Task 6: Queens 시작 화면에 가이드 버튼 추가 & 이벤트 처리

**Files:**
- Modify: `app/(canvas-mobile)/queens/_lib/game.ts`

**Step 1: 시작 화면에 가이드 버튼 렌더링 추가**

`renderStartScreen()` 함수(라인 947-960)의 키보드 안내 텍스트 위에 가이드 버튼을 추가한다.

난이도 카드(baseY=180, height=130)와 키보드 안내(CANVAS_HEIGHT-50) 사이에 배치:

```typescript
// Guide button (after difficulty cards, before keyboard hints)
const guideBtnW = 140;
const guideBtnH = 36;
const guideBtnX = CANVAS_WIDTH / 2 - guideBtnW / 2;
const guideBtnY = 340;
guideButton = { x: guideBtnX, y: guideBtnY, w: guideBtnW, h: guideBtnH };

ctx.fillStyle = COLORS.cardBg;
ctx.beginPath();
ctx.roundRect(guideBtnX, guideBtnY, guideBtnW, guideBtnH, 8);
ctx.fill();

ctx.strokeStyle = COLORS.accent;
ctx.lineWidth = 1;
ctx.beginPath();
ctx.roundRect(guideBtnX, guideBtnY, guideBtnW, guideBtnH, 8);
ctx.stroke();

ctx.fillStyle = COLORS.accent;
ctx.font = 'bold 14px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('📖 가이드', CANVAS_WIDTH / 2, guideBtnY + guideBtnH / 2);
```

키보드 안내 업데이트 (기존 라인 951-959):
```typescript
ctx.fillText(
  '1: Easy   2: Normal   3: Hard   G: 가이드',
  CANVAS_WIDTH / 2,
  CANVAS_HEIGHT - 50,
);
```

**Step 2: KeyG 이벤트 핸들러 추가**

handleKeyDown(라인 ~549-635)의 state === 'start' 분기에 추가:

```typescript
if (e.code === 'KeyG' && state === 'start') {
  startTutorial();
  return;
}
```

**Step 3: 클릭 이벤트에서 가이드 버튼 및 튜토리얼 처리**

handleClick(라인 ~637-670)의 state === 'start' 분기에 가이드 버튼 히트 테스트 추가:

```typescript
if (state === 'start') {
  // Guide button check
  if (x >= guideButton.x && x <= guideButton.x + guideButton.w &&
      y >= guideButton.y && y <= guideButton.y + guideButton.h) {
    startTutorial();
    return;
  }
  // 기존 난이도 선택 로직...
}
```

tutorial state에서의 클릭 처리 추가:
```typescript
if (state === 'tutorial') {
  if (tutorialStep === 4) {
    // Convert click to grid cell
    const cellSize = 80;
    const gridW = TUTORIAL_GRID_SIZE * cellSize;
    const gridLeft = (CANVAS_WIDTH - gridW) / 2;
    const gridTop = 80;
    const col = Math.floor((x - gridLeft) / cellSize);
    const row = Math.floor((y - gridTop) / cellSize);
    if (row >= 0 && row < TUTORIAL_GRID_SIZE && col >= 0 && col < TUTORIAL_GRID_SIZE) {
      handleTutorialTap(row, col);
    }
  } else {
    handleTutorialTap();
  }
  return;
}
```

**Step 4: 터치 이벤트에서 가이드 버튼 및 튜토리얼 처리**

handleTouchStart(라인 ~698-746)에서 동일한 로직 추가:

```typescript
if (state === 'start') {
  // Guide button check
  if (x >= guideButton.x && x <= guideButton.x + guideButton.w &&
      y >= guideButton.y && y <= guideButton.y + guideButton.h) {
    startTutorial();
    return;
  }
  // 기존 난이도 선택 로직...
}

if (state === 'tutorial') {
  if (tutorialStep === 4) {
    const cellSize = 80;
    const gridW = TUTORIAL_GRID_SIZE * cellSize;
    const gridLeft = (CANVAS_WIDTH - gridW) / 2;
    const gridTop = 80;
    const col = Math.floor((x - gridLeft) / cellSize);
    const row = Math.floor((y - gridTop) / cellSize);
    if (row >= 0 && row < TUTORIAL_GRID_SIZE && col >= 0 && col < TUTORIAL_GRID_SIZE) {
      handleTutorialTap(row, col);
    }
  } else {
    handleTutorialTap();
  }
  return;
}
```

**Step 5: 키보드에서 튜토리얼 처리**

handleKeyDown에서 tutorial state 처리 추가:

```typescript
if (state === 'tutorial') {
  if (e.code === 'Escape') {
    state = 'start';
    return;
  }
  if (tutorialStep === 4) {
    // Allow arrow keys and space/enter for practice puzzle (optional, keyboard users)
    // For simplicity, just allow advancing with any key except practice step
  } else {
    handleTutorialTap();
  }
  return;
}
```

**Step 6: 커밋**

```bash
git add app/(canvas-mobile)/queens/_lib/game.ts
git commit -m "feat(queens): add guide button to start screen and tutorial event handling"
```

---

## Task 7: 통합 테스트 및 최종 확인

**Step 1: 개발 서버 실행**

```bash
yarn dev
```

**Step 2: Queens 확인 사항**

1. 시작 화면에 "가이드" 버튼이 표시되는지
2. 가이드 버튼 클릭/G키로 튜토리얼 진입되는지
3. 튜토리얼 단계 0-3에서 규칙 시각화가 올바른지
4. 단계 4에서 체험 퍼즐이 동작하는지 (셀 토글, 정답 확인)
5. 단계 5에서 완료 후 시작 화면으로 돌아가는지
6. 난이도 선택 후 퍼즐이 논리적으로 풀리는지 (5x5, 7x7, 9x9 각각)
7. 퍼즐 생성 시간이 합리적인지 (9x9에서도 수 초 이내)
8. 모바일 터치가 정상 동작하는지

**Step 3: Ripple 확인 사항**

1. 시작 화면에 "가이드" 버튼이 표시되는지
2. 가이드 버튼 클릭/G키로 튜토리얼 진입되는지
3. S키 누르면 바로 게임이 시작되는지 (자동 튜토리얼 없이)
4. 튜토리얼 내용이 기존과 동일한지
5. 모바일 터치가 정상 동작하는지

**Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat: add tutorial guide system to Queens and Ripple puzzles

- Add always-accessible guide button to Queens and Ripple start screens
- Implement 6-step Queens tutorial with rule visualization and practice puzzle
- Add constraint propagation solver to ensure Queens puzzles are logically solvable
- Remove Ripple's auto-tutorial trigger, replace with guide button"
```
