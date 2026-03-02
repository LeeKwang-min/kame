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
  RECIPES,
  PRICE_MULTIPLIER,
  TAP_UPGRADE_BASE_COST,
  TAP_UPGRADE_COST_MULTIPLIER,
  LAYOUT,
} from './config';
import { TProducerState, TFloatingText } from './types';

export type TCookieBakeryCallbacks = {
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

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

export const setupCookieBakery = (
  canvas: HTMLCanvasElement,
  callbacks?: TCookieBakeryCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  // --- 게임 상태 ---
  let cookies = 0;
  let totalCookies = 0; // total cookies this prestige run
  let allTimeTotalCookies = 0; // total across all prestige runs (= score)
  let tapPower = 1;
  let tapLevel = 0;
  let timeRemaining = GAME_DURATION;

  let producerStates: TProducerState[] = PRODUCERS.map(() => ({ count: 0 }));
  let unlockedProducers: boolean[] = PRODUCERS.map(() => false);
  unlockedProducers[0] = true;

  let unlockedRecipes: boolean[] = RECIPES.map(() => false);

  // Prestige
  let prestigePoints = 0;
  let totalPrestigeResets = 0;

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
    'cookiebakery',
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

  const getRecipeMultiplier = (): number => {
    let mult = 1;
    for (let i = 0; i < RECIPES.length; i++) {
      if (unlockedRecipes[i]) {
        mult *= RECIPES[i].multiplier;
      }
    }
    return mult;
  };

  const getPrestigeMultiplier = (): number => {
    return 1 + prestigePoints * 0.01;
  };

  const getGlobalMultiplier = (): number => {
    return getRecipeMultiplier() * getPrestigeMultiplier();
  };

  const getProducerProduction = (index: number): number => {
    const base = PRODUCERS[index].baseProduction;
    const count = producerStates[index].count;
    return base * count * getGlobalMultiplier();
  };

  const getTotalProductionPerSec = (): number => {
    let total = 0;
    for (let i = 0; i < PRODUCERS.length; i++) {
      total += getProducerProduction(i);
    }
    return total;
  };

  const getTapUpgradeCost = (): number => {
    return Math.floor(
      TAP_UPGRADE_BASE_COST * Math.pow(TAP_UPGRADE_COST_MULTIPLIER, tapLevel),
    );
  };

  const getPrestigePointsFromReset = (): number => {
    return Math.floor(Math.sqrt(totalCookies / 1000));
  };

  const doTap = () => {
    if (!isStarted || isGameOver || isPaused) return;
    const amount = tapPower * getGlobalMultiplier();
    cookies += amount;
    totalCookies += amount;
    allTimeTotalCookies += amount;

    // Floating text at tap area center
    const tapCenterX = CANVAS_SIZE / 2 + (Math.random() - 0.5) * 60;
    const tapCenterY =
      LAYOUT.tapAreaTop + LAYOUT.tapAreaHeight / 2 + (Math.random() - 0.5) * 30;
    floatingTexts.push({
      x: tapCenterX,
      y: tapCenterY,
      text: '+' + formatNumber(amount),
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
    if (cookies >= cost) {
      cookies -= cost;
      producerStates[index].count++;
    }
  };

  const upgradeTapPower = () => {
    if (!isStarted || isGameOver || isPaused) return;
    const cost = getTapUpgradeCost();
    if (cookies >= cost) {
      cookies -= cost;
      tapLevel++;
      tapPower = Math.pow(2, tapLevel);
    }
  };

  const doPrestige = () => {
    if (!isStarted || isGameOver || isPaused) return;
    const newPoints = getPrestigePointsFromReset();
    if (newPoints <= 0) return; // Don't prestige with 0 points

    prestigePoints += newPoints;
    totalPrestigeResets++;

    // Reset cookies, producers (but NOT timer, NOT allTimeTotalCookies, NOT prestige points, NOT recipes)
    cookies = 0;
    totalCookies = 0;
    tapPower = 1;
    tapLevel = 0;
    producerStates = PRODUCERS.map(() => ({ count: 0 }));
    unlockedProducers = PRODUCERS.map(() => false);
    unlockedProducers[0] = true;
    // Recipes persist across prestige resets (earned via allTimeTotalCookies)
    floatingTexts = [];
    tapScale = 1;
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
    cookies = 0;
    totalCookies = 0;
    allTimeTotalCookies = 0;
    tapPower = 1;
    tapLevel = 0;
    timeRemaining = GAME_DURATION;
    floatingTexts = [];
    tapScale = 1;
    prestigePoints = 0;
    totalPrestigeResets = 0;
    producerStates = PRODUCERS.map(() => ({ count: 0 }));
    unlockedProducers = PRODUCERS.map(() => false);
    unlockedProducers[0] = true;
    unlockedRecipes = RECIPES.map(() => false);
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
      const handled = gameOverHud.onKeyDown(e, Math.floor(allTimeTotalCookies));
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

    if (e.code === 'KeyE') {
      doPrestige();
      return;
    }
  };

  // --- 터치 이벤트 ---

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

    // 게임 시작 전이면 터치로 시작
    if (!isStarted && !isLoading && !isGameOver) {
      startGame();
      return;
    }

    // 일시정지 상태이면 터치로 재개
    if (isPaused) {
      isPaused = false;
      lastTime = 0;
      return;
    }

    // 게임 오버 상태: 터치로 SAVE/SKIP/재시작 처리
    if (isGameOver) {
      const handled = gameOverHud.onTouchStart(pos.x, pos.y, Math.floor(allTimeTotalCookies));
      if (handled) return;
      return;
    }

    if (!isStarted) return;

    // 탭 영역 터치 (쿠키 탭)
    if (
      pos.y >= LAYOUT.tapAreaTop &&
      pos.y <= LAYOUT.tapAreaTop + LAYOUT.tapAreaHeight
    ) {
      doTap();
      return;
    }

    // 생산기 리스트 터치
    if (
      pos.y >= LAYOUT.producerListTop &&
      pos.y <
        LAYOUT.producerListTop + PRODUCERS.length * LAYOUT.producerRowHeight
    ) {
      const rowIndex = Math.floor(
        (pos.y - LAYOUT.producerListTop) / LAYOUT.producerRowHeight,
      );
      if (rowIndex >= 0 && rowIndex < PRODUCERS.length) {
        buyProducer(rowIndex);
      }
      return;
    }

    // 업그레이드 바 터치
    if (
      pos.y >= LAYOUT.upgradeBarTop &&
      pos.y <= LAYOUT.upgradeBarTop + LAYOUT.upgradeBarHeight
    ) {
      const halfWidth = CANVAS_SIZE / 2;
      if (pos.x < halfWidth) {
        upgradeTapPower();
      } else {
        doPrestige();
      }
      return;
    }
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
      const autoCookies = getTotalProductionPerSec() * dt;
      cookies += autoCookies;
      totalCookies += autoCookies;
      allTimeTotalCookies += autoCookies;

      // 생산기 잠금 해제 확인
      for (let i = 0; i < PRODUCERS.length; i++) {
        if (!unlockedProducers[i] && totalCookies >= PRODUCERS[i].baseCost * 0.5) {
          unlockedProducers[i] = true;
        }
      }

      // 레시피 잠금 해제 확인 (allTimeTotalCookies 기준 — 프레스티지 후에도 유지)
      for (let i = 0; i < RECIPES.length; i++) {
        if (!unlockedRecipes[i] && allTimeTotalCookies >= RECIPES[i].milestone) {
          unlockedRecipes[i] = true;
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

    ctx.save();
    // Cookie count (left)
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = COLORS.cookie;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{1F36A} ' + formatNumber(cookies), padding, LAYOUT.headerHeight / 2);

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

    // Cookie icon with tap animation
    const cx = CANVAS_SIZE / 2;
    const cy = y + h / 2 - 10;
    const cookieRadius = 40 * tapScale;

    // Draw cookie circle
    ctx.beginPath();
    ctx.arc(cx, cy, cookieRadius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.cookie;
    ctx.fill();
    ctx.strokeStyle = COLORS.cookieDark;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Cookie dots (chocolate chips)
    const dotPositions = [
      { dx: -12, dy: -15 },
      { dx: 10, dy: -8 },
      { dx: -5, dy: 8 },
      { dx: 15, dy: 12 },
      { dx: -18, dy: 2 },
    ];
    for (const dot of dotPositions) {
      ctx.beginPath();
      ctx.arc(cx + dot.dx * tapScale, cy + dot.dy * tapScale, 4 * tapScale, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.cookieDark;
      ctx.fill();
    }

    // Tap instruction text
    ctx.font = '14px sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.fillText('TAP or SPACE', cx, y + h - 20);

    // Tap power indicator
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText('Power: ' + formatNumber(tapPower * getGlobalMultiplier()), cx, y + 20);

    ctx.restore();
  };

  const drawRecipeBar = () => {
    const y = LAYOUT.recipeBarTop;
    const h = LAYOUT.recipeBarHeight;
    const padding = 15;
    const barWidth = CANVAS_SIZE - padding * 2;

    ctx.save();

    // Background
    drawRoundRect(ctx, padding, y, barWidth, h, 4);
    ctx.fillStyle = COLORS.recipeBarBg;
    ctx.fill();

    // Find the next recipe milestone
    let nextRecipeIdx = -1;
    for (let i = 0; i < RECIPES.length; i++) {
      if (!unlockedRecipes[i]) {
        nextRecipeIdx = i;
        break;
      }
    }

    if (nextRecipeIdx >= 0) {
      // Progress bar
      const milestone = RECIPES[nextRecipeIdx].milestone;
      const progress = Math.min(allTimeTotalCookies / milestone, 1);
      if (progress > 0) {
        drawRoundRect(ctx, padding, y, barWidth * progress, h, 4);
        ctx.fillStyle = COLORS.recipeBar;
        ctx.fill();
      }

      // Text
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'Next: ' + RECIPES[nextRecipeIdx].name + ' (x' + RECIPES[nextRecipeIdx].multiplier + ') - ' + formatNumber(milestone),
        CANVAS_SIZE / 2,
        y + h / 2,
      );
    } else {
      // All recipes unlocked
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = COLORS.gold;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('All Recipes Unlocked!', CANVAS_SIZE / 2, y + h / 2);
    }

    ctx.restore();
  };

  const drawStatsBar = () => {
    const y = LAYOUT.statsBarTop;
    const production = getTotalProductionPerSec();

    ctx.save();
    ctx.font = '12px sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const prestigeMult = getPrestigeMultiplier();
    const recipeMult = getRecipeMultiplier();
    let statsText = formatNumber(production) + '/s';
    statsText += '  |  Total: ' + formatNumber(allTimeTotalCookies);
    if (prestigePoints > 0) {
      statsText += '  |  P:x' + prestigeMult.toFixed(2);
    }
    if (recipeMult > 1) {
      statsText += '  R:x' + recipeMult.toFixed(1);
    }

    ctx.fillText(statsText, CANVAS_SIZE / 2, y + LAYOUT.statsBarHeight / 2);
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
      const canBuy = unlocked && cookies >= cost;

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
          '?? - ' + formatNumber(producer.baseCost * 0.5) + ' total cookies to unlock',
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
      ctx.fillText(prod > 0 ? formatNumber(prod) + '/s' : '-', padding + 230, rowCy);

      // Cost / Buy button
      const btnX = padding + 290;
      const btnW = 130;
      const btnH = rowH - 14;
      const btnY = y + 5;

      drawRoundRect(ctx, btnX, btnY, btnW, btnH, 4);
      ctx.fillStyle = canBuy ? COLORS.buyable : '#2a3a4a';
      ctx.fill();

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = canBuy ? '#ffffff' : COLORS.textDim;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u{1F36A} ' + formatNumber(cost), btnX + btnW / 2, btnY + btnH / 2);
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

    // Tap power upgrade (left) - [Q]
    const tapCost = getTapUpgradeCost();
    const canTapUpgrade = cookies >= tapCost;

    drawRoundRect(ctx, padding, y, halfW, h - 4, 6);
    ctx.fillStyle = canTapUpgrade ? COLORS.upgradeBtn : COLORS.upgradeBtnDim;
    ctx.fill();

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = canTapUpgrade ? '#ffffff' : COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '[Q] Tap UP  \u{1F36A} ' + formatNumber(tapCost),
      padding + halfW / 2,
      y + (h - 4) / 2,
    );

    // Prestige button (right) - [E]
    const rightX = padding + halfW + 10;
    const newPrestigePoints = getPrestigePointsFromReset();
    const canPrestige = newPrestigePoints > 0;

    drawRoundRect(ctx, rightX, y, halfW, h - 4, 6);
    ctx.fillStyle = canPrestige ? COLORS.prestigeBtn : COLORS.prestigeBtnDim;
    ctx.fill();

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = canPrestige ? '#ffffff' : COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (canPrestige) {
      ctx.fillText(
        '[E] Prestige +' + newPrestigePoints + 'pt',
        rightX + halfW / 2,
        y + (h - 4) / 2,
      );
    } else {
      ctx.fillText(
        '[E] Prestige (' + prestigePoints + 'pt)',
        rightX + halfW / 2,
        y + (h - 4) / 2,
      );
    }

    ctx.restore();
  };

  const drawFloatingTexts = () => {
    ctx.save();
    for (const ft of floatingTexts) {
      ctx.globalAlpha = ft.opacity;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = COLORS.cookie;
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
    drawRecipeBar();
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
      gameOverHud.render(Math.floor(allTimeTotalCookies));
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

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
  };
};
