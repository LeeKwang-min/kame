# Queens 게임 비주얼 리디자인 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Queens 게임의 어두운 다크 테마를 밝고 아기자기한 캔디/팝 스타일로 전환하고, 핵심 액션에 포인트 애니메이션 추가.

**Architecture:** config.ts의 색상 상수 변경 → types.ts에 애니메이션 타입 추가 → game.ts의 렌더링 함수 전체 리디자인 + 애니메이션 시스템 추가. 기존 게임 로직(validation, toggle, hint 등)은 변경하지 않음.

**Tech Stack:** Canvas 2D API, 시간 기반 애니메이션 (requestAnimationFrame + dt)

---

### Task 1: config.ts 색상 팔레트 변경

**Files:**
- Modify: `app/(canvas-mobile)/queens/_lib/config.ts`

**Step 1: REGION_COLORS와 새 색상 상수 추가**

```typescript
// 기존 REGION_COLORS 교체 + 새 색상 상수 추가

// 캔디 파스텔 영역 색상 (최대 9개 영역)
export const REGION_COLORS = [
  '#FFB3D9', // 캔디 핑크
  '#B3E8FF', // 스카이 블루
  '#C8F7C5', // 민트 그린
  '#FFE0B2', // 피치 오렌지
  '#D4B3FF', // 라벤더
  '#FFF3B0', // 레몬 옐로우
  '#FFB3B3', // 코랄 핑크
  '#B3FFE0', // 아쿠아 민트
  '#E8C8FF', // 라일락
];

// UI 색상
export const COLORS = {
  canvasBg: '#FFF8F0',        // 웜 크림
  hudBg: '#FFF0E6',           // 피치 크림
  hudSeparator: 'rgba(180,140,200,0.3)',
  textPrimary: '#4A3B5C',     // 다크 퍼플
  textSecondary: 'rgba(74,59,92,0.5)',
  accent: '#FF6B9D',          // 핫핑크
  accentBg: 'rgba(255,107,157,0.15)',
  accentBorder: 'rgba(255,107,157,0.4)',
  error: '#FF4466',           // 로즈
  hint: '#6C5CE7',            // 퍼플
  cellBorder: 'rgba(180,140,200,0.2)',
  regionBorder: 'rgba(120,80,160,0.4)',
  cardBg: '#FFFFFF',
  cardBorder: 'rgba(180,140,200,0.3)',
  cardHoverBorder: '#FF6B9D',
  cardShadow: 'rgba(180,140,200,0.15)',
  inactiveBg: 'rgba(180,140,200,0.08)',
  inactiveBorder: 'rgba(180,140,200,0.2)',
  inactiveText: 'rgba(74,59,92,0.3)',
} as const;
```

**Step 2: 시각적 확인**

Run: 브라우저에서 Queens 게임 시작 화면 확인
Expected: 아직 game.ts에 적용 안 했으므로 변화 없음 (config만 준비)

**Step 3: Commit**

```bash
git add app/(canvas-mobile)/queens/_lib/config.ts
git commit -m "feat(queens): update color palette to candy/pop theme"
```

---

### Task 2: types.ts에 애니메이션 상태 타입 추가

**Files:**
- Modify: `app/(canvas-mobile)/queens/_lib/types.ts`

**Step 1: 애니메이션 관련 타입 추가**

TCell에 애니메이션 상태 추가하고 파티클 타입 정의:

```typescript
// 기존 타입들 유지 + 아래 추가

export type TCellAnim = {
  scale: number;        // 퀸 팝업/슈링크 (0~1.2)
  opacity: number;      // X 마크 페이드 (0~1)
  shakeX: number;       // 에러 흔들림 오프셋
  shakeTime: number;    // 흔들림 남은 시간 (ms)
  scaleTime: number;    // 스케일 애니메이션 남은 시간 (ms)
  scaleDir: 'in' | 'out'; // 팝업 or 슈링크
  fadeTime: number;     // 페이드 남은 시간 (ms)
  fadeDir: 'in' | 'out';
};

export type TParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;     // 남은 수명 (ms)
  maxLife: number;
  size: number;
  color: string;
  type: 'star' | 'heart' | 'sparkle';
};

export type TCelebration = {
  active: boolean;
  time: number;          // 경과 시간 (ms)
  highlightIndex: number; // 현재 하이라이트 중인 셀 인덱스
};
```

**Step 2: Commit**

```bash
git add app/(canvas-mobile)/queens/_lib/types.ts
git commit -m "feat(queens): add animation and particle type definitions"
```

---

### Task 3: game.ts — 색상 적용 (시작 화면 + HUD)

**Files:**
- Modify: `app/(canvas-mobile)/queens/_lib/game.ts`

**Step 1: import에 COLORS 추가**

```typescript
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HUD_HEIGHT,
  GRID_PADDING,
  DIFFICULTY_CONFIG,
  REGION_COLORS,
  HINT_PENALTY_SECONDS,
  COLORS,           // 추가
} from './config';
```

**Step 2: renderStartScreen() 전체 교체**

모든 색상을 COLORS 상수로 교체:
- 배경: `COLORS.canvasBg`
- 타이틀: `COLORS.textPrimary`
- 부제: `COLORS.textSecondary`
- 카드 배경: `COLORS.cardBg` + shadow
- 카드 보더: `COLORS.cardBorder` / 호버 시 `COLORS.cardHoverBorder`
- 호버 글로우: `COLORS.accent`
- 라벨: `COLORS.textPrimary` / 호버 시 `COLORS.accent`
- 배율 뱃지: `COLORS.accent`
- 키보드 힌트: `COLORS.textSecondary`

**Step 3: renderHud() 전체 교체**

- HUD 배경: `COLORS.hudBg`
- 텍스트: `COLORS.textPrimary`
- 힌트 버튼 활성: `COLORS.accentBg` + `COLORS.accentBorder` + `COLORS.accent`
- 힌트 버튼 비활성: `COLORS.inactiveBg` + `COLORS.inactiveBorder` + `COLORS.inactiveText`
- 구분선: `COLORS.hudSeparator`

**Step 4: render() 함수의 배경색 변경**

```typescript
function render() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = COLORS.canvasBg;  // 기존 '#1a1a2e' → COLORS.canvasBg
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // ... 나머지 동일
}
```

**Step 5: 시각적 확인**

Run: 브라우저에서 Queens 시작 화면 확인
Expected: 밝은 크림 배경에 캔디 색상의 카드가 표시됨

**Step 6: Commit**

```bash
git add app/(canvas-mobile)/queens/_lib/game.ts
git commit -m "feat(queens): apply candy theme to start screen and HUD"
```

---

### Task 4: game.ts — 그리드 색상 적용 + 픽셀아트 왕관

**Files:**
- Modify: `app/(canvas-mobile)/queens/_lib/game.ts`

**Step 1: 픽셀아트 왕관 렌더링 함수 추가**

setupQueens 함수 내부에 추가:

```typescript
// 픽셀아트 왕관 비트맵 (7x7 grid, 1=filled)
const CROWN_BITMAP = [
  [0, 1, 0, 1, 0, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
];
// 보석 위치 (뾰족한 3개 포인트)
const CROWN_JEWELS = [[0, 1], [0, 3], [0, 5]];

function darkenColor(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

function lightenColor(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

function drawPixelCrown(
  cx: number, cy: number, size: number,
  color: string, scale: number = 1,
) {
  const pixelSize = Math.floor(size / 7) * scale;
  const totalW = pixelSize * 7;
  const totalH = pixelSize * 7;
  const startX = cx - totalW / 2;
  const startY = cy - totalH / 2;

  const mainColor = darkenColor(color, 60);
  const jewelColor = lightenColor(color, 40);

  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (CROWN_BITMAP[r][c]) {
        const isJewel = CROWN_JEWELS.some(([jr, jc]) => jr === r && jc === c);
        ctx.fillStyle = isJewel ? jewelColor : mainColor;
        ctx.fillRect(
          startX + c * pixelSize,
          startY + r * pixelSize,
          pixelSize,
          pixelSize,
        );
      }
    }
  }
}
```

**Step 2: renderGrid()에서 퀸 렌더링 교체**

기존 원형 배경 + ♛ 문자 → drawPixelCrown 호출:

```typescript
} else if (cell.state === 'queen') {
  const cx = x + cellSize / 2;
  const cy = y + cellSize / 2;
  const crownSize = cellSize * 0.65;
  const regionColor = REGION_COLORS[cell.region % REGION_COLORS.length];
  const crownColor = cell.isError
    ? COLORS.error
    : cell.isHinted
      ? COLORS.hint
      : regionColor;
  drawPixelCrown(cx, cy, crownSize, crownColor);
}
```

**Step 3: renderGrid()에서 X 마크 색상 변경**

```typescript
if (cell.state === 'cross') {
  const pad = cellSize * 0.3;
  const regionColor = REGION_COLORS[cell.region % REGION_COLORS.length];
  ctx.strokeStyle = cell.isHinted
    ? COLORS.hint
    : cell.isError
      ? COLORS.error
      : darkenColor(regionColor, 40);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  // ... 기존 X 그리기 로직 동일
}
```

**Step 4: renderGrid()에서 보더/커서 색상 변경**

- 셀 보더: `COLORS.cellBorder`
- 리전 보더: `COLORS.regionBorder`
- 외곽 보더: `COLORS.regionBorder`
- 커서: `COLORS.accent`

**Step 5: 시각적 확인**

Run: 브라우저에서 Queens 게임 플레이
Expected: 밝은 배경에 캔디 색상 셀, 픽셀 왕관 아이콘, 핫핑크 커서

**Step 6: Commit**

```bash
git add app/(canvas-mobile)/queens/_lib/game.ts
git commit -m "feat(queens): add pixel art crown and candy grid colors"
```

---

### Task 5: game.ts — 애니메이션 시스템 기반 구축

**Files:**
- Modify: `app/(canvas-mobile)/queens/_lib/game.ts`

**Step 1: import에 애니메이션 타입 추가**

```typescript
import { TDifficulty, TCell, TBoard, TCellState, TCellAnim, TParticle, TCelebration } from './types';
```

**Step 2: 애니메이션 상태 변수 추가**

setupQueens 내부, 기존 게임 상태 변수 아래에:

```typescript
// Animation state
let cellAnims: TCellAnim[][] = [];
let particles: TParticle[] = [];
let celebration: TCelebration = { active: false, time: 0, highlightIndex: -1 };

function initCellAnims(size: number) {
  cellAnims = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      scale: 1,
      opacity: 1,
      shakeX: 0,
      shakeTime: 0,
      scaleTime: 0,
      scaleDir: 'in' as const,
      fadeTime: 0,
      fadeDir: 'in' as const,
    })),
  );
}
```

**Step 3: initBoard 호출 후 initCellAnims도 호출**

startGame() 함수에서 `initBoard(boardSize)` 다음에:

```typescript
initBoard(boardSize);
initCellAnims(boardSize);  // 추가
```

**Step 4: 애니메이션 업데이트 함수 추가**

```typescript
function updateAnimations(dt: number) {
  const dtMs = dt * 1000;

  // Update cell animations
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const anim = cellAnims[r]?.[c];
      if (!anim) continue;

      // Scale animation (queen pop/shrink)
      if (anim.scaleTime > 0) {
        anim.scaleTime = Math.max(0, anim.scaleTime - dtMs);
        const progress = 1 - anim.scaleTime / 300;
        if (anim.scaleDir === 'in') {
          // Bounce: 0 → 1.2 → 1.0
          if (progress < 0.6) {
            anim.scale = (progress / 0.6) * 1.2;
          } else {
            anim.scale = 1.2 - ((progress - 0.6) / 0.4) * 0.2;
          }
        } else {
          // Shrink: 1.0 → 0
          anim.scale = 1 - progress;
        }
        if (anim.scaleTime <= 0) {
          anim.scale = anim.scaleDir === 'in' ? 1 : 0;
        }
      }

      // Fade animation (X mark)
      if (anim.fadeTime > 0) {
        anim.fadeTime = Math.max(0, anim.fadeTime - dtMs);
        const progress = 1 - anim.fadeTime / 150;
        anim.opacity = anim.fadeDir === 'in' ? progress : 1 - progress;
        if (anim.fadeTime <= 0) {
          anim.opacity = anim.fadeDir === 'in' ? 1 : 0;
        }
      }

      // Shake animation (error)
      if (anim.shakeTime > 0) {
        anim.shakeTime = Math.max(0, anim.shakeTime - dtMs);
        const intensity = (anim.shakeTime / 400) * 4;
        anim.shakeX = Math.sin(anim.shakeTime * 0.05) * intensity;
        if (anim.shakeTime <= 0) anim.shakeX = 0;
      }
    }
  }

  // Update particles
  particles = particles.filter(p => {
    p.life -= dtMs;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 120 * dt; // gravity
    return p.life > 0;
  });

  // Update celebration
  if (celebration.active) {
    celebration.time += dtMs;
    celebration.highlightIndex = Math.floor(celebration.time / (800 / (boardSize * boardSize)));
    if (celebration.time > 2300) {
      celebration.active = false;
    }
  }
}
```

**Step 5: gameLoop에서 updateAnimations 호출**

```typescript
function gameLoop(timestamp: number) {
  const dt = lastTime > 0 ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0;
  lastTime = timestamp;
  if (state === 'playing' || state === 'gameover') {
    updateAnimations(dt);
  }
  render();
  animationId = requestAnimationFrame(gameLoop);
}
```

**Step 6: Commit**

```bash
git add app/(canvas-mobile)/queens/_lib/game.ts app/(canvas-mobile)/queens/_lib/types.ts
git commit -m "feat(queens): add animation system infrastructure"
```

---

### Task 6: game.ts — 퀸 배치/제거 애니메이션 연결

**Files:**
- Modify: `app/(canvas-mobile)/queens/_lib/game.ts`

**Step 1: toggleCell에 애니메이션 트리거 추가**

```typescript
function toggleCell(row: number, col: number): void {
  const cell = board[row][col];
  if (cell.isHinted) return;

  const prevState = cell.state;
  const cycle: TCellState[] = ['empty', 'cross', 'queen'];
  const idx = cycle.indexOf(cell.state);
  cell.state = cycle[(idx + 1) % cycle.length];

  // Trigger animations
  const anim = cellAnims[row]?.[col];
  if (anim) {
    if (cell.state === 'queen') {
      // Pop-in animation
      anim.scale = 0;
      anim.scaleTime = 300;
      anim.scaleDir = 'in';
      // Spawn sparkle particles
      spawnSparkles(row, col);
    } else if (prevState === 'queen') {
      // No shrink needed since state already changed
      // (queen is gone, just reset scale)
      anim.scale = 1;
    }
    if (cell.state === 'cross') {
      // Fade-in X
      anim.opacity = 0;
      anim.fadeTime = 150;
      anim.fadeDir = 'in';
    }
  }

  validateBoard();
  checkWin();
}
```

**Step 2: 스파클 파티클 생성 함수**

```typescript
function spawnSparkles(row: number, col: number) {
  const { cellSize, offsetX, offsetY } = getGridLayout();
  const cx = offsetX + col * cellSize + cellSize / 2;
  const cy = offsetY + row * cellSize + cellSize / 2;
  const regionColor = REGION_COLORS[board[row][col].region % REGION_COLORS.length];

  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.5;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * (60 + Math.random() * 40),
      vy: Math.sin(angle) * (60 + Math.random() * 40) - 30,
      life: 500,
      maxLife: 500,
      size: 3 + Math.random() * 2,
      color: lightenColor(regionColor, 30),
      type: 'sparkle',
    });
  }
}
```

**Step 3: renderGrid에서 scale 적용**

퀸 렌더링 부분에서:

```typescript
} else if (cell.state === 'queen') {
  const anim = cellAnims[r]?.[c];
  const scale = anim?.scale ?? 1;
  if (scale > 0.01) {
    const cx = x + cellSize / 2 + (anim?.shakeX ?? 0);
    const cy = y + cellSize / 2;
    const crownSize = cellSize * 0.65 * scale;
    // ... drawPixelCrown 호출
  }
}
```

X 마크 렌더링에서:

```typescript
if (cell.state === 'cross') {
  const anim = cellAnims[r]?.[c];
  const opacity = anim?.opacity ?? 1;
  ctx.globalAlpha = opacity;
  // ... X 그리기
  ctx.globalAlpha = 1;
}
```

**Step 4: 파티클 렌더링 함수**

renderGrid() 끝에 추가:

```typescript
function renderParticles() {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    if (p.type === 'sparkle') {
      // 작은 다이아몬드 모양
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    } else if (p.type === 'star') {
      // 별 모양 (간단히 +자)
      ctx.fillRect(p.x - p.size / 2, p.y - 1, p.size, 2);
      ctx.fillRect(p.x - 1, p.y - p.size / 2, 2, p.size);
    } else {
      // heart - 작은 원으로 대체
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
```

render() 함수에서 renderGrid() 후 renderParticles() 호출.

**Step 5: 시각적 확인**

Run: 브라우저에서 퀸 배치/제거 시 애니메이션 확인
Expected: 퀸 배치 시 팝업+스파클, X 마크 페이드인

**Step 6: Commit**

```bash
git add app/(canvas-mobile)/queens/_lib/game.ts
git commit -m "feat(queens): add queen placement and sparkle animations"
```

---

### Task 7: game.ts — 에러 흔들림 + 완성 축하 애니메이션

**Files:**
- Modify: `app/(canvas-mobile)/queens/_lib/game.ts`

**Step 1: validateBoard에서 에러 셀에 shake 트리거**

validateBoard() 함수 끝에, 에러 표시 후:

```typescript
// After marking errors, trigger shake on newly errored cells
for (let r = 0; r < boardSize; r++) {
  for (let c = 0; c < boardSize; c++) {
    if (board[r][c].isError && board[r][c].state === 'queen') {
      const anim = cellAnims[r]?.[c];
      if (anim && anim.shakeTime <= 0) {
        anim.shakeTime = 400;
      }
    }
  }
}
```

**Step 2: checkWin에서 celebration 트리거**

checkWin() 함수에서 승리 시:

```typescript
if (queenCount === boardSize && !hasError) {
  // Trigger celebration before changing state
  celebration = { active: true, time: 0, highlightIndex: -1 };
  spawnCelebrationParticles();

  const config = DIFFICULTY_CONFIG[difficulty];
  const elapsed = getElapsedSeconds();
  const effectiveTime = elapsed + hintPenalty;
  score = Math.floor(config.multiplier * Math.max(0, config.baseTime - effectiveTime));
  state = 'gameover';
}
```

**Step 3: 축하 파티클 생성 함수**

```typescript
function spawnCelebrationParticles() {
  for (let i = 0; i < 30; i++) {
    const color = REGION_COLORS[Math.floor(Math.random() * REGION_COLORS.length)];
    particles.push({
      x: Math.random() * CANVAS_WIDTH,
      y: -10,
      vx: (Math.random() - 0.5) * 80,
      vy: 40 + Math.random() * 60,
      life: 1500,
      maxLife: 1500,
      size: 4 + Math.random() * 4,
      color,
      type: ['star', 'heart', 'sparkle'][Math.floor(Math.random() * 3)] as TParticle['type'],
    });
  }
}
```

**Step 4: 셀 순차 하이라이트 렌더링**

renderGrid() 내부, 셀 배경 렌더링 후:

```typescript
// Celebration highlight overlay
if (celebration.active) {
  const cellIndex = r * boardSize + c;
  if (cellIndex <= celebration.highlightIndex) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(x, y, cellSize, cellSize);
  }
}
```

**Step 5: 시각적 확인**

Run: 브라우저에서 에러 발생 시 흔들림, 퍼즐 완성 시 축하 확인
Expected: 충돌 퀸 흔들림, 완성 시 셀 순차 하이라이트 + 파티클 낙하

**Step 6: Commit**

```bash
git add app/(canvas-mobile)/queens/_lib/game.ts
git commit -m "feat(queens): add error shake and completion celebration animations"
```

---

### Task 8: 시작 화면에 픽셀 왕관 아이콘 + 카드 호버 스케일

**Files:**
- Modify: `app/(canvas-mobile)/queens/_lib/game.ts`

**Step 1: 시작 화면 타이틀 옆에 작은 왕관 추가**

renderStartScreen()에서 타이틀 렌더링 후:

```typescript
// Title
ctx.fillStyle = COLORS.textPrimary;
ctx.font = 'bold 36px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Queens', CANVAS_WIDTH / 2 + 12, 80);
// Small pixel crown next to title
drawPixelCrown(CANVAS_WIDTH / 2 - 75, 80, 24, '#FF6B9D');
```

**Step 2: 카드 호버 시 그림자 강화**

난이도 카드에서 호버 시:

```typescript
if (isHovered) {
  ctx.shadowColor = 'rgba(255,107,157,0.3)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 4;
}
// 카드 배경 그리기
ctx.fillStyle = COLORS.cardBg;
ctx.beginPath();
ctx.roundRect(x, y, btnW, btnH, 12);
ctx.fill();
// 그림자 리셋
ctx.shadowColor = 'transparent';
ctx.shadowBlur = 0;
ctx.shadowOffsetY = 0;
```

**Step 3: 시각적 확인**

Run: 브라우저에서 시작 화면 확인
Expected: 타이틀 왼쪽에 핑크 왕관, 카드 호버 시 핑크 글로우+그림자

**Step 4: Commit**

```bash
git add app/(canvas-mobile)/queens/_lib/game.ts
git commit -m "feat(queens): add pixel crown to title and card hover effects"
```

---

### Task 9: 최종 정리 및 검증

**Files:**
- Review: `app/(canvas-mobile)/queens/_lib/game.ts`
- Review: `app/(canvas-mobile)/queens/_lib/config.ts`
- Review: `app/(canvas-mobile)/queens/_lib/types.ts`

**Step 1: 데스크탑에서 전체 플로우 테스트**

확인 항목:
- [ ] 시작 화면: 밝은 크림 배경, 캔디 카드, 왕관 아이콘
- [ ] 카드 호버: 핫핑크 글로우
- [ ] 게임 플레이: 밝은 파스텔 그리드
- [ ] 퀸 배치: 픽셀 왕관 + 팝업 + 스파클
- [ ] X 마크: 페이드인
- [ ] 에러: 빨간 퀸 + 흔들림
- [ ] 힌트: 퍼플 색상
- [ ] 퍼즐 완성: 셀 하이라이트 + 파티클 낙하
- [ ] HUD: 밝은 배경, 핫핑크 힌트 버튼
- [ ] 일시정지/게임오버 오버레이 정상

**Step 2: 모바일에서 전체 플로우 테스트**

확인 항목:
- [ ] 터치로 난이도 선택
- [ ] 터치로 셀 탭 → 퀸 배치 애니메이션
- [ ] 터치로 힌트 버튼
- [ ] 게임오버 터치 (저장/재시작)
- [ ] 반응형 스케일링 정상

**Step 3: 미사용 코드 정리**

기존 다크 테마 하드코딩 색상이 남아있는지 확인하고 제거.

**Step 4: 최종 Commit**

```bash
git add app/(canvas-mobile)/queens/_lib/
git commit -m "feat(queens): finalize candy/pop theme redesign"
```
