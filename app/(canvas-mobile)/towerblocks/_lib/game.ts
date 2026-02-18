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
  BLOCK_HEIGHT,
  INITIAL_BLOCK_WIDTH,
  MIN_BLOCK_WIDTH,
  BASE_SPEED,
  SPEED_INCREMENT,
  MAX_SPEED,
  BASE_SCORE,
  PERFECT_TOLERANCE,
  COMBO_RESTORE_THRESHOLD,
  RESTORE_AMOUNT,
  CAMERA_START_LAYER,
  CAMERA_TARGET_RATIO,
  CAMERA_LERP,
  BLOCK_COLORS,
  CLOUD_COUNT,
  DEBRIS_GRAVITY,
  PARTICLE_COUNT,
} from './config';
import {
  TBlock,
  TMovingBlock,
  TDroppingBlock,
  TDebris,
  TParticle,
  TFloatingText,
  TCloud,
} from './types';

export type TTowerBlocksCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupTowerBlocks = (
  canvas: HTMLCanvasElement,
  callbacks?: TTowerBlocksCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // --- State ---
  let stackedBlocks: TBlock[] = [];
  let movingBlock: TMovingBlock | null = null;
  let droppingBlock: TDroppingBlock | null = null;
  let debris: TDebris[] = [];
  let particles: TParticle[] = [];
  let floatingTexts: TFloatingText[] = [];
  let clouds: TCloud[] = [];

  let score = 0;
  let comboCount = 0;
  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;
  let isDropping = false;

  let cameraOffsetY = 0;
  let targetCameraOffsetY = 0;

  let lastTime = 0;
  let animationId = 0;
  let flashAlpha = 0;

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
    'towerblocks',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Cloud generation ---
  const initClouds = () => {
    clouds = [];
    for (let i = 0; i < CLOUD_COUNT; i++) {
      clouds.push({
        x: Math.random() * CANVAS_WIDTH,
        y: -(Math.random() * 2000 + 200),
        width: 60 + Math.random() * 80,
        alpha: 0.2 + Math.random() * 0.3,
        speed: 10 + Math.random() * 20,
      });
    }
  };

  // --- Reset ---
  const resetGame = () => {
    stackedBlocks = [];
    movingBlock = null;
    droppingBlock = null;
    debris = [];
    particles = [];
    floatingTexts = [];
    score = 0;
    comboCount = 0;
    isStarted = false;
    isLoading = false;
    isGameOver = false;
    isPaused = false;
    isDropping = false;
    cameraOffsetY = 0;
    targetCameraOffsetY = 0;
    flashAlpha = 0;
    gameOverHud.reset();
    initClouds();
  };

  // --- Start ---
  const startGame = async () => {
    if (isStarted || isLoading) return;
    isLoading = true;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isLoading = false;
    isStarted = true;
    isGameOver = false;
    isPaused = false;
    score = 0;
    comboCount = 0;
    cameraOffsetY = 0;
    targetCameraOffsetY = 0;
    stackedBlocks = [];
    debris = [];
    particles = [];
    floatingTexts = [];
    flashAlpha = 0;

    // Base block (foundation)
    const baseBlock: TBlock = {
      x: (CANVAS_WIDTH - INITIAL_BLOCK_WIDTH) / 2,
      y: CANVAS_HEIGHT - BLOCK_HEIGHT - 40,
      width: INITIAL_BLOCK_WIDTH,
      height: BLOCK_HEIGHT,
      colorIndex: 0,
    };
    stackedBlocks.push(baseBlock);

    spawnMovingBlock();
  };

  // --- Spawn moving block ---
  const spawnMovingBlock = () => {
    const layer = stackedBlocks.length;
    const topBlock = stackedBlocks[layer - 1];
    const speed = Math.min(BASE_SPEED + layer * SPEED_INCREMENT, MAX_SPEED);
    const direction: 1 | -1 = layer % 2 === 0 ? 1 : -1;
    const startX = direction === 1 ? -topBlock.width : CANVAS_WIDTH;

    movingBlock = {
      x: startX,
      y: topBlock.y - BLOCK_HEIGHT,
      width: topBlock.width,
      height: BLOCK_HEIGHT,
      colorIndex: layer % BLOCK_COLORS.length,
      direction,
      speed,
    };
    isDropping = false;
  };

  // --- Drop block ---
  const dropBlock = () => {
    if (!movingBlock || isDropping || isGameOver || !isStarted || isPaused)
      return;
    isDropping = true;

    const topBlock = stackedBlocks[stackedBlocks.length - 1];
    const moving = movingBlock;

    const overlapLeft = Math.max(moving.x, topBlock.x);
    const overlapRight = Math.min(
      moving.x + moving.width,
      topBlock.x + topBlock.width,
    );
    const overlapWidth = overlapRight - overlapLeft;

    // No overlap → game over
    if (overlapWidth <= 0) {
      debris.push(createDebris(moving, moving.direction));
      movingBlock = null;
      triggerGameOver();
      return;
    }

    // Perfect check
    const leftDiff = Math.abs(moving.x - topBlock.x);
    const rightDiff = Math.abs(
      moving.x + moving.width - (topBlock.x + topBlock.width),
    );
    const isPerfect = leftDiff + rightDiff <= PERFECT_TOLERANCE;

    if (isPerfect) {
      comboCount++;
      score += BASE_SCORE + comboCount;

      const newBlock: TBlock = {
        x: topBlock.x,
        y: moving.y,
        width: topBlock.width,
        height: BLOCK_HEIGHT,
        colorIndex: moving.colorIndex,
      };
      stackedBlocks.push(newBlock);

      spawnPerfectParticles(newBlock);
      floatingTexts.push({
        x: newBlock.x + newBlock.width / 2,
        y: newBlock.y - 10,
        text: comboCount >= 3 ? `PERFECT! x${comboCount}` : 'PERFECT!',
        alpha: 1,
        scale: 1.2,
        color: '#FFD700',
        life: 1,
      });
      flashAlpha = 0.15;

      // Size restore on long combo
      if (comboCount >= COMBO_RESTORE_THRESHOLD) {
        const currentWidth = stackedBlocks[stackedBlocks.length - 1].width;
        const newWidth = Math.min(
          currentWidth + RESTORE_AMOUNT,
          INITIAL_BLOCK_WIDTH,
        );
        if (newWidth > currentWidth) {
          const diff = newWidth - currentWidth;
          stackedBlocks[stackedBlocks.length - 1].width = newWidth;
          stackedBlocks[stackedBlocks.length - 1].x -= diff / 2;
          floatingTexts.push({
            x: newBlock.x + newBlock.width / 2,
            y: newBlock.y - 35,
            text: 'SIZE UP!',
            alpha: 1,
            scale: 1,
            color: '#00FF88',
            life: 1,
          });
        }
      }
    } else {
      comboCount = 0;
      score += BASE_SCORE;

      const newBlock: TBlock = {
        x: overlapLeft,
        y: moving.y,
        width: overlapWidth,
        height: BLOCK_HEIGHT,
        colorIndex: moving.colorIndex,
      };

      if (newBlock.width < MIN_BLOCK_WIDTH) {
        debris.push(createDebris(moving, moving.direction));
        movingBlock = null;
        triggerGameOver();
        return;
      }

      stackedBlocks.push(newBlock);

      // Create debris from cut-off part
      if (moving.x < topBlock.x) {
        const cutWidth = overlapLeft - moving.x;
        if (cutWidth > 0) {
          debris.push({
            x: moving.x,
            y: moving.y,
            width: cutWidth,
            height: BLOCK_HEIGHT,
            colorIndex: moving.colorIndex,
            velocityX: -60 - Math.random() * 40,
            velocityY: -30,
            rotation: 0,
            rotationSpeed: -2 - Math.random() * 2,
            alpha: 1,
          });
        }
      }
      if (moving.x + moving.width > topBlock.x + topBlock.width) {
        const cutX = overlapRight;
        const cutWidth = moving.x + moving.width - overlapRight;
        if (cutWidth > 0) {
          debris.push({
            x: cutX,
            y: moving.y,
            width: cutWidth,
            height: BLOCK_HEIGHT,
            colorIndex: moving.colorIndex,
            velocityX: 60 + Math.random() * 40,
            velocityY: -30,
            rotation: 0,
            rotationSpeed: 2 + Math.random() * 2,
            alpha: 1,
          });
        }
      }
    }

    movingBlock = null;
    updateCamera();
    spawnMovingBlock();
  };

  const createDebris = (block: TMovingBlock | TBlock, dir: number): TDebris => {
    return {
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      colorIndex: block.colorIndex,
      velocityX: dir * (40 + Math.random() * 60),
      velocityY: -50 - Math.random() * 30,
      rotation: 0,
      rotationSpeed: dir * (2 + Math.random() * 3),
      alpha: 1,
    };
  };

  const triggerGameOver = () => {
    isGameOver = true;
    isStarted = false;
  };

  // --- Camera ---
  const updateCamera = () => {
    const layer = stackedBlocks.length;
    if (layer <= CAMERA_START_LAYER) return;

    const topBlock = stackedBlocks[layer - 1];
    const targetY = CANVAS_HEIGHT * CAMERA_TARGET_RATIO;
    targetCameraOffsetY = topBlock.y - targetY;

    if (targetCameraOffsetY > 0) targetCameraOffsetY = 0;
  };

  // --- Particles ---
  const spawnPerfectParticles = (block: TBlock) => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.3;
      const speed = 80 + Math.random() * 120;
      particles.push({
        x: block.x + block.width / 2,
        y: block.y + block.height / 2,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        alpha: 1,
        color: BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)],
        life: 0.6 + Math.random() * 0.4,
      });
    }
  };

  // --- Update ---
  const update = (dt: number) => {
    if (!isStarted || isPaused) return;

    // Moving block
    if (movingBlock && !isDropping) {
      movingBlock.x += movingBlock.direction * movingBlock.speed * dt;

      if (movingBlock.direction === 1 && movingBlock.x > CANVAS_WIDTH) {
        movingBlock.direction = -1;
      } else if (
        movingBlock.direction === -1 &&
        movingBlock.x + movingBlock.width < 0
      ) {
        movingBlock.direction = 1;
      }
    }

    // Camera lerp
    cameraOffsetY += (targetCameraOffsetY - cameraOffsetY) * CAMERA_LERP;

    // Debris
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.x += d.velocityX * dt;
      d.velocityY += DEBRIS_GRAVITY * dt;
      d.y += d.velocityY * dt;
      d.rotation += d.rotationSpeed * dt;
      d.alpha -= dt * 1.5;
      if (d.alpha <= 0 || d.y > CANVAS_HEIGHT + 100) {
        debris.splice(i, 1);
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.velocityX * dt;
      p.y += p.velocityY * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life);
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 40 * dt;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life);
      if (ft.life <= 0) {
        floatingTexts.splice(i, 1);
      }
    }

    // Clouds
    for (const cloud of clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x > CANVAS_WIDTH + cloud.width) {
        cloud.x = -cloud.width;
        cloud.y = -(Math.random() * 2000 + 200);
      }
    }

    // Flash decay
    if (flashAlpha > 0) {
      flashAlpha -= dt * 2;
      if (flashAlpha < 0) flashAlpha = 0;
    }
  };

  // --- Render ---
  const render = () => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const heightRatio = Math.min(Math.abs(cameraOffsetY) / 3000, 1);
    drawSkyGradient(heightRatio);
    drawClouds();

    ctx.save();
    ctx.translate(0, -cameraOffsetY);

    for (const block of stackedBlocks) {
      drawBlock(block.x, block.y, block.width, block.height, block.colorIndex);
    }

    if (movingBlock) {
      drawBlock(
        movingBlock.x,
        movingBlock.y,
        movingBlock.width,
        movingBlock.height,
        movingBlock.colorIndex,
      );
    }

    for (const d of debris) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, d.alpha);
      ctx.translate(d.x + d.width / 2, d.y + d.height / 2);
      ctx.rotate(d.rotation);
      drawBlock(-d.width / 2, -d.height / 2, d.width, d.height, d.colorIndex);
      ctx.restore();
    }

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const ft of floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${Math.floor(16 * ft.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();

    // Flash effect
    if (flashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 215, 0, ${flashAlpha})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.restore();
    }

    // HUD
    drawHud();

    // Overlays
    if (isLoading) {
      gameLoadingHud(canvas, ctx);
    } else if (!isStarted && !isGameOver) {
      gameStartHud(canvas, ctx);
    } else if (isPaused) {
      gamePauseHud(canvas, ctx);
    } else if (isGameOver) {
      gameOverHud.render(score);
    }
  };

  const drawSkyGradient = (heightRatio: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);

    const r1 = Math.floor(160 - heightRatio * 40);
    const g1 = Math.floor(200 + heightRatio * 30);
    const b1 = Math.floor(235 + heightRatio * 20);

    const r2 = Math.floor(255 - heightRatio * 50);
    const g2 = Math.floor(218 - heightRatio * 30);
    const b2 = Math.floor(210 + heightRatio * 30);

    gradient.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
    gradient.addColorStop(0.6, `rgb(${Math.floor((r1 + r2) / 2)}, ${Math.floor((g1 + g2) / 2)}, ${Math.floor((b1 + b2) / 2)})`);
    gradient.addColorStop(1, `rgb(${r2}, ${g2}, ${b2})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const drawClouds = () => {
    ctx.save();
    for (const cloud of clouds) {
      const screenY = cloud.y - cameraOffsetY * 0.3;
      if (screenY < -60 || screenY > CANVAS_HEIGHT + 60) continue;

      ctx.globalAlpha = cloud.alpha;
      ctx.fillStyle = 'white';

      const w = cloud.width;
      const h = w * 0.4;
      ctx.beginPath();
      ctx.ellipse(cloud.x, screenY, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        cloud.x - w * 0.25,
        screenY + h * 0.15,
        w * 0.3,
        h * 0.35,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        cloud.x + w * 0.25,
        screenY + h * 0.15,
        w * 0.35,
        h * 0.4,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  };

  const drawBlock = (
    x: number,
    y: number,
    w: number,
    h: number,
    colorIndex: number,
  ) => {
    const color = BLOCK_COLORS[colorIndex % BLOCK_COLORS.length];

    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x, y, w, 4);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x, y + h - 4, w, 4);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(x, y, 2, h);
    ctx.fillRect(x + w - 2, y, 2, h);
  };

  const drawHud = () => {
    if (!isStarted && !isGameOver) return;

    ctx.save();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText(`Score: ${score}`, 15, 15);
    ctx.fillText(`Score: ${score}`, 15, 15);

    const layer = stackedBlocks.length;
    ctx.textAlign = 'right';
    ctx.strokeText(`Layer: ${layer}`, CANVAS_WIDTH - 15, 15);
    ctx.fillText(`Layer: ${layer}`, CANVAS_WIDTH - 15, 15);

    if (comboCount >= 2) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px sans-serif';
      ctx.strokeText(`Combo x${comboCount}`, CANVAS_WIDTH / 2, 15);
      ctx.fillText(`Combo x${comboCount}`, CANVAS_WIDTH / 2, 15);
    }

    ctx.restore();
  };

  // --- Game Loop ---
  const gameLoop = (timestamp: number) => {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render();

    animationId = requestAnimationFrame(gameLoop);
  };

  // --- Touch position helper ---
  const getTouchPos = (touch: Touch) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  };

  // --- Input Handlers ---
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    switch (e.code) {
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
      case 'Space':
      case 'ArrowDown':
        e.preventDefault();
        dropBlock();
        break;
    }
  };

  const handleClick = () => {
    if (isGameOver) return;
    if (!isStarted) return;
    if (isPaused) return;

    dropBlock();
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const pos = getTouchPos(touch);

    // Game over: touch for SAVE/SKIP/restart
    if (isGameOver) {
      gameOverHud.onTouchStart(pos.x, pos.y, score);
      return;
    }

    // Before game start: touch to start
    if (!isStarted && !isLoading) {
      startGame();
      return;
    }

    // Paused: touch to resume
    if (isPaused) {
      isPaused = false;
      return;
    }

    // Playing: touch to drop
    dropBlock();
  };

  // --- Setup ---
  resize();
  initClouds();

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', resize);

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('click', handleClick);
    canvas.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', resize);
  };
};
