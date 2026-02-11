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
  MAP_WIDTH,
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  INITIAL_GOLD,
  WAVE_PREP_TIME,
  ENEMY_SPAWN_INTERVAL,
  WAVE_BASE_REWARD,
  WAVE_REWARD_INCREMENT,
  BOSS_WAVE_INTERVAL,
  MAX_ENEMIES_ON_SCREEN,
  getPathCells,
} from './config';
import {
  TPlacedUnit,
  TEnemy,
  TProjectile,
  TParticle,
  TFloatingText,
  TScreenShake,
  TDragState,
  TWaveState,
  TGameState,
} from './types';
import {
  summonRandomUnit,
  getSummonCost,
  createPlacedUnit,
  canMerge,
  mergeResult,
  getSellValue,
  resetUnitIdCounter,
} from './units';
import {
  getWaveComposition,
  createEnemy,
  moveEnemy,
  resetEnemyIdCounter,
} from './enemies';
import {
  processUnitAttacks,
  applyDamage,
  applySplashDamage,
  applyBuffAuras,
  applySlowAuras,
  applyDebuffAuras,
  moveProjectile,
  resetProjectileIdCounter,
} from './combat';
import {
  spawnSummonParticles,
  spawnMergeParticles,
  spawnKillParticles,
  spawnBossEntryParticles,
  spawnGoldText,
  spawnWaveText,
  triggerScreenShake,
  getShakeOffset,
  updateScreenShake,
  updateParticles,
  updateFloatingTexts,
} from './effects';
import {
  drawBackground,
  drawPath,
  drawStage,
  drawGrid,
  drawUnit,
  drawEnemy,
  drawProjectile,
  drawParticles,
  drawFloatingTexts,
  drawTopHud,
  drawPanel,
  drawDragGhost,
} from './renderer';
import { createSoundSystem } from './sounds';

// ─── Callbacks type ───

export type TRandomDefenseCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

// ─── Main Setup ───

export function setupRandomDefense(
  canvas: HTMLCanvasElement,
  callbacks?: TRandomDefenseCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) return () => {};

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // Precompute path cells
  const pathCells = getPathCells();

  // Sound system
  const sounds = createSoundSystem();
  let lastShootSoundTime = 0;

  // ─── Game State ───
  let state: TGameState = 'start';
  let score = 0;
  let gold = INITIAL_GOLD;
  let summonCount = 0;

  let units: TPlacedUnit[] = [];
  let enemies: TEnemy[] = [];
  let projectiles: TProjectile[] = [];
  let particles: TParticle[] = [];
  let floatingTexts: TFloatingText[] = [];
  const screenShake: TScreenShake = { timer: 0, intensity: 0 };

  let selectedUnitId: number | null = null;
  let dragState: TDragState = null;

  let waveState: TWaveState = {
    wave: 0,
    phase: 'prep',
    prepTimer: WAVE_PREP_TIME,
    spawnTimer: 0,
    spawnQueue: [],
    spawnIndex: 0,
  };

  let lastTime = 0;
  let animationId = 0;

  // ─── Game Over HUD ───
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
    'randomdefense',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // ─── Helpers ───

  function getCanvasPos(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }

  function gridFromPixel(px: number, py: number): { col: number; row: number } | null {
    const col = Math.floor((px - GRID_OFFSET_X) / CELL_SIZE);
    const row = Math.floor((py - GRID_OFFSET_Y) / CELL_SIZE);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row };
  }

  function isValidPlacement(col: number, row: number): boolean {
    if (pathCells.has(`${col},${row}`)) return false;
    if (units.some((u) => u.gridCol === col && u.gridRow === row)) return false;
    // Must be in map area
    const px = GRID_OFFSET_X + col * CELL_SIZE + CELL_SIZE / 2;
    if (px >= MAP_WIDTH) return false;
    return true;
  }

  function findEmptyCell(): { col: number; row: number } | null {
    // Try random positions first, then systematic
    for (let attempt = 0; attempt < 100; attempt++) {
      const col = Math.floor(Math.random() * GRID_COLS);
      const row = Math.floor(Math.random() * GRID_ROWS);
      if (isValidPlacement(col, row)) return { col, row };
    }
    // Systematic fallback
    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        if (isValidPlacement(col, row)) return { col, row };
      }
    }
    return null;
  }

  // ─── Actions ───

  function summonUnit() {
    if (state !== 'playing') return;
    const cost = getSummonCost(summonCount);
    if (gold < cost) return;

    const cell = findEmptyCell();
    if (!cell) return;

    gold -= cost;
    summonCount++;

    const def = summonRandomUnit();
    const unit = createPlacedUnit(def, cell.col, cell.row);
    units.push(unit);

    // Effects
    particles.push(...spawnSummonParticles(unit.x, unit.y, def.color));
    sounds.playSummon(def.tier);

    // Recalc buffs
    applyBuffAuras(units);
  }

  function sellUnit(unitId: number) {
    const idx = units.findIndex((u) => u.id === unitId);
    if (idx === -1) return;
    const unit = units[idx];
    const value = getSellValue(unit);
    gold += value;
    floatingTexts.push(spawnGoldText(unit.x, unit.y, value));
    units.splice(idx, 1);
    if (selectedUnitId === unitId) selectedUnitId = null;
    applyBuffAuras(units);
  }

  function tryMerge(draggedUnit: TPlacedUnit, targetUnit: TPlacedUnit): boolean {
    if (!canMerge(draggedUnit, targetUnit)) return false;

    const newDef = mergeResult(draggedUnit.def);
    const targetIdx = units.findIndex((u) => u.id === targetUnit.id);
    const dragIdx = units.findIndex((u) => u.id === draggedUnit.id);

    // Remove both
    const idsToRemove = [draggedUnit.id, targetUnit.id];
    units = units.filter((u) => !idsToRemove.includes(u.id));

    // Create merged unit at target position
    const merged = createPlacedUnit(newDef, targetUnit.gridCol, targetUnit.gridRow);
    units.push(merged);
    selectedUnitId = merged.id;

    // Effects
    particles.push(...spawnMergeParticles(merged.x, merged.y, newDef.color));
    triggerScreenShake(screenShake, 3);
    sounds.playMerge(newDef.tier);
    applyBuffAuras(units);

    return true;
  }

  // ─── Wave System ───

  function startNextWave() {
    waveState.wave++;
    score += waveState.wave; // wave-based scoring
    const composition = getWaveComposition(waveState.wave);
    waveState.spawnQueue = composition;
    waveState.spawnIndex = 0;
    waveState.phase = 'spawning';
    waveState.spawnTimer = 0;

    // Reward gold
    const reward = WAVE_BASE_REWARD + waveState.wave * WAVE_REWARD_INCREMENT;
    gold += reward;
    floatingTexts.push(spawnGoldText(MAP_WIDTH / 2, 80, reward));

    // Wave text
    floatingTexts.push(spawnWaveText(waveState.wave, MAP_WIDTH));
    sounds.playWaveStart();

    // Boss wave shake
    if (waveState.wave % BOSS_WAVE_INTERVAL === 0) {
      triggerScreenShake(screenShake, 8);
    }
  }

  function updateWave(dt: number) {
    if (waveState.phase === 'prep') {
      waveState.prepTimer -= dt;
      if (waveState.prepTimer <= 0) {
        startNextWave();
      }
    } else if (waveState.phase === 'spawning') {
      waveState.spawnTimer += dt;
      if (waveState.spawnTimer >= ENEMY_SPAWN_INTERVAL) {
        waveState.spawnTimer -= ENEMY_SPAWN_INTERVAL;
        if (waveState.spawnIndex < waveState.spawnQueue.length) {
          const type = waveState.spawnQueue[waveState.spawnIndex];
          const enemy = createEnemy(type, waveState.wave);
          enemies.push(enemy);

          if (type === 'boss') {
            particles.push(...spawnBossEntryParticles(enemy.x, enemy.y));
            triggerScreenShake(screenShake, 10);
            sounds.playBossEntry();
          }

          waveState.spawnIndex++;
        }
        if (waveState.spawnIndex >= waveState.spawnQueue.length) {
          // All enemies spawned, prep next wave
          waveState.phase = 'prep';
          waveState.prepTimer = WAVE_PREP_TIME;
        }
      }
    }
  }

  // ─── Update ───

  function update(dt: number) {
    if (state !== 'playing') return;

    // Wave system
    updateWave(dt);

    // Apply slow/debuff auras (before moving enemies)
    applySlowAuras(units, enemies);
    applyDebuffAuras(units, enemies);

    // Move enemies (loop around the oval path)
    for (const enemy of enemies) {
      moveEnemy(enemy, dt);
    }

    // Game over: too many enemies on screen
    if (enemies.length >= MAX_ENEMIES_ON_SCREEN) {
      triggerGameOver();
      return;
    }

    // Unit attacks
    applyBuffAuras(units);
    const newProjectiles = processUnitAttacks(units, enemies, dt);
    if (newProjectiles.length > 0) {
      const now = performance.now() / 1000;
      if (now - lastShootSoundTime >= 0.1) {
        sounds.playShoot();
        lastShootSoundTime = now;
      }
    }
    projectiles.push(...newProjectiles);

    // Move projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      const hit = moveProjectile(proj, enemies, dt);
      if (hit) {
        const target = enemies.find((e) => e.id === proj.targetId);
        if (target && target.hp > 0) {
          const killed = applyDamage(target, proj.damage);

          // Apply splash
          if (proj.splashRadius && proj.splashDamage) {
            const splashKills = applySplashDamage(
              { x: target.x, y: target.y },
              proj.splashRadius,
              proj.splashDamage,
              enemies,
              target.id,
            );
            for (const killId of splashKills) {
              handleEnemyKill(enemies.find((e) => e.id === killId)!);
            }
          }

          if (killed) {
            handleEnemyKill(target);
          }
        }
        projectiles.splice(i, 1);
      }
    }

    // Remove dead enemies
    enemies = enemies.filter((e) => e.hp > 0);

    // Effects
    updateParticles(particles, dt);
    updateFloatingTexts(floatingTexts, dt);
    updateScreenShake(screenShake, dt);
  }

  function handleEnemyKill(enemy: TEnemy) {
    gold += enemy.gold;
    score += enemy.type === 'boss' ? 50 : 5;
    particles.push(...spawnKillParticles(enemy.x, enemy.y, '#ef4444'));
    if (enemy.gold > 0) {
      floatingTexts.push(spawnGoldText(enemy.x, enemy.y, enemy.gold));
      sounds.playGold();
    }
    if (enemy.type === 'boss') {
      triggerScreenShake(screenShake, 6);
      sounds.playBossKill();
    } else {
      sounds.playKill();
    }
  }

  // ─── Render ───

  function render() {
    ctx.save();

    // Apply screen shake
    const shake = getShakeOffset(screenShake);
    ctx.translate(shake.x, shake.y);

    drawBackground(ctx);
    drawPath(ctx);
    drawStage(ctx);
    drawGrid(ctx);

    // Units (skip dragging unit)
    for (const unit of units) {
      if (dragState && unit.id === dragState.unitId) continue;
      drawUnit(ctx, unit, unit.id === selectedUnitId);
    }

    // Enemies
    for (const enemy of enemies) {
      drawEnemy(ctx, enemy);
    }

    // Projectiles
    for (const proj of projectiles) {
      drawProjectile(ctx, proj);
    }

    // Particles & texts
    drawParticles(ctx, particles);
    drawFloatingTexts(ctx, floatingTexts);

    // Top HUD
    drawTopHud(ctx, waveState.wave, gold, score, enemies.length);

    // Right panel (no shake)
    ctx.restore();
    drawPanel(ctx, gold, summonCount, units.find((u) => u.id === selectedUnitId) ?? null, units.length, waveState, enemies.length);

    // Drag ghost (no shake)
    drawDragGhost(ctx, dragState, units);

    // Overlays
    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
    } else if (state === 'start') {
      gameStartHud(canvas, ctx);
    } else if (state === 'paused') {
      gamePauseHud(canvas, ctx);
    } else if (state === 'gameover') {
      gameOverHud.render(score);
    }
  }

  // ─── Reset ───

  function resetGame() {
    state = 'start';
    score = 0;
    gold = INITIAL_GOLD;
    summonCount = 0;
    units = [];
    enemies = [];
    projectiles = [];
    particles = [];
    floatingTexts = [];
    screenShake.timer = 0;
    screenShake.intensity = 0;
    selectedUnitId = null;
    dragState = null;
    waveState = {
      wave: 0,
      phase: 'prep',
      prepTimer: WAVE_PREP_TIME,
      spawnTimer: 0,
      spawnQueue: [],
      spawnIndex: 0,
    };
    resetUnitIdCounter();
    resetEnemyIdCounter();
    resetProjectileIdCounter();
    gameOverHud.reset();
  }

  // ─── Start ───

  async function startGame() {
    if (state !== 'start') return;
    sounds.resume();
    state = 'loading';
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    state = 'playing';
  }

  function triggerGameOver() {
    state = 'gameover';
    sounds.playGameOver();
  }

  // ─── Game Loop ───

  function gameLoop(timestamp: number) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render();

    animationId = requestAnimationFrame(gameLoop);
  }

  // ─── Input: Keyboard ───

  function handleKeyDown(e: KeyboardEvent) {
    if (e.repeat) return;

    // Game over HUD handles keys first
    if (state === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    switch (e.code) {
      case 'KeyS':
        if (state === 'start') {
          startGame();
        } else if (state === 'paused') {
          state = 'playing';
        }
        break;
      case 'KeyP':
        if (state === 'playing') {
          state = 'paused';
        } else if (state === 'paused') {
          state = 'playing';
        }
        break;
      case 'KeyR':
        if (state !== 'gameover') {
          resetGame();
        }
        break;
      case 'Space':
      case 'KeyD':
        e.preventDefault();
        summonUnit();
        break;
      case 'Delete':
      case 'Backspace':
        if (selectedUnitId !== null) {
          sellUnit(selectedUnitId);
        }
        break;
    }
  }

  // ─── Input: Mouse ───

  function handleMouseDown(e: MouseEvent) {
    if (state !== 'playing') return;
    const pos = getCanvasPos(e.clientX, e.clientY);

    // Right click: sell selected unit
    if (e.button === 2) {
      const grid = gridFromPixel(pos.x, pos.y);
      if (grid) {
        const unit = units.find((u) => u.gridCol === grid.col && u.gridRow === grid.row);
        if (unit) {
          sellUnit(unit.id);
        }
      }
      return;
    }

    // Left click in map area: select or start drag
    if (pos.x < MAP_WIDTH) {
      const grid = gridFromPixel(pos.x, pos.y);
      if (grid) {
        const unit = units.find((u) => u.gridCol === grid.col && u.gridRow === grid.row);
        if (unit) {
          selectedUnitId = unit.id;
          dragState = {
            unitId: unit.id,
            originCol: unit.gridCol,
            originRow: unit.gridRow,
            mouseX: pos.x,
            mouseY: pos.y,
          };
        } else {
          selectedUnitId = null;
        }
      } else {
        selectedUnitId = null;
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!dragState || state !== 'playing') return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    dragState.mouseX = pos.x;
    dragState.mouseY = pos.y;
  }

  function handleMouseUp(e: MouseEvent) {
    if (!dragState || state !== 'playing') {
      dragState = null;
      return;
    }

    const pos = getCanvasPos(e.clientX, e.clientY);
    const grid = gridFromPixel(pos.x, pos.y);
    const draggedUnit = units.find((u) => u.id === dragState!.unitId);

    if (!draggedUnit || !grid) {
      // Snap back
      dragState = null;
      return;
    }

    // Check if dropped on another unit
    const targetUnit = units.find(
      (u) => u.gridCol === grid.col && u.gridRow === grid.row && u.id !== dragState!.unitId,
    );

    if (targetUnit) {
      // Try merge
      const merged = tryMerge(draggedUnit, targetUnit);
      if (!merged) {
        // Can't merge, snap back
      }
    } else if (
      grid.col !== dragState.originCol ||
      grid.row !== dragState.originRow
    ) {
      // Move to empty cell
      if (isValidPlacement(grid.col, grid.row)) {
        draggedUnit.gridCol = grid.col;
        draggedUnit.gridRow = grid.row;
        draggedUnit.x = GRID_OFFSET_X + grid.col * CELL_SIZE + CELL_SIZE / 2;
        draggedUnit.y = GRID_OFFSET_Y + grid.row * CELL_SIZE + CELL_SIZE / 2;
        applyBuffAuras(units);
      }
    }

    dragState = null;
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
  }

  // ─── Setup Event Listeners ───

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('keydown', handleKeyDown);

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // ─── Cleanup ───
  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('contextmenu', handleContextMenu);
    window.removeEventListener('keydown', handleKeyDown);
    sounds.dispose();
  };
}
