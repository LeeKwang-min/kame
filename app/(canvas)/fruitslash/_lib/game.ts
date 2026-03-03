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
  GRAVITY,
  FRUIT_VY_MIN,
  FRUIT_VY_MAX,
  FRUIT_VX_MIN,
  FRUIT_VX_MAX,
  FRUIT_MIN_RADIUS,
  FRUIT_MAX_RADIUS,
  SPAWN_INTERVAL_START,
  SPAWN_INTERVAL_MIN,
  SPAWN_COUNT_MIN,
  SPAWN_COUNT_MAX,
  BOMB_CHANCE,
  CRITICAL_CHANCE,
  DRAGONFRUIT_CHANCE,
  DRAGONFRUIT_SCORE,
  CRITICAL_BONUS,
  COMBO_MIN_COUNT,
  MAX_LIVES,
  SLICE_TRAIL_DURATION,
  COMBO_WINDOW_MS,
  PARTICLE_COUNT,
  PARTICLE_LIFE,
  FRUIT_COLORS,
  NORMAL_FRUIT_TYPES,
  BOMB_RADIUS,
} from './config';
import {
  TFruit,
  TFruitHalf,
  TFruitType,
  TBomb,
  TSliceTrail,
  TParticle,
  TFloatingText,
} from './types';

export type TFruitNinjaCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupFruitNinja = (
  canvas: HTMLCanvasElement,
  callbacks?: TFruitNinjaCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // --- State ---
  let fruits: TFruit[] = [];
  let fruitHalves: TFruitHalf[] = [];
  let bombs: TBomb[] = [];
  let particles: TParticle[] = [];
  let floatingTexts: TFloatingText[] = [];
  let sliceTrail: TSliceTrail[] = [];

  let score = 0;
  let lives = MAX_LIVES;
  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;
  let isSlicing = false;

  let spawnTimer = 0;
  let sec = 0;

  // Combo window: fruits sliced within COMBO_WINDOW_MS count as one combo
  let comboBuffer: TFruit[] = [];
  let lastSliceTime = 0;

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
    'fruitninja',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Helpers ---
  const rand = (min: number, max: number) =>
    min + Math.random() * (max - min);

  const pickFruitType = (): TFruitType => {
    if (Math.random() < DRAGONFRUIT_CHANCE) return 'dragonfruit';
    return NORMAL_FRUIT_TYPES[
      Math.floor(Math.random() * NORMAL_FRUIT_TYPES.length)
    ];
  };

  // --- Spawn ---
  const spawnFruits = () => {
    const difficulty = Math.min(sec / 120, 1);
    const count =
      SPAWN_COUNT_MIN +
      Math.floor(Math.random() * (SPAWN_COUNT_MIN + difficulty * (SPAWN_COUNT_MAX - SPAWN_COUNT_MIN)));
    const clampedCount = Math.min(count, SPAWN_COUNT_MAX);

    for (let i = 0; i < clampedCount; i++) {
      const type = pickFruitType();
      const colors = FRUIT_COLORS[type];
      const radius = rand(FRUIT_MIN_RADIUS, FRUIT_MAX_RADIUS);
      const x = rand(CANVAS_WIDTH * 0.15, CANVAS_WIDTH * 0.85);
      const vy = rand(FRUIT_VY_MIN, FRUIT_VY_MAX);
      const vx = rand(FRUIT_VX_MIN, FRUIT_VX_MAX);
      const isCritical = Math.random() < CRITICAL_CHANCE;

      const fruit: TFruit = {
        x,
        y: CANVAS_HEIGHT + radius,
        vx,
        vy,
        radius,
        type,
        color: colors.outer,
        innerColor: colors.inner,
        seedColor: colors.seed,
        highlightColor: colors.highlight,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: rand(-4, 4),
        isSliced: false,
        isCritical,
      };
      fruits.push(fruit);
    }

    // Bomb spawn
    if (Math.random() < BOMB_CHANCE) {
      const x = rand(CANVAS_WIDTH * 0.15, CANVAS_WIDTH * 0.85);
      const vy = rand(FRUIT_VY_MIN, FRUIT_VY_MAX);
      const vx = rand(FRUIT_VX_MIN, FRUIT_VX_MAX);
      bombs.push({
        x,
        y: CANVAS_HEIGHT + BOMB_RADIUS,
        vx,
        vy,
        radius: BOMB_RADIUS,
        rotation: 0,
        rotationSpeed: rand(-3, 3),
      });
    }
  };

  // --- Collision: line-segment vs circle ---
  const lineCircleIntersect = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cx: number,
    cy: number,
    r: number,
  ): boolean => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;

    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);

    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
  };

  // --- Slice check ---
  const checkSliceCollisions = () => {
    if (sliceTrail.length < 2) return;

    const now = performance.now();
    const recentTrail = sliceTrail.filter(
      (p) => now - p.time < SLICE_TRAIL_DURATION,
    );
    if (recentTrail.length < 2) return;

    for (let i = 1; i < recentTrail.length; i++) {
      const p1 = recentTrail[i - 1];
      const p2 = recentTrail[i];

      // Check fruits
      for (const fruit of fruits) {
        if (fruit.isSliced) continue;
        if (
          lineCircleIntersect(
            p1.x,
            p1.y,
            p2.x,
            p2.y,
            fruit.x,
            fruit.y,
            fruit.radius,
          )
        ) {
          sliceFruit(fruit);
        }
      }

      // Check bombs
      for (const bomb of bombs) {
        if (
          lineCircleIntersect(
            p1.x,
            p1.y,
            p2.x,
            p2.y,
            bomb.x,
            bomb.y,
            bomb.radius,
          )
        ) {
          hitBomb(bomb);
          return;
        }
      }
    }
  };

  // --- Slice fruit ---
  const sliceFruit = (fruit: TFruit) => {
    fruit.isSliced = true;

    // Create two halves
    const sliceAngle = Math.random() * Math.PI;
    for (let side = -1; side <= 1; side += 2) {
      fruitHalves.push({
        x: fruit.x,
        y: fruit.y,
        vx: fruit.vx + side * rand(40, 80),
        vy: fruit.vy - rand(30, 80),
        rotation: fruit.rotation,
        rotationSpeed: side * rand(2, 5),
        alpha: 1,
        type: fruit.type,
        color: fruit.color,
        innerColor: fruit.innerColor,
        seedColor: fruit.seedColor,
        radius: fruit.radius,
        angle: sliceAngle,
      });
    }

    // Juice particles
    spawnJuiceParticles(fruit.x, fruit.y, fruit.innerColor);

    // Immediate score: 1 point per fruit
    let gained = 1;

    // Bonus: critical
    if (fruit.isCritical) {
      gained += CRITICAL_BONUS;
      floatingTexts.push({
        x: fruit.x,
        y: fruit.y - 40,
        text: `CRITICAL! +${CRITICAL_BONUS}`,
        alpha: 1,
        color: '#FFD700',
        life: 1.2,
      });
    }

    // Bonus: dragonfruit
    if (fruit.type === 'dragonfruit') {
      gained += DRAGONFRUIT_SCORE - 1;
      floatingTexts.push({
        x: fruit.x,
        y: fruit.y - 40,
        text: `DRAGON! +${DRAGONFRUIT_SCORE}`,
        alpha: 1,
        color: '#e84393',
        life: 1.2,
      });
    }

    score += gained;

    // Add to combo window buffer
    comboBuffer.push(fruit);
    lastSliceTime = performance.now();
  };

  // --- Hit bomb ---
  const hitBomb = (bomb: TBomb) => {
    // Explosion particles
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = rand(100, 250);
      particles.push({
        x: bomb.x,
        y: bomb.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE + rand(0, 0.3),
        maxLife: PARTICLE_LIFE + 0.3,
        size: rand(3, 6),
        color: i % 2 === 0 ? '#ff4500' : '#ff8c00',
        gravity: 200,
      });
    }

    floatingTexts.push({
      x: bomb.x,
      y: bomb.y - 30,
      text: 'BOOM!',
      alpha: 1,
      color: '#ff4500',
      life: 1.5,
    });

    triggerGameOver();
  };

  // --- Juice particles ---
  const spawnJuiceParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(60, 150);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        size: rand(2, 5),
        color,
        gravity: 300,
      });
    }
  };

  // --- Combo window: flush buffer when window expires ---
  const flushComboBuffer = () => {
    const count = comboBuffer.length;
    if (count < COMBO_MIN_COUNT) {
      comboBuffer = [];
      return;
    }

    // Combo bonus: extra points = count (on top of already awarded 1 per fruit)
    const bonus = count;
    score += bonus;

    // Show combo text at the midpoint of all combo fruits
    let avgX = 0;
    let avgY = 0;
    for (const f of comboBuffer) {
      avgX += f.x;
      avgY += f.y;
    }
    avgX /= count;
    avgY /= count;

    floatingTexts.push({
      x: avgX,
      y: avgY - 60,
      text: `COMBO x${count}! +${bonus}`,
      alpha: 1,
      color: '#00ff88',
      life: 1.5,
    });

    comboBuffer = [];
  };

  // --- Reset ---
  const resetGame = () => {
    fruits = [];
    fruitHalves = [];
    bombs = [];
    particles = [];
    floatingTexts = [];
    sliceTrail = [];
    comboBuffer = [];
    lastSliceTime = 0;
    score = 0;
    lives = MAX_LIVES;
    isStarted = false;
    isLoading = false;
    isGameOver = false;
    isPaused = false;
    isSlicing = false;
    spawnTimer = 0;
    sec = 0;
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
    lives = MAX_LIVES;
    fruits = [];
    fruitHalves = [];
    bombs = [];
    particles = [];
    floatingTexts = [];
    sliceTrail = [];
    comboBuffer = [];
    lastSliceTime = 0;
    spawnTimer = 0;
    sec = 0;
  };

  const triggerGameOver = () => {
    isGameOver = true;
    isStarted = false;
  };

  // --- Update ---
  const update = (dt: number) => {
    if (!isStarted || isPaused) return;

    sec += dt;

    // Spawn timer
    const difficulty = Math.min(sec / 120, 1);
    const spawnInterval =
      SPAWN_INTERVAL_START -
      difficulty * (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN);

    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnFruits();
    }

    // Update fruits
    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      if (f.isSliced) {
        fruits.splice(i, 1);
        continue;
      }
      f.x += f.vx * dt;
      f.vy += GRAVITY * dt;
      f.y += f.vy * dt;
      f.rotation += f.rotationSpeed * dt;

      // Missed fruit (fell below screen after going up)
      if (f.y > CANVAS_HEIGHT + f.radius && f.vy > 0) {
        fruits.splice(i, 1);
        lives--;

        // X mark floating text
        floatingTexts.push({
          x: Math.min(Math.max(f.x, 30), CANVAS_WIDTH - 30),
          y: CANVAS_HEIGHT - 40,
          text: 'X',
          alpha: 1,
          color: '#ff4444',
          life: 1,
        });

        if (lives <= 0) {
          triggerGameOver();
          return;
        }
      }
    }

    // Update bombs
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i];
      b.x += b.vx * dt;
      b.vy += GRAVITY * dt;
      b.y += b.vy * dt;
      b.rotation += b.rotationSpeed * dt;

      if (b.y > CANVAS_HEIGHT + b.radius && b.vy > 0) {
        bombs.splice(i, 1);
      }
    }

    // Update fruit halves
    for (let i = fruitHalves.length - 1; i >= 0; i--) {
      const h = fruitHalves[i];
      h.x += h.vx * dt;
      h.vy += GRAVITY * dt;
      h.y += h.vy * dt;
      h.rotation += h.rotationSpeed * dt;
      h.alpha -= dt * 1.2;
      if (h.alpha <= 0 || h.y > CANVAS_HEIGHT + 100) {
        fruitHalves.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.vy += p.gravity * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 50 * dt;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life);
      if (ft.life <= 0) {
        floatingTexts.splice(i, 1);
      }
    }

    // Clean old trail points
    const now = performance.now();
    sliceTrail = sliceTrail.filter(
      (p) => now - p.time < SLICE_TRAIL_DURATION * 3,
    );

    // Check collisions
    if (isSlicing) {
      checkSliceCollisions();
    }

    // Flush combo buffer when time window expires
    if (
      comboBuffer.length > 0 &&
      performance.now() - lastSliceTime > COMBO_WINDOW_MS
    ) {
      flushComboBuffer();
    }
  };

  // --- Render ---
  const render = () => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background gradient
    drawBackground();

    // Fruits
    for (const fruit of fruits) {
      drawFruit(fruit);
    }

    // Bombs
    for (const bomb of bombs) {
      drawBomb(bomb);
    }

    // Fruit halves
    for (const half of fruitHalves) {
      drawFruitHalf(half);
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

    // Slice trail
    drawSliceTrail();

    // Floating texts
    for (const ft of floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
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

  const drawBackground = () => {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#e0f7fa');
    gradient.addColorStop(0.3, '#fff9c4');
    gradient.addColorStop(0.6, '#fce4ec');
    gradient.addColorStop(1, '#e8f5e9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const drawFruit = (fruit: TFruit) => {
    ctx.save();
    ctx.translate(fruit.x, fruit.y);
    ctx.rotate(fruit.rotation);

    const r = fruit.radius;

    switch (fruit.type) {
      case 'watermelon':
        drawWatermelon(r, fruit);
        break;
      case 'orange':
        drawOrange(r, fruit);
        break;
      case 'apple':
        drawApple(r, fruit);
        break;
      case 'banana':
        drawBanana(r, fruit);
        break;
      case 'kiwi':
        drawKiwi(r, fruit);
        break;
      case 'dragonfruit':
        drawDragonfruit(r, fruit);
        break;
    }

    // Critical glow
    if (fruit.isCritical) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  };

  const drawWatermelon = (r: number, fruit: TFruit) => {
    // Dark green outer
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = fruit.color;
    ctx.fill();

    // Lighter green stripes
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = fruit.highlightColor;
    ctx.lineWidth = 3;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.35, -r);
      ctx.quadraticCurveTo(i * r * 0.35 + 4, 0, i * r * 0.35, r);
      ctx.stroke();
    }
    ctx.restore();

    // Glossy highlight
    const hlGrad = ctx.createRadialGradient(
      -r * 0.3, -r * 0.3, 0,
      -r * 0.3, -r * 0.3, r * 0.6,
    );
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawOrange = (r: number, fruit: TFruit) => {
    // Main body
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
    grad.addColorStop(0, fruit.highlightColor);
    grad.addColorStop(1, fruit.color);
    ctx.fillStyle = grad;
    ctx.fill();

    // Texture dots (peel pores)
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      const d = r * 0.55;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Small navel at top
    ctx.fillStyle = '#d68910';
    ctx.beginPath();
    ctx.arc(0, -r * 0.75, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Tiny leaf
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.ellipse(r * 0.08, -r * 0.85, r * 0.18, r * 0.08, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Glossy highlight
    const hlGrad = ctx.createRadialGradient(
      -r * 0.25, -r * 0.3, 0,
      -r * 0.25, -r * 0.3, r * 0.5,
    );
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawApple = (r: number, fruit: TFruit) => {
    // Main body (slightly taller oval)
    ctx.beginPath();
    ctx.ellipse(0, r * 0.05, r, r * 1.05, 0, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 0, 0, 0, r * 1.1);
    grad.addColorStop(0, fruit.highlightColor);
    grad.addColorStop(0.7, fruit.color);
    grad.addColorStop(1, '#a93226');
    ctx.fillStyle = grad;
    ctx.fill();

    // Stem
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.85);
    ctx.quadraticCurveTo(r * 0.1, -r * 1.15, r * 0.05, -r * 1.25);
    ctx.stroke();

    // Leaf
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.ellipse(r * 0.2, -r * 1.0, r * 0.22, r * 0.1, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Glossy highlight
    const hlGrad = ctx.createRadialGradient(
      -r * 0.3, -r * 0.35, 0,
      -r * 0.3, -r * 0.35, r * 0.55,
    );
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.45)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.05, r, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBanana = (r: number, fruit: TFruit) => {
    // Banana crescent shape
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.2);
    ctx.quadraticCurveTo(-r * 0.3, -r * 1.1, r * 0.7, -r * 0.7);
    ctx.quadraticCurveTo(r * 1.1, -r * 0.4, r * 0.9, r * 0.1);
    ctx.quadraticCurveTo(r * 0.2, -r * 0.5, -r * 0.4, -r * 0.1);
    ctx.quadraticCurveTo(-r * 0.9, r * 0.3, -r * 0.9, r * 0.2);
    ctx.closePath();

    const grad = ctx.createLinearGradient(-r, -r, r, r);
    grad.addColorStop(0, fruit.highlightColor);
    grad.addColorStop(0.5, fruit.color);
    grad.addColorStop(1, '#d4a017');
    ctx.fillStyle = grad;
    ctx.fill();

    // Brown tip
    ctx.fillStyle = '#8d6e43';
    ctx.beginPath();
    ctx.arc(-r * 0.85, r * 0.2, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Stem tip
    ctx.fillStyle = '#6d4c22';
    ctx.beginPath();
    ctx.arc(r * 0.75, -r * 0.65, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Glossy highlight
    const hlGrad = ctx.createRadialGradient(
      -r * 0.1, -r * 0.5, 0,
      -r * 0.1, -r * 0.5, r * 0.6,
    );
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawKiwi = (r: number, fruit: TFruit) => {
    // Brown fuzzy oval
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.8, 0, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
    grad.addColorStop(0, '#a07850');
    grad.addColorStop(1, fruit.color);
    ctx.fillStyle = grad;
    ctx.fill();

    // Fuzz texture
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * r * 0.85;
      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * dist,
        Math.sin(angle) * dist * 0.8,
        1,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // Glossy highlight
    const hlGrad = ctx.createRadialGradient(
      -r * 0.25, -r * 0.25, 0,
      -r * 0.25, -r * 0.25, r * 0.5,
    );
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawDragonfruit = (r: number, fruit: TFruit) => {
    // Pink oval body
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.9, r, 0, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-r * 0.15, -r * 0.2, 0, 0, 0, r);
    grad.addColorStop(0, fruit.highlightColor);
    grad.addColorStop(1, fruit.color);
    ctx.fillStyle = grad;
    ctx.fill();

    // Scale-like leaf tips
    ctx.fillStyle = '#c0267d';
    const tips = 7;
    for (let i = 0; i < tips; i++) {
      const a = (Math.PI * 2 * i) / tips - Math.PI / 2;
      ctx.save();
      ctx.translate(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.85);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-r * 0.12, -r * 0.35);
      ctx.lineTo(r * 0.12, -r * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Glossy highlight
    const hlGrad = ctx.createRadialGradient(
      -r * 0.25, -r * 0.3, 0,
      -r * 0.25, -r * 0.3, r * 0.5,
    );
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.9, r, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBomb = (bomb: TBomb) => {
    ctx.save();
    ctx.translate(bomb.x, bomb.y);
    ctx.rotate(bomb.rotation);

    // Body
    ctx.beginPath();
    ctx.arc(0, 0, bomb.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#2c2c2c';
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(-bomb.radius * 0.2, -bomb.radius * 0.2, bomb.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();

    // Fuse
    ctx.beginPath();
    ctx.moveTo(0, -bomb.radius);
    ctx.lineTo(5, -bomb.radius - 12);
    ctx.lineTo(10, -bomb.radius - 8);
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Spark on fuse
    const sparkSize = 3 + Math.sin(performance.now() / 100) * 2;
    ctx.beginPath();
    ctx.arc(10, -bomb.radius - 8, sparkSize, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6600';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, -bomb.radius - 8, sparkSize * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffff00';
    ctx.fill();

    // Skull icon
    ctx.fillStyle = '#666';
    ctx.font = `${bomb.radius * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☠', 0, 2);

    ctx.restore();
  };

  const drawFruitHalf = (half: TFruitHalf) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, half.alpha);
    ctx.translate(half.x, half.y);
    ctx.rotate(half.rotation);

    const r = half.radius;
    const a = half.angle;

    // Outer half (skin)
    ctx.beginPath();
    ctx.arc(0, 0, r, a, a + Math.PI);
    ctx.closePath();
    ctx.fillStyle = half.color;
    ctx.fill();

    // Inner flesh (cross-section)
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, a, a + Math.PI);
    ctx.closePath();
    ctx.fillStyle = half.innerColor;
    ctx.fill();

    // Seed details based on fruit type
    if (half.type === 'watermelon') {
      ctx.fillStyle = half.seedColor;
      for (let i = 0; i < 5; i++) {
        const sa = a + Math.PI * 0.2 + (Math.PI * 0.6 * i) / 4;
        const sd = r * 0.45;
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(sa) * sd,
          Math.sin(sa) * sd,
          3,
          1.5,
          sa,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    } else if (half.type === 'kiwi') {
      // White center + radiating seeds
      ctx.fillStyle = '#f0f0e0';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.15, r * 0.15, 0, a, a + Math.PI);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = half.seedColor;
      for (let i = 0; i < 8; i++) {
        const sa = a + Math.PI * 0.1 + (Math.PI * 0.8 * i) / 7;
        const sd = r * 0.5;
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sd, Math.sin(sa) * sd, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (half.type === 'dragonfruit') {
      ctx.fillStyle = half.seedColor;
      for (let i = 0; i < 10; i++) {
        const sa = a + Math.PI * 0.1 + (Math.PI * 0.8 * i) / 9;
        const sd = r * (0.25 + Math.random() * 0.35);
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sd, Math.sin(sa) * sd, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (half.type === 'orange') {
      // Orange segments
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const sa = a + (Math.PI * i) / 5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(sa) * r * 0.8, Math.sin(sa) * r * 0.8);
        ctx.stroke();
      }
      // Center dot
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else if (half.type === 'apple') {
      // Small seeds near center
      ctx.fillStyle = half.seedColor;
      for (let i = 0; i < 3; i++) {
        const sa = a + Math.PI * 0.3 + (Math.PI * 0.4 * i) / 2;
        const sd = r * 0.25;
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(sa) * sd,
          Math.sin(sa) * sd,
          2.5,
          1.5,
          sa,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    ctx.restore();
  };

  const drawSliceTrail = () => {
    if (sliceTrail.length < 2) return;

    const now = performance.now();
    const recent = sliceTrail.filter(
      (p) => now - p.time < SLICE_TRAIL_DURATION * 2,
    );
    if (recent.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Shadow pass (dark outline for visibility on light bg)
    for (let i = 1; i < recent.length; i++) {
      const age = now - recent[i].time;
      const alpha = Math.max(0, 1 - age / (SLICE_TRAIL_DURATION * 2));
      const width = Math.max(2, 6 * alpha);

      ctx.beginPath();
      ctx.moveTo(recent[i - 1].x, recent[i - 1].y);
      ctx.lineTo(recent[i].x, recent[i].y);
      ctx.strokeStyle = `rgba(100, 100, 140, ${alpha * 0.3})`;
      ctx.lineWidth = width;
      ctx.stroke();
    }

    // White core
    for (let i = 1; i < recent.length; i++) {
      const age = now - recent[i].time;
      const alpha = Math.max(0, 1 - age / (SLICE_TRAIL_DURATION * 2));
      const width = Math.max(1, 3 * alpha);

      ctx.beginPath();
      ctx.moveTo(recent[i - 1].x, recent[i - 1].y);
      ctx.lineTo(recent[i].x, recent[i].y);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
      ctx.lineWidth = width;
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawHud = () => {
    if (!isStarted && !isGameOver) return;

    ctx.save();

    // Score (top left)
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeText(`Score: ${score}`, 15, 15);
    ctx.fillText(`Score: ${score}`, 15, 15);

    // Lives (top right) - heart icons
    ctx.textAlign = 'right';
    ctx.font = '22px sans-serif';
    let heartsStr = '';
    for (let i = 0; i < MAX_LIVES; i++) {
      heartsStr += i < lives ? '❤️' : '🖤';
    }
    ctx.strokeText(heartsStr, CANVAS_WIDTH - 15, 15);
    ctx.fillText(heartsStr, CANVAS_WIDTH - 15, 15);

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

  // --- Mouse / Touch position helpers ---
  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  // --- Input Handlers ---
  const handleMouseDown = (e: MouseEvent) => {
    if (isGameOver || !isStarted || isPaused) return;
    isSlicing = true;
    const pos = getCanvasPos(e.clientX, e.clientY);
    sliceTrail = [{ x: pos.x, y: pos.y, time: performance.now() }];
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isSlicing || isGameOver || !isStarted || isPaused) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    sliceTrail.push({ x: pos.x, y: pos.y, time: performance.now() });
  };

  const handleMouseUp = () => {
    isSlicing = false;
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (isGameOver || !isStarted || isPaused) return;
    isSlicing = true;
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    sliceTrail = [{ x: pos.x, y: pos.y, time: performance.now() }];
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!isSlicing || isGameOver || !isStarted || isPaused) return;
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    sliceTrail.push({ x: pos.x, y: pos.y, time: performance.now() });
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    isSlicing = false;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    // Game over HUD handles keys first
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
    }
  };

  // --- Setup ---
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  window.addEventListener('keydown', handleKeyDown);

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('keydown', handleKeyDown);
  };
};
