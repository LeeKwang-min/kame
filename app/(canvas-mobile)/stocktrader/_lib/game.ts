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
  STARTING_CAPITAL,
  COLORS,
  STOCKS,
  QUANTITIES,
  QUANTITY_LABELS,
  NEWS_EVENTS,
  NEWS_MIN_INTERVAL,
  NEWS_MAX_INTERVAL,
  NEWS_DISPLAY_DURATION,
  DIVIDEND_BOOST_DURATION,
  PRICE_UPDATE_INTERVAL,
  PRICE_HISTORY_LENGTH,
  LAYOUT,
} from './config';
import { TStockState, TActiveNews, TFloatingText } from './types';

export type TStockTraderCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

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

function formatPrice(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1) + 'K';
  if (n >= 100) return n.toFixed(1);
  return n.toFixed(2);
}

function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export const setupStockTrader = (
  canvas: HTMLCanvasElement,
  callbacks?: TStockTraderCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let cash = STARTING_CAPITAL;
  let timeRemaining = GAME_DURATION;
  let selectedStock = 0;
  let selectedQuantityIdx = 0;
  let tradeMode: 'buy' | 'sell' = 'buy';

  let stockStates: TStockState[] = STOCKS.map((s) => ({
    currentPrice: s.startPrice,
    priceHistory: [s.startPrice],
    holdings: 0,
    avgBuyPrice: 0,
    totalInvested: 0,
  }));

  let unlockedStocks: boolean[] = STOCKS.map((s) => s.unlockNetWorth === 0);

  let activeNews: TActiveNews | null = null;
  let nextNewsTime = NEWS_MIN_INTERVAL + Math.random() * (NEWS_MAX_INTERVAL - NEWS_MIN_INTERVAL);
  let dividendBoostTimer = 0;
  let dividendMultiplier = 1;

  let priceUpdateTimer = 0;
  let floatingTexts: TFloatingText[] = [];

  let lastTime = 0;
  let isGameOver = false;
  let isStarted = false;
  let isLoading = false;
  let isPaused = false;

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
    'stocktrader',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- helpers ---

  const getNetWorth = (): number => {
    let worth = cash;
    for (let i = 0; i < STOCKS.length; i++) {
      worth += stockStates[i].holdings * stockStates[i].currentPrice;
    }
    return worth;
  };

  const calculateFinalScore = (): number => {
    const profit = getNetWorth() - STARTING_CAPITAL;
    return Math.min(99999, Math.max(0, Math.floor(profit)));
  };

  const getPortfolioValue = (): number => {
    let val = 0;
    for (let i = 0; i < STOCKS.length; i++) {
      val += stockStates[i].holdings * stockStates[i].currentPrice;
    }
    return val;
  };

  const getDividendsPerSec = (): number => {
    let total = 0;
    for (let i = 0; i < STOCKS.length; i++) {
      total += stockStates[i].holdings * STOCKS[i].dividend * dividendMultiplier;
    }
    return total;
  };

  const getActualQuantity = (stockIdx: number, mode: 'buy' | 'sell'): number => {
    const qty = QUANTITIES[selectedQuantityIdx];
    const state = stockStates[stockIdx];
    const price = state.currentPrice;

    if (mode === 'buy') {
      if (qty === -1) {
        return Math.floor(cash / price);
      }
      return Math.min(qty, Math.floor(cash / price));
    } else {
      if (qty === -1) {
        return state.holdings;
      }
      return Math.min(qty, state.holdings);
    }
  };

  const buyStock = (stockIdx: number) => {
    if (!isStarted || isGameOver || isPaused) return;
    if (!unlockedStocks[stockIdx]) return;

    const qty = getActualQuantity(stockIdx, 'buy');
    if (qty <= 0) return;

    const state = stockStates[stockIdx];
    const cost = state.currentPrice * qty;
    if (cash < cost) return;

    const oldTotal = state.avgBuyPrice * state.holdings;
    cash -= cost;
    state.holdings += qty;
    state.totalInvested += cost;
    state.avgBuyPrice = (oldTotal + cost) / state.holdings;

    floatingTexts.push({
      x: CANVAS_SIZE / 2,
      y: LAYOUT.tradeAreaTop + 20,
      text: `-${formatGold(cost)}G  +${qty}`,
      opacity: 1,
      vy: -40,
      color: COLORS.green,
    });
  };

  const sellStock = (stockIdx: number) => {
    if (!isStarted || isGameOver || isPaused) return;
    if (!unlockedStocks[stockIdx]) return;

    const qty = getActualQuantity(stockIdx, 'sell');
    if (qty <= 0) return;

    const state = stockStates[stockIdx];
    const revenue = state.currentPrice * qty;
    cash += revenue;
    state.holdings -= qty;

    if (state.holdings === 0) {
      state.avgBuyPrice = 0;
      state.totalInvested = 0;
    }

    floatingTexts.push({
      x: CANVAS_SIZE / 2,
      y: LAYOUT.tradeAreaTop + 20,
      text: `+${formatGold(revenue)}G  -${qty}`,
      opacity: 1,
      vy: -40,
      color: COLORS.red,
    });
  };

  const executeTrade = () => {
    if (tradeMode === 'buy') {
      buyStock(selectedStock);
    } else {
      sellStock(selectedStock);
    }
  };

  const updatePrices = () => {
    for (let i = 0; i < STOCKS.length; i++) {
      if (!unlockedStocks[i]) continue;
      const stock = STOCKS[i];
      const state = stockStates[i];
      const change = stock.trend + gaussianRandom() * stock.volatility;
      state.currentPrice = Math.max(1, state.currentPrice * (1 + change));
      state.priceHistory.push(state.currentPrice);
      if (state.priceHistory.length > PRICE_HISTORY_LENGTH) {
        state.priceHistory.shift();
      }
    }
  };

  const triggerNewsEvent = () => {
    const available = NEWS_EVENTS.filter((ev) => {
      if (ev.stockId === 'all' || ev.stockId === 'dividend') return true;
      const idx = STOCKS.findIndex((s) => s.id === ev.stockId);
      return idx >= 0 && unlockedStocks[idx];
    });
    if (available.length === 0) return;

    const event = available[Math.floor(Math.random() * available.length)];
    activeNews = { text: event.text, timer: NEWS_DISPLAY_DURATION };

    if (event.stockId === 'dividend') {
      dividendMultiplier = event.effect;
      dividendBoostTimer = DIVIDEND_BOOST_DURATION;
    } else if (event.stockId === 'all') {
      for (let i = 0; i < STOCKS.length; i++) {
        if (unlockedStocks[i]) {
          stockStates[i].currentPrice = Math.max(
            1,
            stockStates[i].currentPrice * (1 + event.effect),
          );
        }
      }
    } else {
      const idx = STOCKS.findIndex((s) => s.id === event.stockId);
      if (idx >= 0 && unlockedStocks[idx]) {
        stockStates[idx].currentPrice = Math.max(
          1,
          stockStates[idx].currentPrice * (1 + event.effect),
        );
      }
    }
  };

  // --- game start/reset ---

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
    cash = STARTING_CAPITAL;
    timeRemaining = GAME_DURATION;
    selectedStock = 0;
    selectedQuantityIdx = 0;
    tradeMode = 'buy';
    priceUpdateTimer = 0;
    floatingTexts = [];
    activeNews = null;
    nextNewsTime = NEWS_MIN_INTERVAL + Math.random() * (NEWS_MAX_INTERVAL - NEWS_MIN_INTERVAL);
    dividendBoostTimer = 0;
    dividendMultiplier = 1;

    stockStates = STOCKS.map((s) => ({
      currentPrice: s.startPrice,
      priceHistory: [s.startPrice],
      holdings: 0,
      avgBuyPrice: 0,
      totalInvested: 0,
    }));
    unlockedStocks = STOCKS.map((s) => s.unlockNetWorth === 0);

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

  // --- keyboard ---

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
      const handled = gameOverHud.onKeyDown(e, calculateFinalScore());
      if (handled) return;
    }

    if (e.code === 'KeyR' && !isGameOver && !isPaused) {
      resetGame();
      return;
    }

    if (isPaused) return;
    if (!isStarted || isGameOver) return;

    // Stock selection (1-5)
    if (e.code === 'Digit1' && unlockedStocks[0]) { selectedStock = 0; return; }
    if (e.code === 'Digit2' && unlockedStocks[1]) { selectedStock = 1; return; }
    if (e.code === 'Digit3' && unlockedStocks[2]) { selectedStock = 2; return; }
    if (e.code === 'Digit4' && unlockedStocks[3]) { selectedStock = 3; return; }
    if (e.code === 'Digit5' && unlockedStocks[4]) { selectedStock = 4; return; }

    // Buy / Sell
    if (e.code === 'KeyB') {
      tradeMode = 'buy';
      executeTrade();
      return;
    }
    if (e.code === 'KeyV') {
      tradeMode = 'sell';
      executeTrade();
      return;
    }

    // Quantity selection
    if (e.code === 'ArrowLeft') {
      selectedQuantityIdx = Math.max(0, selectedQuantityIdx - 1);
      return;
    }
    if (e.code === 'ArrowRight') {
      selectedQuantityIdx = Math.min(QUANTITIES.length - 1, selectedQuantityIdx + 1);
      return;
    }
  };

  // --- pointer (shared mouse/touch) ---

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
    if (!isStarted && !isLoading && !isGameOver) {
      startGame();
      return;
    }

    if (isPaused) {
      isPaused = false;
      lastTime = 0;
      return;
    }

    if (isGameOver) {
      gameOverHud.onTouchStart(pos.x, pos.y, calculateFinalScore());
      return;
    }

    if (!isStarted) return;

    // Stock list click
    if (
      pos.y >= LAYOUT.stockListTop &&
      pos.y <= LAYOUT.stockListTop + LAYOUT.stockListHeight
    ) {
      const padding = 10;
      const cardW = (CANVAS_SIZE - padding * 2 - (STOCKS.length - 1) * 6) / STOCKS.length;
      for (let i = 0; i < STOCKS.length; i++) {
        const cx = padding + i * (cardW + 6);
        if (pos.x >= cx && pos.x <= cx + cardW && unlockedStocks[i]) {
          selectedStock = i;
          return;
        }
      }
      return;
    }

    // Trade area click
    if (
      pos.y >= LAYOUT.tradeAreaTop &&
      pos.y <= LAYOUT.tradeAreaTop + LAYOUT.tradeAreaHeight
    ) {
      const padding = 10;
      const areaW = CANVAS_SIZE - padding * 2;

      // Quantity buttons row (top 35px of trade area)
      if (pos.y < LAYOUT.tradeAreaTop + 35) {
        const qBtnW = areaW / QUANTITIES.length;
        for (let i = 0; i < QUANTITIES.length; i++) {
          const qx = padding + i * qBtnW;
          if (pos.x >= qx && pos.x <= qx + qBtnW) {
            selectedQuantityIdx = i;
            return;
          }
        }
        return;
      }

      // Buy/Sell buttons row (bottom 40px of trade area)
      if (pos.x < CANVAS_SIZE / 2) {
        // Buy button
        tradeMode = 'buy';
        executeTrade();
      } else {
        // Sell button
        tradeMode = 'sell';
        executeTrade();
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

  // --- update ---

  const update = (t: number) => {
    if (isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;
    dt = Math.min(dt, 0.05);

    if (isStarted && !isGameOver) {
      timeRemaining -= dt;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        isGameOver = true;
        return;
      }

      // Price updates
      priceUpdateTimer += dt;
      if (priceUpdateTimer >= PRICE_UPDATE_INTERVAL) {
        priceUpdateTimer -= PRICE_UPDATE_INTERVAL;
        updatePrices();
      }

      // Dividends
      const divPerSec = getDividendsPerSec();
      if (divPerSec > 0) {
        cash += divPerSec * dt;
      }

      // Dividend boost timer
      if (dividendBoostTimer > 0) {
        dividendBoostTimer -= dt;
        if (dividendBoostTimer <= 0) {
          dividendBoostTimer = 0;
          dividendMultiplier = 1;
        }
      }

      // News events
      nextNewsTime -= dt;
      if (nextNewsTime <= 0) {
        triggerNewsEvent();
        nextNewsTime = NEWS_MIN_INTERVAL + Math.random() * (NEWS_MAX_INTERVAL - NEWS_MIN_INTERVAL);
      }

      // Active news timer
      if (activeNews) {
        activeNews.timer -= dt;
        if (activeNews.timer <= 0) {
          activeNews = null;
        }
      }

      // Unlock checks
      const netWorth = getNetWorth();
      for (let i = 0; i < STOCKS.length; i++) {
        if (!unlockedStocks[i] && netWorth >= STOCKS[i].unlockNetWorth) {
          unlockedStocks[i] = true;
          // Initialize price history for newly unlocked stock
          stockStates[i].priceHistory = [stockStates[i].currentPrice];
        }
      }

      // Floating texts
      for (const ft of floatingTexts) {
        ft.y += ft.vy * dt;
        ft.opacity -= 1.5 * dt;
      }
      floatingTexts = floatingTexts.filter((ft) => ft.opacity > 0);
    }
  };

  // --- rendering ---

  const drawBackground = () => {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  };

  const drawHeader = () => {
    const padding = 15;
    const netWorth = getNetWorth();

    ctx.save();
    // Net worth (left)
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Total: ' + formatGold(netWorth) + 'G', padding, LAYOUT.headerHeight / 2);

    // Timer (right)
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = Math.floor(timeRemaining % 60);
    const timeStr =
      minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = timeRemaining <= 60 ? COLORS.red : COLORS.text;
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, CANVAS_SIZE - padding, LAYOUT.headerHeight / 2);

    // Divider line
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, LAYOUT.headerHeight);
    ctx.lineTo(CANVAS_SIZE, LAYOUT.headerHeight);
    ctx.stroke();

    ctx.restore();
  };

  const drawNewsBar = () => {
    const y = LAYOUT.newsBarTop;
    const h = LAYOUT.newsBarHeight;
    const padding = 10;

    ctx.save();
    drawRoundRect(ctx, padding, y, CANVAS_SIZE - padding * 2, h, 4);
    ctx.fillStyle = COLORS.newsBar;
    ctx.fill();
    ctx.strokeStyle = COLORS.newsBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (activeNews) {
      ctx.fillStyle = COLORS.gold;
      ctx.fillText(activeNews.text, CANVAS_SIZE / 2, y + h / 2);
    } else if (dividendBoostTimer > 0) {
      ctx.fillStyle = COLORS.purple;
      ctx.fillText(
        'Dividend x' + dividendMultiplier + ' (' + Math.ceil(dividendBoostTimer) + 's)',
        CANVAS_SIZE / 2,
        y + h / 2,
      );
    } else {
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText('Waiting for news...', CANVAS_SIZE / 2, y + h / 2);
    }

    ctx.restore();
  };

  const drawChart = () => {
    const y = LAYOUT.chartAreaTop;
    const h = LAYOUT.chartAreaHeight;
    const padding = 10;
    const chartX = padding + 5;
    const chartY = y + 30;
    const chartW = CANVAS_SIZE - padding * 2 - 10;
    const chartH = h - 45;

    ctx.save();

    // Chart background
    drawRoundRect(ctx, padding, y, CANVAS_SIZE - padding * 2, h, 8);
    ctx.fillStyle = COLORS.chartBg;
    ctx.fill();
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    const stock = STOCKS[selectedStock];
    const state = stockStates[selectedStock];
    const history = state.priceHistory;

    // Stock name + current price header
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(stock.icon + ' ' + stock.name, padding + 12, y + 16);

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.textAlign = 'center';
    ctx.fillText(formatPrice(state.currentPrice) + 'G', CANVAS_SIZE / 2, y + 16);

    // % change from start
    const startP = stock.startPrice;
    const pctChange = ((state.currentPrice - startP) / startP) * 100;
    const pctColor = pctChange >= 0 ? COLORS.green : COLORS.red;
    const pctSign = pctChange >= 0 ? '+' : '';

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = pctColor;
    ctx.textAlign = 'right';
    ctx.fillText(pctSign + pctChange.toFixed(1) + '%', CANVAS_SIZE - padding - 12, y + 16);

    // Draw chart line
    if (history.length >= 2) {
      const minP = Math.min(...history) * 0.95;
      const maxP = Math.max(...history) * 1.05;
      const range = maxP - minP || 1;

      const isUp = history[history.length - 1] >= history[0];
      const lineColor = isUp ? COLORS.green : COLORS.red;
      const fillColor = isUp ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)';

      // Fill area under line
      ctx.beginPath();
      for (let i = 0; i < history.length; i++) {
        const px = chartX + (i / (PRICE_HISTORY_LENGTH - 1)) * chartW;
        const py = chartY + chartH - ((history[i] - minP) / range) * chartH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      // Close to bottom
      const lastX = chartX + ((history.length - 1) / (PRICE_HISTORY_LENGTH - 1)) * chartW;
      ctx.lineTo(lastX, chartY + chartH);
      ctx.lineTo(chartX, chartY + chartH);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();

      // Draw line
      ctx.beginPath();
      for (let i = 0; i < history.length; i++) {
        const px = chartX + (i / (PRICE_HISTORY_LENGTH - 1)) * chartW;
        const py = chartY + chartH - ((history[i] - minP) / range) * chartH;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Current price dot
      const lastPx = chartX + ((history.length - 1) / (PRICE_HISTORY_LENGTH - 1)) * chartW;
      const lastPy =
        chartY + chartH - ((history[history.length - 1] - minP) / range) * chartH;
      ctx.beginPath();
      ctx.arc(lastPx, lastPy, 4, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();

      // Min/max labels
      ctx.font = '10px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(formatPrice(maxP / 1.05), chartX - 2, chartY);
      ctx.textBaseline = 'bottom';
      ctx.fillText(formatPrice(minP / 0.95), chartX - 2, chartY + chartH);
    } else {
      ctx.font = '13px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Collecting data...', CANVAS_SIZE / 2, chartY + chartH / 2);
    }

    ctx.restore();
  };

  const drawStockList = () => {
    const y = LAYOUT.stockListTop;
    const h = LAYOUT.stockListHeight;
    const padding = 10;
    const gap = 6;
    const cardW = (CANVAS_SIZE - padding * 2 - (STOCKS.length - 1) * gap) / STOCKS.length;

    ctx.save();

    for (let i = 0; i < STOCKS.length; i++) {
      const stock = STOCKS[i];
      const state = stockStates[i];
      const cx = padding + i * (cardW + gap);
      const isSelected = i === selectedStock;
      const unlocked = unlockedStocks[i];

      // Card background
      drawRoundRect(ctx, cx, y, cardW, h, 6);
      ctx.fillStyle = unlocked ? COLORS.panelBg : '#111a24';
      ctx.fill();

      if (isSelected && unlocked) {
        ctx.strokeStyle = COLORS.selectedBorder;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.strokeStyle = COLORS.panelBorder;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (!unlocked) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = COLORS.locked;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒', cx + cardW / 2, y + h / 2 - 8);
        ctx.font = '9px sans-serif';
        ctx.fillText(formatGold(stock.unlockNetWorth), cx + cardW / 2, y + h / 2 + 8);
        continue;
      }

      // Icon + name
      ctx.font = '11px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stock.icon, cx + cardW / 2, y + 14);

      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(stock.name, cx + cardW / 2, y + 28);

      // Price
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = COLORS.gold;
      ctx.fillText(formatPrice(state.currentPrice), cx + cardW / 2, y + 42);

      // % change
      const pctChange = ((state.currentPrice - stock.startPrice) / stock.startPrice) * 100;
      const pctColor = pctChange >= 0 ? COLORS.green : COLORS.red;
      const pctSign = pctChange >= 0 ? '+' : '';
      ctx.font = '9px sans-serif';
      ctx.fillStyle = pctColor;
      ctx.fillText(pctSign + pctChange.toFixed(1) + '%', cx + cardW / 2, y + 56);

      // Key hint
      ctx.font = '9px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textBaseline = 'bottom';
      ctx.fillText('[' + (i + 1) + ']', cx + cardW / 2, y + h - 1);
    }

    ctx.restore();
  };

  const drawTradeArea = () => {
    const y = LAYOUT.tradeAreaTop;
    const h = LAYOUT.tradeAreaHeight;
    const padding = 10;
    const areaW = CANVAS_SIZE - padding * 2;

    ctx.save();

    // Background
    drawRoundRect(ctx, padding, y, areaW, h, 8);
    ctx.fillStyle = COLORS.panelBg;
    ctx.fill();
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Quantity buttons row
    const qBtnW = (areaW - 10) / QUANTITIES.length;
    const qBtnH = 24;
    const qBtnY = y + 5;

    for (let i = 0; i < QUANTITIES.length; i++) {
      const qx = padding + 5 + i * qBtnW;
      const isActive = i === selectedQuantityIdx;

      drawRoundRect(ctx, qx, qBtnY, qBtnW - 4, qBtnH, 4);
      ctx.fillStyle = isActive ? COLORS.quantityActive : COLORS.quantityBg;
      ctx.fill();

      ctx.font = isActive ? 'bold 12px sans-serif' : '12px sans-serif';
      ctx.fillStyle = isActive ? COLORS.text : COLORS.textDim;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(QUANTITY_LABELS[i], qx + (qBtnW - 4) / 2, qBtnY + qBtnH / 2);
    }

    // Arrow key hints
    ctx.font = '9px sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'left';
    ctx.fillText('[← →]', padding + 5, qBtnY + qBtnH + 10);

    // Buy/Sell buttons
    const btnH = 30;
    const btnY = y + h - btnH - 5;
    const halfW = (areaW - 20) / 2;

    // Buy button
    const buyQty = getActualQuantity(selectedStock, 'buy');
    const canBuy = buyQty > 0 && unlockedStocks[selectedStock];
    drawRoundRect(ctx, padding + 5, btnY, halfW, btnH, 6);
    ctx.fillStyle = canBuy ? COLORS.buyBtn : '#2a3a4a';
    ctx.fill();

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = canBuy ? COLORS.text : COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const buyCost = stockStates[selectedStock].currentPrice * buyQty;
    ctx.fillText(
      '[B] Buy ' + (buyQty > 0 ? buyQty + ' (' + formatGold(buyCost) + 'G)' : ''),
      padding + 5 + halfW / 2,
      btnY + btnH / 2,
    );

    // Sell button
    const sellQty = getActualQuantity(selectedStock, 'sell');
    const canSell = sellQty > 0 && unlockedStocks[selectedStock];
    const sellX = padding + 5 + halfW + 10;
    drawRoundRect(ctx, sellX, btnY, halfW, btnH, 6);
    ctx.fillStyle = canSell ? COLORS.sellBtn : '#2a3a4a';
    ctx.fill();

    const sellRevenue = stockStates[selectedStock].currentPrice * sellQty;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = canSell ? COLORS.text : COLORS.textDim;
    ctx.fillText(
      '[V] Sell ' + (sellQty > 0 ? sellQty + ' (' + formatGold(sellRevenue) + 'G)' : ''),
      sellX + halfW / 2,
      btnY + btnH / 2,
    );

    ctx.restore();
  };

  const drawPortfolio = () => {
    const y = LAYOUT.portfolioTop;
    const h = LAYOUT.portfolioHeight;
    const padding = 10;

    ctx.save();

    // Background
    drawRoundRect(ctx, padding, y, CANVAS_SIZE - padding * 2, h, 8);
    ctx.fillStyle = COLORS.panelBg;
    ctx.fill();
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Header
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Portfolio', padding + 12, y + 14);

    // Column headers
    const colX = [padding + 12, padding + 80, padding + 160, padding + 270, padding + 370];
    const headerY = y + 32;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'left';
    ctx.fillText('Stock', colX[0], headerY);
    ctx.textAlign = 'center';
    ctx.fillText('Qty', colX[1], headerY);
    ctx.fillText('Avg Price', colX[2], headerY);
    ctx.fillText('Value', colX[3], headerY);
    ctx.textAlign = 'right';
    ctx.fillText('P/L%', CANVAS_SIZE - padding - 12, headerY);

    // Divider
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.beginPath();
    ctx.moveTo(padding + 12, y + 40);
    ctx.lineTo(CANVAS_SIZE - padding - 12, y + 40);
    ctx.stroke();

    // Stock rows
    const rowH = 22;
    let rowIdx = 0;
    for (let i = 0; i < STOCKS.length; i++) {
      const stock = STOCKS[i];
      const state = stockStates[i];
      if (!unlockedStocks[i] || state.holdings === 0) continue;

      const ry = y + 48 + rowIdx * rowH;
      if (ry + rowH > y + h) break;

      const currentValue = state.holdings * state.currentPrice;
      const investedValue = state.avgBuyPrice * state.holdings;
      const pl = investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0;
      const plColor = pl >= 0 ? COLORS.green : COLORS.red;
      const plSign = pl >= 0 ? '+' : '';

      // Stock name
      ctx.font = '11px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'left';
      ctx.fillText(stock.icon + ' ' + stock.name, colX[0], ry);

      // Quantity
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.gold;
      ctx.fillText(state.holdings.toString(), colX[1], ry);

      // Avg price
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText(formatPrice(state.avgBuyPrice), colX[2], ry);

      // Current value
      ctx.fillStyle = COLORS.text;
      ctx.fillText(formatGold(currentValue), colX[3], ry);

      // P/L%
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = plColor;
      ctx.textAlign = 'right';
      ctx.fillText(plSign + pl.toFixed(1) + '%', CANVAS_SIZE - padding - 12, ry);

      rowIdx++;
    }

    if (rowIdx === 0) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No holdings yet', CANVAS_SIZE / 2, y + h / 2 + 10);
    }

    ctx.restore();
  };

  const drawStatusBar = () => {
    const y = LAYOUT.statusBarTop;
    const h = LAYOUT.statusBarHeight;
    const padding = 15;

    ctx.save();

    // Divider
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_SIZE, y);
    ctx.stroke();

    ctx.font = 'bold 14px sans-serif';
    ctx.textBaseline = 'middle';
    const cy = y + h / 2;

    // Cash (left)
    ctx.fillStyle = COLORS.gold;
    ctx.textAlign = 'left';
    ctx.fillText('Cash: ' + formatGold(cash) + 'G', padding, cy);

    // Dividends/s (right)
    const divPerSec = getDividendsPerSec();
    ctx.font = '13px sans-serif';
    ctx.fillStyle = divPerSec > 0 ? COLORS.green : COLORS.textDim;
    ctx.textAlign = 'right';
    if (divPerSec > 0) {
      ctx.fillText(
        'Div: +' + formatPrice(divPerSec) + '/s' + (dividendMultiplier > 1 ? ' (x' + dividendMultiplier + ')' : ''),
        CANVAS_SIZE - padding,
        cy,
      );
    } else {
      ctx.fillText('Div: 0/s', CANVAS_SIZE - padding, cy);
    }

    ctx.restore();
  };

  const drawFloatingTexts = () => {
    ctx.save();
    for (const ft of floatingTexts) {
      ctx.globalAlpha = ft.opacity;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = ft.color;
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
    drawNewsBar();
    drawChart();
    drawStockList();
    drawTradeArea();
    drawPortfolio();
    drawStatusBar();
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
      gameOverHud.render(calculateFinalScore());
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
