import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config';
import { TGameState } from './types';
import { createPlayer, updatePlayer, startDash, hitPlayer, renderPlayer, renderHP, renderDashCooldown, checkProjectileCollision, checkLaserCollision, checkAreaCollision, checkWallCollision, isPlayerInZone } from './player';
import { createBoss, updateBoss, renderBoss, renderPatterns, checkBossCollision } from './boss';
import { renderBackground, renderTimeHud } from './renderer';
import { loadAssets } from './assets';

export type TKustomCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn: boolean;
};

export function setupKustom(
  canvas: HTMLCanvasElement,
  callbacks: TKustomCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  let state: TGameState = 'start';
  let animationId = 0;
  let lastTime = 0;
  let elapsedTime = 0;

  let player = createPlayer();
  let boss = createBoss();
  const keys = new Set<string>();

  // Game Over HUD
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
    'kustom',
    gameOverCallbacks,
    { isLoggedIn: callbacks.isLoggedIn },
  );

  function resetGame(): void {
    state = 'start';
    elapsedTime = 0;
    lastTime = 0;
    player = createPlayer();
    boss = createBoss();
    keys.clear();
    gameOverHud.reset();
  }

  async function startGame(): Promise<void> {
    if (state !== 'start' && state !== 'paused') return;

    if (state === 'paused') {
      state = 'playing';
      return;
    }

    state = 'loading';
    await loadAssets();
    if (callbacks.onGameStart) {
      await callbacks.onGameStart();
    }
    state = 'playing';
    lastTime = 0;
  }

  function update(dt: number): void {
    elapsedTime += dt;

    // Check slow zones
    let speedMultiplier = 1.0;
    for (const ap of boss.activePatterns) {
      if (!ap.pattern) continue;
      if (isPlayerInZone(player, ap.state.zones, 'slow')) {
        speedMultiplier = 0.5;
        break;
      }
    }

    // Update player
    updatePlayer(player, dt, keys, speedMultiplier);

    // Update boss
    updateBoss(boss, dt, elapsedTime, { x: player.x, y: player.y });

    // Boss contact collision
    let wasHit = false;
    if (!player.isInvincible && checkBossCollision(boss, player.x, player.y)) {
      wasHit = true;
    }

    // Pattern collision detection
    for (const ap of boss.activePatterns) {
      if (!ap.pattern || wasHit) continue;
      const s = ap.state;

      // Projectile collision
      if (checkProjectileCollision(player, s.projectiles)) {
        wasHit = true;
      }

      // Laser collision
      if (!wasHit && checkLaserCollision(player, s.lasers)) {
        wasHit = true;
      }

      // Area collision
      if (!wasHit && s.areas.length > 0) {
        const isInOutPattern = ap.pattern.name === 'in-out';
        if (isInOutPattern) {
          const isInner = s.custom.isInner as boolean;
          if (checkAreaCollision(player, s.areas, isInner)) {
            wasHit = true;
          }
        } else {
          if (checkAreaCollision(player, s.areas)) {
            wasHit = true;
          }
        }
      }

      // Wall collision
      if (!wasHit && checkWallCollision(player, s.walls)) {
        wasHit = true;
      }

      // Damage zone collision
      if (!wasHit && isPlayerInZone(player, s.zones, 'damage')) {
        wasHit = true;
      }
    }

    if (wasHit) {
      const isDead = hitPlayer(player);
      if (isDead) {
        state = 'gameover';
      }
    }
  }

  function render(): void {
    ctx.imageSmoothingEnabled = false;
    renderBackground(ctx);

    if (state === 'start') {
      gameStartHud(canvas, ctx);
      return;
    }

    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
      return;
    }

    // Render game elements
    renderPatterns(boss, ctx);
    renderBoss(boss, ctx);
    renderPlayer(player, ctx);

    // HUD
    renderHP(player, ctx);
    renderTimeHud(ctx, elapsedTime);
    renderDashCooldown(player, ctx);

    if (state === 'paused') {
      gamePauseHud(canvas, ctx);
      return;
    }

    if (state === 'gameover') {
      gameOverHud.render(Math.floor(elapsedTime));
      return;
    }
  }

  // Game loop
  function gameLoop(currentTime: number): void {
    if (lastTime === 0) lastTime = currentTime;
    const dt = Math.min((currentTime - lastTime) / 1000, 0.05); // cap dt
    lastTime = currentTime;

    if (state === 'playing') {
      update(dt);
    }

    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  // Keyboard events
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (state === 'gameover') {
      gameOverHud.onKeyDown(e, Math.floor(elapsedTime));
      return;
    }

    switch (e.code) {
      case 'KeyS':
        startGame();
        break;
      case 'KeyP':
        if (state === 'playing') {
          state = 'paused';
        }
        break;
      case 'KeyR':
        resetGame();
        break;
      case 'Space':
        if (state === 'playing') {
          startDash(player, keys);
          e.preventDefault();
        }
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
        keys.add(e.code);
        e.preventDefault();
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
        keys.delete(e.code);
        break;
    }
  };

  // Register events
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    cancelAnimationFrame(animationId);
  };
}
