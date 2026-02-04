import {
  createGameOverHud,
  TGameOverCallbacks,
} from '@/lib/game';
import { BET_AMOUNTS, INITIAL_COINS, REEL_COUNT, SYMBOL_DISPLAY, SYMBOLS } from './config';
import { ReelSymbol, SlotState } from './types';
import { calculateWin, generateReelResult, getWinMessage } from './utils';

export type TSlotCallbacks = {
  onScoreSave: (initials: string, score: number) => Promise<void>;
};

type Button = {
  x: number;
  y: number;
  w: number;
  h: number;
  action: () => void;
  label: string;
};

export const setupSlot = (
  canvas: HTMLCanvasElement,
  callbacks?: TSlotCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let state: SlotState = {
    phase: 'playing',
    coins: INITIAL_COINS,
    maxCoins: INITIAL_COINS,
    betAmount: BET_AMOUNTS[0],
    reels: ['CHERRY', 'BELL', 'LEMON'],
    lastWin: 0,
  };

  let spinProgress = 0;
  let spinningReels: ReelSymbol[][] = [[], [], []];
  let reelStops: number[] = [0, 0, 0];
  let reelOffsets: number[] = [0, 0, 0];
  let pendingResult: ReelSymbol[] | null = null;
  let globalTime = 0;
  let winAnimationTime = 0;
  let showWinAnimation = false;
  let buttons: Button[] = [];
  let hoveredButton: Button | null = null;

  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (initials, finalScore) => {
      if (callbacks?.onScoreSave) {
        await callbacks.onScoreSave(initials, finalScore);
      }
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(canvas, ctx, 'slot', gameOverCallbacks);

  const resetGame = () => {
    state = {
      phase: 'playing',
      coins: INITIAL_COINS,
      maxCoins: INITIAL_COINS,
      betAmount: BET_AMOUNTS[0],
      reels: ['CHERRY', 'BELL', 'LEMON'],
      lastWin: 0,
    };
    spinProgress = 0;
    pendingResult = null;
    showWinAnimation = false;
    gameOverHud.reset();
  };

  const generateSpinningReels = () => {
    spinningReels = [];
    for (let i = 0; i < REEL_COUNT; i++) {
      const reel: ReelSymbol[] = [];
      for (let j = 0; j < 30; j++) {
        reel.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      }
      spinningReels.push(reel);
    }
    reelOffsets = [0, 0, 0];
  };

  const spin = () => {
    if (state.phase !== 'playing') return;
    if (state.coins < state.betAmount) return;

    state.coins -= state.betAmount;
    state.phase = 'spinning';
    state.lastWin = 0;
    spinProgress = 0;
    reelStops = [0, 0, 0];
    showWinAnimation = false;

    generateSpinningReels();
    pendingResult = generateReelResult();
  };

  const finishSpin = () => {
    if (!pendingResult) return;

    state.reels = pendingResult;
    const winAmount = calculateWin(state.reels, state.betAmount);
    state.lastWin = winAmount;
    state.coins += winAmount;

    if (state.coins > state.maxCoins) {
      state.maxCoins = state.coins;
    }

    if (winAmount > 0) {
      showWinAnimation = true;
      winAnimationTime = globalTime;
    }

    if (state.coins <= 0) {
      state.phase = 'gameover';
    } else {
      state.phase = 'playing';
    }

    pendingResult = null;
  };

  const changeBet = (delta: number) => {
    if (state.phase !== 'playing') return;

    const currentIndex = BET_AMOUNTS.indexOf(state.betAmount);
    const newIndex = Math.max(0, Math.min(BET_AMOUNTS.length - 1, currentIndex + delta));
    state.betAmount = BET_AMOUNTS[newIndex];
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const getCanvasPos = (e: MouseEvent | Touch): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const findButton = (x: number, y: number): Button | null => {
    for (const btn of buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        return btn;
      }
    }
    return null;
  };

  const handleClick = (x: number, y: number) => {
    if (state.phase === 'gameover') return;

    const btn = findButton(x, y);
    if (btn) {
      btn.action();
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    const pos = getCanvasPos(e);
    hoveredButton = findButton(pos.x, pos.y);
    canvas.style.cursor = hoveredButton ? 'pointer' : 'default';
  };

  const onMouseDown = (e: MouseEvent) => {
    const pos = getCanvasPos(e);
    handleClick(pos.x, pos.y);
  };

  const onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = getCanvasPos(e.touches[0]);
      handleClick(pos.x, pos.y);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (state.phase === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, state.maxCoins);
      if (handled) return;
    }

    if (e.code === 'KeyR') {
      resetGame();
      return;
    }

    if (e.code === 'Space' && state.phase === 'playing') {
      e.preventDefault();
      spin();
      return;
    }

    if (e.code === 'ArrowLeft') {
      e.preventDefault();
      changeBet(-1);
      return;
    }

    if (e.code === 'ArrowRight') {
      e.preventDefault();
      changeBet(1);
      return;
    }
  };

  // ========== 렌더링 ==========

  const renderBackground = () => {
    const rect = canvas.getBoundingClientRect();

    const bgGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    bgGradient.addColorStop(0, '#1a0a2e');
    bgGradient.addColorStop(0.5, '#2d1b4e');
    bgGradient.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    for (let i = 0; i < 30; i++) {
      const x = (i * 97.3 + globalTime * 0.01) % rect.width;
      const y = (i * 137.5) % rect.height;
      const alpha = 0.3 + Math.sin(globalTime * 0.003 + i) * 0.3;
      const size = 1 + Math.sin(globalTime * 0.002 + i * 0.5) * 1;

      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const renderNeonText = (text: string, x: number, y: number, color: string, fontSize: number) => {
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x, y);

    ctx.shadowBlur = 0;
  };

  const renderButton = (btn: Button, isHovered: boolean, color1: string, color2: string, glowColor: string) => {
    const gradient = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
    if (isHovered) {
      gradient.addColorStop(0, '#FFD700');
      gradient.addColorStop(1, '#FFA000');
    } else {
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
    }

    ctx.fillStyle = gradient;
    ctx.shadowColor = isHovered ? '#FFD700' : glowColor;
    ctx.shadowBlur = isHovered ? 15 : 5;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = isHovered ? '#FFF' : glowColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
  };

  const renderMachine = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const machineW = 440;
    const machineH = 220;
    const machineX = cx - machineW / 2;
    const machineY = 100;

    const frameGradient = ctx.createLinearGradient(machineX - 30, machineY, machineX + machineW + 30, machineY);
    frameGradient.addColorStop(0, '#8B4513');
    frameGradient.addColorStop(0.2, '#D4A574');
    frameGradient.addColorStop(0.5, '#FFD700');
    frameGradient.addColorStop(0.8, '#D4A574');
    frameGradient.addColorStop(1, '#8B4513');

    ctx.fillStyle = frameGradient;
    ctx.beginPath();
    ctx.roundRect(machineX - 25, machineY - 25, machineW + 50, machineH + 50, 20);
    ctx.fill();

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(machineX - 15, machineY - 15, machineW + 30, machineH + 30, 15);
    ctx.fill();

    ctx.fillStyle = '#0d0d1a';
    ctx.beginPath();
    ctx.roundRect(machineX, machineY, machineW, machineH, 10);
    ctx.fill();

    const reelW = (machineW - 60) / 3;
    const reelH = machineH - 40;
    const reelY = machineY + 20;

    for (let i = 0; i < REEL_COUNT; i++) {
      const reelX = machineX + 15 + i * (reelW + 15);

      const reelGradient = ctx.createLinearGradient(reelX, reelY, reelX, reelY + reelH);
      reelGradient.addColorStop(0, '#1a1a1a');
      reelGradient.addColorStop(0.2, '#2a2a2a');
      reelGradient.addColorStop(0.5, '#3a3a3a');
      reelGradient.addColorStop(0.8, '#2a2a2a');
      reelGradient.addColorStop(1, '#1a1a1a');

      ctx.fillStyle = reelGradient;
      ctx.beginPath();
      ctx.roundRect(reelX, reelY, reelW, reelH, 8);
      ctx.fill();

      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(reelX, reelY, reelW, reelH, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;

      let symbol: ReelSymbol;
      if (state.phase === 'spinning' && reelStops[i] === 0) {
        const offset = reelOffsets[i];
        const idx = Math.floor(offset) % spinningReels[i].length;
        symbol = spinningReels[i][idx] || '7';
        ctx.globalAlpha = 0.7;
      } else {
        symbol = state.reels[i];
        ctx.globalAlpha = 1;
      }

      ctx.font = '64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(SYMBOL_DISPLAY[symbol], reelX + reelW / 2, reelY + reelH / 2);
      ctx.globalAlpha = 1;
    }

    if (showWinAnimation && state.lastWin > 0) {
      const lineY = reelY + reelH / 2;
      const pulse = Math.sin((globalTime - winAnimationTime) * 0.01) * 0.5 + 0.5;

      ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20 * pulse;
      ctx.beginPath();
      ctx.moveTo(machineX - 10, lineY);
      ctx.lineTo(machineX + machineW + 10, lineY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(machineX - 5, reelY + reelH / 2);
      ctx.lineTo(machineX + machineW + 5, reelY + reelH / 2);
      ctx.stroke();
    }

    renderNeonText('★ LUCKY SLOTS ★', cx, machineY - 50, '#FF1493', 28);
  };

  const renderWinEffect = () => {
    if (!showWinAnimation || state.lastWin === 0) return;

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const elapsed = globalTime - winAnimationTime;

    const particleCount = state.lastWin >= state.betAmount * 50 ? 30 : 15;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 100 + Math.sin(i * 1.5) * 50;
      const dist = (elapsed * 0.1 * speed) % 200;
      const x = cx + Math.cos(angle + elapsed * 0.001) * dist;
      const y = 220 + Math.sin(angle + elapsed * 0.001) * dist * 0.5;
      const alpha = Math.max(0, 1 - dist / 200);

      const colors = ['#FFD700', '#FF1493', '#00FFFF', '#FF4500', '#7FFF00'];
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const renderUI = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 5;
    ctx.fillText(`💰 ${state.coins.toLocaleString()}`, 20, 35);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#aaa';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Best: ${state.maxCoins.toLocaleString()}`, 20, 58);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`BET: ${state.betAmount}`, rect.width - 20, 35);

    if (showWinAnimation && state.lastWin > 0) {
      const isJackpot = state.reels[0] === state.reels[1] && state.reels[1] === state.reels[2];
      const elapsed = globalTime - winAnimationTime;
      const scale = 1 + Math.sin(elapsed * 0.01) * 0.1;

      ctx.save();
      ctx.translate(cx, 400);
      ctx.scale(scale, scale);

      if (isJackpot) {
        renderNeonText('🎉 JACKPOT! 🎉', 0, 0, '#FFD700', 36);
        renderNeonText(`+${state.lastWin.toLocaleString()}`, 0, 45, '#00FF00', 28);
      } else {
        renderNeonText(`WIN! +${state.lastWin.toLocaleString()}`, 0, 0, '#00FF00', 32);
      }
      ctx.restore();
    }
  };

  const renderControls = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const btnY = 480;

    if (state.phase === 'playing') {
      // 베팅 감소 버튼
      const betDownBtn: Button = {
        x: cx - 180,
        y: btnY,
        w: 50,
        h: 45,
        action: () => changeBet(-1),
        label: '◀',
      };
      buttons.push(betDownBtn);
      renderButton(betDownBtn, hoveredButton === betDownBtn, '#555', '#333', '#888');

      // 베팅 금액 표시
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`BET: ${state.betAmount}`, cx - 90, btnY + 23);

      // 베팅 증가 버튼
      const betUpBtn: Button = {
        x: cx - 40,
        y: btnY,
        w: 50,
        h: 45,
        action: () => changeBet(1),
        label: '▶',
      };
      buttons.push(betUpBtn);
      renderButton(betUpBtn, hoveredButton === betUpBtn, '#555', '#333', '#888');

      // 스핀 버튼
      const spinBtn: Button = {
        x: cx + 30,
        y: btnY,
        w: 140,
        h: 45,
        action: spin,
        label: '🎰 SPIN',
      };
      buttons.push(spinBtn);
      renderButton(spinBtn, hoveredButton === spinBtn, '#E91E63', '#AD1457', '#FF4081');
    } else if (state.phase === 'spinning') {
      ctx.fillStyle = '#aaa';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Spinning...', cx, btnY + 23);
    }

    // 재시작 버튼
    const restartBtn: Button = {
      x: cx - 50,
      y: 540,
      w: 100,
      h: 35,
      action: resetGame,
      label: '재시작 (R)',
    };
    buttons.push(restartBtn);

    ctx.fillStyle = hoveredButton === restartBtn ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 5);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(restartBtn.label, cx, restartBtn.y + restartBtn.h / 2 + 4);
  };

  const renderPayTable = () => {
    const rect = canvas.getBoundingClientRect();
    const startX = 30;
    const startY = 360;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(startX - 10, startY - 25, rect.width - 40, 85, 10);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PAYOUTS', startX, startY - 5);

    const payouts = [
      { symbol: '7️⃣×3', payout: '100x', color: '#FF4500' },
      { symbol: '🎰×3', payout: '50x', color: '#FFD700' },
      { symbol: '🍒×3', payout: '25x', color: '#FF69B4' },
      { symbol: '🔔×3', payout: '15x', color: '#FFD700' },
      { symbol: '🍋×3', payout: '10x', color: '#FFFF00' },
      { symbol: '🍊×3', payout: '8x', color: '#FFA500' },
      { symbol: '🍇×3', payout: '5x', color: '#9400D3' },
    ];

    ctx.font = '12px sans-serif';
    payouts.forEach((p, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = startX + col * 140;
      const y = startY + 20 + row * 22;

      ctx.fillStyle = '#fff';
      ctx.fillText(`${p.symbol} = `, x, y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.payout, x + 55, y);
    });

    ctx.fillStyle = '#aaa';
    ctx.fillText('2 Match = 2x', startX + 420, startY + 20);
  };

  const renderSlotMachine = () => {
    buttons = [];
    renderBackground();
    renderMachine();
    renderWinEffect();
    renderUI();
    renderPayTable();
    renderControls();
  };

  let lastTime = 0;
  const SPIN_DURATION = 2500;
  const REEL_STOP_DELAYS = [800, 1500, 2200];

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    const dt = t - lastTime;
    lastTime = t;
    globalTime = t;

    if (state.phase === 'spinning') {
      spinProgress += dt / SPIN_DURATION;

      for (let i = 0; i < REEL_COUNT; i++) {
        if (reelStops[i] === 0) {
          const speed = 15 - i * 2;
          reelOffsets[i] += dt * 0.03 * speed;
        }
      }

      for (let i = 0; i < REEL_COUNT; i++) {
        if (reelStops[i] === 0 && spinProgress * SPIN_DURATION >= REEL_STOP_DELAYS[i]) {
          reelStops[i] = 1;
          if (pendingResult) {
            state.reels[i] = pendingResult[i];
          }
        }
      }

      if (spinProgress >= 1) {
        spinProgress = 1;
        finishSpin();
      }
    }

    if (showWinAnimation && globalTime - winAnimationTime > 3000) {
      showWinAnimation = false;
    }
  };

  const render = () => {
    renderSlotMachine();

    if (state.phase === 'gameover') {
      gameOverHud.render(state.maxCoins);
    }
  };

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    raf = requestAnimationFrame(draw);
  };

  resize();
  raf = requestAnimationFrame(draw);

  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('touchstart', onTouchStart);
  };
};
