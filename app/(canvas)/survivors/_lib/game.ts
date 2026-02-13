import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { TGameState, TLevelUpChoice } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config';
import { createPlayer, updatePlayer, renderPlayer, damagePlayer, getPassiveBonus } from './player';
import { createCamera, updateCamera } from './camera';
import { createEnemyPool, updateEnemies, renderEnemies, damageEnemy } from './enemies';
import {
  createProjectilePool,
  updateWeapons,
  updateProjectiles,
  renderProjectiles,
  checkEvolution,
} from './weapons';
import { createGemPool, updateGems, renderGems, spawnGem } from './items';
import { createWaveManager, updateWaves } from './waves';
import { generateChoices, applyChoice, renderLevelUpUI, handleLevelUpInput } from './levelup';
import { renderBackground, renderDecorations, renderHUD } from './renderer';
import { buildSpatialHash, queryNearby, circleCollision } from './collision';
import { forEachActive, deactivate } from './pool';

// ─── Callback Type ───

export type TSurvivorsCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

// ─── Main Entry Point ───

export function setupSurvivors(
  canvas: HTMLCanvasElement,
  callbacks?: TSurvivorsCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // === Game State ===
  let state: TGameState = 'start';
  let animationId = 0;
  let lastTime = 0;
  let elapsed = 0;

  // === Game Objects ===
  let player = createPlayer();
  const camera = createCamera();
  let enemyPool = createEnemyPool();
  let projectilePool = createProjectilePool();
  let gemPool = createGemPool();
  let waveManager = createWaveManager();
  let levelUpChoices: TLevelUpChoice[] = [];
  const keys = new Set<string>();

  // === Game Over HUD (KAME pattern) ===
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (score) => {
      if (callbacks?.onScoreSave) return callbacks.onScoreSave(score);
      return { saved: false };
    },
    onRestart: () => resetGame(),
  };
  const gameOverHud = createGameOverHud(canvas, ctx, 'survivors', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  // === Keyboard Handler (e.code, NOT e.key!) ===
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    // Game over HUD gets priority
    if (state === 'gameover') {
      gameOverHud.onKeyDown(e, Math.floor(elapsed));
      return;
    }

    switch (e.code) {
      case 'KeyS':
        if (state === 'start') startGame();
        else if (state === 'paused') state = 'playing';
        break;
      case 'KeyP':
        if (state === 'playing') state = 'paused';
        break;
      case 'KeyR':
        resetGame();
        break;
      default:
        // Level-up choices
        if (state === 'levelup') {
          const idx = handleLevelUpInput(e.code, levelUpChoices.length);
          if (idx >= 0) {
            applyChoice(player, levelUpChoices[idx]);
            state = 'playing';
          }
        }
        break;
    }

    // Always track movement keys
    keys.add(e.code);
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };

  // === Game Start ===
  async function startGame() {
    state = 'loading';
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    state = 'playing';
  }

  // === Game Reset ===
  function resetGame() {
    player = createPlayer();
    enemyPool = createEnemyPool();
    projectilePool = createProjectilePool();
    gemPool = createGemPool();
    waveManager = createWaveManager();
    levelUpChoices = [];
    elapsed = 0;
    keys.clear();
    gameOverHud.reset();
    state = 'start';
  }

  // === Main Update ===
  function update(dt: number) {
    if (state !== 'playing') return;

    elapsed += dt;

    // Player movement
    updatePlayer(player, keys, dt);
    updateCamera(camera, player);

    // HP recovery (pummarola passive)
    const pummarolaLevel = getPassiveBonus(player, 'pummarola');
    if (pummarolaLevel > 0 && player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + pummarolaLevel * 0.2 * dt);
    }

    // Waves (enemy spawning)
    updateWaves(waveManager, elapsed, dt, enemyPool, player.x, player.y);

    // Enemies (move toward player)
    updateEnemies(enemyPool, player.x, player.y, dt);

    // Weapons (auto-attack based on cooldowns)
    updateWeapons(player, enemyPool, projectilePool, dt);

    // Projectiles (movement, lifetime, special behaviors)
    updateProjectiles(projectilePool, enemyPool, dt, camera);

    // Collision: projectiles vs enemies
    const enemyHash = buildSpatialHash(enemyPool);
    forEachActive(projectilePool, (proj) => {
      const nearby = queryNearby(enemyHash, proj.x, proj.y, 100);
      for (const enemy of nearby) {
        if (!enemy.active) continue;
        if (circleCollision(proj.x, proj.y, proj.radius, enemy.x, enemy.y, enemy.radius)) {
          const killed = damageEnemy(enemy, proj.damage);
          if (killed) {
            // Enemy killed: drop gem and count kill
            spawnGem(gemPool, enemy.x, enemy.y, enemy.exp);
            player.kills++;
          }
          // Handle piercing
          if (proj.piercing === 0) {
            deactivate(proj);
            break;
          } else if (proj.piercing > 0) {
            proj.piercing--;
          }
          // piercing === -1 means infinite, don't deactivate
        }
      }
    });

    // Collision: enemies vs player
    forEachActive(enemyPool, (enemy) => {
      if (circleCollision(player.x, player.y, 12, enemy.x, enemy.y, enemy.radius)) {
        const isDead = damagePlayer(player, enemy.damage);
        if (isDead) {
          state = 'gameover';
        }
      }
    });

    // Items (gems): magnetize, pick up, level up
    const leveledUp = updateGems(gemPool, player, dt);
    if (leveledUp && state === 'playing') {
      levelUpChoices = generateChoices(player);
      if (levelUpChoices.length > 0) {
        state = 'levelup';
      }
    }

    // Check weapon evolution after level-up
    checkEvolution(player);
  }

  // === Main Render ===
  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (state === 'playing' || state === 'paused' || state === 'levelup' || state === 'gameover') {
      // World rendering (affected by camera)
      renderBackground(ctx, camera);
      renderDecorations(ctx, camera);
      renderGems(gemPool, ctx, camera);
      renderEnemies(enemyPool, ctx, camera);
      renderProjectiles(projectilePool, ctx, camera);
      renderPlayer(ctx, player, camera);

      // HUD (fixed screen position)
      renderHUD(ctx, player, elapsed, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Overlays
    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
    } else if (state === 'start') {
      gameStartHud(canvas, ctx);
    } else if (state === 'paused') {
      gamePauseHud(canvas, ctx);
    } else if (state === 'levelup') {
      renderLevelUpUI(ctx, levelUpChoices, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (state === 'gameover') {
      gameOverHud.render(Math.floor(elapsed));
    }
  }

  // === Game Loop ===
  function gameLoop(timestamp: number) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render();

    animationId = requestAnimationFrame(gameLoop);
  }

  // === Start ===
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // === Cleanup ===
  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}
