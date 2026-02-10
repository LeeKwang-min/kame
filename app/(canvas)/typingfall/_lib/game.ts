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
  SEA_Y,
  WAVE_AMPLITUDE,
  WAVE_FREQUENCY,
  WAVE_SPEED,
  MAX_LIVES,
  SPAWN_INTERVAL_START,
  SPAWN_INTERVAL_MIN,
  WORD_SPEED_START,
  WORD_SPEED_MAX,
  WORD_FONT_SIZE,
  SCORE_PER_LETTER,
  BOAT_SPEED,
  BOAT_WIDTH,
  BOAT_HEIGHT,
  PARTICLE_COUNT,
  PARTICLE_LIFE,
  EASY_WORDS,
  MEDIUM_WORDS,
  HARD_WORDS,
} from './config';
import {
  TFallingWord,
  TParticle,
  TFloatingText,
  TCloud,
  TBoat,
} from './types';

export type TTypingfallCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupTypingfall = (
  canvas: HTMLCanvasElement,
  callbacks?: TTypingfallCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // --- State ---
  let words: TFallingWord[] = [];
  let particles: TParticle[] = [];
  let floatingTexts: TFloatingText[] = [];
  let clouds: TCloud[] = [];

  let score = 0;
  let lives = MAX_LIVES;
  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;

  let typingBuffer = '';
  let cursorBlink = 0;

  let spawnTimer = 0;
  let sec = 0;
  let waveTime = 0;

  let lastTime = 0;
  let animationId = 0;

  // Boat state
  const boat: TBoat = {
    x: CANVAS_WIDTH / 2,
    direction: 1,
    speed: BOAT_SPEED,
    bobPhase: 0,
  };

  // Init clouds
  const initClouds = () => {
    clouds = [];
    for (let i = 0; i < 5; i++) {
      clouds.push({
        x: Math.random() * CANVAS_WIDTH,
        y: 30 + Math.random() * 120,
        width: 60 + Math.random() * 80,
        speed: 8 + Math.random() * 15,
        opacity: 0.3 + Math.random() * 0.4,
      });
    }
  };
  initClouds();

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
    'typingfall',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Helpers ---
  const rand = (min: number, max: number) =>
    min + Math.random() * (max - min);

  const pickWord = (): string => {
    const difficulty = Math.min(sec / 90, 1);
    const r = Math.random();

    if (difficulty < 0.3) {
      // Early game: mostly easy
      if (r < 0.8) return EASY_WORDS[Math.floor(Math.random() * EASY_WORDS.length)];
      return MEDIUM_WORDS[Math.floor(Math.random() * MEDIUM_WORDS.length)];
    } else if (difficulty < 0.7) {
      // Mid game: mix
      if (r < 0.3) return EASY_WORDS[Math.floor(Math.random() * EASY_WORDS.length)];
      if (r < 0.8) return MEDIUM_WORDS[Math.floor(Math.random() * MEDIUM_WORDS.length)];
      return HARD_WORDS[Math.floor(Math.random() * HARD_WORDS.length)];
    } else {
      // Late game: mostly hard
      if (r < 0.15) return EASY_WORDS[Math.floor(Math.random() * EASY_WORDS.length)];
      if (r < 0.5) return MEDIUM_WORDS[Math.floor(Math.random() * MEDIUM_WORDS.length)];
      return HARD_WORDS[Math.floor(Math.random() * HARD_WORDS.length)];
    }
  };

  const measureWordWidth = (word: string): number => {
    ctx.font = `bold ${WORD_FONT_SIZE}px monospace`;
    return ctx.measureText(word).width;
  };

  // --- Spawn ---
  const spawnWord = () => {
    const word = pickWord();
    const width = measureWordWidth(word);
    const x = rand(width / 2 + 10, CANVAS_WIDTH - width / 2 - 10);
    const difficulty = Math.min(sec / 90, 1);
    const speed = WORD_SPEED_START + difficulty * (WORD_SPEED_MAX - WORD_SPEED_START);

    words.push({
      x,
      y: -20,
      speed: speed + rand(-10, 10),
      word,
      width,
    });
  };

  // --- Splash particles ---
  const spawnSplashParticles = (x: number, y: number) => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
      const speed = rand(80, 180);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        size: rand(2, 5),
        color: `hsl(${200 + Math.random() * 20}, 80%, ${60 + Math.random() * 20}%)`,
        gravity: 300,
      });
    }
  };

  // --- Word match particles ---
  const spawnMatchParticles = (x: number, y: number) => {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(60, 150);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        size: rand(2, 4),
        color: `hsl(${50 + Math.random() * 30}, 100%, ${60 + Math.random() * 20}%)`,
        gravity: 200,
      });
    }
  };

  // --- Submit word ---
  const submitWord = () => {
    if (typingBuffer.length === 0) return;

    const input = typingBuffer.toLowerCase();
    typingBuffer = '';

    // Find matching word
    const idx = words.findIndex((w) => w.word === input);
    if (idx === -1) return;

    const matched = words[idx];
    words.splice(idx, 1);

    const gained = matched.word.length * SCORE_PER_LETTER;
    score += gained;

    // Effects
    spawnMatchParticles(matched.x, matched.y);
    floatingTexts.push({
      x: matched.x,
      y: matched.y - 20,
      text: `+${gained}`,
      alpha: 1,
      color: '#FFD700',
      life: 1.2,
    });
  };

  // --- Reset ---
  const resetGame = () => {
    words = [];
    particles = [];
    floatingTexts = [];
    score = 0;
    lives = MAX_LIVES;
    isStarted = false;
    isLoading = false;
    isGameOver = false;
    isPaused = false;
    typingBuffer = '';
    spawnTimer = 0;
    sec = 0;
    waveTime = 0;
    boat.x = CANVAS_WIDTH / 2;
    boat.direction = 1;
    boat.bobPhase = 0;
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
    lives = MAX_LIVES;
    words = [];
    particles = [];
    floatingTexts = [];
    typingBuffer = '';
    spawnTimer = 0;
    sec = 0;
    waveTime = 0;
  };

  const triggerGameOver = () => {
    isGameOver = true;
    isStarted = false;
  };

  // --- Update ---
  const update = (dt: number) => {
    // Always update visual elements
    waveTime += dt * WAVE_SPEED;
    cursorBlink += dt;

    // Update clouds always
    for (const cloud of clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x > CANVAS_WIDTH + cloud.width) {
        cloud.x = -cloud.width;
        cloud.y = 30 + Math.random() * 120;
      }
    }

    // Update boat always
    boat.bobPhase += dt * 2;
    boat.x += boat.direction * boat.speed * dt;
    if (boat.x > CANVAS_WIDTH - BOAT_WIDTH) {
      boat.direction = -1;
    } else if (boat.x < BOAT_WIDTH) {
      boat.direction = 1;
    }

    if (!isStarted || isPaused) return;

    sec += dt;

    // Spawn timer
    const difficulty = Math.min(sec / 90, 1);
    const spawnInterval =
      SPAWN_INTERVAL_START -
      difficulty * (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN);

    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnWord();
    }

    // Update words
    for (let i = words.length - 1; i >= 0; i--) {
      const w = words[i];
      w.y += w.speed * dt;

      // Word reached the sea
      if (w.y > SEA_Y) {
        spawnSplashParticles(w.x, SEA_Y);
        floatingTexts.push({
          x: w.x,
          y: SEA_Y - 20,
          text: 'X',
          alpha: 1,
          color: '#ff4444',
          life: 1,
        });
        words.splice(i, 1);
        lives--;

        if (lives <= 0) {
          triggerGameOver();
          return;
        }
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
  };

  // --- Render ---
  const render = () => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawSky();
    drawClouds();
    drawWords();
    drawSea();
    drawBoat();
    drawParticles();
    drawFloatingTexts();
    drawInputBox();
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

  const drawSky = () => {
    const gradient = ctx.createLinearGradient(0, 0, 0, SEA_Y);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.4, '#B0E0E6');
    gradient.addColorStop(0.7, '#E0F0FF');
    gradient.addColorStop(1, '#F0F8FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, SEA_Y);
  };

  const drawClouds = () => {
    for (const cloud of clouds) {
      ctx.save();
      ctx.globalAlpha = cloud.opacity;
      ctx.fillStyle = '#ffffff';

      // Cloud shape: overlapping circles
      const w = cloud.width;
      const h = w * 0.4;
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, w * 0.3, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloud.x - w * 0.2, cloud.y + h * 0.15, w * 0.22, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloud.x + w * 0.2, cloud.y + h * 0.1, w * 0.25, h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloud.x + w * 0.05, cloud.y - h * 0.2, w * 0.2, h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  };

  const drawSea = () => {
    // Animated wave surface
    ctx.beginPath();
    ctx.moveTo(0, SEA_Y);

    for (let x = 0; x <= CANVAS_WIDTH; x += 4) {
      const waveY =
        SEA_Y +
        Math.sin(x * WAVE_FREQUENCY + waveTime) * WAVE_AMPLITUDE +
        Math.sin(x * WAVE_FREQUENCY * 1.5 + waveTime * 0.7) * WAVE_AMPLITUDE * 0.5;
      ctx.lineTo(x, waveY);
    }

    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.closePath();

    const seaGradient = ctx.createLinearGradient(0, SEA_Y, 0, CANVAS_HEIGHT);
    seaGradient.addColorStop(0, '#4A90D9');
    seaGradient.addColorStop(0.3, '#357ABD');
    seaGradient.addColorStop(0.7, '#2C5F8A');
    seaGradient.addColorStop(1, '#1A3A5C');
    ctx.fillStyle = seaGradient;
    ctx.fill();

    // Wave highlight line
    ctx.beginPath();
    ctx.moveTo(0, SEA_Y);
    for (let x = 0; x <= CANVAS_WIDTH; x += 4) {
      const waveY =
        SEA_Y +
        Math.sin(x * WAVE_FREQUENCY + waveTime) * WAVE_AMPLITUDE +
        Math.sin(x * WAVE_FREQUENCY * 1.5 + waveTime * 0.7) * WAVE_AMPLITUDE * 0.5;
      ctx.lineTo(x, waveY);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Foam dots on wave
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let x = 0; x < CANVAS_WIDTH; x += 30) {
      const waveY =
        SEA_Y +
        Math.sin(x * WAVE_FREQUENCY + waveTime) * WAVE_AMPLITUDE +
        Math.sin(x * WAVE_FREQUENCY * 1.5 + waveTime * 0.7) * WAVE_AMPLITUDE * 0.5;
      const foamSize = 1.5 + Math.sin(x * 0.1 + waveTime * 3) * 0.8;
      if (foamSize > 1) {
        ctx.beginPath();
        ctx.arc(x, waveY + 3, foamSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawBoat = () => {
    const bobY = Math.sin(boat.bobPhase) * 4;
    const bx = boat.x;
    const by = SEA_Y - BOAT_HEIGHT * 0.3 + bobY;
    const tilt = Math.sin(boat.bobPhase * 0.8) * 0.05;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(tilt);

    // Hull
    ctx.beginPath();
    ctx.moveTo(-BOAT_WIDTH / 2, 0);
    ctx.lineTo(-BOAT_WIDTH / 2 + 8, BOAT_HEIGHT * 0.6);
    ctx.lineTo(BOAT_WIDTH / 2 - 8, BOAT_HEIGHT * 0.6);
    ctx.lineTo(BOAT_WIDTH / 2, 0);
    ctx.closePath();
    const hullGrad = ctx.createLinearGradient(0, 0, 0, BOAT_HEIGHT * 0.6);
    hullGrad.addColorStop(0, '#8B4513');
    hullGrad.addColorStop(1, '#5C2E0A');
    ctx.fillStyle = hullGrad;
    ctx.fill();
    ctx.strokeStyle = '#3E1A00';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Hull stripe
    ctx.beginPath();
    ctx.moveTo(-BOAT_WIDTH / 2 + 4, BOAT_HEIGHT * 0.3);
    ctx.lineTo(BOAT_WIDTH / 2 - 4, BOAT_HEIGHT * 0.3);
    ctx.strokeStyle = '#D4A574';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mast
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -BOAT_HEIGHT * 1.5);
    ctx.strokeStyle = '#5C2E0A';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Sail
    ctx.beginPath();
    ctx.moveTo(0, -BOAT_HEIGHT * 1.4);
    ctx.quadraticCurveTo(
      BOAT_WIDTH * 0.4 * boat.direction,
      -BOAT_HEIGHT * 0.8,
      0,
      -BOAT_HEIGHT * 0.2,
    );
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Flag
    ctx.beginPath();
    ctx.moveTo(0, -BOAT_HEIGHT * 1.5);
    ctx.lineTo(10 * boat.direction, -BOAT_HEIGHT * 1.5 - 5);
    ctx.lineTo(0, -BOAT_HEIGHT * 1.5 - 10);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();

    ctx.restore();
  };

  const drawWords = () => {
    ctx.font = `bold ${WORD_FONT_SIZE}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const w of words) {
      // Glow background
      const padding = 8;
      const boxW = w.width + padding * 2;
      const boxH = WORD_FONT_SIZE + padding * 2;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.roundRect(w.x - boxW / 2, w.y - boxH / 2, boxW, boxH, 6);
      ctx.fill();

      // Highlight matched prefix
      const input = typingBuffer.toLowerCase();
      const wordStr = w.word;
      const isPartialMatch = wordStr.startsWith(input) && input.length > 0;

      if (isPartialMatch) {
        // Draw matched portion in green
        const matchedPart = wordStr.slice(0, input.length);
        const remainPart = wordStr.slice(input.length);

        const matchedWidth = ctx.measureText(matchedPart).width;
        const remainWidth = ctx.measureText(remainPart).width;
        const totalWidth = matchedWidth + remainWidth;
        const startX = w.x - totalWidth / 2;

        // Matched text (green)
        ctx.fillStyle = '#00FF88';
        ctx.shadowColor = '#00FF88';
        ctx.shadowBlur = 8;
        ctx.textAlign = 'left';
        ctx.fillText(matchedPart, startX, w.y);

        // Remaining text (white)
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(remainPart, startX + matchedWidth, w.y);
      } else {
        // Normal white text
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.textAlign = 'center';
        ctx.fillText(wordStr, w.x, w.y);
      }

      ctx.restore();
    }
  };

  const drawParticles = () => {
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
  };

  const drawFloatingTexts = () => {
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
  };

  const drawInputBox = () => {
    if (!isStarted || isGameOver) return;

    const boxWidth = 300;
    const boxHeight = 36;
    const boxX = (CANVAS_WIDTH - boxWidth) / 2;
    const boxY = SEA_Y - boxHeight - 12;

    // Box background
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = typingBuffer.length > 0 ? 'rgba(0, 255, 136, 0.6)' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
    ctx.stroke();

    // Text
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    const textX = boxX + 12;
    const textY = boxY + boxHeight / 2;

    if (typingBuffer.length > 0) {
      ctx.fillText(typingBuffer, textX, textY);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillText('type the word...', textX, textY);
    }

    // Blinking cursor
    const showCursor = Math.floor(cursorBlink * 2) % 2 === 0;
    if (showCursor) {
      const cursorX = textX + ctx.measureText(typingBuffer).width + 2;
      ctx.fillStyle = '#00FF88';
      ctx.fillRect(cursorX, boxY + 8, 2, boxHeight - 16);
    }

    ctx.restore();
  };

  const drawHud = () => {
    if (!isStarted && !isGameOver) return;

    ctx.save();

    // Score (top left)
    ctx.fillStyle = '#1A3A5C';
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

  // --- Input Handlers ---
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    // Game over HUD handles keys first
    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    // Typing during gameplay
    if (isStarted && !isPaused && !isGameOver) {
      // A-Z keys -> typing buffer
      if (e.code.startsWith('Key')) {
        e.preventDefault();
        const letter = e.code.slice(3).toLowerCase();
        typingBuffer += letter;
        return;
      }

      // Enter -> submit word
      if (e.code === 'Enter') {
        e.preventDefault();
        submitWord();
        return;
      }

      // Backspace -> delete last char
      if (e.code === 'Backspace') {
        e.preventDefault();
        typingBuffer = typingBuffer.slice(0, -1);
        return;
      }

      // Escape -> pause
      if (e.code === 'Escape') {
        isPaused = true;
        return;
      }
    }

    // Non-playing state controls
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
  window.addEventListener('keydown', handleKeyDown);

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('keydown', handleKeyDown);
  };
};
