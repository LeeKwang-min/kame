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
  PLAYER_SIZE,
  PLAYER_X,
  PLAYER_GROUND_Y,
  JUMP_VELOCITY,
  JUMPPAD_VELOCITY,
  GRAVITY,
  GROUND_Y,
  GROUND_HEIGHT,
  BASE_SPEED,
  MAX_SPEED,
  SPEED_INCREASE_RATE,
  SPIKE_WIDTH,
  SPIKE_HEIGHT,
  PLATFORM_WIDTH,
  PLATFORM_HEIGHT,
  PLATFORM_ELEVATION,
  JUMPPAD_WIDTH,
  JUMPPAD_HEIGHT,
  PIT_WIDTH,
  PATTERN_GAP_MIN,
  PATTERN_GAP_MAX,
  PATTERN_GAP_DECREASE_RATE,
  PATTERN_GAP_FLOOR,
  PARTICLE_COUNT,
  PARTICLE_LIFE,
  GRID_SPACING,
  COLORS,
  PATTERNS,
} from './config';
import {
  TObstacle,
  TPlayer,
  TParticle,
  TPlatformBlock,
  TJumpPad,
} from './types';

export type TGeometryDashCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupGeometryDash = (
  canvas: HTMLCanvasElement,
  callbacks?: TGeometryDashCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // --- State ---
  let player: TPlayer = {
    x: PLAYER_X,
    y: PLAYER_GROUND_Y,
    size: PLAYER_SIZE,
    vy: 0,
    rotation: 0,
    isGrounded: true,
  };

  let obstacles: TObstacle[] = [];
  let platforms: TPlatformBlock[] = [];
  let jumppads: TJumpPad[] = [];
  let particles: TParticle[] = [];

  let score = 0;
  let speed = BASE_SPEED;
  let distanceSinceLastPattern = 0;
  let nextPatternDistance = 300;
  let gridOffset = 0;
  let elapsedTime = 0;

  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  let animationId = 0;

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
    'geometrydash',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Helpers ---
  const rand = (min: number, max: number) =>
    min + Math.random() * (max - min);

  // --- Reset ---
  const resetGame = () => {
    player = {
      x: PLAYER_X,
      y: PLAYER_GROUND_Y,
      size: PLAYER_SIZE,
      vy: 0,
      rotation: 0,
      isGrounded: true,
    };
    obstacles = [];
    platforms = [];
    jumppads = [];
    particles = [];
    score = 0;
    speed = BASE_SPEED;
    distanceSinceLastPattern = 0;
    nextPatternDistance = 300;
    gridOffset = 0;
    elapsedTime = 0;
    isStarted = false;
    isLoading = false;
    isGameOver = false;
    isPaused = false;
    gameOverHud.reset();
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

    player = {
      x: PLAYER_X,
      y: PLAYER_GROUND_Y,
      size: PLAYER_SIZE,
      vy: 0,
      rotation: 0,
      isGrounded: true,
    };
    obstacles = [];
    platforms = [];
    jumppads = [];
    particles = [];
    score = 0;
    speed = BASE_SPEED;
    distanceSinceLastPattern = 0;
    nextPatternDistance = 300;
    gridOffset = 0;
    elapsedTime = 0;
  };

  const triggerGameOver = () => {
    spawnParticles(player.x, player.y);
    isGameOver = true;
    isStarted = false;
  };

  // --- Spawn Pattern ---
  const spawnPattern = () => {
    // 1. Filter patterns by current difficulty
    const maxDifficulty = elapsedTime < 15 ? 1 : elapsedTime < 30 ? 2 : 3;
    const available = PATTERNS.filter((p) => p.difficulty <= maxDifficulty);

    // 2. Random selection
    const pattern = available[Math.floor(Math.random() * available.length)];

    // 3. Convert pattern elements to game objects
    const startX = CANVAS_WIDTH + 50;
    for (const elem of pattern.elements) {
      const x = startX + elem.offsetX;
      switch (elem.type) {
        case 'spike':
          obstacles.push({
            x,
            y: GROUND_Y - SPIKE_HEIGHT,
            width: SPIKE_WIDTH,
            height: SPIKE_HEIGHT,
            type: 'spike',
          });
          break;
        case 'platform': {
          const platWidth = elem.width ?? PLATFORM_WIDTH;
          const platY =
            GROUND_Y - PLATFORM_ELEVATION + (elem.offsetY ?? 0);
          platforms.push({
            x,
            y: platY,
            width: platWidth,
            height: PLATFORM_HEIGHT,
          });
          break;
        }
        case 'jumppad':
          jumppads.push({
            x,
            y: GROUND_Y - JUMPPAD_HEIGHT,
            width: JUMPPAD_WIDTH,
            height: JUMPPAD_HEIGHT,
            triggered: false,
            animTimer: 0,
          });
          break;
        case 'pit': {
          const pitWidth = elem.width ?? PIT_WIDTH;
          obstacles.push({
            x,
            y: GROUND_Y,
            width: pitWidth,
            height: GROUND_HEIGHT,
            type: 'pit',
          });
          break;
        }
        case 'spike-on-platform':
          obstacles.push({
            x,
            y:
              GROUND_Y -
              PLATFORM_ELEVATION -
              SPIKE_HEIGHT +
              (elem.offsetY ?? 0),
            width: SPIKE_WIDTH,
            height: SPIKE_HEIGHT,
            type: 'spike',
          });
          break;
      }
    }

    // 4. Calculate distance until next pattern
    const currentMaxGap = Math.max(
      PATTERN_GAP_FLOOR,
      PATTERN_GAP_MAX - elapsedTime * PATTERN_GAP_DECREASE_RATE,
    );
    nextPatternDistance =
      pattern.totalWidth + rand(PATTERN_GAP_MIN, currentMaxGap);
    distanceSinceLastPattern = 0;
  };

  // --- Is Over Pit ---
  const isOverPit = (): boolean => {
    const playerLeft = player.x - player.size / 2;
    const playerRight = player.x + player.size / 2;

    for (const obs of obstacles) {
      if (obs.type !== 'pit') continue;
      const pitLeft = obs.x;
      const pitRight = obs.x + obs.width;

      // Player center is over the pit
      if (playerLeft >= pitLeft && playerRight <= pitRight) {
        return true;
      }
      // Player mostly over the pit (center is over)
      if (player.x >= pitLeft && player.x <= pitRight) {
        return true;
      }
    }
    return false;
  };

  // --- Check Collision ---
  const checkCollision = (): boolean => {
    const halfSize = player.size / 2;
    const pLeft = player.x - halfSize;
    const pRight = player.x + halfSize;
    const pTop = player.y - halfSize;
    const pBottom = player.y + halfSize;

    for (const obs of obstacles) {
      if (obs.type === 'pit') {
        // Pit collision: player falls below ground level while over the pit
        if (player.y + halfSize > GROUND_Y + 10) {
          const pitLeft = obs.x;
          const pitRight = obs.x + obs.width;
          if (player.x >= pitLeft && player.x <= pitRight) {
            return true;
          }
        }
        continue;
      }

      // AABB collision for spike
      const oLeft = obs.x;
      const oRight = obs.x + obs.width;
      const oTop = obs.y;
      const oBottom = obs.y + obs.height;

      // Shrink hitbox slightly for fairness
      const margin = 4;
      if (
        pRight - margin > oLeft &&
        pLeft + margin < oRight &&
        pBottom - margin > oTop &&
        pTop + margin < oBottom
      ) {
        return true;
      }
    }

    return false;
  };

  // --- Spawn Particles ---
  const spawnParticles = (x: number, y: number) => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = rand(80, 200);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 100,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        size: rand(2, 6),
        color: i % 3 === 0 ? COLORS.neon : COLORS.particle,
      });
    }
  };

  // --- Update ---
  const update = (dt: number) => {
    if (!isStarted || isPaused) return;

    elapsedTime += dt;

    // Increase speed over time
    speed = Math.min(MAX_SPEED, BASE_SPEED + elapsedTime * SPEED_INCREASE_RATE);

    // Increase score based on speed
    score += speed * dt * 0.1;

    // --- Player physics ---
    if (!player.isGrounded) {
      player.vy += GRAVITY * dt;
      player.y += player.vy * dt;

      // Rotation while in air
      player.rotation += dt * 6;

      // Platform landing check (only when falling down)
      if (player.vy > 0) {
        for (const plat of platforms) {
          const playerBottom = player.y + player.size / 2;
          const playerLeft = player.x - player.size / 2;
          const playerRight = player.x + player.size / 2;
          const prevBottom = playerBottom - player.vy * dt;

          if (
            prevBottom <= plat.y &&
            playerBottom >= plat.y &&
            playerRight > plat.x + 4 &&
            playerLeft < plat.x + plat.width - 4
          ) {
            player.y = plat.y - player.size / 2;
            player.vy = 0;
            player.isGrounded = true;
            player.rotation =
              Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
            break;
          }
        }
      }

      // Check if over pit
      if (!player.isGrounded && isOverPit()) {
        // Don't land, keep falling
        if (player.y > CANVAS_HEIGHT + player.size) {
          triggerGameOver();
          return;
        }
      } else if (!player.isGrounded) {
        // Land on ground
        if (player.y >= PLAYER_GROUND_Y) {
          player.y = PLAYER_GROUND_Y;
          player.vy = 0;
          player.isGrounded = true;
          // Snap rotation to nearest 90 degrees
          player.rotation =
            Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
        }
      }
    } else {
      // On ground or platform, check if a pit appeared below
      if (player.y + player.size / 2 >= GROUND_Y - 5) {
        // On the main ground level
        if (isOverPit()) {
          player.isGrounded = false;
          player.vy = 0;
        }
      }
    }

    // Platform edge fall-off check (grounded on a platform, not main ground)
    if (player.isGrounded && player.y + player.size / 2 < GROUND_Y - 5) {
      const playerLeft = player.x - player.size / 2;
      const playerRight = player.x + player.size / 2;
      const playerBottom = player.y + player.size / 2;
      let onPlatform = false;
      for (const plat of platforms) {
        if (
          Math.abs(playerBottom - plat.y) < 3 &&
          playerRight > plat.x + 4 &&
          playerLeft < plat.x + plat.width - 4
        ) {
          onPlatform = true;
          break;
        }
      }
      if (!onPlatform) {
        player.isGrounded = false;
      }
    }

    // Jump pad check
    for (const pad of jumppads) {
      if (pad.triggered) continue;
      const playerBottom = player.y + player.size / 2;
      const playerLeft = player.x - player.size / 2;
      const playerRight = player.x + player.size / 2;

      if (
        playerBottom >= pad.y &&
        playerBottom <= pad.y + pad.height + 5 &&
        playerRight > pad.x &&
        playerLeft < pad.x + pad.width &&
        player.vy >= 0
      ) {
        player.vy = JUMPPAD_VELOCITY;
        player.isGrounded = false;
        pad.triggered = true;
        pad.animTimer = 0.3;
      }
    }

    // Spawn patterns
    distanceSinceLastPattern += speed * dt;
    if (distanceSinceLastPattern >= nextPatternDistance) {
      spawnPattern();
    }

    // Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= speed * dt;

      // Remove off-screen obstacles
      if (obstacles[i].x + obstacles[i].width < -50) {
        obstacles.splice(i, 1);
      }
    }

    // Move platforms
    for (let i = platforms.length - 1; i >= 0; i--) {
      platforms[i].x -= speed * dt;

      if (platforms[i].x + platforms[i].width < -50) {
        platforms.splice(i, 1);
      }
    }

    // Move jump pads
    for (let i = jumppads.length - 1; i >= 0; i--) {
      jumppads[i].x -= speed * dt;

      // Update anim timer
      if (jumppads[i].animTimer > 0) {
        jumppads[i].animTimer -= dt;
      }

      if (jumppads[i].x + jumppads[i].width < -50) {
        jumppads.splice(i, 1);
      }
    }

    // Grid scroll offset
    gridOffset = (gridOffset + speed * dt) % GRID_SPACING;

    // Check collision
    if (checkCollision()) {
      triggerGameOver();
      return;
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.vy += 400 * dt; // particle gravity
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  };

  // --- Render ---
  const render = () => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Scrolling grid lines
    drawGrid();

    // Ground (skip pit areas)
    drawGround();

    // Platforms
    for (const plat of platforms) {
      drawPlatform(plat);
    }

    // Jump pads
    for (const pad of jumppads) {
      drawJumpPad(pad);
    }

    // Obstacles
    for (const obs of obstacles) {
      drawObstacle(obs);
    }

    // Player (only when playing or paused)
    if (isStarted || isPaused) {
      drawPlayer();
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

    // Score text
    if (isStarted || isGameOver) {
      drawScore();
    }

    // Overlays
    if (isLoading) {
      gameLoadingHud(canvas, ctx);
    } else if (!isStarted && !isGameOver) {
      gameStartHud(canvas, ctx);
    } else if (isPaused) {
      gamePauseHud(canvas, ctx);
    } else if (isGameOver) {
      gameOverHud.render(Math.floor(score));
    }
  };

  const drawGrid = () => {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;

    // Vertical lines (scrolling)
    for (let x = -gridOffset; x < CANVAS_WIDTH; x += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GROUND_Y);
      ctx.stroke();
    }

    // Horizontal lines (static)
    for (let y = 0; y < GROUND_Y; y += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  };

  const drawGround = () => {
    // Build a list of pit ranges for exclusion
    const pits: { left: number; right: number }[] = [];
    for (const obs of obstacles) {
      if (obs.type === 'pit') {
        pits.push({ left: obs.x, right: obs.x + obs.width });
      }
    }

    // Draw ground, skipping pits
    ctx.fillStyle = COLORS.ground;

    if (pits.length === 0) {
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, GROUND_HEIGHT);
    } else {
      // Sort pits by left edge
      pits.sort((a, b) => a.left - b.left);

      let drawX = 0;
      for (const pit of pits) {
        const pitLeft = Math.max(0, pit.left);
        const pitRight = Math.min(CANVAS_WIDTH, pit.right);

        if (drawX < pitLeft) {
          ctx.fillRect(drawX, GROUND_Y, pitLeft - drawX, GROUND_HEIGHT);
        }

        // Draw pit darkness
        if (pitLeft < pitRight) {
          ctx.fillStyle = COLORS.pit;
          ctx.fillRect(pitLeft, GROUND_Y, pitRight - pitLeft, GROUND_HEIGHT);
          ctx.fillStyle = COLORS.ground;
        }

        drawX = pitRight;
      }

      // Draw remaining ground after last pit
      if (drawX < CANVAS_WIDTH) {
        ctx.fillRect(drawX, GROUND_Y, CANVAS_WIDTH - drawX, GROUND_HEIGHT);
      }
    }

    // Ground top line
    ctx.strokeStyle = COLORS.groundLine;
    ctx.lineWidth = 2;
    ctx.beginPath();

    if (pits.length === 0) {
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    } else {
      let lineX = 0;
      for (const pit of pits) {
        const pitLeft = Math.max(0, pit.left);
        const pitRight = Math.min(CANVAS_WIDTH, pit.right);

        if (lineX < pitLeft) {
          ctx.moveTo(lineX, GROUND_Y);
          ctx.lineTo(pitLeft, GROUND_Y);
        }

        // Pit edges (vertical lines down)
        if (pitLeft >= 0 && pitLeft <= CANVAS_WIDTH) {
          ctx.moveTo(pitLeft, GROUND_Y);
          ctx.lineTo(pitLeft, GROUND_Y + GROUND_HEIGHT);
        }
        if (pitRight >= 0 && pitRight <= CANVAS_WIDTH) {
          ctx.moveTo(pitRight, GROUND_Y + GROUND_HEIGHT);
          ctx.lineTo(pitRight, GROUND_Y);
        }

        lineX = pitRight;
      }

      if (lineX < CANVAS_WIDTH) {
        ctx.moveTo(lineX, GROUND_Y);
        ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      }
    }

    ctx.stroke();
  };

  const drawPlatform = (plat: TPlatformBlock) => {
    // Block body
    ctx.fillStyle = COLORS.platform;
    ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

    // Top highlight
    ctx.fillStyle = COLORS.platformTop;
    ctx.fillRect(plat.x, plat.y, plat.width, 3);

    // Border
    ctx.strokeStyle = COLORS.platformBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
  };

  const drawJumpPad = (pad: TJumpPad) => {
    ctx.fillStyle = pad.triggered ? COLORS.jumppadTriggered : COLORS.jumppad;

    // Trapezoid shape (wider at bottom, narrower at top)
    ctx.beginPath();
    ctx.moveTo(pad.x + 3, pad.y + pad.height);
    ctx.lineTo(pad.x - 3 + pad.width, pad.y + pad.height);
    ctx.lineTo(pad.x + pad.width - 6, pad.y);
    ctx.lineTo(pad.x + 6, pad.y);
    ctx.closePath();
    ctx.fill();

    // Glow effect
    if (!pad.triggered) {
      ctx.shadowColor = COLORS.jumppadGlow;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  };

  const drawObstacle = (obs: TObstacle) => {
    if (obs.type === 'spike') {
      // Triangle spike
      ctx.fillStyle = COLORS.spike;
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y + obs.height); // bottom left
      ctx.lineTo(obs.x + obs.width / 2, obs.y); // top center
      ctx.lineTo(obs.x + obs.width, obs.y + obs.height); // bottom right
      ctx.closePath();
      ctx.fill();

      // Neon outline
      ctx.strokeStyle = COLORS.neon;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Pit is drawn by drawGround
  };

  const drawPlayer = () => {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation);

    const half = player.size / 2;

    // Glow effect
    ctx.shadowColor = COLORS.playerGlow;
    ctx.shadowBlur = 15;

    // Player square
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(-half, -half, player.size, player.size);

    // Border
    ctx.strokeStyle = COLORS.neon;
    ctx.lineWidth = 2;
    ctx.strokeRect(-half, -half, player.size, player.size);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Inner icon (small square)
    ctx.fillStyle = COLORS.neon;
    const innerSize = player.size * 0.3;
    ctx.fillRect(-innerSize / 2, -innerSize / 2, innerSize, innerSize);

    ctx.restore();
  };

  const drawScore = () => {
    ctx.save();
    ctx.fillStyle = COLORS.scoreText;
    ctx.font = 'bold 24px "Space Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    // Text shadow for readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillText(`${Math.floor(score)}`, CANVAS_WIDTH - 20, 20);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
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

  // --- Input Handler ---
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    // Game over HUD handles keys first
    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, Math.floor(score));
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
      case 'ArrowUp':
        e.preventDefault();
        if (isStarted && !isPaused && !isGameOver && player.isGrounded) {
          player.vy = JUMP_VELOCITY;
          player.isGrounded = false;
        }
        break;
    }
  };

  // --- Setup ---
  window.addEventListener('keydown', handleKeyDown);

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('keydown', handleKeyDown);
  };
};
