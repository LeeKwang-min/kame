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
  PLAYER_X,
  ASCEND_FORCE,
  GRAVITY,
  MAX_VY,
  SEGMENT_WIDTH,
  INITIAL_GAP,
  MIN_GAP,
  GAP_DECREASE_RATE,
  CAVE_ROUGHNESS,
  CAVE_MARGIN,
  BASE_SPEED,
  MAX_SPEED,
  SPEED_INCREASE_RATE,
  PARTICLE_COUNT,
  PARTICLE_LIFE,
  TRAIL_PARTICLE_INTERVAL,
  COLORS,
} from './config';
import { TCaveSegment, TParticle, TPlayer } from './types';

export type THelicopterCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupHelicopter = (
  canvas: HTMLCanvasElement,
  callbacks?: THelicopterCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // --- State ---
  let cave: TCaveSegment[] = [];
  let player: TPlayer = {
    x: PLAYER_X,
    y: CANVAS_HEIGHT / 2,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    vy: 0,
  };
  let particles: TParticle[] = [];

  let score = 0;
  let elapsedTime = 0;
  let speed = BASE_SPEED;
  let isHolding = false;

  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  let animationId = 0;

  let trailTimer = 0;
  let propellerAngle = 0;
  let caveOffset = 0; // tracks total horizontal distance for sine wave

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
    'helicopter',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Cave Generation ---
  const initCave = () => {
    cave = [];
    caveOffset = 0;
    const centerY = CANVAS_HEIGHT / 2;
    const gap = INITIAL_GAP;
    const segmentCount = Math.ceil(CANVAS_WIDTH / SEGMENT_WIDTH) + 10;

    for (let i = 0; i < segmentCount; i++) {
      const x = i * SEGMENT_WIDTH;
      const topY = centerY - gap / 2;
      const bottomY = centerY + gap / 2;
      cave.push({ x, topY, bottomY, width: SEGMENT_WIDTH });
    }
  };

  const addCaveSegment = () => {
    const last = cave[cave.length - 1];
    const gap = Math.max(MIN_GAP, INITIAL_GAP - elapsedTime * GAP_DECREASE_RATE);

    // Sine wave center drift
    caveOffset += SEGMENT_WIDTH;
    const centerWave =
      Math.sin(caveOffset * 0.005) * 60 + Math.sin(caveOffset * 0.002) * 40;
    const baseCenter = CANVAS_HEIGHT / 2 + centerWave;

    // Random roughness based on previous segment
    const prevCenter = (last.topY + last.bottomY) / 2;
    const roughness = (Math.random() - 0.5) * 2 * CAVE_ROUGHNESS;
    let newCenter = prevCenter + roughness;

    // Blend toward sine wave center
    newCenter = newCenter * 0.7 + baseCenter * 0.3;

    // Clamp so cave stays within canvas
    const halfGap = gap / 2;
    newCenter = Math.max(CAVE_MARGIN + halfGap, newCenter);
    newCenter = Math.min(CANVAS_HEIGHT - CAVE_MARGIN - halfGap, newCenter);

    const topY = newCenter - halfGap;
    const bottomY = newCenter + halfGap;
    const x = last.x + SEGMENT_WIDTH;

    cave.push({ x, topY, bottomY, width: SEGMENT_WIDTH });
  };

  // --- Particles ---
  const spawnTrailParticle = () => {
    const spread = 4;
    for (let i = 0; i < 2; i++) {
      particles.push({
        x: player.x - player.width / 2 + (Math.random() - 0.5) * spread,
        y: player.y + (Math.random() - 0.5) * player.height * 0.5,
        vx: -(speed * 0.3 + Math.random() * 30),
        vy: (Math.random() - 0.5) * 40,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        size: 1.5 + Math.random() * 2,
        color: COLORS.trail,
      });
    }
  };

  const spawnExplosionParticles = (x: number, y: number) => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT;
      const spd = 50 + Math.random() * 150;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: PARTICLE_LIFE + Math.random() * 0.3,
        maxLife: PARTICLE_LIFE + 0.3,
        size: 2 + Math.random() * 4,
        color: i % 2 === 0 ? COLORS.particle : COLORS.warning,
      });
    }
  };

  // --- Collision ---
  const checkCollision = (): boolean => {
    const px = player.x;
    const py = player.y;
    const halfW = player.width / 2;
    const halfH = player.height / 2;

    // Find cave segments that overlap with the player
    for (const seg of cave) {
      const segLeft = seg.x;
      const segRight = seg.x + seg.width;

      // Check horizontal overlap
      if (segRight < px - halfW || segLeft > px + halfW) continue;

      // Check if player top is above cave ceiling or player bottom is below cave floor
      if (py - halfH < seg.topY || py + halfH > seg.bottomY) {
        return true;
      }
    }

    // Also check canvas bounds
    if (py - player.height / 2 < 0 || py + player.height / 2 > CANVAS_HEIGHT) {
      return true;
    }

    return false;
  };

  // --- Reset ---
  const resetGame = () => {
    cave = [];
    particles = [];
    score = 0;
    elapsedTime = 0;
    speed = BASE_SPEED;
    isHolding = false;
    isStarted = false;
    isLoading = false;
    isGameOver = false;
    isPaused = false;
    trailTimer = 0;
    propellerAngle = 0;
    caveOffset = 0;
    player = {
      x: PLAYER_X,
      y: CANVAS_HEIGHT / 2,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      vy: 0,
    };
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
    score = 0;
    elapsedTime = 0;
    speed = BASE_SPEED;
    isHolding = false;
    trailTimer = 0;
    propellerAngle = 0;
    particles = [];
    player = {
      x: PLAYER_X,
      y: CANVAS_HEIGHT / 2,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      vy: 0,
    };
    initCave();
  };

  // --- Game Over ---
  const triggerGameOver = () => {
    spawnExplosionParticles(player.x, player.y);
    isGameOver = true;
    isStarted = false;
  };

  // --- Update ---
  const update = (dt: number) => {
    if (!isStarted || isPaused) return;

    elapsedTime += dt;

    // Increase speed over time
    speed = Math.min(MAX_SPEED, BASE_SPEED + elapsedTime * SPEED_INCREASE_RATE);

    // Player physics
    if (isHolding) {
      player.vy += ASCEND_FORCE * dt;
    } else {
      player.vy += GRAVITY * dt;
    }
    player.vy = Math.max(-MAX_VY, Math.min(MAX_VY, player.vy));
    player.y += player.vy * dt;

    // Scroll cave segments
    const scrollAmount = speed * dt;
    for (const seg of cave) {
      seg.x -= scrollAmount;
    }

    // Remove segments that have scrolled off screen
    while (cave.length > 0 && cave[0].x + cave[0].width < 0) {
      cave.shift();
    }

    // Add new segments at the right edge
    while (
      cave.length === 0 ||
      cave[cave.length - 1].x < CANVAS_WIDTH + SEGMENT_WIDTH
    ) {
      addCaveSegment();
    }

    // Score: distance-based
    score += speed * dt * 0.1;

    // Trail particles
    trailTimer += dt;
    if (trailTimer >= TRAIL_PARTICLE_INTERVAL) {
      trailTimer = 0;
      spawnTrailParticle();
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Propeller animation
    propellerAngle += dt * 25;

    // Collision check
    if (checkCollision()) {
      triggerGameOver();
    }
  };

  // --- Render ---
  const render = () => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw cave
    drawCave();

    // Draw particles
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

    // Draw player (only when playing or paused)
    if (isStarted || isPaused) {
      drawPlayer();
    }

    // Draw HUD
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

  // --- Draw Cave ---
  const drawCave = () => {
    if (cave.length === 0) return;

    // Draw ceiling fill
    ctx.fillStyle = COLORS.caveTop;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const seg of cave) {
      ctx.lineTo(seg.x, seg.topY);
      ctx.lineTo(seg.x + seg.width, seg.topY);
    }
    ctx.lineTo(CANVAS_WIDTH, 0);
    ctx.closePath();
    ctx.fill();

    // Draw floor fill
    ctx.fillStyle = COLORS.caveBottom;
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT);
    for (const seg of cave) {
      ctx.lineTo(seg.x, seg.bottomY);
      ctx.lineTo(seg.x + seg.width, seg.bottomY);
    }
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Draw cave border lines
    ctx.strokeStyle = COLORS.caveBorder;
    ctx.lineWidth = 2;

    // Ceiling border
    ctx.beginPath();
    for (let i = 0; i < cave.length; i++) {
      const seg = cave[i];
      if (i === 0) {
        ctx.moveTo(seg.x, seg.topY);
      } else {
        ctx.lineTo(seg.x, seg.topY);
      }
    }
    ctx.stroke();

    // Floor border
    ctx.beginPath();
    for (let i = 0; i < cave.length; i++) {
      const seg = cave[i];
      if (i === 0) {
        ctx.moveTo(seg.x, seg.bottomY);
      } else {
        ctx.lineTo(seg.x, seg.bottomY);
      }
    }
    ctx.stroke();
  };

  // --- Draw Player ---
  const drawPlayer = () => {
    const px = player.x;
    const py = player.y;
    const hw = player.width / 2;
    const hh = player.height / 2;

    ctx.save();

    // Glow
    ctx.shadowColor = COLORS.playerGlow;
    ctx.shadowBlur = 15;

    // Body
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(px - hw, py - hh, player.width, player.height);

    // Tail (small triangle at back)
    ctx.beginPath();
    ctx.moveTo(px - hw, py - hh);
    ctx.lineTo(px - hw - 8, py);
    ctx.lineTo(px - hw, py + hh);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    // Propeller on top
    const propLen = 12;
    const propX = px;
    const propY = py - hh - 2;
    ctx.strokeStyle = COLORS.propeller;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const dx = Math.cos(propellerAngle) * propLen;
    ctx.moveTo(propX - dx, propY);
    ctx.lineTo(propX + dx, propY);
    ctx.stroke();

    // Propeller hub
    ctx.fillStyle = COLORS.propeller;
    ctx.beginPath();
    ctx.arc(propX, propY, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // --- Draw HUD ---
  const drawHud = () => {
    if (!isStarted && !isGameOver && !isPaused) return;

    ctx.save();
    ctx.fillStyle = COLORS.scoreText;
    ctx.font = 'bold 24px "Space Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    const scoreText = `${Math.floor(score)}m`;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText(scoreText, CANVAS_WIDTH - 15, 15);
    ctx.fillText(scoreText, CANVAS_WIDTH - 15, 15);

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

  // --- Input Handlers ---
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    // Game over HUD handles keys first
    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (isStarted && !isPaused && !isGameOver) {
          isHolding = true;
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
      case 'Space':
        isHolding = false;
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
