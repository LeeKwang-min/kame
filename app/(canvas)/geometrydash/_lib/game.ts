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
  GRAVITY,
  GROUND_Y,
  GROUND_HEIGHT,
  BASE_SPEED,
  MAX_SPEED,
  SPEED_INCREASE_RATE,
  SPIKE_WIDTH,
  SPIKE_HEIGHT,
  BLOCK_WIDTH,
  BLOCK_HEIGHT,
  BLOCK_Y_OFFSET,
  PIT_WIDTH_MIN,
  PIT_WIDTH_MAX,
  MIN_OBSTACLE_GAP,
  MAX_OBSTACLE_GAP,
  OBSTACLE_GAP_DECREASE_RATE,
  MIN_GAP_FLOOR,
  PARTICLE_COUNT,
  PARTICLE_LIFE,
  GRID_SPACING,
  COLORS,
} from './config';
import { TObstacle, TObstacleType, TPlayer, TParticle, TGroundSegment } from './types';

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
  let groundSegments: TGroundSegment[] = [];
  let particles: TParticle[] = [];

  let score = 0;
  let speed = BASE_SPEED;
  let distanceSinceLastObstacle = 0;
  let nextObstacleGap = MIN_OBSTACLE_GAP;
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
    groundSegments = [];
    particles = [];
    score = 0;
    speed = BASE_SPEED;
    distanceSinceLastObstacle = 0;
    nextObstacleGap = MIN_OBSTACLE_GAP;
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
    groundSegments = [];
    particles = [];
    score = 0;
    speed = BASE_SPEED;
    distanceSinceLastObstacle = 0;
    nextObstacleGap = rand(MIN_OBSTACLE_GAP, MAX_OBSTACLE_GAP);
    gridOffset = 0;
    elapsedTime = 0;
  };

  const triggerGameOver = () => {
    spawnParticles(player.x, player.y);
    isGameOver = true;
    isStarted = false;
  };

  // --- Spawn Obstacle ---
  const spawnObstacle = () => {
    const roll = Math.random();
    let type: TObstacleType;

    if (roll < 0.45) {
      type = 'spike';
    } else if (roll < 0.75) {
      type = 'block';
    } else {
      type = 'pit';
    }

    if (type === 'spike') {
      const obstacle: TObstacle = {
        x: CANVAS_WIDTH + SPIKE_WIDTH,
        y: GROUND_Y - SPIKE_HEIGHT,
        width: SPIKE_WIDTH,
        height: SPIKE_HEIGHT,
        type: 'spike',
      };
      obstacles.push(obstacle);
    } else if (type === 'block') {
      const obstacle: TObstacle = {
        x: CANVAS_WIDTH + BLOCK_WIDTH,
        y: GROUND_Y - BLOCK_Y_OFFSET - BLOCK_HEIGHT,
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        type: 'block',
      };
      obstacles.push(obstacle);
    } else {
      // pit
      const pitWidth = rand(PIT_WIDTH_MIN, PIT_WIDTH_MAX);
      const obstacle: TObstacle = {
        x: CANVAS_WIDTH + pitWidth,
        y: GROUND_Y,
        width: pitWidth,
        height: GROUND_HEIGHT,
        type: 'pit',
      };
      obstacles.push(obstacle);

      // Add ground segment with pit
      groundSegments.push({
        x: CANVAS_WIDTH + pitWidth,
        width: pitWidth,
        hasPit: true,
      });
    }

    // Calculate next gap (decreasing over time)
    const currentMaxGap = Math.max(
      MIN_GAP_FLOOR,
      MAX_OBSTACLE_GAP - elapsedTime * OBSTACLE_GAP_DECREASE_RATE,
    );
    const currentMinGap = Math.max(MIN_GAP_FLOOR, MIN_OBSTACLE_GAP);
    nextObstacleGap = rand(currentMinGap, Math.max(currentMinGap, currentMaxGap));
    distanceSinceLastObstacle = 0;
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

      // AABB collision for spike and block
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

    // Player physics
    if (!player.isGrounded) {
      player.vy += GRAVITY * dt;
      player.y += player.vy * dt;

      // Rotation while in air
      player.rotation += dt * 6;

      // Check if over pit
      if (isOverPit()) {
        // Don't land, keep falling
        if (player.y > CANVAS_HEIGHT + player.size) {
          triggerGameOver();
          return;
        }
      } else {
        // Land on ground
        if (player.y >= PLAYER_GROUND_Y) {
          player.y = PLAYER_GROUND_Y;
          player.vy = 0;
          player.isGrounded = true;
          // Snap rotation to nearest 90 degrees
          player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
        }
      }
    } else {
      // On ground, check if a pit appeared below
      if (isOverPit()) {
        player.isGrounded = false;
        player.vy = 0;
      }
    }

    // Spawn obstacles
    distanceSinceLastObstacle += speed * dt;
    if (distanceSinceLastObstacle >= nextObstacleGap) {
      spawnObstacle();
    }

    // Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= speed * dt;

      // Remove off-screen obstacles
      if (obstacles[i].x + obstacles[i].width < -50) {
        obstacles.splice(i, 1);
      }
    }

    // Move ground segments
    for (let i = groundSegments.length - 1; i >= 0; i--) {
      groundSegments[i].x -= speed * dt;

      if (groundSegments[i].x + groundSegments[i].width < -50) {
        groundSegments.splice(i, 1);
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
    } else if (obs.type === 'block') {
      // Filled rectangle
      ctx.fillStyle = COLORS.block;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

      // Border
      ctx.strokeStyle = COLORS.blockBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

      // Inner cross pattern
      ctx.strokeStyle = COLORS.neon;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(obs.x, obs.y);
      ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
      ctx.moveTo(obs.x + obs.width, obs.y);
      ctx.lineTo(obs.x, obs.y + obs.height);
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
