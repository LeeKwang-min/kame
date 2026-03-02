# Tap Empire (탭 제국) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 3분 안에 최대한 큰 제국을 건설하는 시간제한 아이들 클리커 게임을 canvas-mobile 라우트 그룹에 구현한다.

**Architecture:** Canvas 2D 기반의 아이들 클리커. 탭으로 골드를 획득하고, 6단계 자동 생산기와 업그레이드 시스템으로 골드 수익을 극대화한다. 기존 dodge 게임의 canvas-mobile 패턴(CSS transform 스케일링, 공유 HUD, 터치 이벤트)을 그대로 따른다.

**Tech Stack:** Next.js, Canvas 2D API, TypeScript, 기존 공유 HUD 라이브러리 (`lib/game.ts`)

**Design Doc:** `docs/plans/2026-03-02-tap-empire-design.md`

---

### Task 1: 타입 정의 및 설정 상수

**Files:**
- Create: `app/(canvas-mobile)/tapempire/_lib/types.ts`
- Create: `app/(canvas-mobile)/tapempire/_lib/config.ts`

**Step 1: types.ts 작성**

```typescript
export type TProducerDef = {
  id: string;
  name: string;
  icon: string;
  baseCost: number;
  baseProduction: number;
};

export type TProducerState = {
  count: number;
  upgraded: boolean;
};

export type TFloatingText = {
  x: number;
  y: number;
  text: string;
  opacity: number;
  vy: number;
};

export type TGameState = {
  gold: number;
  totalGold: number;
  tapPower: number;
  tapPowerLevel: number;
  producers: TProducerState[];
  totalTaps: number;
  timeRemaining: number;
  floatingTexts: TFloatingText[];
};
```

**Step 2: config.ts 작성**

```typescript
import { TGameMeta } from '@/@types/game-meta';
import { TProducerDef } from './types';

export const GAME_META: TGameMeta = {
  id: 'tapempire',
  title: '탭 제국',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'action',
  difficulty: 'progressive',
};

export const CANVAS_SIZE = 620;
export const GAME_DURATION = 180; // 3분

// 색상
export const COLORS = {
  bg: '#0f1923',
  gold: '#FFD700',
  goldDark: '#B8860B',
  text: '#ffffff',
  textDim: '#8899aa',
  panelBg: '#1a2a3a',
  panelBorder: '#2a3a4a',
  buyable: '#2ecc71',
  locked: '#555555',
  tapArea: '#162636',
  tapAreaBorder: '#2a4a6a',
  upgradeBtn: '#8b5cf6',
  upgradeBtnDim: '#4a3a6a',
};

// 생산기 정의
export const PRODUCERS: TProducerDef[] = [
  { id: 'miner', name: '광부', icon: '⛏', baseCost: 15, baseProduction: 1 },
  { id: 'farm', name: '농장', icon: '🌾', baseCost: 100, baseProduction: 5 },
  { id: 'forge', name: '대장간', icon: '🔨', baseCost: 500, baseProduction: 20 },
  { id: 'market', name: '시장', icon: '🏪', baseCost: 2500, baseProduction: 100 },
  { id: 'castle', name: '성', icon: '🏰', baseCost: 15000, baseProduction: 500 },
  { id: 'dragon', name: '용', icon: '🐉', baseCost: 100000, baseProduction: 3000 },
];

export const PRICE_MULTIPLIER = 1.15;
export const UPGRADE_COST_MULTIPLIER = 10;
export const TAP_UPGRADE_BASE_COST = 50;
export const TAP_UPGRADE_COST_MULTIPLIER = 3;

// UI 영역 레이아웃 (캔버스 좌표 기준)
export const LAYOUT = {
  headerHeight: 50,
  tapAreaTop: 55,
  tapAreaHeight: 200,
  statsBarTop: 260,
  statsBarHeight: 30,
  producerListTop: 295,
  producerRowHeight: 45,
  upgradeBarTop: 570,
  upgradeBarHeight: 45,
};
```

**Step 3: Commit**

```bash
git add app/(canvas-mobile)/tapempire/_lib/types.ts app/(canvas-mobile)/tapempire/_lib/config.ts
git commit -m "feat(tapempire): add type definitions and config constants"
```

---

### Task 2: 게임 로직 - 코어 (상태 관리 + 게임 루프)

**Files:**
- Create: `app/(canvas-mobile)/tapempire/_lib/game.ts`

**참조 필수:** `app/(canvas-mobile)/dodge/_lib/game.ts`의 패턴을 그대로 따를 것.

**Step 1: game.ts 핵심 구조 작성**

기존 dodge 패턴을 따라 `setupTapEmpire` 함수 작성. 핵심 요소:

1. **함수 시그니처:**
```typescript
import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { CANVAS_SIZE, GAME_DURATION, PRODUCERS, COLORS, LAYOUT, PRICE_MULTIPLIER, UPGRADE_COST_MULTIPLIER, TAP_UPGRADE_BASE_COST, TAP_UPGRADE_COST_MULTIPLIER } from './config';
import { TProducerState, TFloatingText, TGameState } from './types';

export type TTapEmpireCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn: boolean;
};

export function setupTapEmpire(
  canvas: HTMLCanvasElement,
  callbacks: TTapEmpireCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  // ...
}
```

2. **상태 변수:**
```typescript
let isStarted = false;
let isLoading = false;
let isPaused = false;
let isGameOver = false;
let lastTime = 0;
let raf = 0;

// 게임 상태
let gold = 0;
let totalGold = 0;
let tapPower = 1;
let tapPowerLevel = 0;
let producers: TProducerState[] = PRODUCERS.map(() => ({ count: 0, upgraded: false }));
let totalTaps = 0;
let timeRemaining = GAME_DURATION;
let floatingTexts: TFloatingText[] = [];
```

3. **골드 계산 함수들:**
```typescript
const getProducerCost = (index: number): number => {
  return Math.floor(PRODUCERS[index].baseCost * Math.pow(PRICE_MULTIPLIER, producers[index].count));
};

const getProducerProduction = (index: number): number => {
  const base = PRODUCERS[index].baseProduction;
  const multiplier = producers[index].upgraded ? 2 : 1;
  return base * producers[index].count * multiplier;
};

const getTotalProduction = (): number => {
  return producers.reduce((sum, _, i) => sum + getProducerProduction(i), 0);
};

const getUpgradeCost = (index: number): number => {
  return PRODUCERS[index].baseCost * UPGRADE_COST_MULTIPLIER;
};

const getTapUpgradeCost = (): number => {
  return Math.floor(TAP_UPGRADE_BASE_COST * Math.pow(TAP_UPGRADE_COST_MULTIPLIER, tapPowerLevel));
};

const isProducerUnlocked = (index: number): boolean => {
  if (index === 0) return true;
  return totalGold >= PRODUCERS[index].baseCost * 0.5;
};
```

4. **탭/구매 함수:**
```typescript
const doTap = (x: number, y: number) => {
  gold += tapPower;
  totalGold += tapPower;
  totalTaps++;
  floatingTexts.push({
    x: x + (Math.random() - 0.5) * 40,
    y,
    text: `+${tapPower}`,
    opacity: 1,
    vy: -60,
  });
};

const buyProducer = (index: number): boolean => {
  if (!isProducerUnlocked(index)) return false;
  const cost = getProducerCost(index);
  if (gold < cost) return false;
  gold -= cost;
  producers[index].count++;
  return true;
};

const upgradeProducer = (index: number): boolean => {
  if (producers[index].upgraded || producers[index].count === 0) return false;
  const cost = getUpgradeCost(index);
  if (gold < cost) return false;
  gold -= cost;
  producers[index].upgraded = true;
  return true;
};

const upgradeTapPower = (): boolean => {
  const cost = getTapUpgradeCost();
  if (gold < cost) return false;
  gold -= cost;
  tapPowerLevel++;
  tapPower = Math.pow(2, tapPowerLevel);
  return true;
};
```

5. **게임 시작/리셋:**
```typescript
const startGame = async () => {
  if (isStarted || isLoading) return;
  isLoading = true;
  if (callbacks.onGameStart) {
    await callbacks.onGameStart();
  }
  isLoading = false;
  isStarted = true;
  isPaused = false;
  isGameOver = false;
  lastTime = 0;
};

const resetGame = () => {
  gold = 0;
  totalGold = 0;
  tapPower = 1;
  tapPowerLevel = 0;
  producers = PRODUCERS.map(() => ({ count: 0, upgraded: false }));
  totalTaps = 0;
  timeRemaining = GAME_DURATION;
  floatingTexts = [];
  isStarted = false;
  isLoading = false;
  isPaused = false;
  isGameOver = false;
  lastTime = 0;
  gameOverHud.reset();
};
```

6. **gameOverHud 초기화** (dodge 패턴 그대로):
```typescript
const gameOverCallbacks: TGameOverCallbacks = {
  onScoreSave: async (finalScore) => {
    return callbacks.onScoreSave(finalScore);
  },
  onRestart: () => {
    resetGame();
  },
};

const gameOverHud = createGameOverHud(
  canvas,
  ctx,
  'tapempire',
  gameOverCallbacks,
  { isLoggedIn: callbacks.isLoggedIn },
);
```

7. **업데이트 함수:**
```typescript
const update = (dt: number) => {
  if (!isStarted || isPaused || isGameOver) return;

  // 타이머 감소
  timeRemaining -= dt;
  if (timeRemaining <= 0) {
    timeRemaining = 0;
    isGameOver = true;
    return;
  }

  // 자동 생산
  const production = getTotalProduction() * dt;
  gold += production;
  totalGold += production;

  // 플로팅 텍스트 업데이트
  floatingTexts = floatingTexts.filter(ft => {
    ft.y += ft.vy * dt;
    ft.opacity -= dt * 1.5;
    return ft.opacity > 0;
  });
};
```

8. **렌더 함수** (별도 Step에서 상세 구현):
```typescript
const render = () => {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  if (!isStarted) {
    if (isLoading) {
      gameLoadingHud(canvas, ctx);
    } else {
      gameStartHud(canvas, ctx);
    }
    return;
  }

  if (isGameOver) {
    gameOverHud.render(Math.floor(totalGold));
    return;
  }

  if (isPaused) {
    gamePauseHud(canvas, ctx);
    return;
  }

  // 게임 플레이 중 렌더링
  drawBackground();
  drawHeader();
  drawTapArea();
  drawStatsBar();
  drawProducerList();
  drawUpgradeBar();
  drawFloatingTexts();
};
```

9. **게임 루프:**
```typescript
const gameLoop = (currentTime: number) => {
  if (lastTime === 0) {
    lastTime = currentTime;
  }
  const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  update(dt);
  render();

  raf = requestAnimationFrame(gameLoop);
};
```

10. **키보드 이벤트:**
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.repeat) return;

  if (e.code === 'KeyS') {
    if (isPaused) {
      isPaused = false;
      lastTime = 0;
      return;
    }
    if (!isStarted && !isLoading) {
      startGame();
    }
    return;
  }

  if (e.code === 'KeyP' && isStarted && !isGameOver) {
    isPaused = true;
    return;
  }

  if (isGameOver) {
    const handled = gameOverHud.onKeyDown(e, Math.floor(totalGold));
    if (handled) return;
  }

  if (e.code === 'KeyR') {
    resetGame();
    return;
  }

  if (isPaused || !isStarted || isGameOver) return;

  // 게임 중 조작
  if (e.code === 'Space') {
    e.preventDefault();
    doTap(CANVAS_SIZE / 2, LAYOUT.tapAreaTop + LAYOUT.tapAreaHeight / 2);
    return;
  }

  // 1~6: 생산기 구매
  const digitMatch = e.code.match(/^Digit([1-6])$/);
  if (digitMatch) {
    const index = parseInt(digitMatch[1]) - 1;
    buyProducer(index);
    return;
  }

  // Q: 탭 파워 업그레이드
  if (e.code === 'KeyQ') {
    upgradeTapPower();
    return;
  }

  // M: 음소거 (사운드 구현 시)
  if (e.code === 'KeyM') {
    // TODO: 사운드 토글
    return;
  }
};
```

11. **터치 이벤트:**
```typescript
const getTouchPos = (touch: Touch) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_SIZE / rect.width;
  const scaleY = CANVAS_SIZE / rect.height;
  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY,
  };
};

const handleTouchStart = (e: TouchEvent) => {
  e.preventDefault();
  const touch = e.touches[0];
  if (!touch) return;
  const pos = getTouchPos(touch);

  // 시작 전
  if (!isStarted && !isLoading && !isGameOver) {
    startGame();
    return;
  }

  // 일시정지
  if (isPaused) {
    isPaused = false;
    lastTime = 0;
    return;
  }

  // 게임 오버
  if (isGameOver) {
    gameOverHud.onTouchStart(pos.x, pos.y, Math.floor(totalGold));
    return;
  }

  // 게임 중: 영역별 터치 처리
  const { tapAreaTop, tapAreaHeight, producerListTop, producerRowHeight, upgradeBarTop, upgradeBarHeight } = LAYOUT;

  // 탭 영역
  if (pos.y >= tapAreaTop && pos.y < tapAreaTop + tapAreaHeight) {
    doTap(pos.x, pos.y);
    return;
  }

  // 생산기 구매
  if (pos.y >= producerListTop && pos.y < producerListTop + PRODUCERS.length * producerRowHeight) {
    const index = Math.floor((pos.y - producerListTop) / producerRowHeight);
    if (index >= 0 && index < PRODUCERS.length) {
      buyProducer(index);
    }
    return;
  }

  // 업그레이드 바
  if (pos.y >= upgradeBarTop && pos.y < upgradeBarTop + upgradeBarHeight) {
    // 왼쪽 절반: 탭 파워 업그레이드
    if (pos.x < CANVAS_SIZE / 2) {
      upgradeTapPower();
    } else {
      // 오른쪽 절반: 가장 저렴한 생산기 효율 업그레이드
      for (let i = 0; i < PRODUCERS.length; i++) {
        if (!producers[i].upgraded && producers[i].count > 0 && gold >= getUpgradeCost(i)) {
          upgradeProducer(i);
          break;
        }
      }
    }
    return;
  }
};
```

12. **이벤트 등록 + Cleanup:**
```typescript
window.addEventListener('keydown', handleKeyDown);
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

raf = requestAnimationFrame(gameLoop);

return () => {
  cancelAnimationFrame(raf);
  window.removeEventListener('keydown', handleKeyDown);
  canvas.removeEventListener('touchstart', handleTouchStart);
};
```

**Step 2: Commit**

```bash
git add app/(canvas-mobile)/tapempire/_lib/game.ts
git commit -m "feat(tapempire): add core game logic with tap, producers, and upgrades"
```

---

### Task 3: 게임 로직 - 렌더링

**Files:**
- Modify: `app/(canvas-mobile)/tapempire/_lib/game.ts` (render 함수들 구현)

**Step 1: 렌더링 함수들 구현**

`render()` 함수 내에서 호출되는 개별 draw 함수들:

```typescript
const formatGold = (n: number): string => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Math.floor(n).toString();
};

const drawBackground = () => {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
};

const drawHeader = () => {
  // 골드
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`💰 ${formatGold(gold)}`, 15, 35);

  // 타이머
  const min = Math.floor(timeRemaining / 60);
  const sec = Math.floor(timeRemaining % 60);
  ctx.textAlign = 'right';
  ctx.fillStyle = timeRemaining <= 30 ? '#ff4444' : COLORS.text;
  ctx.fillText(`⏱ ${min}:${sec.toString().padStart(2, '0')}`, CANVAS_SIZE - 15, 35);

  // 구분선
  ctx.strokeStyle = COLORS.panelBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, LAYOUT.headerHeight);
  ctx.lineTo(CANVAS_SIZE, LAYOUT.headerHeight);
  ctx.stroke();
};

const drawTapArea = () => {
  const { tapAreaTop, tapAreaHeight } = LAYOUT;
  const cx = CANVAS_SIZE / 2;
  const cy = tapAreaTop + tapAreaHeight / 2;

  // 배경
  ctx.fillStyle = COLORS.tapArea;
  ctx.fillRect(10, tapAreaTop, CANVAS_SIZE - 20, tapAreaHeight);
  ctx.strokeStyle = COLORS.tapAreaBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(10, tapAreaTop, CANVAS_SIZE - 20, tapAreaHeight);

  // 코인 아이콘 (큰 원)
  ctx.beginPath();
  ctx.arc(cx, cy - 10, 40, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.gold;
  ctx.fill();
  ctx.strokeStyle = COLORS.goldDark;
  ctx.lineWidth = 3;
  ctx.stroke();

  // $ 기호
  ctx.fillStyle = COLORS.goldDark;
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', cx, cy - 10);

  // 탭 파워 표시
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px monospace';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`Tap: +${tapPower}/click`, cx, cy + 50);
  ctx.fillText('Space / Tap to earn gold', cx, cy + 70);
};

const drawStatsBar = () => {
  const y = LAYOUT.statsBarTop;
  ctx.fillStyle = COLORS.panelBg;
  ctx.fillRect(0, y, CANVAS_SIZE, LAYOUT.statsBarHeight);

  ctx.fillStyle = COLORS.gold;
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`📊 Per second: ${formatGold(getTotalProduction())}/s`, CANVAS_SIZE / 2, y + 20);
};

const drawProducerList = () => {
  const startY = LAYOUT.producerListTop;
  const rowH = LAYOUT.producerRowHeight;

  PRODUCERS.forEach((def, i) => {
    const y = startY + i * rowH;
    const unlocked = isProducerUnlocked(i);
    const cost = getProducerCost(i);
    const canBuy = unlocked && gold >= cost;

    // 행 배경
    ctx.fillStyle = i % 2 === 0 ? COLORS.panelBg : COLORS.bg;
    ctx.fillRect(0, y, CANVAS_SIZE, rowH);

    if (!unlocked) {
      // 잠김 표시
      ctx.fillStyle = COLORS.locked;
      ctx.font = '16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`  🔒  ${def.name}`, 10, y + 28);
      ctx.textAlign = 'right';
      ctx.font = '12px monospace';
      ctx.fillText(`${formatGold(PRODUCERS[i].baseCost)} needed`, CANVAS_SIZE - 15, y + 28);
    } else {
      // 아이콘 + 이름
      ctx.fillStyle = COLORS.text;
      ctx.font = '16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`  ${def.icon}  ${def.name}`, 10, y + 20);

      // 보유 수량 + 생산량
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '11px monospace';
      const prod = getProducerProduction(i);
      const upgMark = producers[i].upgraded ? ' ★' : '';
      ctx.fillText(`    x${producers[i].count}  (${formatGold(prod)}/s)${upgMark}`, 10, y + 37);

      // 구매 버튼
      const btnX = CANVAS_SIZE - 130;
      const btnW = 115;
      const btnH = 30;
      const btnY = y + 7;

      ctx.fillStyle = canBuy ? COLORS.buyable : COLORS.locked;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 6);
      ctx.fill();

      ctx.fillStyle = canBuy ? '#fff' : '#999';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Buy ${formatGold(cost)}`, btnX + btnW / 2, btnY + 20);
    }
  });
};

const drawUpgradeBar = () => {
  const y = LAYOUT.upgradeBarTop;
  ctx.fillStyle = COLORS.panelBg;
  ctx.fillRect(0, y, CANVAS_SIZE, LAYOUT.upgradeBarHeight);

  // 탭 파워 업그레이드 버튼 (왼쪽 절반)
  const tapCost = getTapUpgradeCost();
  const canTapUpg = gold >= tapCost;
  const btnW = CANVAS_SIZE / 2 - 20;
  const btnH = 32;
  const btnY = y + 6;

  ctx.fillStyle = canTapUpg ? COLORS.upgradeBtn : COLORS.upgradeBtnDim;
  ctx.beginPath();
  ctx.roundRect(10, btnY, btnW, btnH, 6);
  ctx.fill();

  ctx.fillStyle = canTapUpg ? '#fff' : '#999';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`⬆ Tap ×${Math.pow(2, tapPowerLevel + 1)} [${formatGold(tapCost)}]`, 10 + btnW / 2, btnY + 21);

  // 효율 업그레이드 버튼 (오른쪽 절반)
  let nextUpg = -1;
  let upgCost = 0;
  for (let i = 0; i < PRODUCERS.length; i++) {
    if (!producers[i].upgraded && producers[i].count > 0) {
      nextUpg = i;
      upgCost = getUpgradeCost(i);
      break;
    }
  }

  const canUpg = nextUpg >= 0 && gold >= upgCost;
  const btnX2 = CANVAS_SIZE / 2 + 10;

  ctx.fillStyle = canUpg ? COLORS.upgradeBtn : COLORS.upgradeBtnDim;
  ctx.beginPath();
  ctx.roundRect(btnX2, btnY, btnW, btnH, 6);
  ctx.fill();

  ctx.fillStyle = canUpg ? '#fff' : '#999';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  if (nextUpg >= 0) {
    ctx.fillText(`⬆ ${PRODUCERS[nextUpg].name} ×2 [${formatGold(upgCost)}]`, btnX2 + btnW / 2, btnY + 21);
  } else {
    ctx.fillText('No upgrade available', btnX2 + btnW / 2, btnY + 21);
  }
};

const drawFloatingTexts = () => {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 18px monospace';
  floatingTexts.forEach(ft => {
    ctx.globalAlpha = ft.opacity;
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(ft.text, ft.x, ft.y);
  });
  ctx.globalAlpha = 1;
};
```

**Step 2: Commit**

```bash
git add app/(canvas-mobile)/tapempire/_lib/game.ts
git commit -m "feat(tapempire): add rendering functions for all UI elements"
```

---

### Task 4: 캔버스 컴포넌트

**Files:**
- Create: `app/(canvas-mobile)/tapempire/_components/tapempire.tsx`

**참조 필수:** `app/(canvas-mobile)/dodge/_components/dodge.tsx` 패턴을 그대로 따를 것.

**Step 1: 컴포넌트 작성**

```typescript
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupTapEmpire, TTapEmpireCallbacks } from '../_lib/game';
import { CANVAS_SIZE } from '../_lib/config';
import { useCreateScore, useGameSession } from '@/service/scores';

function TapEmpire() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('tapempire');
  const { mutateAsync: createSession } = useGameSession('tapempire');
  const isLoggedIn = !!session;

  const updateScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const container = wrapper.parentElement;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const scale = Math.min(containerWidth / CANVAS_SIZE, 1);
    wrapper.style.transform = `scale(${scale})`;
    wrapper.style.transformOrigin = 'top center';
    wrapper.style.height = `${CANVAS_SIZE * scale}px`;
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TTapEmpireCallbacks = {
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
          gameType: 'tapempire',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupTapEmpire(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full flex justify-center">
      <div ref={wrapperRef} style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
        <canvas
          ref={canvasRef}
          className="border border-white/20 rounded-2xl shadow-lg touch-none"
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
        />
      </div>
    </div>
  );
}

export default TapEmpire;
```

**Step 2: Commit**

```bash
git add app/(canvas-mobile)/tapempire/_components/tapempire.tsx
git commit -m "feat(tapempire): add canvas component with CSS transform scaling"
```

---

### Task 5: 페이지 및 레이아웃

**Files:**
- Create: `app/(canvas-mobile)/tapempire/page.tsx`
- Create: `app/(canvas-mobile)/tapempire/layout.tsx`

**참조 필수:** `app/(canvas-mobile)/dodge/page.tsx` 및 `layout.tsx`

**Step 1: layout.tsx 작성**

```typescript
import KameHeader from '@/components/common/KameHeader';

function TapEmpireLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 xl:px-6 py-4 flex flex-col gap-4 xl:gap-10 items-center">
      <KameHeader title="탭 제국" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default TapEmpireLayout;
```

**Step 2: page.tsx 작성**

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
import TapEmpire from './_components/tapempire';

const controls = [
  { key: 'S / Tap', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
  { key: 'Space / Tap', action: '골드 획득' },
  { key: '1~6', action: '생산기 구매' },
  { key: 'Q', action: '탭 파워 업그레이드' },
  { key: 'M', action: '음소거' },
];

function TapEmpirePage() {
  const { data: session, status } = useSession();
  const { data: scores = [], isLoading } = useGetScores('tapempire');

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

      {/* 게임 캔버스 */}
      <div className="w-full xl:flex-1 max-w-[620px]">
        <TapEmpire />
      </div>

      {/* 데스크탑: 랭킹 */}
      <aside className="hidden xl:block shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default TapEmpirePage;
```

**Step 3: Commit**

```bash
git add app/(canvas-mobile)/tapempire/page.tsx app/(canvas-mobile)/tapempire/layout.tsx
git commit -m "feat(tapempire): add page layout with responsive mobile/desktop views"
```

---

### Task 6: 게임 등록 (6개 파일 수정)

**Files:**
- Modify: `@types/scores.ts` - TGameType에 'tapempire' 추가
- Modify: `lib/config.ts` - MENU_LIST에 탭 제국 추가
- Modify: `components/common/GameCard.tsx` - 아이콘 추가
- Modify: `app/api/game-session/route.ts` - VALID_GAME_TYPES에 추가
- Modify: `app/api/scores/route.ts` - VALID_GAME_TYPES에 추가
- Modify: `lib/game-security/config.ts` - 보안 설정 추가

**Step 1: @types/scores.ts**

TGameType union에 `'tapempire'` 추가 (마지막 항목 뒤에):
```typescript
| 'tapempire'
```

**Step 2: lib/config.ts**

MENU_LIST의 Action 카테고리 끝에 추가:
```typescript
{
  name: {
    kor: '탭 제국',
    eng: 'Tap Empire',
  },
  href: '/tapempire',
  category: 'Action',
  platform: 'both',
},
```

**Step 3: components/common/GameCard.tsx**

GAME_ICONS에 추가 (lucide-react의 `Crown` 아이콘 사용):
```typescript
'/tapempire': Crown,
```
import에 `Crown` 추가.

**Step 4: app/api/game-session/route.ts**

VALID_GAME_TYPES 배열에 `'tapempire'` 추가.

**Step 5: app/api/scores/route.ts**

VALID_GAME_TYPES 배열에 `'tapempire'` 추가.

**Step 6: lib/game-security/config.ts**

GAME_SECURITY_CONFIG에 추가 (suikagame 항목 아래):
```typescript
tapempire: { maxScore: 10000000, minPlayTimeSeconds: 60 },
```
- maxScore: 3분 동안 이론적으로 도달 가능한 최대치 (1천만)
- minPlayTimeSeconds: 최소 60초 이상 플레이해야 유효

**Step 7: Commit**

```bash
git add @types/scores.ts lib/config.ts components/common/GameCard.tsx app/api/game-session/route.ts app/api/scores/route.ts lib/game-security/config.ts
git commit -m "feat(tapempire): register game in all 6 required files"
```

---

### Task 7: 빌드 확인 및 수동 테스트

**Step 1: 빌드 확인**

```bash
yarn build
```

Expected: 빌드 성공, 타입 에러 없음.

**Step 2: 로컬 서버 실행 및 수동 테스트**

```bash
yarn dev
```

브라우저에서 `http://localhost:3000/tapempire` 접속 후 확인:
- [ ] 시작 화면 표시 (Press S or Tap to start)
- [ ] S 키로 게임 시작
- [ ] Space로 골드 획득 + 플로팅 텍스트
- [ ] 1~6으로 생산기 구매
- [ ] 자동 생산 (초당 골드 증가)
- [ ] Q로 탭 파워 업그레이드
- [ ] P로 일시정지/재개
- [ ] 3분 후 게임 오버
- [ ] 점수 저장/재시작
- [ ] 모바일 뷰 (개발자 도구 → 모바일 모드)
- [ ] 터치로 탭/구매 작동

**Step 3: 문제 수정 후 Commit**

```bash
git add -A
git commit -m "fix(tapempire): address issues found during manual testing"
```

---

### Task 8: Featured Games 및 배너 등록 (선택사항)

**Files:**
- Modify: `lib/config.ts` - FEATURED_GAMES, BANNER_ITEMS에 추가

**Step 1: FEATURED_GAMES에 추가**

```typescript
{
  href: '/tapempire',
  description: {
    kor: '3분 안에 최대한 큰 제국을 건설하세요!',
    eng: 'Build the biggest empire in 3 minutes!',
  },
},
```

**Step 2: BANNER_ITEMS 첫 번째 항목 교체**

```typescript
{
  type: 'card',
  icon: '👑',
  bgColor: 'from-yellow-900/50 to-amber-900/50',
  title: { kor: '새로운 게임 출시!', eng: 'New Game Released!' },
  description: {
    kor: '3분 안에 최대한 큰 제국을 건설하세요!',
    eng: 'Build the biggest empire in 3 minutes!',
  },
  href: '/tapempire',
  ctaText: { kor: '지금 플레이', eng: 'Play Now' },
},
```

**Step 3: Commit**

```bash
git add lib/config.ts
git commit -m "feat(tapempire): add to featured games and main banner"
```
