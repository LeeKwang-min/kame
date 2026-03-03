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
  RESOURCES,
  BUILDINGS,
  TECHS,
  RANDOM_EVENTS,
  EVENT_INTERVAL_MIN,
  EVENT_INTERVAL_MAX,
  POP_GROWTH_INTERVAL,
  POP_SHRINK_INTERVAL,
  STARTING_POPULATION,
  BASE_POP_CAP,
  LAYOUT,
} from './config';
import { TTab, TEventLog, TTechId } from './types';

export type TSpaceColonyCallbacks = {
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

export const setupSpaceColony = (
  canvas: HTMLCanvasElement,
  callbacks?: TSpaceColonyCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  // --- Game State ---
  let gold = STARTING_GOLD;
  let population = STARTING_POPULATION;
  let timeRemaining = GAME_DURATION;

  let resourceValues: number[] = RESOURCES.map((r) => r.starting);
  let buildingLevels: number[] = BUILDINGS.map(() => 0);
  let techUnlocked: boolean[] = TECHS.map(() => false);
  let researchPoints = 0;
  let selectedTechIndex = 0;

  let currentTab: TTab = 'build';
  let eventLog: TEventLog | null = null;
  let eventLogFade = 0;

  let nextEventTime = 0;
  let popGrowthTimer = 0;
  let popShrinkTimer = 0;

  // Scroll offset for list area
  let listScrollOffset = 0;

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
    'spacecolony',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Helper Functions ---

  const getPopCap = (): number => {
    const domeDef = BUILDINGS[3]; // dome
    return BASE_POP_CAP + domeDef.effectPerLevel * buildingLevels[3];
  };

  const getWorkersUsed = (): number => {
    let total = 0;
    for (let i = 0; i < BUILDINGS.length; i++) {
      const def = BUILDINGS[i];
      const level = buildingLevels[i];
      if (level === 0) continue;

      let workersNeeded = def.workersNeeded;
      if (techUnlocked[1]) { // automation
        workersNeeded = Math.max(0, workersNeeded - 1);
      }

      if (def.workerPerLevel) {
        total += workersNeeded * level;
      } else {
        total += workersNeeded * Math.min(level, 1);
      }
    }
    return total;
  };

  const getAvailableWorkers = (): number => {
    return Math.max(0, population - getWorkersUsed());
  };

  const getWorkersNeededForBuilding = (index: number): number => {
    const def = BUILDINGS[index];
    let workersNeeded = def.workersNeeded;
    if (techUnlocked[1]) { // automation
      workersNeeded = Math.max(0, workersNeeded - 1);
    }
    return workersNeeded;
  };

  const getWorkersForNewLevel = (index: number): number => {
    const def = BUILDINGS[index];
    const currentLevel = buildingLevels[index];
    if (def.workerPerLevel) {
      return getWorkersNeededForBuilding(index);
    } else {
      // dome, shield, port: only need workers when first built
      return currentLevel === 0 ? getWorkersNeededForBuilding(index) : 0;
    }
  };

  const getBuildingCost = (index: number): number => {
    const def = BUILDINGS[index];
    return Math.floor(def.baseCost * Math.pow(1.5, buildingLevels[index]));
  };

  const getProductionMultiplier = (): number => {
    let mult = 1;
    if (techUnlocked[0]) mult *= 1.2; // efficiency1
    if (techUnlocked[2]) mult *= 1.4; // efficiency2
    // port boost
    if (buildingLevels[7] > 0) mult *= 1.2; // +20% all production
    return mult;
  };

  const getResourceProduction = (resourceId: string): number => {
    let production = 0;
    const mult = getProductionMultiplier();
    for (let i = 0; i < BUILDINGS.length; i++) {
      const def = BUILDINGS[i];
      if (def.effectType === resourceId && buildingLevels[i] > 0) {
        production += def.effectPerLevel * buildingLevels[i] * mult;
      }
    }
    return production;
  };

  const getGoldProduction = (): number => {
    const minerIndex = 5;
    if (buildingLevels[minerIndex] === 0) return 0;
    const mult = getProductionMultiplier();
    return BUILDINGS[minerIndex].effectPerLevel * buildingLevels[minerIndex] * mult;
  };

  const getResearchProduction = (): number => {
    const labIndex = 4;
    if (buildingLevels[labIndex] === 0) return 0;
    let mult = getProductionMultiplier();
    if (techUnlocked[4]) mult *= 2; // quantum computer
    return BUILDINGS[labIndex].effectPerLevel * buildingLevels[labIndex] * mult;
  };

  const getDecayMultiplier = (): number => {
    return techUnlocked[3] ? 0.5 : 1; // terraforming
  };

  const calculateScore = (): number => {
    const techCount = techUnlocked.filter((t) => t).length;
    const resourceSum = resourceValues[0] + resourceValues[1] + resourceValues[2];
    return Math.floor(
      population * 100 + techCount * 500 + gold + resourceSum * 2,
    );
  };

  const addEvent = (message: string, type: 'positive' | 'negative' | 'neutral') => {
    eventLog = { message, type, time: 3 };
    eventLogFade = 1;
  };

  const triggerRandomEvent = () => {
    const eventIndex = Math.floor(Math.random() * RANDOM_EVENTS.length);
    const event = RANDOM_EVENTS[eventIndex];
    const hasShield = buildingLevels[6] > 0;

    switch (event.id) {
      case 'meteor': {
        if (hasShield) {
          addEvent('운석 충돌! 방어막이 피해를 차단했습니다', 'neutral');
        } else {
          // Random building with level > 0 loses 1 level
          const builtBuildings = buildingLevels
            .map((l, i) => ({ level: l, index: i }))
            .filter((b) => b.level > 0);
          if (builtBuildings.length > 0) {
            const target = builtBuildings[Math.floor(Math.random() * builtBuildings.length)];
            buildingLevels[target.index]--;
            addEvent(`운석 충돌! ${BUILDINGS[target.index].name} Lv 하락!`, 'negative');
          } else {
            addEvent('운석 충돌! 피해 없음', 'neutral');
          }
        }
        break;
      }
      case 'trade':
        gold += 200;
        addEvent('무역선 도착! +200G', 'positive');
        break;
      case 'immigrants': {
        const cap = getPopCap();
        const added = Math.min(5, cap - population);
        if (added > 0) {
          population += added;
          addEvent(`이민선 도착! +${added} 인구`, 'positive');
        } else {
          addEvent('이민선 도착! 거주 공간 부족', 'neutral');
        }
        break;
      }
      case 'solarstorm': {
        const damage = hasShield ? 10 : 30;
        resourceValues[1] = Math.max(0, resourceValues[1] - damage);
        addEvent(`태양 폭풍! 에너지 -${damage}`, 'negative');
        break;
      }
      case 'harvest':
        resourceValues[2] = Math.min(RESOURCES[2].max, resourceValues[2] + 50);
        addEvent('풍작! 식량 +50', 'positive');
        break;
    }
  };

  const buyBuilding = (index: number) => {
    if (!isStarted || isGameOver || isPaused) return;
    if (index < 0 || index >= BUILDINGS.length) return;

    const def = BUILDINGS[index];
    const level = buildingLevels[index];
    if (level >= def.maxLevel) return;

    const cost = getBuildingCost(index);
    if (gold < cost) return;

    const workersNeeded = getWorkersForNewLevel(index);
    if (workersNeeded > getAvailableWorkers()) return;

    gold -= cost;
    buildingLevels[index]++;
  };

  const selectTech = (index: number) => {
    if (index < 0 || index >= TECHS.length) return;
    if (techUnlocked[index]) return;
    selectedTechIndex = index;
  };

  // --- Game Start / Reset ---

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
    nextEventTime = GAME_DURATION - (EVENT_INTERVAL_MIN + Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN));
  };

  const resetGame = () => {
    isStarted = false;
    isGameOver = false;
    isPaused = false;
    gold = STARTING_GOLD;
    population = STARTING_POPULATION;
    timeRemaining = GAME_DURATION;
    resourceValues = RESOURCES.map((r) => r.starting);
    buildingLevels = BUILDINGS.map(() => 0);
    techUnlocked = TECHS.map(() => false);
    researchPoints = 0;
    selectedTechIndex = 0;
    currentTab = 'build';
    eventLog = null;
    eventLogFade = 0;
    nextEventTime = 0;
    popGrowthTimer = 0;
    popShrinkTimer = 0;
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

  // --- Keyboard Events ---

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
      const handled = gameOverHud.onKeyDown(e, calculateScore());
      if (handled) return;
    }

    if (e.code === 'KeyR' && !isGameOver && !isPaused) {
      resetGame();
      return;
    }

    if (isPaused) return;
    if (!isStarted || isGameOver) return;

    // Tab switching
    if (e.code === 'KeyT') {
      if (currentTab === 'build') currentTab = 'research';
      else if (currentTab === 'research') currentTab = 'info';
      else currentTab = 'build';
      listScrollOffset = 0;
      return;
    }

    // Building / Tech shortcuts
    if (currentTab === 'build') {
      if (e.code === 'Digit1') { buyBuilding(0); return; }
      if (e.code === 'Digit2') { buyBuilding(1); return; }
      if (e.code === 'Digit3') { buyBuilding(2); return; }
      if (e.code === 'Digit4') { buyBuilding(3); return; }
      if (e.code === 'Digit5') { buyBuilding(4); return; }
      if (e.code === 'Digit6') { buyBuilding(5); return; }
      if (e.code === 'Digit7') { buyBuilding(6); return; }
      if (e.code === 'Digit8') { buyBuilding(7); return; }
    } else if (currentTab === 'research') {
      if (e.code === 'Digit1') { selectTech(0); return; }
      if (e.code === 'Digit2') { selectTech(1); return; }
      if (e.code === 'Digit3') { selectTech(2); return; }
      if (e.code === 'Digit4') { selectTech(3); return; }
      if (e.code === 'Digit5') { selectTech(4); return; }
    }
  };

  // --- Pointer Events (shared mouse/touch) ---

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
      gameOverHud.onTouchStart(pos.x, pos.y, calculateScore());
      return;
    }

    if (!isStarted) return;

    // Tab buttons
    if (pos.y >= LAYOUT.tabAreaTop && pos.y < LAYOUT.tabAreaTop + LAYOUT.tabAreaHeight) {
      const tabWidth = (CANVAS_SIZE - 30) / 3;
      const tabIndex = Math.floor((pos.x - 15) / tabWidth);
      if (tabIndex === 0) { currentTab = 'build'; listScrollOffset = 0; }
      else if (tabIndex === 1) { currentTab = 'research'; listScrollOffset = 0; }
      else if (tabIndex === 2) { currentTab = 'info'; listScrollOffset = 0; }
      return;
    }

    // List area
    if (pos.y >= LAYOUT.listAreaTop && pos.y < LAYOUT.listAreaTop + LAYOUT.listAreaHeight) {
      if (currentTab === 'build') {
        const rowHeight = 33;
        const relY = pos.y - LAYOUT.listAreaTop + listScrollOffset;
        const rowIndex = Math.floor(relY / rowHeight);
        if (rowIndex >= 0 && rowIndex < BUILDINGS.length) {
          buyBuilding(rowIndex);
        }
      } else if (currentTab === 'research') {
        const rowHeight = 52;
        const relY = pos.y - LAYOUT.listAreaTop + listScrollOffset;
        const rowIndex = Math.floor(relY / rowHeight);
        if (rowIndex >= 0 && rowIndex < TECHS.length) {
          if (!techUnlocked[rowIndex]) {
            selectTech(rowIndex);
          }
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
      const decayMult = getDecayMultiplier();
      for (let i = 0; i < RESOURCES.length; i++) {
        const res = RESOURCES[i];
        const production = getResourceProduction(res.id);
        const decay = population * res.decayPerPerson * decayMult;
        resourceValues[i] += (production - decay) * dt;
        resourceValues[i] = Math.max(0, Math.min(res.max, resourceValues[i]));
      }

      // Gold from miners
      gold += getGoldProduction() * dt;

      // Research points from labs
      const rpProduction = getResearchProduction();
      if (rpProduction > 0 && selectedTechIndex >= 0 && selectedTechIndex < TECHS.length && !techUnlocked[selectedTechIndex]) {
        researchPoints += rpProduction * dt;
        if (researchPoints >= TECHS[selectedTechIndex].rpCost) {
          researchPoints -= TECHS[selectedTechIndex].rpCost;
          techUnlocked[selectedTechIndex] = true;
          addEvent(`${TECHS[selectedTechIndex].name} 연구 완료!`, 'positive');
          // Auto-select next tech
          for (let i = 0; i < TECHS.length; i++) {
            if (!techUnlocked[i]) {
              selectedTechIndex = i;
              break;
            }
          }
        }
      }

      // Population growth/shrink
      const allAbove30 = resourceValues.every((v) => v > 30);
      const anyBelow10 = resourceValues.some((v) => v < 10);

      if (allAbove30) {
        popGrowthTimer += dt;
        if (popGrowthTimer >= POP_GROWTH_INTERVAL) {
          popGrowthTimer -= POP_GROWTH_INTERVAL;
          const cap = getPopCap();
          if (population < cap) {
            population++;
          }
        }
      } else {
        popGrowthTimer = 0;
      }

      if (anyBelow10) {
        popShrinkTimer += dt;
        if (popShrinkTimer >= POP_SHRINK_INTERVAL) {
          popShrinkTimer -= POP_SHRINK_INTERVAL;
          if (population > 1) {
            population--;
          }
        }
      } else {
        popShrinkTimer = 0;
      }

      // Random events
      if (timeRemaining <= nextEventTime) {
        triggerRandomEvent();
        nextEventTime = timeRemaining - (EVENT_INTERVAL_MIN + Math.random() * (EVENT_INTERVAL_MAX - EVENT_INTERVAL_MIN));
      }

      // Event log fade
      if (eventLog) {
        eventLog.time -= dt;
        if (eventLog.time <= 1) {
          eventLogFade = Math.max(0, eventLog.time);
        }
        if (eventLog.time <= 0) {
          eventLog = null;
          eventLogFade = 0;
        }
      }
    }
  };

  // --- Render ---

  const drawBackground = () => {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  };

  const drawHeader = () => {
    const pad = 12;
    const y = LAYOUT.headerHeight / 2;

    // Population
    ctx.save();
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`\uD83D\uDC64 ${population}/${getPopCap()}`, pad, y - 8);

    // Workers
    ctx.font = '12px sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(`\uD83D\uDEE0 ${getWorkersUsed()}/${population}`, pad, y + 10);

    // Gold (center)
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.textAlign = 'center';
    ctx.fillText(`\uD83D\uDCB0 ${formatGold(gold)}`, CANVAS_SIZE / 2, y);

    // Timer (right)
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = Math.floor(timeRemaining % 60);
    const timeStr = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = timeRemaining <= 60 ? COLORS.critical : COLORS.text;
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, CANVAS_SIZE - pad, y);
    ctx.restore();
  };

  const drawResourceBars = () => {
    const pad = 15;
    const barW = CANVAS_SIZE - pad * 2;
    const barH = 20;
    const gap = 5;
    const startY = LAYOUT.resourceBarsTop;

    ctx.save();
    for (let i = 0; i < RESOURCES.length; i++) {
      const res = RESOURCES[i];
      const val = resourceValues[i];
      const y = startY + i * (barH + gap);
      const pct = val / res.max;
      const production = getResourceProduction(res.id);
      const decay = population * res.decayPerPerson * getDecayMultiplier();
      const netRate = production - decay;

      // Bar background
      drawRoundRect(ctx, pad, y, barW, barH, 4);
      ctx.fillStyle = '#111828';
      ctx.fill();

      // Bar fill
      let barColor = res.color;
      if (val < 10) barColor = COLORS.critical;
      else if (val < 30) barColor = COLORS.warning;

      const fillW = Math.max(0, barW * pct);
      if (fillW > 0) {
        drawRoundRect(ctx, pad, y, fillW, barH, 4);
        ctx.fillStyle = barColor;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Icon + value
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${res.icon} ${Math.floor(val)}%`, pad + 6, y + barH / 2);

      // Net rate
      ctx.font = '11px sans-serif';
      ctx.fillStyle = netRate >= 0 ? COLORS.positive : COLORS.negative;
      ctx.textAlign = 'right';
      const rateStr = (netRate >= 0 ? '+' : '') + netRate.toFixed(1) + '/s';
      ctx.fillText(rateStr, CANVAS_SIZE - pad - 4, y + barH / 2);
    }
    ctx.restore();
  };

  const drawColonyView = () => {
    const pad = 15;
    const startY = LAYOUT.colonyViewTop;
    const viewW = CANVAS_SIZE - pad * 2;
    const viewH = LAYOUT.colonyViewHeight;

    // Background
    drawRoundRect(ctx, pad, startY, viewW, viewH, 8);
    ctx.fillStyle = COLORS.panelBg;
    ctx.fill();
    ctx.strokeStyle = COLORS.panelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();

    // Draw building grid: 4x2
    const cols = 4;
    const rows = 2;
    const cellW = viewW / cols;
    const cellH = viewH / rows;

    for (let i = 0; i < BUILDINGS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = pad + col * cellW + cellW / 2;
      const cy = startY + row * cellH + cellH / 2;
      const def = BUILDINGS[i];
      const level = buildingLevels[i];

      if (level > 0) {
        // Building icon
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.icon, cx, cy - 10);

        // Level
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = COLORS.gold;
        ctx.fillText(`Lv.${level}`, cx, cy + 16);

        // Name
        ctx.font = '10px sans-serif';
        ctx.fillStyle = COLORS.textDim;
        ctx.fillText(def.name, cx, cy + 30);
      } else {
        // Empty slot
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLORS.locked;
        ctx.fillText('--', cx, cy - 5);

        ctx.font = '10px sans-serif';
        ctx.fillText(def.name, cx, cy + 16);
      }
    }

    ctx.restore();
  };

  const drawEventLog = () => {
    if (!eventLog) return;

    ctx.save();
    ctx.globalAlpha = eventLogFade;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const y = LAYOUT.eventLogTop + LAYOUT.eventLogHeight / 2;

    if (eventLog.type === 'positive') ctx.fillStyle = COLORS.positive;
    else if (eventLog.type === 'negative') ctx.fillStyle = COLORS.negative;
    else ctx.fillStyle = COLORS.textDim;

    ctx.fillText(eventLog.message, CANVAS_SIZE / 2, y);
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  const drawTabs = () => {
    const pad = 15;
    const tabW = (CANVAS_SIZE - pad * 2 - 10) / 3;
    const tabH = LAYOUT.tabAreaHeight - 5;
    const y = LAYOUT.tabAreaTop;

    const tabs: { id: TTab; label: string }[] = [
      { id: 'build', label: '\uD83D\uDEE0 \uAC74\uC124' },
      { id: 'research', label: '\uD83D\uDD2C \uC5F0\uAD6C' },
      { id: 'info', label: '\uD83D\uDCCA \uC815\uBCF4' },
    ];

    ctx.save();
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const x = pad + i * (tabW + 5);

      drawRoundRect(ctx, x, y, tabW, tabH, 6);
      ctx.fillStyle = currentTab === tab.id ? COLORS.tabActive : COLORS.tabInactive;
      ctx.fill();

      if (currentTab === tab.id) {
        ctx.strokeStyle = COLORS.tabActive;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = currentTab === tab.id ? '#ffffff' : COLORS.textDim;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tab.label, x + tabW / 2, y + tabH / 2);
    }
    ctx.restore();
  };

  const drawBuildList = () => {
    const pad = 15;
    const startY = LAYOUT.listAreaTop;
    const rowH = 33;
    const availW = CANVAS_SIZE - pad * 2;

    ctx.save();

    // Clip
    ctx.beginPath();
    ctx.rect(pad, startY, availW, LAYOUT.listAreaHeight);
    ctx.clip();

    for (let i = 0; i < BUILDINGS.length; i++) {
      const def = BUILDINGS[i];
      const level = buildingLevels[i];
      const y = startY + i * rowH - listScrollOffset;
      if (y + rowH < startY || y > startY + LAYOUT.listAreaHeight) continue;

      const cost = getBuildingCost(i);
      const workersForNew = getWorkersForNewLevel(i);
      const canBuy = gold >= cost && workersForNew <= getAvailableWorkers() && level < def.maxLevel;
      const atMax = level >= def.maxLevel;

      // Row bg
      drawRoundRect(ctx, pad, y, availW, rowH - 3, 4);
      ctx.fillStyle = canBuy ? '#1a2a35' : '#111828';
      ctx.fill();
      ctx.strokeStyle = canBuy ? '#2a4a5a' : '#1a2230';
      ctx.lineWidth = 1;
      ctx.stroke();

      const rowCy = y + (rowH - 3) / 2;

      // Key hint
      ctx.font = '10px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`[${i + 1}]`, pad + 4, rowCy);

      // Icon + name
      ctx.font = '12px sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.fillText(`${def.icon} ${def.name}`, pad + 28, rowCy);

      // Level
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = COLORS.gold;
      ctx.textAlign = 'center';
      ctx.fillText(`Lv.${level}`, pad + 140, rowCy);

      // Workers needed
      if (def.workersNeeded > 0) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = COLORS.textDim;
        ctx.fillText(`\uD83D\uDC64${getWorkersNeededForBuilding(i)}`, pad + 180, rowCy);
      }

      // Effect info
      ctx.font = '10px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'center';
      let effectStr = '';
      if (def.effectType === 'oxygen') effectStr = `+${def.effectPerLevel}/s O\u2082`;
      else if (def.effectType === 'energy') effectStr = `+${def.effectPerLevel}/s \u26A1`;
      else if (def.effectType === 'food') effectStr = `+${def.effectPerLevel}/s \uD83C\uDF3E`;
      else if (def.effectType === 'popcap') effectStr = `+${def.effectPerLevel} cap`;
      else if (def.effectType === 'research') effectStr = `+${def.effectPerLevel} RP/s`;
      else if (def.effectType === 'gold') effectStr = `+${def.effectPerLevel}G/s`;
      else if (def.effectType === 'shield') effectStr = 'Protect';
      else if (def.effectType === 'allboost') effectStr = '+20% all';
      ctx.fillText(effectStr, pad + 240, rowCy);

      // Buy button
      const btnW = 100;
      const btnH = rowH - 10;
      const btnX = pad + availW - btnW - 4;
      const btnY = y + 3;

      drawRoundRect(ctx, btnX, btnY, btnW, btnH, 4);
      if (atMax) {
        ctx.fillStyle = '#2a2a3a';
        ctx.fill();
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = COLORS.textDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('MAX', btnX + btnW / 2, btnY + btnH / 2);
      } else {
        ctx.fillStyle = canBuy ? COLORS.buyable : '#2a3a4a';
        ctx.fill();
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = canBuy ? '#ffffff' : COLORS.textDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${formatGold(cost)}G`, btnX + btnW / 2, btnY + btnH / 2);
      }
    }

    ctx.restore();
  };

  const drawResearchList = () => {
    const pad = 15;
    const startY = LAYOUT.listAreaTop;
    const rowH = 52;
    const availW = CANVAS_SIZE - pad * 2;

    ctx.save();

    ctx.beginPath();
    ctx.rect(pad, startY, availW, LAYOUT.listAreaHeight);
    ctx.clip();

    const rpProd = getResearchProduction();

    for (let i = 0; i < TECHS.length; i++) {
      const tech = TECHS[i];
      const unlocked = techUnlocked[i];
      const isSelected = selectedTechIndex === i && !unlocked;
      const y = startY + i * rowH - listScrollOffset;
      if (y + rowH < startY || y > startY + LAYOUT.listAreaHeight) continue;

      // Row bg
      drawRoundRect(ctx, pad, y, availW, rowH - 4, 6);
      if (unlocked) {
        ctx.fillStyle = '#1a2a3a';
        ctx.fill();
        ctx.strokeStyle = COLORS.techUnlocked;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (isSelected) {
        ctx.fillStyle = '#1a2235';
        ctx.fill();
        ctx.strokeStyle = COLORS.tabActive;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#111828';
        ctx.fill();
        ctx.strokeStyle = '#1a2230';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const rowTop = y + 6;

      // Key hint
      ctx.font = '10px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`[${i + 1}]`, pad + 6, rowTop);

      // Name
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = unlocked ? COLORS.techUnlocked : COLORS.text;
      ctx.fillText(tech.name, pad + 28, rowTop);

      // Status
      if (unlocked) {
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = COLORS.techUnlocked;
        ctx.textAlign = 'right';
        ctx.fillText('\u2713 DONE', pad + availW - 10, rowTop);
      } else {
        ctx.font = '11px sans-serif';
        ctx.fillStyle = COLORS.textDim;
        ctx.textAlign = 'right';
        ctx.fillText(`${tech.rpCost} RP`, pad + availW - 10, rowTop);
      }

      // Description
      ctx.font = '11px sans-serif';
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'left';
      ctx.fillText(tech.description, pad + 28, rowTop + 16);

      // Progress bar (if selected and not unlocked)
      if (isSelected && !unlocked) {
        const barX = pad + 28;
        const barY = rowTop + 30;
        const barW = availW - 50;
        const barH = 8;
        const pct = Math.min(1, researchPoints / tech.rpCost);

        drawRoundRect(ctx, barX, barY, barW, barH, 3);
        ctx.fillStyle = '#0a0e1a';
        ctx.fill();

        if (pct > 0) {
          drawRoundRect(ctx, barX, barY, barW * pct, barH, 3);
          ctx.fillStyle = COLORS.tabActive;
          ctx.fill();
        }

        ctx.font = '9px sans-serif';
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.floor(researchPoints)}/${tech.rpCost}  (${rpProd.toFixed(1)} RP/s)`, barX + barW / 2, barY + barH / 2);
      }
    }

    ctx.restore();
  };

  const drawInfoPanel = () => {
    const pad = 15;
    const startY = LAYOUT.listAreaTop;
    const availW = CANVAS_SIZE - pad * 2;
    const lineH = 22;
    let y = startY + 10;

    ctx.save();

    // Background
    drawRoundRect(ctx, pad, startY, availW, LAYOUT.listAreaHeight, 8);
    ctx.fillStyle = COLORS.panelBg;
    ctx.fill();

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = COLORS.tabActive;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('\uD83D\uDCCA \uC2DD\uBBFC\uC9C0 \uC815\uBCF4', pad + 12, y);
    y += lineH + 4;

    const info: [string, string][] = [
      ['\uD83D\uDC64 \uC778\uAD6C', `${population} / ${getPopCap()}`],
      ['\uD83D\uDEE0 \uC778\uB825', `${getWorkersUsed()} \uC0AC\uC6A9 / ${getAvailableWorkers()} \uC5EC\uC720`],
      ['\uD83D\uDCB0 \uAC31\uB4DC \uC218\uC785', `+${getGoldProduction().toFixed(1)}G/s`],
      ['O\u2082 \uC0DD\uC0B0', `+${getResourceProduction('oxygen').toFixed(1)}/s`],
      ['\u26A1 \uC0DD\uC0B0', `+${getResourceProduction('energy').toFixed(1)}/s`],
      ['\uD83C\uDF3E \uC0DD\uC0B0', `+${getResourceProduction('food').toFixed(1)}/s`],
      ['\uD83D\uDD2C \uC5F0\uAD6C \uC18D\uB3C4', `${getResearchProduction().toFixed(1)} RP/s`],
      ['\uD83C\uDF1F \uC5F0\uAD6C \uC644\uB8CC', `${techUnlocked.filter((t) => t).length} / ${TECHS.length}`],
      ['\uD83D\uDEE1 \uBC29\uC5B4\uB9C9', buildingLevels[6] > 0 ? '\uD65C\uC131\uD654' : '\uBBF8\uAC74\uC124'],
      ['\uD83D\uDE80 \uC6B0\uC8FC\uD56D\uAD6C', buildingLevels[7] > 0 ? '+20% \uBCF4\uB108\uC2A4' : '\uBBF8\uAC74\uC124'],
    ];

    ctx.font = '12px sans-serif';
    for (const [label, value] of info) {
      ctx.fillStyle = COLORS.textDim;
      ctx.textAlign = 'left';
      ctx.fillText(label, pad + 12, y);

      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'right';
      ctx.fillText(value, pad + availW - 12, y);

      y += lineH;
    }

    // Score preview
    y += 10;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = COLORS.gold;
    ctx.textAlign = 'left';
    ctx.fillText('\uD83C\uDFC6 \uC608\uC0C1 \uC810\uC218', pad + 12, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatGold(calculateScore()), pad + availW - 12, y);

    ctx.restore();
  };

  const render = () => {
    drawBackground();

    if (!isStarted) return;
    if (isGameOver) return;

    drawHeader();
    drawResourceBars();
    drawColonyView();
    drawEventLog();
    drawTabs();

    if (currentTab === 'build') {
      drawBuildList();
    } else if (currentTab === 'research') {
      drawResearchList();
    } else {
      drawInfoPanel();
    }
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
      gameOverHud.render(calculateScore());
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
