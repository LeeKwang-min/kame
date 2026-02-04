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
    reels: ['7', '7', '7'],
    lastWin: 0,
  };

  let spinProgress = 0;
  let spinningReels: ReelSymbol[][] = [[], [], []];
  let reelStops: number[] = [0, 0, 0];
  let pendingResult: ReelSymbol[] | null = null;

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
      reels: ['7', '7', '7'],
      lastWin: 0,
    };
    spinProgress = 0;
    pendingResult = null;
    gameOverHud.reset();
  };

  const generateSpinningReels = () => {
    spinningReels = [];
    for (let i = 0; i < REEL_COUNT; i++) {
      const reel: ReelSymbol[] = [];
      for (let j = 0; j < 20; j++) {
        reel.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      }
      spinningReels.push(reel);
    }
  };

  const spin = () => {
    if (state.phase !== 'playing') return;
    if (state.coins < state.betAmount) return;

    state.coins -= state.betAmount;
    state.phase = 'spinning';
    state.lastWin = 0;
    spinProgress = 0;
    reelStops = [0, 0, 0];

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

  const renderSlotMachine = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;

    ctx.fillStyle = '#2d1f4e';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = 'white';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Coins: ${state.coins}`, 20, 30);
    ctx.fillText(`Max: ${state.maxCoins}`, 20, 55);

    ctx.textAlign = 'right';
    ctx.fillText(`Bet: ${state.betAmount}`, rect.width - 20, 30);

    const machineW = 400;
    const machineH = 200;
    const machineX = cx - machineW / 2;
    const machineY = 150;

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(machineX - 20, machineY - 20, machineW + 40, machineH + 40);

    ctx.fillStyle = '#DEB887';
    ctx.fillRect(machineX - 15, machineY - 15, machineW + 30, machineH + 30);

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(machineX, machineY, machineW, machineH);

    const reelW = machineW / 3 - 20;
    const reelH = machineH - 40;

    for (let i = 0; i < REEL_COUNT; i++) {
      const reelX = machineX + 15 + i * (reelW + 15);
      const reelY = machineY + 20;

      ctx.fillStyle = '#fff';
      ctx.fillRect(reelX, reelY, reelW, reelH);

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.strokeRect(reelX, reelY, reelW, reelH);

      let symbol: ReelSymbol;
      if (state.phase === 'spinning' && reelStops[i] === 0) {
        const idx = Math.floor(spinProgress * 10 + i * 3) % spinningReels[i].length;
        symbol = spinningReels[i][idx] || '7';
      } else {
        symbol = state.reels[i];
      }

      ctx.font = '48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SYMBOL_DISPLAY[symbol], reelX + reelW / 2, reelY + reelH / 2);
    }

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(machineX - 10, machineY + machineH / 2);
    ctx.lineTo(machineX + machineW + 10, machineY + machineH / 2);
    ctx.stroke();

    if (state.lastWin > 0 && state.phase === 'playing') {
      ctx.font = 'bold 32px sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'center';
      ctx.fillText(getWinMessage(state.reels, state.lastWin), cx, machineY + machineH + 80);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';

    if (state.phase === 'playing') {
      ctx.fillText('Space: Spin  ←/→: Change Bet  R: Restart', cx, 500);
    } else if (state.phase === 'spinning') {
      ctx.fillText('Spinning...', cx, 500);
    }

    renderPayTable(machineX, machineY + machineH + 120);
  };

  const renderPayTable = (x: number, y: number) => {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';

    const payouts = [
      { symbol: '7️⃣', multiplier: '100x' },
      { symbol: '🎰', multiplier: '50x' },
      { symbol: '🍒', multiplier: '25x' },
      { symbol: '🔔', multiplier: '15x' },
      { symbol: '🍋', multiplier: '10x' },
      { symbol: '🍊', multiplier: '8x' },
      { symbol: '🍇', multiplier: '5x' },
    ];

    ctx.fillText('PAYOUTS (3 Match):', x, y);

    let col = 0;
    let row = 0;
    payouts.forEach((p, i) => {
      const px = x + col * 120;
      const py = y + 20 + row * 20;
      ctx.fillText(`${p.symbol}x3 = ${p.multiplier}`, px, py);
      col++;
      if (col >= 4) {
        col = 0;
        row++;
      }
    });

    ctx.fillText('2 Match = 2x', x, y + 60);
  };

  let lastTime = 0;
  const SPIN_DURATION = 2000;
  const REEL_STOP_DELAYS = [600, 1200, 1800];

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    const dt = t - lastTime;
    lastTime = t;

    if (state.phase === 'spinning') {
      spinProgress += dt / SPIN_DURATION;

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

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
  };
};
