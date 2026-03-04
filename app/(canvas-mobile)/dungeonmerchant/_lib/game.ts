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
  STARTING_GOLD,
  COLORS,
  RESOURCE_BUILDINGS,
  RECIPES,
  SHOP_UPGRADES,
  ADVENTURER_NAMES,
  ADVENTURER_VISIT_MIN,
  ADVENTURER_VISIT_MAX,
  LAYOUT,
} from './config';
import {
  TResourceBuildingState,
  TCraftingState,
  TDisplayItem,
  TAdventurer,
  TFloatingText,
  TTabType,
  TResourceType,
} from './types';

export type TDungeonMerchantCallbacks = {
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

function formatResource(n: number): string {
  return Math.floor(n).toString();
}

export const setupDungeonMerchant = (
  canvas: HTMLCanvasElement,
  callbacks?: TDungeonMerchantCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  // Game state
  let gold = STARTING_GOLD;
  let totalGoldEarned = 0;
  let timeRemaining = GAME_DURATION;

  // Resources
  let resources: Record<TResourceType, number> = { iron: 0, wood: 0, gem: 0 };

  // Resource buildings state
  let buildingStates: TResourceBuildingState[] = RESOURCE_BUILDINGS.map(() => ({
    level: 0,
  }));

  // Crafting state
  let crafting: TCraftingState = {
    recipeId: null,
    progress: 0,
    totalTime: 0,
  };

  // Display (items for sale)
  let displayItems: TDisplayItem[] = [];
  let displayCapacity = 1;

  // Shop upgrades purchased
  let purchasedUpgrades: Set<string> = new Set();

  // Adventurer state
  let adventurer: TAdventurer = {
    name: '',
    x: CANVAS_SIZE + 30,
    targetX: CANVAS_SIZE / 2,
    visible: false,
    speechBubble: null,
    speechTimer: 0,
    leaving: false,
  };
  let adventurerTimer = randomAdventurerInterval();

  // UI state
  let currentTab: TTabType = 'resources';
  let floatingTexts: TFloatingText[] = [];

  // Game flow state
  let lastTime = 0;
  let isGameOver = false;
  let isStarted = false;
  let isLoading = false;
  let isPaused = false;

  // Scroll offset for list area
  let listScrollOffset = 0;

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
    'dungeonmerchant',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Helper functions ---

  function randomAdventurerInterval(): number {
    return ADVENTURER_VISIT_MIN + Math.random() * (ADVENTURER_VISIT_MAX - ADVENTURER_VISIT_MIN);
  }

  function getBuildingCost(index: number): number {
    const def = RESOURCE_BUILDINGS[index];
    const state = buildingStates[index];
    return Math.floor(def.baseCost * Math.pow(def.costMult, state.level));
  }

  function getBuildingProduction(index: number): number {
    const def = RESOURCE_BUILDINGS[index];
    const state = buildingStates[index];
    return def.baseProduction * state.level;
  }

  function canAffordRecipe(recipeId: string): boolean {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;
    for (const [res, amount] of Object.entries(recipe.materials)) {
      if ((resources[res as TResourceType] || 0) < (amount || 0)) return false;
    }
    return true;
  }

  function consumeRecipeMaterials(recipeId: string): void {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    for (const [res, amount] of Object.entries(recipe.materials)) {
      resources[res as TResourceType] -= amount || 0;
    }
  }

  function getCraftSpeedMultiplier(): number {
    return purchasedUpgrades.has('workshop') ? 1.5 : 1;
  }

  function getAdventurerRateMultiplier(): number {
    return purchasedUpgrades.has('sign') ? 1.5 : 1;
  }

  function getDisplayCapacity(): number {
    return purchasedUpgrades.has('display') ? 2 : 1;
  }

  function hasAutocraft(): boolean {
    return purchasedUpgrades.has('autocraft');
  }

  function findCheapestAffordableRecipe(): string | null {
    let cheapest: string | null = null;
    let cheapestPrice = Infinity;
    for (const recipe of RECIPES) {
      if (canAffordRecipe(recipe.id) && recipe.sellPrice < cheapestPrice) {
        cheapest = recipe.id;
        cheapestPrice = recipe.sellPrice;
      }
    }
    return cheapest;
  }

  // --- Game actions ---

  function upgradeBuilding(index: number): void {
    if (!isStarted || isGameOver || isPaused) return;
    if (index < 0 || index >= RESOURCE_BUILDINGS.length) return;
    const def = RESOURCE_BUILDINGS[index];
    const state = buildingStates[index];
    if (state.level >= def.maxLevel) return;
    const cost = getBuildingCost(index);
    if (gold >= cost) {
      gold -= cost;
      state.level++;
    }
  }

  function startCrafting(recipeIndex: number): void {
    if (!isStarted || isGameOver || isPaused) return;
    if (crafting.recipeId !== null) return; // Already crafting
    if (recipeIndex < 0 || recipeIndex >= RECIPES.length) return;
    const recipe = RECIPES[recipeIndex];
    if (!canAffordRecipe(recipe.id)) return;
    if (displayItems.length >= getDisplayCapacity()) return;

    consumeRecipeMaterials(recipe.id);
    crafting.recipeId = recipe.id;
    crafting.progress = 0;
    crafting.totalTime = recipe.craftTime / getCraftSpeedMultiplier();
  }

  function speedUpCrafting(): void {
    if (!isStarted || isGameOver || isPaused) return;
    if (crafting.recipeId === null) return;
    crafting.progress += 0.5;
    if (crafting.progress >= crafting.totalTime) {
      completeCrafting();
    }
  }

  function completeCrafting(): void {
    if (crafting.recipeId === null) return;
    const recipe = RECIPES.find((r) => r.id === crafting.recipeId);
    if (!recipe) return;

    if (displayItems.length < getDisplayCapacity()) {
      displayItems.push({
        recipeId: recipe.id,
        name: recipe.name,
        icon: recipe.icon,
        sellPrice: recipe.sellPrice,
      });
    }

    crafting.recipeId = null;
    crafting.progress = 0;
    crafting.totalTime = 0;
  }

  function buyShopUpgrade(index: number): void {
    if (!isStarted || isGameOver || isPaused) return;
    if (index < 0 || index >= SHOP_UPGRADES.length) return;
    const upgrade = SHOP_UPGRADES[index];
    if (purchasedUpgrades.has(upgrade.id)) return;
    if (gold < upgrade.cost) return;

    gold -= upgrade.cost;
    purchasedUpgrades.add(upgrade.id);

    if (upgrade.id === 'display') {
      displayCapacity = 2;
    }
  }

  function spawnAdventurer(): void {
    if (adventurer.visible) return;
    const nameIdx = Math.floor(Math.random() * ADVENTURER_NAMES.length);
    adventurer.name = ADVENTURER_NAMES[nameIdx];
    adventurer.x = CANVAS_SIZE + 30;
    adventurer.targetX = CANVAS_SIZE / 2 - 20;
    adventurer.visible = true;
    adventurer.speechBubble = null;
    adventurer.speechTimer = 0;
    adventurer.leaving = false;
  }

  function adventurerBuy(): void {
    if (displayItems.length === 0) {
      adventurer.speechBubble = '물건이 없네...';
      adventurer.speechTimer = 1.5;
      adventurer.leaving = true;
      return;
    }

    // Buy most expensive item
    let bestIdx = 0;
    for (let i = 1; i < displayItems.length; i++) {
      if (displayItems[i].sellPrice > displayItems[bestIdx].sellPrice) {
        bestIdx = i;
      }
    }

    const item = displayItems[bestIdx];
    gold += item.sellPrice;
    totalGoldEarned += item.sellPrice;
    displayItems.splice(bestIdx, 1);

    adventurer.speechBubble = `${item.icon} ${item.name} 구매!`;
    adventurer.speechTimer = 2;
    adventurer.leaving = true;

    // Floating text
    floatingTexts.push({
      x: CANVAS_SIZE / 2,
      y: LAYOUT.shopAreaTop + 40,
      text: '+' + formatGold(item.sellPrice) + 'G',
      opacity: 1,
      vy: -50,
    });
  }

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
    resources = { iron: 0, wood: 0, gem: 0 };
    buildingStates = RESOURCE_BUILDINGS.map(() => ({ level: 0 }));
    crafting = { recipeId: null, progress: 0, totalTime: 0 };
    displayItems = [];
    displayCapacity = 1;
    purchasedUpgrades = new Set();
    adventurer = {
      name: '',
      x: CANVAS_SIZE + 30,
      targetX: CANVAS_SIZE / 2,
      visible: false,
      speechBubble: null,
      speechTimer: 0,
      leaving: false,
    };
    adventurerTimer = randomAdventurerInterval();
    currentTab = 'resources';
    floatingTexts = [];
    listScrollOffset = 0;
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
      const handled = gameOverHud.onKeyDown(e, Math.min(99999, Math.floor(totalGoldEarned)));
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
      speedUpCrafting();
      return;
    }

    // 1-3: Upgrade resource buildings
    if (e.code === 'Digit1') { upgradeBuilding(0); return; }
    if (e.code === 'Digit2') { upgradeBuilding(1); return; }
    if (e.code === 'Digit3') { upgradeBuilding(2); return; }

    // 4-9: Craft recipes
    if (e.code === 'Digit4') { startCrafting(0); return; }
    if (e.code === 'Digit5') { startCrafting(1); return; }
    if (e.code === 'Digit6') { startCrafting(2); return; }
    if (e.code === 'Digit7') { startCrafting(3); return; }
    if (e.code === 'Digit8') { startCrafting(4); return; }
    if (e.code === 'Digit9') { startCrafting(5); return; }
  };

  // --- Touch events ---

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
      gameOverHud.onTouchStart(pos.x, pos.y, Math.min(99999, Math.floor(totalGoldEarned)));
      return;
    }

    if (!isStarted) return;

    // Crafting bar area - tap to speed up
    if (
      pos.y >= LAYOUT.craftingBarTop &&
      pos.y <= LAYOUT.craftingBarTop + LAYOUT.craftingBarHeight
    ) {
      speedUpCrafting();
      return;
    }

    // Shop area - tap to speed up crafting too
    if (
      pos.y >= LAYOUT.shopAreaTop &&
      pos.y <= LAYOUT.shopAreaTop + LAYOUT.shopAreaHeight
    ) {
      speedUpCrafting();
      return;
    }

    // Tab area
    if (
      pos.y >= LAYOUT.tabAreaTop &&
      pos.y <= LAYOUT.tabAreaTop + LAYOUT.tabAreaHeight
    ) {
      const tabWidth = (CANVAS_SIZE - 30) / 3;
      const tabIndex = Math.floor((pos.x - 15) / tabWidth);
      if (tabIndex === 0) currentTab = 'resources';
      else if (tabIndex === 1) currentTab = 'crafting';
      else if (tabIndex === 2) currentTab = 'shop';
      listScrollOffset = 0;
      return;
    }

    // List area
    if (
      pos.y >= LAYOUT.listAreaTop &&
      pos.y <= LAYOUT.listAreaTop + LAYOUT.listAreaHeight
    ) {
      const relY = pos.y - LAYOUT.listAreaTop + listScrollOffset;
      const rowHeight = 50;

      if (currentTab === 'resources') {
        const rowIndex = Math.floor(relY / rowHeight);
        if (rowIndex >= 0 && rowIndex < RESOURCE_BUILDINGS.length) {
          upgradeBuilding(rowIndex);
        }
      } else if (currentTab === 'crafting') {
        const rowIndex = Math.floor(relY / rowHeight);
        if (rowIndex >= 0 && rowIndex < RECIPES.length) {
          startCrafting(rowIndex);
        }
      } else if (currentTab === 'shop') {
        const rowIndex = Math.floor(relY / rowHeight);
        if (rowIndex >= 0 && rowIndex < SHOP_UPGRADES.length) {
          buyShopUpgrade(rowIndex);
        }
      }
      return;
    }

    // Upgrade bar
    if (
      pos.y >= LAYOUT.upgradeBarTop &&
      pos.y <= LAYOUT.upgradeBarTop + LAYOUT.upgradeBarHeight
    ) {
      speedUpCrafting();
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

  // --- Update ---

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

      // Resource production
      for (let i = 0; i < RESOURCE_BUILDINGS.length; i++) {
        const production = getBuildingProduction(i);
        if (production > 0) {
          const resType = RESOURCE_BUILDINGS[i].resourceType;
          resources[resType] += production * dt;
        }
      }

      // Crafting progress
      if (crafting.recipeId !== null) {
        crafting.progress += dt;
        if (crafting.progress >= crafting.totalTime) {
          completeCrafting();
        }
      }

      // Auto-craft logic
      if (hasAutocraft() && crafting.recipeId === null && displayItems.length < getDisplayCapacity()) {
        const cheapest = findCheapestAffordableRecipe();
        if (cheapest !== null) {
          const recipeIndex = RECIPES.findIndex((r) => r.id === cheapest);
          if (recipeIndex >= 0) {
            startCrafting(recipeIndex);
          }
        }
      }

      // Adventurer timing
      const rateMultiplier = getAdventurerRateMultiplier();
      adventurerTimer -= dt * rateMultiplier;
      if (adventurerTimer <= 0 && !adventurer.visible) {
        spawnAdventurer();
        adventurerTimer = randomAdventurerInterval();
      }

      // Adventurer movement
      if (adventurer.visible) {
        if (!adventurer.leaving) {
          // Walk towards shop
          const speed = 120;
          if (adventurer.x > adventurer.targetX) {
            adventurer.x -= speed * dt;
            if (adventurer.x <= adventurer.targetX) {
              adventurer.x = adventurer.targetX;
              // Arrived - buy
              adventurerBuy();
            }
          }
        } else {
          // Speech bubble timer
          if (adventurer.speechTimer > 0) {
            adventurer.speechTimer -= dt;
          } else {
            // Walk away to the right
            const speed = 150;
            adventurer.x += speed * dt;
            if (adventurer.x > CANVAS_SIZE + 40) {
              adventurer.visible = false;
            }
          }
        }
      }

      // Floating texts
      for (const ft of floatingTexts) {
        ft.y += ft.vy * dt;
        ft.opacity -= 1.2 * dt;
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
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('\uD83D\uDCB0 ' + formatGold(gold) + 'G', padding, LAYOUT.headerHeight / 2);

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

  const drawResourceBar = () => {
    const y = LAYOUT.resourceBarTop;
    const h = LAYOUT.resourceBarHeight;
    const padding = 15;
    const sectionW = (CANVAS_SIZE - padding * 2) / 3;

    ctx.save();

    // Background
    drawRoundRect(ctx, padding, y, CANVAS_SIZE - padding * 2, h, 6);
    ctx.fillStyle = COLORS.panelBg;
    ctx.fill();

    ctx.font = 'bold 13px sans-serif';
    ctx.textBaseline = 'middle';
    const cy = y + h / 2;

    // Iron
    ctx.fillStyle = COLORS.iron;
    ctx.textAlign = 'center';
    ctx.fillText('\u26CF ' + formatResource(resources.iron), padding + sectionW * 0.5, cy);

    // Wood
    ctx.fillStyle = COLORS.wood;
    ctx.fillText('\uD83E\uDEB5 ' + formatResource(resources.wood), padding + sectionW * 1.5, cy);

    // Gem
    ctx.fillStyle = COLORS.gem;
    ctx.fillText('\uD83D\uDC8E ' + formatResource(resources.gem), padding + sectionW * 2.5, cy);

    ctx.restore();
  };

  const drawShopArea = () => {
    const x = 15;
    const y = LAYOUT.shopAreaTop;
    const w = CANVAS_SIZE - 30;
    const h = LAYOUT.shopAreaHeight;

    ctx.save();

    // Shop background
    drawRoundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = COLORS.shopBg;
    ctx.fill();
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Shop floor
    ctx.fillStyle = COLORS.shopFloor;
    ctx.fillRect(x + 1, y + h - 30, w - 2, 29);

    // Shop sign
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('\u2694 DUNGEON MERCHANT \u2694', CANVAS_SIZE / 2, y + 8);

    // Display items on shelves
    const shelfY = y + 35;
    const shelfH = 60;
    const displayCap = getDisplayCapacity();

    // Draw shelf
    ctx.fillStyle = '#4a3520';
    ctx.fillRect(x + 20, shelfY + shelfH - 5, w - 40, 5);

    // Draw display slots
    const slotWidth = (w - 60) / Math.max(displayCap, 2);
    for (let i = 0; i < displayCap; i++) {
      const slotX = x + 30 + i * slotWidth;
      const slotY = shelfY;

      // Slot outline
      drawRoundRect(ctx, slotX, slotY, slotWidth - 10, shelfH - 10, 4);
      ctx.strokeStyle = COLORS.panelBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      if (i < displayItems.length) {
        const item = displayItems[i];
        ctx.font = '28px sans-serif';
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.icon, slotX + (slotWidth - 10) / 2, slotY + 22);

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = COLORS.gold;
        ctx.fillText(
          formatGold(item.sellPrice) + 'G',
          slotX + (slotWidth - 10) / 2,
          slotY + shelfH - 20,
        );
      } else {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = COLORS.locked;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('empty', slotX + (slotWidth - 10) / 2, slotY + (shelfH - 10) / 2);
      }
    }

    // Adventurer
    if (adventurer.visible) {
      const ax = adventurer.x;
      const ay = y + h - 45;

      // Body
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('\uD83E\uDDD9', ax, ay + 28);

      // Speech bubble
      if (adventurer.speechBubble && adventurer.speechTimer > 0) {
        const bubbleW = Math.min(ctx.measureText(adventurer.speechBubble).width + 20, 180);
        const bubbleH = 24;
        const bubbleX = ax - bubbleW / 2;
        const bubbleY = ay - 18;

        drawRoundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 8);
        ctx.fillStyle = COLORS.speechBubble;
        ctx.fill();

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(adventurer.speechBubble, ax, bubbleY + bubbleH / 2);
      }

      // Name
      ctx.font = '10px sans-serif';
      ctx.fillStyle = COLORS.adventurer;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(adventurer.name, ax, ay + 28);
    }

    ctx.restore();
  };

  const drawCraftingBar = () => {
    const x = 15;
    const y = LAYOUT.craftingBarTop;
    const w = CANVAS_SIZE - 30;
    const h = LAYOUT.craftingBarHeight;

    ctx.save();

    // Background
    drawRoundRect(ctx, x, y, w, h, 6);
    ctx.fillStyle = COLORS.craftProgressBg;
    ctx.fill();

    if (crafting.recipeId !== null) {
      const recipe = RECIPES.find((r) => r.id === crafting.recipeId);
      const progress = Math.min(crafting.progress / crafting.totalTime, 1);

      // Progress fill
      if (progress > 0) {
        const fillW = Math.max((w - 4) * progress, 0);
        drawRoundRect(ctx, x + 2, y + 2, fillW, h - 4, 4);
        ctx.fillStyle = COLORS.craftProgress;
        ctx.fill();
      }

      // Text
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const pctStr = Math.floor(progress * 100) + '%';
      ctx.fillText(
        (recipe ? recipe.icon + ' ' + recipe.name : '') + '  ' + pctStr + '  [TAP to speed up]',
        CANVAS_SIZE / 2,
        y + h / 2,
      );
    } else {
      ctx.font = '13px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No crafting in progress', CANVAS_SIZE / 2, y + h / 2);
    }

    ctx.restore();
  };

  const drawTabs = () => {
    const y = LAYOUT.tabAreaTop;
    const h = LAYOUT.tabAreaHeight;
    const padding = 15;
    const tabW = (CANVAS_SIZE - padding * 2) / 3;
    const tabs: { label: string; key: TTabType }[] = [
      { label: '\u26CF \uC790\uC6D0', key: 'resources' },
      { label: '\uD83D\uDD28 \uC81C\uC791', key: 'crafting' },
      { label: '\uD83C\uDFEA \uC0C1\uC810', key: 'shop' },
    ];

    ctx.save();

    for (let i = 0; i < tabs.length; i++) {
      const tx = padding + i * tabW;
      const isActive = currentTab === tabs[i].key;

      drawRoundRect(ctx, tx + 1, y, tabW - 2, h, 6);
      ctx.fillStyle = isActive ? COLORS.tabActive : COLORS.tabInactive;
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = COLORS.craftProgress;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.font = isActive ? 'bold 14px sans-serif' : '13px sans-serif';
      ctx.fillStyle = isActive ? COLORS.text : COLORS.textDim;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tabs[i].label, tx + tabW / 2, y + h / 2);
    }

    ctx.restore();
  };

  const drawListArea = () => {
    const x = 15;
    const y = LAYOUT.listAreaTop;
    const w = CANVAS_SIZE - 30;
    const h = LAYOUT.listAreaHeight;
    const rowH = 50;

    ctx.save();

    // Background
    drawRoundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = COLORS.panelBg;
    ctx.fill();

    // Clip to list area
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    if (currentTab === 'resources') {
      drawResourceList(x, y, w, rowH);
    } else if (currentTab === 'crafting') {
      drawCraftingList(x, y, w, rowH);
    } else if (currentTab === 'shop') {
      drawShopList(x, y, w, rowH);
    }

    ctx.restore();
  };

  const drawResourceList = (x: number, y: number, w: number, rowH: number) => {
    ctx.save();

    for (let i = 0; i < RESOURCE_BUILDINGS.length; i++) {
      const def = RESOURCE_BUILDINGS[i];
      const state = buildingStates[i];
      const ry = y + 5 + i * rowH - listScrollOffset;
      const cost = getBuildingCost(i);
      const production = getBuildingProduction(i);
      const canBuy = gold >= cost && state.level < def.maxLevel;
      const maxed = state.level >= def.maxLevel;

      // Row bg
      drawRoundRect(ctx, x + 5, ry, w - 10, rowH - 4, 6);
      ctx.fillStyle = '#162636';
      ctx.fill();

      // Key hint
      ctx.font = '10px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('[' + (i + 1) + ']', x + 8, ry + (rowH - 4) / 2);

      // Icon + Name
      ctx.font = '14px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'left';
      ctx.fillText(def.icon + ' ' + def.name, x + 28, ry + 15);

      // Level
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = COLORS.gold;
      ctx.fillText('Lv.' + state.level + '/' + def.maxLevel, x + 28, ry + 33);

      // Production rate
      ctx.font = '12px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'center';
      const prodText = production > 0 ? production.toFixed(1) + '/s' : '-';
      ctx.fillText(prodText, x + w / 2 + 30, ry + (rowH - 4) / 2);

      // Buy button
      const btnW = 100;
      const btnH = 32;
      const btnX = x + w - btnW - 10;
      const btnY = ry + (rowH - 4 - btnH) / 2;

      drawRoundRect(ctx, btnX, btnY, btnW, btnH, 4);
      if (maxed) {
        ctx.fillStyle = '#2a3a4a';
        ctx.fill();
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = COLORS.textDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('MAX', btnX + btnW / 2, btnY + btnH / 2);
      } else {
        ctx.fillStyle = canBuy ? COLORS.buyable : '#2a3a4a';
        ctx.fill();
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = canBuy ? '#ffffff' : COLORS.textDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatGold(cost) + 'G', btnX + btnW / 2, btnY + btnH / 2);
      }
    }

    ctx.restore();
  };

  const drawCraftingList = (x: number, y: number, w: number, rowH: number) => {
    ctx.save();

    for (let i = 0; i < RECIPES.length; i++) {
      const recipe = RECIPES[i];
      const ry = y + 5 + i * rowH - listScrollOffset;
      const canCraft = canAffordRecipe(recipe.id) && crafting.recipeId === null && displayItems.length < getDisplayCapacity();

      // Row bg
      drawRoundRect(ctx, x + 5, ry, w - 10, rowH - 4, 6);
      ctx.fillStyle = '#162636';
      ctx.fill();

      // Key hint
      ctx.font = '10px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('[' + (i + 4) + ']', x + 8, ry + (rowH - 4) / 2);

      // Icon + Name
      ctx.font = '14px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'left';
      ctx.fillText(recipe.icon + ' ' + recipe.name, x + 28, ry + 14);

      // Materials
      const matParts: string[] = [];
      if (recipe.materials.iron) matParts.push('\u26CF' + recipe.materials.iron);
      if (recipe.materials.wood) matParts.push('\uD83E\uDEB5' + recipe.materials.wood);
      if (recipe.materials.gem) matParts.push('\uD83D\uDC8E' + recipe.materials.gem);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText(matParts.join(' '), x + 28, ry + 34);

      // Sell price
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = COLORS.gold;
      ctx.textAlign = 'center';
      ctx.fillText(formatGold(recipe.sellPrice) + 'G', x + w / 2 + 40, ry + (rowH - 4) / 2);

      // Craft button
      const btnW = 70;
      const btnH = 30;
      const btnX = x + w - btnW - 10;
      const btnY = ry + (rowH - 4 - btnH) / 2;

      drawRoundRect(ctx, btnX, btnY, btnW, btnH, 4);
      if (crafting.recipeId !== null) {
        ctx.fillStyle = '#2a3a4a';
        ctx.fill();
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = COLORS.textDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BUSY', btnX + btnW / 2, btnY + btnH / 2);
      } else if (displayItems.length >= getDisplayCapacity()) {
        ctx.fillStyle = '#2a3a4a';
        ctx.fill();
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = COLORS.textDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FULL', btnX + btnW / 2, btnY + btnH / 2);
      } else {
        ctx.fillStyle = canCraft ? COLORS.upgradeBtn : '#2a3a4a';
        ctx.fill();
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = canCraft ? '#ffffff' : COLORS.textDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CRAFT', btnX + btnW / 2, btnY + btnH / 2);
      }
    }

    ctx.restore();
  };

  const drawShopList = (x: number, y: number, w: number, rowH: number) => {
    ctx.save();

    for (let i = 0; i < SHOP_UPGRADES.length; i++) {
      const upgrade = SHOP_UPGRADES[i];
      const ry = y + 5 + i * rowH - listScrollOffset;
      const purchased = purchasedUpgrades.has(upgrade.id);
      const canBuy = !purchased && gold >= upgrade.cost;

      // Row bg
      drawRoundRect(ctx, x + 5, ry, w - 10, rowH - 4, 6);
      ctx.fillStyle = '#162636';
      ctx.fill();

      // Icon + Name
      ctx.font = '14px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        upgrade.icon + ' ' + upgrade.name,
        x + 15,
        ry + 14,
      );

      // Description
      ctx.font = '11px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText(upgrade.description, x + 15, ry + 33);

      // Buy button
      const btnW = 100;
      const btnH = 30;
      const btnX = x + w - btnW - 10;
      const btnY = ry + (rowH - 4 - btnH) / 2;

      drawRoundRect(ctx, btnX, btnY, btnW, btnH, 4);
      if (purchased) {
        ctx.fillStyle = '#2a5a2a';
        ctx.fill();
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#4ade80';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2713 DONE', btnX + btnW / 2, btnY + btnH / 2);
      } else {
        ctx.fillStyle = canBuy ? COLORS.buyable : '#2a3a4a';
        ctx.fill();
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = canBuy ? '#ffffff' : COLORS.textDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatGold(upgrade.cost) + 'G', btnX + btnW / 2, btnY + btnH / 2);
      }
    }

    ctx.restore();
  };

  const drawUpgradeBar = () => {
    const y = LAYOUT.upgradeBarTop;
    const h = LAYOUT.upgradeBarHeight;
    const padding = 15;

    ctx.save();

    // Total earned display
    drawRoundRect(ctx, padding, y, CANVAS_SIZE - padding * 2, h - 4, 6);
    ctx.fillStyle = COLORS.panelBg;
    ctx.fill();

    ctx.font = '13px sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'Total Earned: ' + formatGold(totalGoldEarned) + 'G  |  Display: ' + displayItems.length + '/' + getDisplayCapacity(),
      CANVAS_SIZE / 2,
      y + (h - 4) / 2,
    );

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
    drawResourceBar();
    drawShopArea();
    drawCraftingBar();
    drawTabs();
    drawListArea();
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
      gameOverHud.render(Math.min(99999, Math.floor(totalGoldEarned)));
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
