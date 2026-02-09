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
  GAME_DURATION,
  SIMULTANEOUS_TARGETS,
  TARGET_LIFETIME,
  TARGET_DEFAULT_RADIUS,
  SPAWN_MARGIN,
  BASE_SCORE,
  SPEED_BONUS_MAX,
  COMBO_THRESHOLD,
  COMBO_MULTIPLIER,
  TARGET_COLORS,
  PARTICLE_COUNT,
  PARTICLE_LIFE,
  FLOATING_TEXT_DURATION,
} from './config';
import { TTarget, TParticle, TFloatingText, TGameStats } from './types';

export type TAimTrainerCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupAimTrainer = (
  canvas: HTMLCanvasElement,
  callbacks?: TAimTrainerCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // --- State ---
  let targets: TTarget[] = [];
  let particles: TParticle[] = [];
  let floatingTexts: TFloatingText[] = [];
  let nextTargetId = 0;

  let score = 0;
  let timeRemaining = GAME_DURATION;
  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;

  let stats: TGameStats = {
    totalClicks: 0,
    successfulHits: 0,
    missedTargets: 0,
    combo: 0,
    maxCombo: 0,
    lastHitTime: 0,
  };

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
    'aimtrainer',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Helpers ---
  const rand = (min: number, max: number) =>
    min + Math.random() * (max - min);

  const randomColor = () =>
    TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)];

  // --- Target Spawning ---
  const spawnTarget = () => {
    const margin = SPAWN_MARGIN;
    const x = rand(
      CANVAS_WIDTH * margin + TARGET_DEFAULT_RADIUS,
      CANVAS_WIDTH * (1 - margin) - TARGET_DEFAULT_RADIUS,
    );
    const y = rand(
      CANVAS_HEIGHT * margin + TARGET_DEFAULT_RADIUS,
      CANVAS_HEIGHT * (1 - margin) - TARGET_DEFAULT_RADIUS,
    );

    const target: TTarget = {
      id: nextTargetId++,
      x,
      y,
      radius: TARGET_DEFAULT_RADIUS,
      color: randomColor(),
      spawnTime: performance.now(),
      lifetime: TARGET_LIFETIME,
      isHit: false,
    };

    targets.push(target);
  };

  const maintainTargetCount = () => {
    while (targets.length < SIMULTANEOUS_TARGETS) {
      spawnTarget();
    }
  };

  // --- Click Handling ---
  const handleCanvasClick = (e: MouseEvent) => {
    if (!isStarted || isPaused || isGameOver) return;

    stats.totalClicks++;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

    let hit = false;

    for (let i = targets.length - 1; i >= 0; i--) {
      const target = targets[i];
      if (target.isHit) continue;

      const dx = x - target.x;
      const dy = y - target.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= target.radius) {
        hitTarget(target);
        hit = true;
        break;
      }
    }

    if (!hit) {
      // 콤보 초기화
      if (stats.combo > 0) {
        stats.combo = 0;
      }
    }
  };

  const hitTarget = (target: TTarget) => {
    target.isHit = true;
    stats.successfulHits++;

    // 반응 속도 계산
    const now = performance.now();
    const reactionTime = (now - target.spawnTime) / 1000;
    const speedRatio = Math.max(0, 1 - reactionTime / target.lifetime);

    // 기본 점수
    let earnedScore = BASE_SCORE;

    // 반응 속도 보너스
    const speedBonus = Math.floor(speedRatio * SPEED_BONUS_MAX);
    earnedScore += speedBonus;

    // 콤보 처리
    const comboWindow = 1500; // 1.5초 이내에 연속으로 맞춰야 콤보 유지
    if (now - stats.lastHitTime < comboWindow) {
      stats.combo++;
    } else {
      stats.combo = 1;
    }
    stats.lastHitTime = now;

    if (stats.combo > stats.maxCombo) {
      stats.maxCombo = stats.combo;
    }

    // 콤보 보너스
    if (stats.combo >= COMBO_THRESHOLD) {
      const comboBonus = Math.floor(earnedScore * (COMBO_MULTIPLIER - 1));
      earnedScore += comboBonus;

      floatingTexts.push({
        x: target.x,
        y: target.y - 50,
        text: `COMBO x${stats.combo}!`,
        alpha: 1,
        color: '#FFD700',
        life: FLOATING_TEXT_DURATION,
      });
    }

    score += earnedScore;

    // 점수 표시
    let scoreText = `+${earnedScore}`;
    if (speedBonus > 0) {
      scoreText += ` (⚡${speedBonus})`;
    }

    floatingTexts.push({
      x: target.x,
      y: target.y - 30,
      text: scoreText,
      alpha: 1,
      color: speedBonus > 30 ? '#00ff88' : '#ffffff',
      life: FLOATING_TEXT_DURATION,
    });

    // 파티클 생성
    spawnHitParticles(target.x, target.y, target.color);

    // 타겟 제거 및 새 타겟 생성
    targets = targets.filter((t) => t.id !== target.id);
    maintainTargetCount();
  };

  // --- Particles ---
  const spawnHitParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT;
      const speed = rand(100, 200);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        size: rand(2, 5),
        color,
      });
    }
  };

  // --- Reset ---
  const resetGame = () => {
    targets = [];
    particles = [];
    floatingTexts = [];
    nextTargetId = 0;
    score = 0;
    timeRemaining = GAME_DURATION;
    isStarted = false;
    isLoading = false;
    isGameOver = false;
    isPaused = false;
    stats = {
      totalClicks: 0,
      successfulHits: 0,
      missedTargets: 0,
      combo: 0,
      maxCombo: 0,
      lastHitTime: 0,
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
    timeRemaining = GAME_DURATION;
    targets = [];
    particles = [];
    floatingTexts = [];
    nextTargetId = 0;
    stats = {
      totalClicks: 0,
      successfulHits: 0,
      missedTargets: 0,
      combo: 0,
      maxCombo: 0,
      lastHitTime: 0,
    };
    maintainTargetCount();
  };

  const triggerGameOver = () => {
    isGameOver = true;
    isStarted = false;
  };

  // --- Update ---
  const update = (dt: number) => {
    if (!isStarted || isPaused) return;

    // 시간 감소
    timeRemaining -= dt;
    if (timeRemaining <= 0) {
      timeRemaining = 0;
      triggerGameOver();
      return;
    }

    // 타겟 업데이트
    const now = performance.now();
    for (let i = targets.length - 1; i >= 0; i--) {
      const target = targets[i];
      if (target.isHit) continue;

      const elapsed = (now - target.spawnTime) / 1000;
      if (elapsed >= target.lifetime) {
        // 놓친 타겟
        stats.missedTargets++;
        targets.splice(i, 1);

        floatingTexts.push({
          x: target.x,
          y: target.y,
          text: 'MISS',
          alpha: 1,
          color: '#ff4444',
          life: FLOATING_TEXT_DURATION,
        });

        // 콤보 초기화
        stats.combo = 0;

        // 새 타겟 생성
        maintainTargetCount();
      }
    }

    // 파티클 업데이트
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // 플로팅 텍스트 업데이트
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 50 * dt;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life / FLOATING_TEXT_DURATION);
      if (ft.life <= 0) {
        floatingTexts.splice(i, 1);
      }
    }
  };

  // --- Render ---
  const render = () => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 배경 그라디언트
    drawBackground();

    // 타겟 그리기
    const now = performance.now();
    for (const target of targets) {
      if (target.isHit) continue;
      drawTarget(target, now);
    }

    // 파티클 그리기
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

    // 플로팅 텍스트 그리기
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

    // 오버레이
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
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 그리드 패턴
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  };

  const drawTarget = (target: TTarget, now: number) => {
    const elapsed = (now - target.spawnTime) / 1000;
    const progress = elapsed / target.lifetime;

    // 시간이 지나면서 타겟 크기 감소
    const sizeMultiplier = progress > 0.75 ? 1 - (progress - 0.75) * 2 : 1;
    const currentRadius = Math.max(0.1, target.radius * sizeMultiplier);

    // 타겟이 너무 작아지면 그리지 않음
    if (currentRadius < 0.5) {
      return;
    }

    ctx.save();
    ctx.translate(target.x, target.y);

    // 외곽 링 (진행 상황)
    const ringRadius = currentRadius + 8;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 진행 링
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      ringRadius,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * progress,
    );
    ctx.strokeStyle = progress > 0.75 ? '#e74c3c' : '#3498db';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 메인 타겟
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      -currentRadius * 0.3,
      -currentRadius * 0.3,
      0,
      0,
      0,
      currentRadius,
    );
    gradient.addColorStop(0, lightenColor(target.color, 30));
    gradient.addColorStop(1, target.color);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 테두리
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 중앙 점
    const centerSize = currentRadius * 0.15;
    ctx.beginPath();
    ctx.arc(0, 0, centerSize, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();

    // 십자선
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    const crossSize = currentRadius * 0.5;
    ctx.beginPath();
    ctx.moveTo(-crossSize, 0);
    ctx.lineTo(crossSize, 0);
    ctx.moveTo(0, -crossSize);
    ctx.lineTo(0, crossSize);
    ctx.stroke();

    ctx.restore();
  };

  const lightenColor = (color: string, percent: number) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, ((num >> 16) & 0xff) + amt);
    const G = Math.min(255, ((num >> 8) & 0xff) + amt);
    const B = Math.min(255, (num & 0xff) + amt);
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  };

  const drawHud = () => {
    if (!isStarted && !isGameOver) return;

    ctx.save();

    // 시간 (왼쪽 상단)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    const timeText = `⏱ ${Math.ceil(timeRemaining)}s`;
    ctx.strokeText(timeText, 15, 15);
    ctx.fillText(timeText, 15, 15);

    // 점수 (오른쪽 상단)
    ctx.textAlign = 'right';
    const scoreText = `${score}`;
    ctx.strokeText(scoreText, CANVAS_WIDTH - 15, 15);
    ctx.fillText(scoreText, CANVAS_WIDTH - 15, 15);

    // 정확도 (왼쪽 하단)
    const accuracy =
      stats.totalClicks > 0
        ? ((stats.successfulHits / stats.totalClicks) * 100).toFixed(1)
        : '0.0';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const accuracyText = `정확도: ${accuracy}%`;
    ctx.strokeText(accuracyText, 15, CANVAS_HEIGHT - 15);
    ctx.fillText(accuracyText, 15, CANVAS_HEIGHT - 15);

    // 콤보 (오른쪽 하단)
    if (stats.combo >= COMBO_THRESHOLD) {
      ctx.textAlign = 'right';
      const comboText = `COMBO x${stats.combo}`;
      ctx.fillStyle = '#FFD700';
      ctx.strokeText(comboText, CANVAS_WIDTH - 15, CANVAS_HEIGHT - 15);
      ctx.fillText(comboText, CANVAS_WIDTH - 15, CANVAS_HEIGHT - 15);
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

  // --- Input Handlers ---
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
  canvas.addEventListener('click', handleCanvasClick);
  window.addEventListener('keydown', handleKeyDown);

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('click', handleCanvasClick);
    window.removeEventListener('keydown', handleKeyDown);
  };
};
