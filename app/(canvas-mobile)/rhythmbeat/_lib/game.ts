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
  LANE_COUNT,
  LANE_COLORS,
  LANE_KEYS,
  LANE_LABELS,
  NOTE_HEIGHT,
  NOTE_SPEED,
  JUDGE_PERFECT,
  JUDGE_GREAT,
  JUDGE_GOOD,
  JUDGE_LINE_OFFSET,
  SCORE_PERFECT,
  SCORE_GREAT,
  SCORE_GOOD,
  HP_MAX,
  HP_PERFECT,
  HP_GREAT,
  HP_GOOD,
  HP_MISS,
  BPM_PHASES,
  BPM_MAX,
  BPM_ENDLESS_INCREASE_PER_SEC,
} from './config';
import { TNote, TLane, TJudgment, TJudgmentEffect, TBeat } from './types';
import { PATTERNS } from './patterns';
import { createRhythmSoundSystem } from './audio';

export type TRhythmBeatCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export function setupRhythmBeat(
  canvas: HTMLCanvasElement,
  canvasHeight: number,
  callbacks?: TRhythmBeatCallbacks,
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  canvas.width = CANVAS_WIDTH;
  canvas.height = canvasHeight;

  const judgeLineY = canvasHeight - JUDGE_LINE_OFFSET;
  const laneWidth = CANVAS_WIDTH / LANE_COUNT;

  // --- Sound ---
  const sound = createRhythmSoundSystem();

  // --- Game state ---
  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;
  let raf = 0;
  let lastTime = 0;
  let gameTime = 0;

  // --- Game data ---
  let notes: TNote[] = [];
  let noteIdCounter = 0;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let hp = HP_MAX;
  let currentBpm = 100;
  let judgmentEffects: TJudgmentEffect[] = [];

  // --- BPM scheduler ---
  let beatTimer = 0;
  let patternQueue: TBeat[] = [];
  let recentPatternIndices: number[] = [];

  // --- Lane press state (for visual feedback) ---
  const lanePressed = [false, false, false, false];

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'rhythmbeat' as any, gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  // --- Reset ---
  function resetGame() {
    isStarted = false;
    isLoading = false;
    isGameOver = false;
    isPaused = false;
    lastTime = 0;
    gameTime = 0;
    notes = [];
    noteIdCounter = 0;
    score = 0;
    combo = 0;
    maxCombo = 0;
    hp = HP_MAX;
    currentBpm = 100;
    beatTimer = 0;
    patternQueue = [];
    recentPatternIndices = [];
    judgmentEffects = [];
    gameOverHud.reset();
  }

  // --- Start ---
  async function startGame() {
    if (isStarted || isLoading) return;
    isLoading = true;
    sound.resume();
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isLoading = false;
    isStarted = true;
    lastTime = 0;
  }

  // --- BPM/Phase management ---
  function getCurrentPhase() {
    for (let i = BPM_PHASES.length - 1; i >= 0; i--) {
      if (gameTime >= BPM_PHASES[i].startTime) return BPM_PHASES[i];
    }
    return BPM_PHASES[0];
  }

  function updateBpm() {
    const phase = getCurrentPhase();
    if (phase.name === 'Endless') {
      const elapsed = gameTime - phase.startTime;
      currentBpm = Math.min(phase.bpm + elapsed * BPM_ENDLESS_INCREASE_PER_SEC, BPM_MAX);
    } else {
      currentBpm = phase.bpm;
    }
  }

  // --- Pattern selection ---
  function selectPattern(): TBeat[] {
    const phase = getCurrentPhase();
    const eligible = PATTERNS.map((p, i) => ({ pattern: p, index: i })).filter(
      ({ pattern, index }) =>
        pattern.difficulty <= phase.maxDifficulty && !recentPatternIndices.includes(index),
    );

    if (eligible.length === 0) {
      const fallback = PATTERNS.filter((p) => p.difficulty <= phase.maxDifficulty);
      const idx = Math.floor(Math.random() * fallback.length);
      return [...fallback[idx].beats];
    }

    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    recentPatternIndices.push(pick.index);
    if (recentPatternIndices.length > 3) recentPatternIndices.shift();

    return [...pick.pattern.beats];
  }

  // --- Note spawning ---
  function spawnNote(lane: TLane) {
    const travelTime = (judgeLineY / NOTE_SPEED) * 1000;
    notes.push({
      id: noteIdCounter++,
      lane,
      y: -NOTE_HEIGHT,
      targetTime: performance.now() + travelTime,
      hit: false,
      missed: false,
    });
  }

  function spawnBeat(beat: TBeat) {
    if (beat === 0) return;
    if (Array.isArray(beat)) {
      beat.forEach((b) => spawnNote((b - 1) as TLane));
    } else {
      spawnNote((beat - 1) as TLane);
    }
  }

  // --- Beat scheduling ---
  function updateBeatScheduler(dt: number) {
    const beatInterval = 60 / currentBpm;
    beatTimer -= dt;

    if (beatTimer <= 0) {
      const beatCount = Math.floor(gameTime / beatInterval);
      if (beatCount % 2 === 0) {
        sound.playKick();
      } else {
        sound.playSnare();
      }

      if (patternQueue.length === 0) {
        patternQueue = selectPattern();
      }
      const nextBeat = patternQueue.shift()!;
      spawnBeat(nextBeat);

      beatTimer += beatInterval;
      if (beatTimer < 0) beatTimer = 0;
    }
  }

  // --- Judgment ---
  function judge(lane: TLane): TJudgment | null {
    const now = performance.now();

    let closest: TNote | null = null;
    let closestDiff = Infinity;

    for (const note of notes) {
      if (note.lane !== lane || note.hit || note.missed) continue;
      const diff = Math.abs(now - note.targetTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = note;
      }
    }

    if (!closest || closestDiff > JUDGE_GOOD) return null;

    closest.hit = true;

    let judgment: TJudgment;
    if (closestDiff <= JUDGE_PERFECT) {
      judgment = 'perfect';
    } else if (closestDiff <= JUDGE_GREAT) {
      judgment = 'great';
    } else {
      judgment = 'good';
    }

    applyJudgment(judgment, lane);
    return judgment;
  }

  function applyJudgment(judgment: TJudgment, lane: TLane) {
    const comboMultiplier = 1 + Math.floor(combo / 10) * 0.1;
    let baseScore = 0;
    let hpChange = 0;
    let color = '#ffffff';
    let text = '';

    switch (judgment) {
      case 'perfect':
        baseScore = SCORE_PERFECT;
        hpChange = HP_PERFECT;
        color = '#ffd700';
        text = 'Perfect!';
        break;
      case 'great':
        baseScore = SCORE_GREAT;
        hpChange = HP_GREAT;
        color = '#00f5ff';
        text = 'Great!';
        break;
      case 'good':
        baseScore = SCORE_GOOD;
        hpChange = HP_GOOD;
        color = '#ffffff';
        text = 'Good';
        break;
      case 'miss':
        baseScore = 0;
        hpChange = HP_MISS;
        color = '#ff3333';
        text = 'Miss';
        break;
    }

    if (judgment !== 'miss') {
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      sound.playHit(lane);
    } else {
      combo = 0;
      sound.playMiss();
    }

    score += Math.floor(baseScore * comboMultiplier);
    hp = Math.max(0, Math.min(HP_MAX, hp + hpChange));

    judgmentEffects.push({
      text,
      color,
      y: judgeLineY - 30,
      alpha: 1,
      scale: judgment === 'perfect' ? 1.3 : 1,
      lane,
    });

    if (hp <= 0) {
      isGameOver = true;
    }
  }

  // --- Update notes ---
  function updateNotes(dt: number) {
    for (const note of notes) {
      if (note.hit || note.missed) continue;
      note.y += NOTE_SPEED * dt;

      if (note.y > judgeLineY + (JUDGE_GOOD * NOTE_SPEED) / 1000 + NOTE_HEIGHT) {
        note.missed = true;
        applyJudgment('miss', note.lane);
      }
    }

    notes = notes.filter((n) => n.y < canvasHeight + NOTE_HEIGHT || (!n.hit && !n.missed));
  }

  // --- Update effects ---
  function updateEffects(dt: number) {
    for (const effect of judgmentEffects) {
      effect.y -= 60 * dt;
      effect.alpha -= 1.5 * dt;
      if (effect.scale > 1) effect.scale -= 1.5 * dt;
      if (effect.scale < 1) effect.scale = 1;
    }
    judgmentEffects = judgmentEffects.filter((e) => e.alpha > 0);
  }

  // --- Render ---
  function render() {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 1; i < LANE_COUNT; i++) {
      const x = i * laneWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }

    // Notes
    for (const note of notes) {
      if (note.hit || note.missed) continue;
      const x = note.lane * laneWidth + laneWidth * 0.1;
      const w = laneWidth * 0.8;
      const color = LANE_COLORS[note.lane];

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(x, note.y, w, NOTE_HEIGHT, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Judge line
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, judgeLineY);
    ctx.lineTo(CANVAS_WIDTH, judgeLineY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Hit area (bottom)
    for (let i = 0; i < LANE_COUNT; i++) {
      const x = i * laneWidth;
      const color = LANE_COLORS[i];

      if (lanePressed[i]) {
        ctx.fillStyle = color + '30';
        ctx.fillRect(x, judgeLineY, laneWidth, canvasHeight - judgeLineY);
      }

      ctx.fillStyle = lanePressed[i] ? color : 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(LANE_LABELS[i], x + laneWidth / 2, judgeLineY + 40);
    }

    // HP bar
    const hpBarWidth = CANVAS_WIDTH - 20;
    const hpBarHeight = 6;
    const hpBarX = 10;
    const hpBarY = 45;
    const hpRatio = hp / HP_MAX;

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    let hpColor: string;
    if (hpRatio > 0.5) hpColor = '#00ff88';
    else if (hpRatio > 0.2) hpColor = '#ffff00';
    else hpColor = '#ff3333';

    if (hpRatio <= 0.2 && Math.floor(gameTime * 4) % 2 === 0) {
      hpColor = '#ff0000';
    }

    ctx.fillStyle = hpColor;
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpRatio, hpBarHeight);

    // Score & BPM
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score.toLocaleString()}`, 10, 25);

    ctx.textAlign = 'right';
    ctx.fillText(`BPM: ${Math.floor(currentBpm)}`, CANVAS_WIDTH - 10, 25);

    // Combo
    if (combo >= 5) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      const comboScale = combo % 10 === 0 && combo > 0 ? 1.2 : 1;
      const comboSize = Math.floor(28 * comboScale);
      ctx.font = `bold ${comboSize}px monospace`;
      ctx.fillText(`${combo}`, CANVAS_WIDTH / 2, 80);
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('COMBO', CANVAS_WIDTH / 2, 96);
    }

    // Judgment effects
    for (const effect of judgmentEffects) {
      ctx.globalAlpha = effect.alpha;
      ctx.fillStyle = effect.color;
      ctx.font = `bold ${Math.floor(16 * effect.scale)}px monospace`;
      ctx.textAlign = 'center';
      const x = effect.lane * laneWidth + laneWidth / 2;
      ctx.fillText(effect.text, x, effect.y);
      ctx.globalAlpha = 1;
    }

    // Phase name
    const phase = getCurrentPhase();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(phase.name, 10, canvasHeight - 10);

    // Mute indicator
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '12px monospace';
    ctx.fillText(sound.isMuted() ? '♪ MUTE' : '♪ ON', CANVAS_WIDTH - 10, canvasHeight - 10);
  }

  // --- HUD ---
  function drawHuds() {
    if (!isStarted) {
      if (isLoading) {
        gameLoadingHud(canvas, ctx);
      } else {
        gameStartHud(canvas, ctx);
      }
      return;
    }

    if (isGameOver) {
      gameOverHud.render(score);
      return;
    }

    if (isPaused) {
      gamePauseHud(canvas, ctx);
      return;
    }
  }

  // --- Game loop ---
  function gameLoop(timestamp: number) {
    const dt = lastTime > 0 ? Math.min((timestamp - lastTime) / 1000, 0.1) : 0;
    lastTime = timestamp;

    if (isStarted && !isGameOver && !isPaused) {
      gameTime += dt;
      updateBpm();
      updateBeatScheduler(dt);
      updateNotes(dt);
      updateEffects(dt);
    }

    render();
    drawHuds();

    raf = requestAnimationFrame(gameLoop);
  }

  // --- Keyboard events ---
  function onKeyDown(e: KeyboardEvent) {
    if (e.repeat) return;

    if (e.code === 'KeyM') {
      sound.toggleMute();
      return;
    }

    if (e.code === 'KeyS') {
      if (isPaused) {
        isPaused = false;
        lastTime = 0;
        return;
      }
      if (!isStarted && !isLoading && !isGameOver) {
        startGame();
      }
      return;
    }

    if (e.code === 'KeyP' && isStarted && !isGameOver) {
      isPaused = true;
      return;
    }

    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    if (isStarted && !isGameOver && !isPaused) {
      const laneIndex = LANE_KEYS.indexOf(e.code as any);
      if (laneIndex >= 0) {
        lanePressed[laneIndex] = true;
        judge(laneIndex as TLane);
        e.preventDefault();
      }
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    const laneIndex = LANE_KEYS.indexOf(e.code as any);
    if (laneIndex >= 0) {
      lanePressed[laneIndex] = false;
    }
  }

  // --- Touch events ---
  function getTouchPos(touch: Touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = canvasHeight / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    sound.resume();

    if (isGameOver) {
      const touch = e.touches[0];
      if (!touch) return;
      const pos = getTouchPos(touch);
      gameOverHud.onTouchStart(pos.x, pos.y, score);
      return;
    }

    if (!isStarted && !isLoading) {
      startGame();
      return;
    }

    if (isPaused) {
      isPaused = false;
      lastTime = 0;
      return;
    }

    if (isStarted && !isGameOver && !isPaused) {
      for (let i = 0; i < e.touches.length; i++) {
        const pos = getTouchPos(e.touches[i]);
        const laneIndex = Math.floor(pos.x / laneWidth);
        if (laneIndex >= 0 && laneIndex < LANE_COUNT) {
          lanePressed[laneIndex] = true;
          judge(laneIndex as TLane);
        }
      }
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 0) {
      for (let i = 0; i < LANE_COUNT; i++) {
        lanePressed[i] = false;
      }
    }
  }

  // --- Event listeners ---
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

  raf = requestAnimationFrame(gameLoop);

  // --- Cleanup ---
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchend', handleTouchEnd);
    sound.dispose();
  };
}
