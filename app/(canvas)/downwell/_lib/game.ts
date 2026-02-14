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
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  PLAYER_MAX_HP,
  PLAYER_MAX_AMMO,
  JUMP_VELOCITY,
  STOMP_BOUNCE,
  GRAVITY,
  INVINCIBLE_DURATION,
  BULLET_WIDTH,
  BULLET_HEIGHT,
  BULLET_SPEED,
  PLATFORM_HEIGHT,
  PLATFORM_MIN_WIDTH,
  PLATFORM_MAX_WIDTH,
  PLATFORM_SPACING_Y,
  WALL_WIDTH,
  ENEMY_SIZE,
  ENEMY_SPEED,
  ENEMY_SPAWN_CHANCE,
  FLYER_CHANCE,
  ENEMY_KILL_SCORE,
  BASE_SCROLL_SPEED,
  MAX_SCROLL_SPEED,
  SCROLL_SPEED_INCREASE,
  PARTICLE_COUNT,
  PARTICLE_LIFE,
  DEPTH_SCORE_RATE,
  COLORS,
} from './config';
import { TPlayer, TPlatform, TEnemy, TBullet, TParticle } from './types';

export type TDownwellCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupDownwell = (
  canvas: HTMLCanvasElement,
  callbacks?: TDownwellCallbacks,
) => {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // --- State ---
  let player: TPlayer = createPlayer();
  let platforms: TPlatform[] = [];
  let enemies: TEnemy[] = [];
  let bullets: TBullet[] = [];
  let particles: TParticle[] = [];

  let scrollY = 0;
  let depth = 0;
  let kills = 0;
  let scrollSpeed = BASE_SCROLL_SPEED;
  let nextPlatformY = 0;

  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  let animationId = 0;

  let keys = { left: false, right: false };

  // --- Game Over HUD ---
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
    'downwell',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Helpers ---
  function createPlayer(): TPlayer {
    return {
      x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: 100,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      ammo: PLAYER_MAX_AMMO,
      maxAmmo: PLAYER_MAX_AMMO,
      isGrounded: false,
      isFacingRight: true,
      invincibleTimer: 0,
    };
  }

  function getScore(): number {
    return Math.floor(depth * DEPTH_SCORE_RATE + kills * ENEMY_KILL_SCORE);
  }

  // --- Platform Generation ---
  function generateInitialPlatforms() {
    platforms = [];
    nextPlatformY = 200;

    // Generate enough platforms to fill the screen and below
    while (nextPlatformY < scrollY + CANVAS_HEIGHT + PLATFORM_SPACING_Y * 3) {
      spawnPlatform(nextPlatformY);
      nextPlatformY += PLATFORM_SPACING_Y;
    }
  }

  function spawnPlatform(worldY: number) {
    const minX = WALL_WIDTH;
    const maxWidth = CANVAS_WIDTH - WALL_WIDTH * 2;
    const width =
      PLATFORM_MIN_WIDTH + Math.random() * (PLATFORM_MAX_WIDTH - PLATFORM_MIN_WIDTH);
    const x = minX + Math.random() * (maxWidth - width);

    const platform: TPlatform = {
      x,
      y: worldY,
      width,
      height: PLATFORM_HEIGHT,
    };
    platforms.push(platform);

    // Spawn enemy on platform
    if (Math.random() < ENEMY_SPAWN_CHANCE) {
      const isFlyer = Math.random() < FLYER_CHANCE;
      const enemy: TEnemy = {
        x: x + Math.random() * (width - ENEMY_SIZE),
        y: isFlyer ? worldY - 40 - Math.random() * 30 : worldY - ENEMY_SIZE,
        width: ENEMY_SIZE,
        height: ENEMY_SIZE,
        vx: (Math.random() < 0.5 ? -1 : 1) * ENEMY_SPEED,
        hp: 1,
        type: isFlyer ? 'flyer' : 'walker',
      };
      enemies.push(enemy);
    }
  }

  // --- Shooting ---
  function shoot() {
    if (player.ammo <= 0) return;
    player.ammo--;

    // Recoil: slight upward push
    player.vy = Math.min(player.vy, -100);

    const bullet: TBullet = {
      x: player.x + player.width / 2 - BULLET_WIDTH / 2,
      y: player.y + player.height,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      vy: BULLET_SPEED,
    };
    bullets.push(bullet);

    // Muzzle flash particles
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: bullet.x + BULLET_WIDTH / 2,
        y: bullet.y,
        vx: (Math.random() - 0.5) * 80,
        vy: Math.random() * 60 + 20,
        life: PARTICLE_LIFE * 0.5,
        maxLife: PARTICLE_LIFE * 0.5,
        size: 2 + Math.random() * 2,
        color: COLORS.bullet,
      });
    }
  }

  // --- Spawn kill particles ---
  function spawnKillParticles(x: number, y: number, color: string) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  // --- AABB collision ---
  function aabb(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number,
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // --- Reset ---
  function resetGame() {
    player = createPlayer();
    platforms = [];
    enemies = [];
    bullets = [];
    particles = [];
    scrollY = 0;
    depth = 0;
    kills = 0;
    scrollSpeed = BASE_SCROLL_SPEED;
    nextPlatformY = 0;
    isStarted = false;
    isLoading = false;
    isGameOver = false;
    isPaused = false;
    keys = { left: false, right: false };
    gameOverHud.reset();
  }

  // --- Start ---
  async function startGame() {
    if (isStarted || isLoading) return;
    isLoading = true;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isLoading = false;
    isStarted = true;
    isGameOver = false;
    isPaused = false;
    player = createPlayer();
    platforms = [];
    enemies = [];
    bullets = [];
    particles = [];
    scrollY = 0;
    depth = 0;
    kills = 0;
    scrollSpeed = BASE_SCROLL_SPEED;
    nextPlatformY = 0;
    keys = { left: false, right: false };
    generateInitialPlatforms();
  }

  function triggerGameOver() {
    isGameOver = true;
    isStarted = false;
  }

  // --- Update ---
  function update(dt: number) {
    if (!isStarted || isPaused) return;

    // Increase scroll speed over time
    scrollSpeed = Math.min(
      MAX_SCROLL_SPEED,
      scrollSpeed + SCROLL_SPEED_INCREASE * dt,
    );

    // Auto scroll (world moves up)
    scrollY += scrollSpeed * dt;
    depth += scrollSpeed * dt / 10;

    // Player horizontal movement
    player.vx = 0;
    if (keys.left) {
      player.vx = -PLAYER_SPEED;
      player.isFacingRight = false;
    }
    if (keys.right) {
      player.vx = PLAYER_SPEED;
      player.isFacingRight = true;
    }

    // Apply gravity
    player.vy += GRAVITY * dt;
    player.isGrounded = false;

    // Move player
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    // Wall collision
    if (player.x < WALL_WIDTH) {
      player.x = WALL_WIDTH;
    }
    if (player.x + player.width > CANVAS_WIDTH - WALL_WIDTH) {
      player.x = CANVAS_WIDTH - WALL_WIDTH - player.width;
    }

    // Platform collision (only when falling)
    if (player.vy > 0) {
      for (const plat of platforms) {
        const platScreenY = plat.y - scrollY;
        const playerBottom = player.y + player.height;
        const prevBottom = playerBottom - player.vy * dt;

        if (
          prevBottom <= platScreenY &&
          playerBottom >= platScreenY &&
          player.x + player.width > plat.x &&
          player.x < plat.x + plat.width
        ) {
          player.y = platScreenY - player.height;
          player.vy = 0;
          player.isGrounded = true;
          player.ammo = player.maxAmmo; // Reload on landing
          break;
        }
      }
    }

    // Scroll player: if player is below center, push world up
    const playerScreenY = player.y;
    const scrollThreshold = 250;
    if (playerScreenY > scrollThreshold) {
      const diff = playerScreenY - scrollThreshold;
      scrollY += diff;
      depth += diff / 10;
      player.y = scrollThreshold;
    }

    // Invincibility timer
    if (player.invincibleTimer > 0) {
      player.invincibleTimer -= dt;
    }

    // --- Update bullets ---
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.y += b.vy * dt;

      // Bullet vs platform
      let bulletHit = false;
      for (const plat of platforms) {
        const platScreenY = plat.y - scrollY;
        if (
          aabb(
            b.x,
            b.y,
            b.width,
            b.height,
            plat.x,
            platScreenY,
            plat.width,
            plat.height,
          )
        ) {
          bulletHit = true;
          break;
        }
      }

      // Bullet vs enemy
      if (!bulletHit) {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const enemy = enemies[j];
          const enemyScreenY = enemy.y - scrollY;
          if (
            aabb(
              b.x,
              b.y,
              b.width,
              b.height,
              enemy.x,
              enemyScreenY,
              enemy.width,
              enemy.height,
            )
          ) {
            enemy.hp--;
            if (enemy.hp <= 0) {
              spawnKillParticles(
                enemy.x + enemy.width / 2,
                enemyScreenY + enemy.height / 2,
                enemy.type === 'walker' ? COLORS.enemyWalker : COLORS.enemyFlyer,
              );
              enemies.splice(j, 1);
              kills++;
            }
            bulletHit = true;
            break;
          }
        }
      }

      // Remove bullet if hit or off screen
      const bulletScreenY = b.y;
      if (bulletHit || bulletScreenY > CANVAS_HEIGHT + 20) {
        bullets.splice(i, 1);
      }
    }

    // --- Update enemies ---
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      enemy.x += enemy.vx * dt;

      if (enemy.type === 'walker') {
        // Find the platform this walker is on
        let onPlatform = false;
        for (const plat of platforms) {
          if (
            Math.abs(enemy.y + enemy.height - plat.y) < 2 &&
            enemy.x + enemy.width > plat.x &&
            enemy.x < plat.x + plat.width
          ) {
            onPlatform = true;
            // Reverse at platform edges
            if (enemy.x <= plat.x) {
              enemy.vx = Math.abs(enemy.vx);
            }
            if (enemy.x + enemy.width >= plat.x + plat.width) {
              enemy.vx = -Math.abs(enemy.vx);
            }
            break;
          }
        }
        if (!onPlatform) {
          // Reverse at platform edges (fallback)
          if (enemy.x <= WALL_WIDTH || enemy.x + enemy.width >= CANVAS_WIDTH - WALL_WIDTH) {
            enemy.vx = -enemy.vx;
          }
        }
      } else {
        // Flyer: bounce off walls
        if (enemy.x <= WALL_WIDTH) {
          enemy.vx = Math.abs(enemy.vx);
        }
        if (enemy.x + enemy.width >= CANVAS_WIDTH - WALL_WIDTH) {
          enemy.vx = -Math.abs(enemy.vx);
        }
      }

      // Remove enemies that scrolled off screen (above viewport)
      const enemyScreenY = enemy.y - scrollY;
      if (enemyScreenY + enemy.height < -50) {
        enemies.splice(i, 1);
        continue;
      }

      // Player vs enemy collision
      const playerRect = {
        x: player.x,
        y: player.y,
        w: player.width,
        h: player.height,
      };
      const enemyRect = {
        x: enemy.x,
        y: enemyScreenY,
        w: enemy.width,
        h: enemy.height,
      };

      if (
        aabb(
          playerRect.x,
          playerRect.y,
          playerRect.w,
          playerRect.h,
          enemyRect.x,
          enemyRect.y,
          enemyRect.w,
          enemyRect.h,
        )
      ) {
        // Check if stomping (player falling and above enemy center)
        const playerBottom = player.y + player.height;
        const enemyCenter = enemyScreenY + enemy.height / 2;

        if (player.vy > 0 && playerBottom < enemyCenter + 5) {
          // Stomp kill
          spawnKillParticles(
            enemy.x + enemy.width / 2,
            enemyScreenY + enemy.height / 2,
            enemy.type === 'walker' ? COLORS.enemyWalker : COLORS.enemyFlyer,
          );
          enemies.splice(i, 1);
          kills++;
          player.vy = STOMP_BOUNCE;
          player.ammo = player.maxAmmo; // Reload on stomp
        } else if (player.invincibleTimer <= 0) {
          // Side collision: take damage
          player.hp--;
          player.invincibleTimer = INVINCIBLE_DURATION;
          // Knockback
          player.vy = JUMP_VELOCITY * 0.5;
          player.vx = player.x < enemy.x ? -200 : 200;

          if (player.hp <= 0) {
            triggerGameOver();
            return;
          }
        }
      }
    }

    // --- Update particles ---
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt; // particle gravity
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // --- Generate new platforms below ---
    while (nextPlatformY < scrollY + CANVAS_HEIGHT + PLATFORM_SPACING_Y * 3) {
      spawnPlatform(nextPlatformY);
      nextPlatformY += PLATFORM_SPACING_Y;
    }

    // --- Remove off-screen platforms (above viewport) ---
    for (let i = platforms.length - 1; i >= 0; i--) {
      if (platforms[i].y - scrollY + platforms[i].height < -50) {
        platforms.splice(i, 1);
      }
    }

    // --- Game over: player pushed above screen ---
    if (player.y + player.height < -50) {
      triggerGameOver();
    }
  }

  // --- Render ---
  function render() {
    // Clear
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Walls
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, 0, WALL_WIDTH, CANVAS_HEIGHT);
    ctx.fillRect(CANVAS_WIDTH - WALL_WIDTH, 0, WALL_WIDTH, CANVAS_HEIGHT);

    // Wall borders
    ctx.strokeStyle = COLORS.wallBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(WALL_WIDTH, 0);
    ctx.lineTo(WALL_WIDTH, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH - WALL_WIDTH, 0);
    ctx.lineTo(CANVAS_WIDTH - WALL_WIDTH, CANVAS_HEIGHT);
    ctx.stroke();

    // Platforms
    ctx.fillStyle = COLORS.platform;
    for (const plat of platforms) {
      const screenY = plat.y - scrollY;
      if (screenY > -PLATFORM_HEIGHT && screenY < CANVAS_HEIGHT + PLATFORM_HEIGHT) {
        ctx.fillRect(plat.x, screenY, plat.width, plat.height);
      }
    }

    // Enemies
    for (const enemy of enemies) {
      const screenY = enemy.y - scrollY;
      if (screenY > -ENEMY_SIZE && screenY < CANVAS_HEIGHT + ENEMY_SIZE) {
        ctx.fillStyle =
          enemy.type === 'walker' ? COLORS.enemyWalker : COLORS.enemyFlyer;
        ctx.fillRect(enemy.x, screenY, enemy.width, enemy.height);

        // Eye
        ctx.fillStyle = '#ffffff';
        const eyeX = enemy.vx > 0 ? enemy.x + enemy.width * 0.65 : enemy.x + enemy.width * 0.2;
        const eyeY = screenY + enemy.height * 0.3;
        ctx.fillRect(eyeX, eyeY, 5, 5);
      }
    }

    // Bullets
    ctx.fillStyle = COLORS.bullet;
    for (const b of bullets) {
      ctx.fillRect(b.x, b.y, b.width, b.height);
      // Glow
      ctx.save();
      ctx.fillStyle = COLORS.bulletFlash;
      ctx.fillRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
      ctx.restore();
    }

    // Particles
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Player
    ctx.save();
    if (player.invincibleTimer > 0) {
      // Flashing when invincible
      const flash = Math.sin(player.invincibleTimer * 20) > 0;
      ctx.globalAlpha = flash ? 1 : 0.3;
      ctx.fillStyle = COLORS.playerDamaged;
    } else {
      ctx.fillStyle = COLORS.player;
    }
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Player boots (indicate shooting direction)
    if (!player.isGrounded) {
      ctx.fillStyle = COLORS.bullet;
      ctx.fillRect(
        player.x + 2,
        player.y + player.height - 4,
        player.width / 2 - 3,
        4,
      );
      ctx.fillRect(
        player.x + player.width / 2 + 1,
        player.y + player.height - 4,
        player.width / 2 - 3,
        4,
      );
    }

    // Player eye
    ctx.fillStyle = COLORS.bg;
    const eyeOffsetX = player.isFacingRight ? player.width * 0.6 : player.width * 0.2;
    ctx.fillRect(player.x + eyeOffsetX, player.y + 5, 4, 4);
    ctx.restore();

    // --- HUD ---
    drawHud();

    // --- Overlays ---
    if (isLoading) {
      gameLoadingHud(canvas, ctx);
    } else if (!isStarted && !isGameOver) {
      gameStartHud(canvas, ctx);
    } else if (isPaused) {
      gamePauseHud(canvas, ctx);
    } else if (isGameOver) {
      gameOverHud.render(getScore());
    }
  }

  function drawHud() {
    if (!isStarted && !isGameOver) return;

    ctx.save();

    // HP (left side)
    for (let i = 0; i < player.maxHp; i++) {
      ctx.fillStyle = i < player.hp ? COLORS.hp : COLORS.hpEmpty;
      ctx.fillRect(WALL_WIDTH + 8 + i * 18, 10, 14, 14);
      // Heart-like shape inner highlight
      if (i < player.hp) {
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(WALL_WIDTH + 10 + i * 18, 12, 4, 4);
      }
    }

    // Ammo (right side)
    const ammoStartX = CANVAS_WIDTH - WALL_WIDTH - 8;
    for (let i = 0; i < player.maxAmmo; i++) {
      ctx.fillStyle = i < player.ammo ? COLORS.ammo : COLORS.ammoEmpty;
      const barX = ammoStartX - (i + 1) * 8;
      ctx.fillRect(barX, 12, 5, 10);
    }

    // Score (center top)
    ctx.fillStyle = COLORS.scoreText;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${getScore()}`, CANVAS_WIDTH / 2, 10);

    // Depth indicator (center, smaller)
    ctx.fillStyle = COLORS.depthText;
    ctx.font = '11px sans-serif';
    ctx.fillText(`${Math.floor(depth)}m`, CANVAS_WIDTH / 2, 28);

    ctx.restore();
  }

  // --- Game Loop ---
  const gameLoop = (timestamp: number) => {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render();

    animationId = requestAnimationFrame(gameLoop);
  };

  // --- Keyboard Handlers ---
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    // Game over HUD handles keys first
    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, getScore());
      if (handled) return;
    }

    switch (e.code) {
      case 'ArrowLeft':
        keys.left = true;
        break;
      case 'ArrowRight':
        keys.right = true;
        break;
      case 'Space':
        e.preventDefault();
        if (
          isStarted &&
          !isPaused &&
          !isGameOver &&
          !player.isGrounded &&
          player.ammo > 0
        ) {
          shoot();
        }
        break;
      case 'KeyS':
        if (!isStarted && !isGameOver) {
          startGame();
        } else if (isPaused) {
          isPaused = false;
        }
        break;
      case 'KeyP':
        if (isStarted && !isGameOver) {
          isPaused = !isPaused;
        }
        break;
      case 'KeyR':
        if (!isGameOver) {
          resetGame();
        }
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowLeft':
        keys.left = false;
        break;
      case 'ArrowRight':
        keys.right = false;
        break;
    }
  };

  // --- Setup ---
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
};
