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
  INGREDIENTS,
  WEATHERS,
  UPGRADES,
  STARTING_GOLD,
  WEATHER_CHANGE_INTERVAL,
  BASE_CUSTOMER_INTERVAL,
  ICE_MELT_INTERVAL,
  ICE_MELT_INTERVAL_FRIDGE,
  CUSTOMER_ICONS,
  LAYOUT,
} from './config';
import { TFloatingText, TCustomer, TIngredientId } from './types';

export type TLemonadeStandCallbacks = {
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

export const setupLemonadeStand = (
  canvas: HTMLCanvasElement,
  callbacks?: TLemonadeStandCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  // Game state
  let gold = STARTING_GOLD;
  let totalGoldEarned = 0;
  let timeRemaining = GAME_DURATION;

  // Ingredients stock
  let stock: Record<TIngredientId, number> = { lemon: 0, sugar: 0, ice: 0 };

  // Recipe ratios
  let lemonRatio = 2;
  let sugarRatio = 2;
  let iceRatio = 1;

  // Price
  let price = 3;

  // Weather
  let currentWeatherIndex = 0;
  let weatherTimer = WEATHER_CHANGE_INTERVAL;

  // Reputation
  let reputation = 50;

  // Upgrades
  let upgrades: Record<string, boolean> = {
    stand: false,
    fridge: false,
    sign: false,
    mixer: false,
    franchise: false,
  };

  // Customers
  let customers: TCustomer[] = [];
  let customerTimer = BASE_CUSTOMER_INTERVAL;
  let salesPerSec = 0;
  let salesCount = 0;
  let salesTimer = 0;

  // Ice melting
  let iceMeltTimer = ICE_MELT_INTERVAL;

  // UI state
  let activeTab: 'ingredients' | 'upgrades' = 'ingredients';

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
    'lemonadestand',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Game logic helpers ---

  const getCurrentWeather = () => WEATHERS[currentWeatherIndex];

  const getQuality = (): number => {
    const weather = getCurrentWeather();
    let lemonWeight = 1;
    let sugarWeight = 1;
    let iceWeight = 1;

    if (weather.id === 'hot' || weather.id === 'sunny') {
      iceWeight = 2;
    }
    if (weather.id === 'cold' || weather.id === 'rainy') {
      sugarWeight = 2;
    }

    const weighted = lemonRatio * lemonWeight + sugarRatio * sugarWeight + iceRatio * iceWeight;
    const maxPossible = 5 * lemonWeight + 5 * sugarWeight + 3 * iceWeight;
    return Math.min(100, Math.round((weighted / maxPossible) * 100));
  };

  const getDemand = (): number => {
    const weather = getCurrentWeather();
    const quality = getQuality();
    const priceFactor = Math.max(0, (10 - price) / 5);
    return weather.demandMultiplier * priceFactor * (quality / 100);
  };

  const getCustomerArrivalRate = (): number => {
    let rate = BASE_CUSTOMER_INTERVAL;
    // Reputation effect
    rate = rate * (50 / Math.max(reputation, 10));
    // Upgrades
    if (upgrades.stand) rate /= 1.5;
    if (upgrades.sign) rate /= 2;
    return Math.max(0.5, rate);
  };

  const canMakeLemonade = (): boolean => {
    return stock.lemon >= lemonRatio && stock.sugar >= sugarRatio && stock.ice >= iceRatio;
  };

  const makeLemonade = (): boolean => {
    if (!canMakeLemonade()) return false;
    stock.lemon -= lemonRatio;
    stock.sugar -= sugarRatio;
    stock.ice -= iceRatio;
    return true;
  };

  const buyIngredient = (index: number) => {
    if (!isStarted || isGameOver || isPaused) return;
    if (index < 0 || index >= INGREDIENTS.length) return;
    const ingredient = INGREDIENTS[index];
    if (gold >= ingredient.buyCost) {
      const newAmount = Math.min(
        stock[ingredient.id] + ingredient.buyAmount,
        ingredient.maxStock,
      );
      const actualAdded = newAmount - stock[ingredient.id];
      if (actualAdded <= 0) return; // Already at max
      gold -= ingredient.buyCost;
      stock[ingredient.id] = newAmount;
    }
  };

  const buyUpgrade = (index: number) => {
    if (!isStarted || isGameOver || isPaused) return;
    if (index < 0 || index >= UPGRADES.length) return;
    const upgrade = UPGRADES[index];
    if (upgrades[upgrade.id]) return; // Already bought
    if (gold >= upgrade.cost) {
      gold -= upgrade.cost;
      upgrades[upgrade.id] = true;
    }
  };

  const adjustPrice = (delta: number) => {
    if (!isStarted || isGameOver || isPaused) return;
    price = Math.max(1, Math.min(10, price + delta));
  };

  const adjustRatio = (type: 'lemon' | 'sugar' | 'ice', delta: number) => {
    if (!isStarted || isGameOver || isPaused) return;
    if (type === 'lemon') lemonRatio = Math.max(1, Math.min(5, lemonRatio + delta));
    if (type === 'sugar') sugarRatio = Math.max(1, Math.min(5, sugarRatio + delta));
    if (type === 'ice') iceRatio = Math.max(1, Math.min(3, iceRatio + delta));
  };

  // --- Game start/reset ---

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
    gold = STARTING_GOLD;
    totalGoldEarned = 0;
    timeRemaining = GAME_DURATION;
    stock = { lemon: 0, sugar: 0, ice: 0 };
    lemonRatio = 2;
    sugarRatio = 2;
    iceRatio = 1;
    price = 3;
    currentWeatherIndex = 0;
    weatherTimer = WEATHER_CHANGE_INTERVAL;
    reputation = 50;
    upgrades = { stand: false, fridge: false, sign: false, mixer: false, franchise: false };
    customers = [];
    customerTimer = BASE_CUSTOMER_INTERVAL;
    salesPerSec = 0;
    salesCount = 0;
    salesTimer = 0;
    iceMeltTimer = ICE_MELT_INTERVAL;
    activeTab = 'ingredients';
    floatingTexts = [];
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

  // --- Keyboard events ---

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
      const handled = gameOverHud.onKeyDown(e, Math.floor(totalGoldEarned));
      if (handled) return;
    }

    if (e.code === 'KeyR' && !isGameOver && !isPaused) {
      resetGame();
      return;
    }

    if (isPaused) return;
    if (!isStarted || isGameOver) return;

    // Ingredient purchases
    if (e.code === 'Digit1') { buyIngredient(0); return; }
    if (e.code === 'Digit2') { buyIngredient(1); return; }
    if (e.code === 'Digit3') { buyIngredient(2); return; }

    // Upgrade purchases
    if (e.code === 'Digit4') { buyUpgrade(0); return; }
    if (e.code === 'Digit5') { buyUpgrade(1); return; }
    if (e.code === 'Digit6') { buyUpgrade(2); return; }
    if (e.code === 'Digit7') { buyUpgrade(3); return; }
    if (e.code === 'Digit8') { buyUpgrade(4); return; }

    // Price adjustment
    if (e.code === 'ArrowLeft') { adjustPrice(-1); return; }
    if (e.code === 'ArrowRight') { adjustPrice(1); return; }
  };

  // --- Touch events ---

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
      const handled = gameOverHud.onTouchStart(pos.x, pos.y, Math.floor(totalGoldEarned));
      if (handled) return;
      return;
    }

    if (!isStarted) return;

    // Recipe area - price +/- buttons and ratio +/- buttons
    if (pos.y >= LAYOUT.recipeAreaTop && pos.y < LAYOUT.recipeAreaTop + LAYOUT.recipeAreaHeight) {
      handleRecipeTouch(pos.x, pos.y);
      return;
    }

    // Tab area
    if (pos.y >= LAYOUT.tabAreaTop && pos.y < LAYOUT.tabAreaTop + LAYOUT.tabAreaHeight) {
      const halfW = CANVAS_SIZE / 2;
      if (pos.x < halfW) {
        activeTab = 'ingredients';
      } else {
        activeTab = 'upgrades';
      }
      return;
    }

    // List area
    if (pos.y >= LAYOUT.listAreaTop && pos.y < LAYOUT.listAreaTop + LAYOUT.listAreaHeight) {
      if (activeTab === 'ingredients') {
        const rowH = 55;
        const rowIndex = Math.floor((pos.y - LAYOUT.listAreaTop) / rowH);
        if (rowIndex >= 0 && rowIndex < INGREDIENTS.length) {
          buyIngredient(rowIndex);
        }
      } else {
        const rowH = 36;
        const rowIndex = Math.floor((pos.y - LAYOUT.listAreaTop) / rowH);
        if (rowIndex >= 0 && rowIndex < UPGRADES.length) {
          buyUpgrade(rowIndex);
        }
      }
      return;
    }
  };

  const getMousePos = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: MouseEvent) => {
    const pos = getMousePos(e);

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
      const handled = gameOverHud.onTouchStart(pos.x, pos.y, Math.floor(totalGoldEarned));
      if (handled) return;
      return;
    }

    if (!isStarted) return;

    // Recipe area - price +/- buttons and ratio +/- buttons
    if (pos.y >= LAYOUT.recipeAreaTop && pos.y < LAYOUT.recipeAreaTop + LAYOUT.recipeAreaHeight) {
      handleRecipeTouch(pos.x, pos.y);
      return;
    }

    // Tab area
    if (pos.y >= LAYOUT.tabAreaTop && pos.y < LAYOUT.tabAreaTop + LAYOUT.tabAreaHeight) {
      const halfW = CANVAS_SIZE / 2;
      if (pos.x < halfW) {
        activeTab = 'ingredients';
      } else {
        activeTab = 'upgrades';
      }
      return;
    }

    // List area
    if (pos.y >= LAYOUT.listAreaTop && pos.y < LAYOUT.listAreaTop + LAYOUT.listAreaHeight) {
      if (activeTab === 'ingredients') {
        const rowH = 55;
        const rowIndex = Math.floor((pos.y - LAYOUT.listAreaTop) / rowH);
        if (rowIndex >= 0 && rowIndex < INGREDIENTS.length) {
          buyIngredient(rowIndex);
        }
      } else {
        const rowH = 36;
        const rowIndex = Math.floor((pos.y - LAYOUT.listAreaTop) / rowH);
        if (rowIndex >= 0 && rowIndex < UPGRADES.length) {
          buyUpgrade(rowIndex);
        }
      }
      return;
    }
  };

  const handleRecipeTouch = (x: number, y: number) => {
    const padding = 15;
    const areaW = CANVAS_SIZE - padding * 2;
    const areaTop = LAYOUT.recipeAreaTop;

    // Price row (top row of recipe area)
    const priceRowY = areaTop + 5;
    const priceRowH = 25;
    if (y >= priceRowY && y < priceRowY + priceRowH) {
      // Price - button (left side near price display)
      const priceMinusBtnX = padding + 120;
      const pricePlusBtnX = padding + 200;
      if (x >= priceMinusBtnX - 15 && x < priceMinusBtnX + 15) {
        adjustPrice(-1);
        return;
      }
      if (x >= pricePlusBtnX - 15 && x < pricePlusBtnX + 15) {
        adjustPrice(1);
        return;
      }
    }

    // Ratio row (bottom row)
    const ratioRowY = areaTop + 38;
    const ratioRowH = 35;
    if (y >= ratioRowY && y < ratioRowY + ratioRowH) {
      const sectionW = areaW / 3;
      const sectionIndex = Math.floor((x - padding) / sectionW);

      // Each section has a [-] and [+] button
      const sectionLeft = padding + sectionIndex * sectionW;

      if (sectionIndex === 0) {
        if (x < sectionLeft + sectionW / 2) adjustRatio('lemon', -1);
        else adjustRatio('lemon', 1);
      } else if (sectionIndex === 1) {
        if (x < sectionLeft + sectionW / 2) adjustRatio('sugar', -1);
        else adjustRatio('sugar', 1);
      } else if (sectionIndex === 2) {
        if (x < sectionLeft + sectionW / 2) adjustRatio('ice', -1);
        else adjustRatio('ice', 1);
      }
    }
  };

  // --- Game logic update ---

  const update = (t: number) => {
    if (isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;
    dt = Math.min(dt, 0.05);

    if (isStarted && !isGameOver) {
      // Timer
      timeRemaining -= dt;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        isGameOver = true;
        return;
      }

      // Weather change
      weatherTimer -= dt;
      if (weatherTimer <= 0) {
        weatherTimer = WEATHER_CHANGE_INTERVAL;
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * WEATHERS.length);
        } while (newIndex === currentWeatherIndex && WEATHERS.length > 1);
        currentWeatherIndex = newIndex;
      }

      // Ice melting
      const meltInterval = upgrades.fridge ? ICE_MELT_INTERVAL_FRIDGE : ICE_MELT_INTERVAL;
      iceMeltTimer -= dt;
      if (iceMeltTimer <= 0) {
        iceMeltTimer = meltInterval;
        if (stock.ice > 0) {
          stock.ice = Math.max(0, stock.ice - 1);
        }
      }

      // Franchise passive income
      if (upgrades.franchise) {
        const passiveGold = 10 * dt;
        gold += passiveGold;
        totalGoldEarned += passiveGold;
      }

      // Customer spawning
      customerTimer -= dt;
      if (customerTimer <= 0) {
        const demand = getDemand();
        customerTimer = getCustomerArrivalRate();

        // Only spawn if demand is favorable (random check)
        if (Math.random() < demand) {
          const icon = CUSTOMER_ICONS[Math.floor(Math.random() * CUSTOMER_ICONS.length)];
          const standCenterX = CANVAS_SIZE / 2;
          customers.push({
            x: CANVAS_SIZE + 20,
            y: LAYOUT.standAreaTop + LAYOUT.standAreaHeight - 40 + Math.random() * 20,
            targetX: standCenterX + 20 + Math.random() * 60,
            speed: 80 + Math.random() * 40,
            state: 'approaching',
            timer: 0,
            icon,
          });
        }
      }

      // Update customers
      for (let i = customers.length - 1; i >= 0; i--) {
        const c = customers[i];

        if (c.state === 'approaching') {
          c.x -= c.speed * dt;
          if (c.x <= c.targetX) {
            c.x = c.targetX;
            c.state = 'buying';
            c.timer = 0.5;
          }
        } else if (c.state === 'buying') {
          c.timer -= dt;
          if (c.timer <= 0) {
            // Try to sell (mixer auto-buys ingredients if affordable)
            if (!canMakeLemonade() && upgrades.mixer) {
              // Auto-buy missing ingredients
              for (const ingredient of INGREDIENTS) {
                while (stock[ingredient.id] < (ingredient.id === 'lemon' ? lemonRatio : ingredient.id === 'sugar' ? sugarRatio : iceRatio) && gold >= ingredient.buyCost) {
                  const newAmount = Math.min(stock[ingredient.id] + ingredient.buyAmount, ingredient.maxStock);
                  if (newAmount === stock[ingredient.id]) break;
                  gold -= ingredient.buyCost;
                  stock[ingredient.id] = newAmount;
                }
              }
            }
            if (canMakeLemonade()) {
              makeLemonade();
              const saleGold = price;
              gold += saleGold;
              totalGoldEarned += saleGold;
              salesCount++;

              // Floating text
              floatingTexts.push({
                x: c.x + (Math.random() - 0.5) * 20,
                y: c.y - 10,
                text: '+' + saleGold + 'G',
                opacity: 1,
                vy: -50,
              });

              // Reputation
              const quality = getQuality();
              if (quality >= 30) {
                reputation = Math.min(100, reputation + 1);
              } else {
                reputation = Math.max(0, reputation - 1);
              }

              c.state = 'leaving';
              c.speed = 100 + Math.random() * 40;
            } else {
              // Out of stock
              reputation = Math.max(0, reputation - 2);
              c.state = 'angry';
              c.timer = 0.5;
            }
          }
        } else if (c.state === 'angry') {
          c.timer -= dt;
          if (c.timer <= 0) {
            c.state = 'leaving';
            c.speed = 120;
          }
        } else if (c.state === 'leaving') {
          c.x += c.speed * dt;
          if (c.x > CANVAS_SIZE + 30) {
            customers.splice(i, 1);
          }
        }
      }

      // Sales per second tracking
      salesTimer += dt;
      if (salesTimer >= 1) {
        salesPerSec = salesCount;
        salesCount = 0;
        salesTimer = 0;
      }

      // Floating text update
      for (const ft of floatingTexts) {
        ft.y += ft.vy * dt;
        ft.opacity -= 1.5 * dt;
      }
      floatingTexts = floatingTexts.filter((ft) => ft.opacity > 0);
    }
  };

  // --- Rendering ---

  const drawBackground = () => {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  };

  const drawHeader = () => {
    const padding = 15;

    ctx.save();
    // Gold display (left)
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{1F4B0} ' + formatGold(gold), padding, LAYOUT.headerHeight / 2);

    // Timer (right)
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = Math.floor(timeRemaining % 60);
    const timeStr =
      minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = timeRemaining <= 30 ? '#ef4444' : COLORS.text;
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, CANVAS_SIZE - padding, LAYOUT.headerHeight / 2);
    ctx.restore();
  };

  const drawWeatherBar = () => {
    const padding = 15;
    const y = LAYOUT.weatherBarTop;
    const h = LAYOUT.weatherBarHeight;
    const weather = getCurrentWeather();

    ctx.save();
    drawRoundRect(ctx, padding, y, CANVAS_SIZE - padding * 2, h, 6);
    ctx.fillStyle = COLORS.panelBg;
    ctx.fill();
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Weather icon and name
    ctx.font = '16px sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(weather.icon + ' ' + weather.name, padding + 10, y + h / 2);

    // Demand indicator
    const demand = getDemand();
    const demandText = 'Demand: ' + (demand * 100).toFixed(0) + '%';
    ctx.font = '13px sans-serif';
    ctx.fillStyle = demand >= 0.6 ? COLORS.repGood : demand >= 0.3 ? COLORS.gold : COLORS.repBad;
    ctx.textAlign = 'center';
    ctx.fillText(demandText, CANVAS_SIZE / 2, y + h / 2);

    // Weather timer
    const weatherTimeLeft = Math.ceil(weatherTimer);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'right';
    ctx.fillText('Next: ' + weatherTimeLeft + 's', CANVAS_SIZE - padding - 10, y + h / 2);

    ctx.restore();
  };

  const drawStandArea = () => {
    const padding = 15;
    const y = LAYOUT.standAreaTop;
    const h = LAYOUT.standAreaHeight;

    ctx.save();
    drawRoundRect(ctx, padding, y, CANVAS_SIZE - padding * 2, h, 8);
    ctx.fillStyle = COLORS.tapArea;
    ctx.fill();
    ctx.strokeStyle = COLORS.tapAreaBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw lemonade stand
    const standX = CANVAS_SIZE / 2 - 60;
    const standY = y + 30;
    const standW = 120;
    const standH = 80;

    // Stand body (counter)
    drawRoundRect(ctx, standX, standY + 40, standW, 40, 4);
    ctx.fillStyle = '#8B4513';
    ctx.fill();

    // Stand roof
    ctx.beginPath();
    ctx.moveTo(standX - 15, standY + 40);
    ctx.lineTo(standX + standW / 2, standY);
    ctx.lineTo(standX + standW + 15, standY + 40);
    ctx.closePath();
    ctx.fillStyle = '#FFE135';
    ctx.fill();
    ctx.strokeStyle = '#CDB200';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Lemonade glass on counter
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{1F34B}', standX + standW / 2, standY + 60);

    // Price tag
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.fillText('$' + price, standX + standW / 2, standY + 80);

    // Draw customers
    for (const c of customers) {
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.icon, c.x, c.y);

      if (c.state === 'angry') {
        ctx.font = '14px sans-serif';
        ctx.fillText('\u{1F4A2}', c.x + 12, c.y - 12);
      }
      if (c.state === 'buying') {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = COLORS.textDim;
        ctx.fillText('...', c.x, c.y - 16);
      }
    }

    // Quality badge
    const quality = getQuality();
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = quality >= 70 ? COLORS.repGood : quality >= 40 ? COLORS.gold : COLORS.repBad;
    ctx.textAlign = 'right';
    ctx.fillText('Quality: ' + quality, CANVAS_SIZE - padding - 10, y + 15);

    ctx.restore();
  };

  const drawReputationBar = () => {
    const padding = 15;
    const y = LAYOUT.reputationBarTop;
    const h = LAYOUT.reputationBarHeight;
    const barW = CANVAS_SIZE - padding * 2;

    ctx.save();

    // Background
    drawRoundRect(ctx, padding, y, barW, h, 4);
    ctx.fillStyle = '#1a2230';
    ctx.fill();

    // Fill
    const fillW = (reputation / 100) * barW;
    drawRoundRect(ctx, padding, y, Math.max(fillW, 4), h, 4);
    ctx.fillStyle = reputation >= 60 ? COLORS.repGood : reputation >= 30 ? COLORS.gold : COLORS.repBad;
    ctx.fill();

    // Text
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{2B50} Rep: ' + reputation, CANVAS_SIZE / 2, y + h / 2);

    ctx.restore();
  };

  const drawRecipeArea = () => {
    const padding = 15;
    const y = LAYOUT.recipeAreaTop;
    const h = LAYOUT.recipeAreaHeight;
    const w = CANVAS_SIZE - padding * 2;

    ctx.save();
    drawRoundRect(ctx, padding, y, w, h, 6);
    ctx.fillStyle = COLORS.panelBg;
    ctx.fill();
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Price row
    const priceY = y + 18;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{1F4B2} Price:', padding + 10, priceY);

    // Price -/+ buttons
    const btnW = 28;
    const btnH = 20;
    const priceMinusX = padding + 100;
    const pricePlusX = padding + 195;

    // Minus button
    drawRoundRect(ctx, priceMinusX, priceY - btnH / 2, btnW, btnH, 4);
    ctx.fillStyle = price > 1 ? COLORS.buyable : COLORS.panelBorder;
    ctx.fill();
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.fillText('-', priceMinusX + btnW / 2, priceY);

    // Price display
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.textAlign = 'center';
    ctx.fillText('$' + price, padding + 160, priceY);

    // Plus button
    drawRoundRect(ctx, pricePlusX, priceY - btnH / 2, btnW, btnH, 4);
    ctx.fillStyle = price < 10 ? COLORS.buyable : COLORS.panelBorder;
    ctx.fill();
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.fillText('+', pricePlusX + btnW / 2, priceY);

    // Key hints
    ctx.font = '10px sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'right';
    ctx.fillText('[</>]', CANVAS_SIZE - padding - 10, priceY);

    // Recipe ratios row
    const ratioY = y + 55;
    const sectionW = w / 3;
    const ratios = [
      { label: '\u{1F34B}', value: lemonRatio, max: 5, type: 'lemon' as const },
      { label: '\u{1F36C}', value: sugarRatio, max: 5, type: 'sugar' as const },
      { label: '\u{1F9CA}', value: iceRatio, max: 3, type: 'ice' as const },
    ];

    for (let i = 0; i < ratios.length; i++) {
      const r = ratios[i];
      const sx = padding + i * sectionW;
      const centerX = sx + sectionW / 2;

      // Minus button
      const minBtnX = sx + 8;
      drawRoundRect(ctx, minBtnX, ratioY - 10, 22, 20, 3);
      ctx.fillStyle = r.value > 1 ? '#3a5a7a' : COLORS.panelBorder;
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.fillText('-', minBtnX + 11, ratioY);

      // Label + value
      ctx.font = '14px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.fillText(r.label + ' x' + r.value, centerX, ratioY);

      // Plus button
      const plusBtnX = sx + sectionW - 30;
      drawRoundRect(ctx, plusBtnX, ratioY - 10, 22, 20, 3);
      ctx.fillStyle = r.value < r.max ? '#3a5a7a' : COLORS.panelBorder;
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.fillText('+', plusBtnX + 11, ratioY);
    }

    ctx.restore();
  };

  const drawStatsBar = () => {
    const y = LAYOUT.statsBarTop;
    ctx.save();
    ctx.font = '13px sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const stockStr =
      '\u{1F34B}' + stock.lemon +
      '  \u{1F36C}' + stock.sugar +
      '  \u{1F9CA}' + stock.ice +
      '  |  Sales: ' + salesPerSec + '/s  |  Total: ' + formatGold(totalGoldEarned) + 'G';
    ctx.fillText(stockStr, CANVAS_SIZE / 2, y + LAYOUT.statsBarHeight / 2);
    ctx.restore();
  };

  const drawTabArea = () => {
    const padding = 15;
    const y = LAYOUT.tabAreaTop;
    const h = LAYOUT.tabAreaHeight;
    const halfW = (CANVAS_SIZE - padding * 2) / 2;

    ctx.save();

    // Ingredients tab
    drawRoundRect(ctx, padding, y, halfW - 2, h, 6);
    ctx.fillStyle = activeTab === 'ingredients' ? COLORS.tabActive : COLORS.tabInactive;
    ctx.fill();
    if (activeTab === 'ingredients') {
      ctx.strokeStyle = COLORS.tapAreaBorder;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = activeTab === 'ingredients' ? COLORS.text : COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{1F6D2} \uC7AC\uB8CC \uAD6C\uB9E4', padding + halfW / 2, y + h / 2);

    // Upgrades tab
    drawRoundRect(ctx, padding + halfW + 2, y, halfW - 2, h, 6);
    ctx.fillStyle = activeTab === 'upgrades' ? COLORS.tabActive : COLORS.tabInactive;
    ctx.fill();
    if (activeTab === 'upgrades') {
      ctx.strokeStyle = COLORS.tapAreaBorder;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = activeTab === 'upgrades' ? COLORS.text : COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.fillText('\u{2B06}\u{FE0F} \uC5C5\uADF8\uB808\uC774\uB4DC', padding + halfW + halfW / 2 + 2, y + h / 2);

    ctx.restore();
  };

  const drawIngredientList = () => {
    const padding = 15;
    const rowH = 55;

    ctx.save();

    for (let i = 0; i < INGREDIENTS.length; i++) {
      const ing = INGREDIENTS[i];
      const y = LAYOUT.listAreaTop + i * rowH;
      const canBuy = gold >= ing.buyCost && stock[ing.id] < ing.maxStock;

      // Row background
      drawRoundRect(ctx, padding, y, CANVAS_SIZE - padding * 2, rowH - 4, 6);
      ctx.fillStyle = COLORS.panelBg;
      ctx.fill();
      ctx.strokeStyle = COLORS.panelBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      const rowCy = y + (rowH - 4) / 2;

      // Key hint
      ctx.font = '11px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('[' + (i + 1) + ']', padding + 5, rowCy);

      // Icon + Name
      ctx.font = '15px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'left';
      ctx.fillText(ing.icon + ' ' + ing.name, padding + 30, rowCy - 8);

      // Stock
      ctx.font = '12px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText('Stock: ' + stock[ing.id] + '/' + ing.maxStock, padding + 30, rowCy + 10);

      // Buy button
      const btnX = CANVAS_SIZE - padding - 130;
      const btnW = 115;
      const btnH = rowH - 16;
      const btnY = y + 6;

      drawRoundRect(ctx, btnX, btnY, btnW, btnH, 4);
      ctx.fillStyle = canBuy ? COLORS.buyable : '#2a3a4a';
      ctx.fill();

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = canBuy ? '#ffffff' : COLORS.textDim;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        '+' + ing.buyAmount + ' / ' + ing.buyCost + 'G',
        btnX + btnW / 2,
        btnY + btnH / 2,
      );
    }

    ctx.restore();
  };

  const drawUpgradeList = () => {
    const padding = 15;
    const rowH = 36;

    ctx.save();

    for (let i = 0; i < UPGRADES.length; i++) {
      const upg = UPGRADES[i];
      const y = LAYOUT.listAreaTop + i * rowH;
      const bought = upgrades[upg.id];
      const canBuy = !bought && gold >= upg.cost;

      // Row background
      drawRoundRect(ctx, padding, y, CANVAS_SIZE - padding * 2, rowH - 3, 4);
      ctx.fillStyle = COLORS.panelBg;
      ctx.fill();
      ctx.strokeStyle = COLORS.panelBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      const rowCy = y + (rowH - 3) / 2;

      // Key hint
      ctx.font = '10px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('[' + (i + 4) + ']', padding + 5, rowCy);

      // Icon + Name
      ctx.font = '13px sans-serif';
      ctx.fillStyle = bought ? COLORS.textDim : COLORS.text;
      ctx.textAlign = 'left';
      ctx.fillText(upg.icon + ' ' + upg.name, padding + 30, rowCy);

      if (bought) {
        // Already purchased
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = COLORS.repGood;
        ctx.textAlign = 'right';
        ctx.fillText('\u{2705}', CANVAS_SIZE - padding - 10, rowCy);
      } else {
        // Cost / Buy button
        const btnX = CANVAS_SIZE - padding - 90;
        const btnW = 75;
        const btnH = rowH - 12;
        const btnY = y + 4;

        drawRoundRect(ctx, btnX, btnY, btnW, btnH, 4);
        ctx.fillStyle = canBuy ? COLORS.upgradeBtn : COLORS.upgradeBtnDim;
        ctx.fill();

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = canBuy ? '#ffffff' : COLORS.textDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatGold(upg.cost) + 'G', btnX + btnW / 2, btnY + btnH / 2);
      }
    }

    ctx.restore();
  };

  const drawFloatingTexts = () => {
    ctx.save();
    for (const ft of floatingTexts) {
      ctx.globalAlpha = ft.opacity;
      ctx.font = 'bold 16px sans-serif';
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
    drawWeatherBar();
    drawStandArea();
    drawReputationBar();
    drawRecipeArea();
    drawStatsBar();
    drawTabArea();
    if (activeTab === 'ingredients') {
      drawIngredientList();
    } else {
      drawUpgradeList();
    }
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
      gameOverHud.render(Math.floor(totalGoldEarned));
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
