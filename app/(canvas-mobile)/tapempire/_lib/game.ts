import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CANVAS_SIZE,
  GAME_DURATION,
  COLORS,
  PRODUCERS,
  PRICE_MULTIPLIER,
  UPGRADE_COST_MULTIPLIER,
  TAP_UPGRADE_BASE_COST,
  TAP_UPGRADE_COST_MULTIPLIER,
  LAYOUT,
} from './config';
import { TProducerState, TFloatingText } from './types';

export type TTapEmpireCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

// 둥근 사각형 헬퍼 (ctx.roundRect 미지원 대비)
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function formatGold(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

export const setupTapEmpire = (
  canvas: HTMLCanvasElement,
  callbacks?: TTapEmpireCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let gold = 0;
  let totalGold = 0;
  let tapPower = 1;
  let tapLevel = 0;
  let timeRemaining = GAME_DURATION;

  let producerStates: TProducerState[] = PRODUCERS.map(() => ({
    count: 0,
    upgraded: false,
  }));
  let unlockedProducers: boolean[] = PRODUCERS.map(() => false);
  // First producer is always unlocked
  unlockedProducers[0] = true;

  let floatingTexts: TFloatingText[] = [];

  let lastTime = 0;
  let isGameOver = false;
  let isStarted = false;
  let isLoading = false;
  let isPaused = false;

  // Tap animation state
  let tapScale = 1;

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
    'tapempire',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- 게임 로직 헬퍼 ---

  const getProducerCost = (index: number): number => {
    const base = PRODUCERS[index].baseCost;
    const count = producerStates[index].count;
    return Math.floor(base * Math.pow(PRICE_MULTIPLIER, count));
  };

  const getProducerProduction = (index: number): number => {
    const base = PRODUCERS[index].baseProduction;
    const count = producerStates[index].count;
    const multiplier = producerStates[index].upgraded ? 2 : 1;
    return base * count * multiplier;
  };

  const getTotalProductionPerSec = (): number => {
    let total = 0;
    for (let i = 0; i < PRODUCERS.length; i++) {
      total += getProducerProduction(i);
    }
    return total;
  };

  const getProducerUpgradeCost = (index: number): number => {
    return PRODUCERS[index].baseCost * UPGRADE_COST_MULTIPLIER;
  };

  const getTapUpgradeCost = (): number => {
    return Math.floor(
      TAP_UPGRADE_BASE_COST * Math.pow(TAP_UPGRADE_COST_MULTIPLIER, tapLevel),
    );
  };

  const doTap = () => {
    if (!isStarted || isGameOver || isPaused) return;
    gold += tapPower;
    totalGold += tapPower;

    // Floating text at tap area center
    const tapCenterX = CANVAS_SIZE / 2 + (Math.random() - 0.5) * 60;
    const tapCenterY =
      LAYOUT.tapAreaTop + LAYOUT.tapAreaHeight / 2 + (Math.random() - 0.5) * 30;
    floatingTexts.push({
      x: tapCenterX,
      y: tapCenterY,
      text: '+' + formatGold(tapPower),
      opacity: 1,
      vy: -60,
    });

    // Tap animation
    tapScale = 0.9;
  };

  const buyProducer = (index: number) => {
    if (!isStarted || isGameOver || isPaused) return;
    if (index < 0 || index >= PRODUCERS.length) return;
    if (!unlockedProducers[index]) return;

    const cost = getProducerCost(index);
    if (gold >= cost) {
      gold -= cost;
      producerStates[index].count++;
    }
  };

  const upgradeTapPower = () => {
    if (!isStarted || isGameOver || isPaused) return;
    const cost = getTapUpgradeCost();
    if (gold >= cost) {
      gold -= cost;
      tapLevel++;
      tapPower = Math.pow(2, tapLevel);
    }
  };

  const upgradeProducer = (index: number) => {
    if (!isStarted || isGameOver || isPaused) return;
    if (index < 0 || index >= PRODUCERS.length) return;
    if (!unlockedProducers[index]) return;
    if (producerStates[index].upgraded) return;
    if (producerStates[index].count === 0) return;

    const cost = getProducerUpgradeCost(index);
    if (gold >= cost) {
      gold -= cost;
      producerStates[index].upgraded = true;
    }
  };

  // Find the first non-upgraded producer that the player owns
  const getUpgradeableProducerIndex = (): number => {
    for (let i = 0; i < PRODUCERS.length; i++) {
      if (
        unlockedProducers[i] &&
        producerStates[i].count > 0 &&
        !producerStates[i].upgraded
      ) {
        return i;
      }
    }
    return -1;
  };

  // --- 게임 시작/리셋 ---

  const startGame = async () => {
    if (isStarted || isLoading) return;
    isLoading = true;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isLoading = false;
    isStarted = true;
    lastTime = 0;
    timeRemaining = GAME_DURATION;
  };

  const resetGame = () => {
    isStarted = false;
    isGameOver = false;
    isPaused = false;
    gold = 0;
    totalGold = 0;
    tapPower = 1;
    tapLevel = 0;
    timeRemaining = GAME_DURATION;
    floatingTexts = [];
    tapScale = 1;
    producerStates = PRODUCERS.map(() => ({ count: 0, upgraded: false }));
    unlockedProducers = PRODUCERS.map(() => false);
    unlockedProducers[0] = true;
    gameOverHud.reset();
    lastTime = 0;
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(CANVAS_SIZE * dpr);
    canvas.height = Math.round(CANVAS_SIZE * dpr);
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    resetGame();
  };

  // --- 키보드 이벤트 ---

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (e.code === 'KeyS') {
      if (isPaused) {
        isPaused = false;
        lastTime = 0;
        return;
      }
      startGame();
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

    if (e.code === 'KeyR' && !isGameOver && !isPaused) {
      resetGame();
      return;
    }

    if (isPaused) return;
    if (!isStarted || isGameOver) return;

    if (e.code === 'Space') {
      e.preventDefault();
      doTap();
      return;
    }

    if (e.code === 'Digit1') { buyProducer(0); return; }
    if (e.code === 'Digit2') { buyProducer(1); return; }
    if (e.code === 'Digit3') { buyProducer(2); return; }
    if (e.code === 'Digit4') { buyProducer(3); return; }
    if (e.code === 'Digit5') { buyProducer(4); return; }
    if (e.code === 'Digit6') { buyProducer(5); return; }

    if (e.code === 'KeyQ') {
      upgradeTapPower();
      return;
    }
  };

  // --- 포인터 이벤트 (터치 + 마우스 공통) ---

  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (pos: { x: number; y: number }) => {
    // 게임 시작 전이면 시작
    if (!isStarted && !isLoading && !isGameOver) {
      startGame();
      return;
    }

    // 일시정지 상태이면 재개
    if (isPaused) {
      isPaused = false;
      lastTime = 0;
      return;
    }

    // 게임 오버 상태: SAVE/SKIP/재시작 처리
    if (isGameOver) {
      gameOverHud.onTouchStart(pos.x, pos.y, Math.floor(totalGold));
      return;
    }

    if (!isStarted) return;

    // 탭 영역
    if (
      pos.y >= LAYOUT.tapAreaTop &&
      pos.y <= LAYOUT.tapAreaTop + LAYOUT.tapAreaHeight
    ) {
      doTap();
      return;
    }

    // 생산기 리스트
    if (
      pos.y >= LAYOUT.producerListTop &&
      pos.y <
        LAYOUT.producerListTop + PRODUCERS.length * LAYOUT.producerRowHeight
    ) {
      const rowIndex = Math.floor(
        (pos.y - LAYOUT.producerListTop) / LAYOUT.producerRowHeight,
      );
      if (rowIndex >= 0 && rowIndex < PRODUCERS.length) {
        // Right side = upgrade button area (last 80px)
        if (pos.x >= CANVAS_SIZE - 90) {
          upgradeProducer(rowIndex);
        } else {
          buyProducer(rowIndex);
        }
      }
      return;
    }

    // 업그레이드 바
    if (
      pos.y >= LAYOUT.upgradeBarTop &&
      pos.y <= LAYOUT.upgradeBarTop + LAYOUT.upgradeBarHeight
    ) {
      const halfWidth = CANVAS_SIZE / 2;
      if (pos.x < halfWidth) {
        upgradeTapPower();
      } else {
        const idx = getUpgradeableProducerIndex();
        if (idx >= 0) {
          upgradeProducer(idx);
        }
      }
      return;
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    handlePointerDown(getCanvasPos(touch.clientX, touch.clientY));
  };

  const handleMouseDown = (e: MouseEvent) => {
    handlePointerDown(getCanvasPos(e.clientX, e.clientY));
  };

  // --- 게임 로직 업데이트 ---

  const update = (t: number) => {
    if (isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);

    if (isStarted && !isGameOver) {
      // 타이머
      timeRemaining -= dt;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        isGameOver = true;
        return;
      }

      // 자동 생산
      const autoGold = getTotalProductionPerSec() * dt;
      gold += autoGold;
      totalGold += autoGold;

      // 생산기 잠금 해제 확인
      for (let i = 0; i < PRODUCERS.length; i++) {
        if (!unlockedProducers[i] && totalGold >= PRODUCERS[i].baseCost * 0.5) {
          unlockedProducers[i] = true;
        }
      }

      // Floating text 업데이트
      for (const ft of floatingTexts) {
        ft.y += ft.vy * dt;
        ft.opacity -= 1.5 * dt;
      }
      floatingTexts = floatingTexts.filter((ft) => ft.opacity > 0);

      // Tap scale 복원
      if (tapScale < 1) {
        tapScale += 3 * dt;
        if (tapScale > 1) tapScale = 1;
      }
    }
  };

  // --- 렌더링 ---

  const drawBackground = () => {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  };

  const drawHeader = () => {
    const padding = 15;

    // Gold display (left)
    ctx.save();
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('$ ' + formatGold(gold), padding, LAYOUT.headerHeight / 2);

    // Timer display (right)
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = Math.floor(timeRemaining % 60);
    const timeStr =
      minutes.toString().padStart(2, '0') +
      ':' +
      seconds.toString().padStart(2, '0');

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = timeRemaining <= 30 ? '#ef4444' : COLORS.text;
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, CANVAS_SIZE - padding, LAYOUT.headerHeight / 2);
    ctx.restore();
  };

  const drawTapArea = () => {
    const x = 20;
    const y = LAYOUT.tapAreaTop;
    const w = CANVAS_SIZE - 40;
    const h = LAYOUT.tapAreaHeight;

    ctx.save();

    // Tap area background
    drawRoundRect(ctx, x, y, w, h, 12);
    ctx.fillStyle = COLORS.tapArea;
    ctx.fill();
    ctx.strokeStyle = COLORS.tapAreaBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Coin icon (circle with $ sign) with tap animation
    const cx = CANVAS_SIZE / 2;
    const cy = y + h / 2 - 10;
    const coinRadius = 35 * tapScale;

    ctx.beginPath();
    ctx.arc(cx, cy, coinRadius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.gold;
    ctx.fill();
    ctx.strokeStyle = COLORS.goldDark;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = `bold ${Math.floor(28 * tapScale)}px sans-serif`;
    ctx.fillStyle = COLORS.goldDark;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', cx, cy);

    // Tap instruction text
    ctx.font = '14px sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.fillText('TAP or SPACE', cx, y + h - 20);

    // Tap power indicator
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText('Power: ' + formatGold(tapPower), cx, y + 20);

    ctx.restore();
  };

  const drawStatsBar = () => {
    const y = LAYOUT.statsBarTop;
    const production = getTotalProductionPerSec();

    ctx.save();
    ctx.font = '14px sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'Per sec: ' + formatGold(production) + '/s  |  Total: ' + formatGold(totalGold),
      CANVAS_SIZE / 2,
      y + LAYOUT.statsBarHeight / 2,
    );
    ctx.restore();
  };

  const drawProducerList = () => {
    const padding = 15;
    const rowH = LAYOUT.producerRowHeight;

    ctx.save();

    for (let i = 0; i < PRODUCERS.length; i++) {
      const producer = PRODUCERS[i];
      const state = producerStates[i];
      const unlocked = unlockedProducers[i];
      const y = LAYOUT.producerListTop + i * rowH;
      const cost = getProducerCost(i);
      const canBuy = unlocked && gold >= cost;

      // Row background
      drawRoundRect(ctx, padding, y, CANVAS_SIZE - padding * 2, rowH - 4, 6);
      ctx.fillStyle = unlocked ? COLORS.panelBg : '#111a24';
      ctx.fill();
      ctx.strokeStyle = unlocked ? COLORS.panelBorder : '#1a2230';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (!unlocked) {
        // Locked display
        ctx.font = '14px sans-serif';
        ctx.fillStyle = COLORS.locked;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          '?? - ' + formatGold(producer.baseCost * 0.5) + ' total gold to unlock',
          padding + 12,
          y + (rowH - 4) / 2,
        );
        continue;
      }

      // Icon + Name
      ctx.font = '15px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const rowCy = y + (rowH - 4) / 2;
      ctx.fillText(producer.icon + ' ' + producer.name, padding + 10, rowCy);

      // Count
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = COLORS.gold;
      ctx.textAlign = 'center';
      ctx.fillText('x' + state.count, padding + 160, rowCy);

      // Production rate
      const prod = getProducerProduction(i);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'center';
      ctx.fillText(prod > 0 ? formatGold(prod) + '/s' : '-', padding + 220, rowCy);

      // Cost / Buy button
      const btnX = padding + 280;
      const btnW = 110;
      const btnH = rowH - 14;
      const btnY = y + 5;

      drawRoundRect(ctx, btnX, btnY, btnW, btnH, 4);
      ctx.fillStyle = canBuy ? COLORS.buyable : '#2a3a4a';
      ctx.fill();

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = canBuy ? '#ffffff' : COLORS.textDim;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$ ' + formatGold(cost), btnX + btnW / 2, btnY + btnH / 2);

      // Upgrade indicator (right side)
      if (state.count > 0) {
        const upgX = CANVAS_SIZE - padding - 70;
        const upgW = 55;
        const upgH = rowH - 14;
        const upgY = y + 5;

        if (state.upgraded) {
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = COLORS.upgradeBtn;
          ctx.textAlign = 'center';
          ctx.fillText('x2', upgX + upgW / 2, upgY + upgH / 2);
        } else {
          const upgCost = getProducerUpgradeCost(i);
          const canUpgrade = gold >= upgCost;

          drawRoundRect(ctx, upgX, upgY, upgW, upgH, 4);
          ctx.fillStyle = canUpgrade ? COLORS.upgradeBtn : COLORS.upgradeBtnDim;
          ctx.fill();

          ctx.font = 'bold 10px sans-serif';
          ctx.fillStyle = canUpgrade ? '#ffffff' : COLORS.textDim;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('UP', upgX + upgW / 2, upgY + upgH / 2);
        }
      }
    }

    // Key hints (desktop)
    ctx.font = '11px sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'left';
    for (let i = 0; i < PRODUCERS.length; i++) {
      if (unlockedProducers[i]) {
        const y = LAYOUT.producerListTop + i * rowH;
        ctx.fillText('[' + (i + 1) + ']', 3, y + (rowH - 4) / 2);
      }
    }

    ctx.restore();
  };

  const drawUpgradeBar = () => {
    const y = LAYOUT.upgradeBarTop;
    const h = LAYOUT.upgradeBarHeight;
    const padding = 15;
    const halfW = (CANVAS_SIZE - padding * 2 - 10) / 2;

    ctx.save();

    // Tap power upgrade (left)
    const tapCost = getTapUpgradeCost();
    const canTapUpgrade = gold >= tapCost;

    drawRoundRect(ctx, padding, y, halfW, h - 4, 6);
    ctx.fillStyle = canTapUpgrade ? COLORS.upgradeBtn : COLORS.upgradeBtnDim;
    ctx.fill();

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = canTapUpgrade ? '#ffffff' : COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '[Q] Tap UP  $ ' + formatGold(tapCost),
      padding + halfW / 2,
      y + (h - 4) / 2,
    );

    // Producer efficiency upgrade (right)
    const upgIdx = getUpgradeableProducerIndex();
    const rightX = padding + halfW + 10;

    drawRoundRect(ctx, rightX, y, halfW, h - 4, 6);

    if (upgIdx >= 0) {
      const upgCost = getProducerUpgradeCost(upgIdx);
      const canUpg = gold >= upgCost;

      ctx.fillStyle = canUpg ? COLORS.upgradeBtn : COLORS.upgradeBtnDim;
      ctx.fill();

      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = canUpg ? '#ffffff' : COLORS.textDim;
      ctx.textAlign = 'center';
      ctx.fillText(
        PRODUCERS[upgIdx].name + ' x2  $ ' + formatGold(upgCost),
        rightX + halfW / 2,
        y + (h - 4) / 2,
      );
    } else {
      ctx.fillStyle = '#1a2230';
      ctx.fill();

      ctx.font = '13px sans-serif';
      ctx.fillStyle = COLORS.locked;
      ctx.textAlign = 'center';
      ctx.fillText('No upgrades', rightX + halfW / 2, y + (h - 4) / 2);
    }

    ctx.restore();
  };

  const drawFloatingTexts = () => {
    ctx.save();
    for (const ft of floatingTexts) {
      ctx.globalAlpha = ft.opacity;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = COLORS.gold;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  const render = () => {
    drawBackground();

    if (!isStarted) return;
    if (isGameOver) return;

    drawHeader();
    drawTapArea();
    drawStatsBar();
    drawProducerList();
    drawUpgradeBar();
    drawFloatingTexts();
  };

  const drawHud = () => {
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
  };

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    drawHud();

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  resize();
  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('mousedown', handleMouseDown);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('mousedown', handleMouseDown);
  };
};
