import {
  createGameOverHud,
  TGameOverCallbacks,
} from '@/lib/game';
import {
  BET_PAYOUTS,
  BET_TYPE_LABELS,
  BET_TYPES,
  CHIP_AMOUNTS,
  INITIAL_CHIPS,
  WHEEL_NUMBERS,
} from './config';
import { Bet, RouletteState } from './types';
import { calculateTotalWin, getNumberColor, getWheelIndex, spinWheel } from './utils';

export type TRouletteCallbacks = {
  onScoreSave: (initials: string, score: number) => Promise<void>;
};

export const setupRoulette = (
  canvas: HTMLCanvasElement,
  callbacks?: TRouletteCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let state: RouletteState = {
    phase: 'betting',
    chips: INITIAL_CHIPS,
    maxChips: INITIAL_CHIPS,
    currentBetType: 'red',
    currentBetAmount: CHIP_AMOUNTS[0],
    selectedNumber: 0,
    bets: [],
    result: null,
    lastWin: 0,
    wheelAngle: 0,
    ballAngle: 0,
  };

  let spinSpeed = 0;
  let ballSpeed = 0;
  let targetNumber: number | null = null;

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'roulette', gameOverCallbacks);

  const resetGame = () => {
    state = {
      phase: 'betting',
      chips: INITIAL_CHIPS,
      maxChips: INITIAL_CHIPS,
      currentBetType: 'red',
      currentBetAmount: CHIP_AMOUNTS[0],
      selectedNumber: 0,
      bets: [],
      result: null,
      lastWin: 0,
      wheelAngle: 0,
      ballAngle: 0,
    };
    spinSpeed = 0;
    ballSpeed = 0;
    targetNumber = null;
    gameOverHud.reset();
  };

  const changeBetType = (delta: number) => {
    if (state.phase !== 'betting') return;

    const currentIndex = BET_TYPES.indexOf(state.currentBetType);
    const newIndex = (currentIndex + delta + BET_TYPES.length) % BET_TYPES.length;
    state.currentBetType = BET_TYPES[newIndex];
  };

  const changeBetAmount = (delta: number) => {
    if (state.phase !== 'betting') return;

    const currentIndex = CHIP_AMOUNTS.indexOf(state.currentBetAmount);
    const newIndex = Math.max(0, Math.min(CHIP_AMOUNTS.length - 1, currentIndex + delta));
    state.currentBetAmount = CHIP_AMOUNTS[newIndex];
  };

  const changeSelectedNumber = (delta: number) => {
    if (state.phase !== 'betting' || state.currentBetType !== 'single') return;

    state.selectedNumber = (state.selectedNumber + delta + 37) % 37;
  };

  const placeBet = () => {
    if (state.phase !== 'betting') return;
    if (state.chips < state.currentBetAmount) return;

    const bet: Bet = {
      type: state.currentBetType,
      amount: state.currentBetAmount,
      number: state.currentBetType === 'single' ? state.selectedNumber : undefined,
    };

    state.bets.push(bet);
    state.chips -= state.currentBetAmount;
  };

  const spin = () => {
    if (state.phase !== 'betting' || state.bets.length === 0) return;

    state.phase = 'spinning';
    targetNumber = spinWheel();
    spinSpeed = 0.3;
    ballSpeed = -0.5;
  };

  const finishSpin = () => {
    if (targetNumber === null) return;

    state.result = targetNumber;
    state.lastWin = calculateTotalWin(state.bets, targetNumber);
    state.chips += state.lastWin;

    if (state.chips > state.maxChips) {
      state.maxChips = state.chips;
    }

    state.phase = 'result';
  };

  const nextRound = () => {
    if (state.chips <= 0) {
      state.phase = 'gameover';
      return;
    }

    state.bets = [];
    state.result = null;
    state.lastWin = 0;
    state.phase = 'betting';
    targetNumber = null;
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
      const handled = gameOverHud.onKeyDown(e, state.maxChips);
      if (handled) return;
    }

    if (e.code === 'KeyR') {
      resetGame();
      return;
    }

    if (state.phase === 'betting') {
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        changeBetType(-1);
        return;
      }

      if (e.code === 'ArrowDown') {
        e.preventDefault();
        changeBetType(1);
        return;
      }

      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (state.currentBetType === 'single') {
          changeSelectedNumber(-1);
        } else {
          changeBetAmount(-1);
        }
        return;
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (state.currentBetType === 'single') {
          changeSelectedNumber(1);
        } else {
          changeBetAmount(1);
        }
        return;
      }

      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        placeBet();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        spin();
        return;
      }
    }

    if (state.phase === 'result') {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        nextRound();
        return;
      }
    }
  };

  const renderWheel = (cx: number, cy: number, radius: number) => {
    const segments = WHEEL_NUMBERS.length;
    const angleStep = (Math.PI * 2) / segments;

    for (let i = 0; i < segments; i++) {
      const num = WHEEL_NUMBERS[i];
      const startAngle = state.wheelAngle + i * angleStep - Math.PI / 2;
      const endAngle = startAngle + angleStep;

      const color = getNumberColor(num);
      ctx.fillStyle = color === 'red' ? '#C62828' : color === 'black' ? '#212121' : '#2E7D32';

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.stroke();

      const textAngle = startAngle + angleStep / 2;
      const textR = radius * 0.75;
      const tx = cx + Math.cos(textAngle) * textR;
      const ty = cy + Math.sin(textAngle) * textR;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(num), 0, 0);
      ctx.restore();
    }

    ctx.fillStyle = '#4A3728';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    const ballR = radius * 0.85;
    const ballX = cx + Math.cos(state.ballAngle) * ballR;
    const ballY = cy + Math.sin(state.ballAngle) * ballR;

    ctx.fillStyle = '#EEEEEE';
    ctx.beginPath();
    ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius - 15);
    ctx.lineTo(cx - 10, cy - radius - 5);
    ctx.lineTo(cx + 10, cy - radius - 5);
    ctx.closePath();
    ctx.fill();
  };

  const renderBettingPanel = () => {
    const rect = canvas.getBoundingClientRect();
    const panelX = 20;
    const panelY = 350;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(panelX, panelY, rect.width - 40, 250);

    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Bet Type:', panelX + 20, panelY + 30);

    let y = panelY + 55;
    BET_TYPES.forEach((type, i) => {
      const isSelected = type === state.currentBetType;
      ctx.fillStyle = isSelected ? '#FFD700' : 'rgba(255,255,255,0.6)';
      ctx.font = isSelected ? 'bold 14px sans-serif' : '14px sans-serif';

      let label = BET_TYPE_LABELS[type];
      if (type === 'single') {
        label += ` [${state.selectedNumber}]`;
      }

      const col = i < 5 ? 0 : 1;
      const row = i % 5;
      ctx.fillText(
        (isSelected ? '> ' : '  ') + label,
        panelX + 20 + col * 180,
        y + row * 22
      );
    });

    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Bet Amount: ${state.currentBetAmount}`, panelX + 400, panelY + 30);
    ctx.fillText(`Total Bets: ${state.bets.length}`, panelX + 400, panelY + 55);

    const payout = BET_PAYOUTS[state.currentBetType];
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Payout: ${payout}:1`, panelX + 400, panelY + 80);

    if (state.bets.length > 0) {
      ctx.fillStyle = '#4CAF50';
      ctx.font = '14px sans-serif';
      ctx.fillText('Press Space to Spin!', panelX + 400, panelY + 120);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.fillText('↑/↓: Type  ←/→: Amount/Number  Enter: Bet  R: Restart', panelX + 20, panelY + 230);
  };

  const renderGameScreen = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;

    ctx.fillStyle = '#0d4d0d';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = 'white';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Chips: ${state.chips}`, 20, 30);
    ctx.fillText(`Max: ${state.maxChips}`, 20, 55);

    renderWheel(cx, 180, 140);

    if (state.phase === 'betting') {
      renderBettingPanel();
    }

    if (state.phase === 'result' && state.result !== null) {
      const color = getNumberColor(state.result);
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = color === 'red' ? '#F44336' : color === 'black' ? '#333' : '#4CAF50';
      ctx.fillText(`Result: ${state.result} (${color.toUpperCase()})`, cx, 380);

      if (state.lastWin > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`You won ${state.lastWin} chips!`, cx, 420);
      } else {
        ctx.fillStyle = '#F44336';
        ctx.fillText('No win this round', cx, 420);
      }

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '14px sans-serif';
      ctx.fillText('Press Space to continue', cx, 480);
    }

    if (state.phase === 'spinning') {
      ctx.fillStyle = 'white';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Spinning...', cx, 380);
    }
  };

  let lastTime = 0;

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    const dt = (t - lastTime) / 1000;
    lastTime = t;

    if (state.phase === 'spinning') {
      state.wheelAngle += spinSpeed * dt * 10;
      state.ballAngle += ballSpeed * dt * 10;

      spinSpeed *= 0.995;
      ballSpeed *= 0.99;

      if (Math.abs(spinSpeed) < 0.01 && Math.abs(ballSpeed) < 0.02) {
        if (targetNumber !== null) {
          const idx = getWheelIndex(targetNumber);
          const targetAngle = -(idx * (Math.PI * 2) / WHEEL_NUMBERS.length) - Math.PI / 2;
          state.ballAngle = targetAngle - state.wheelAngle;
        }
        finishSpin();
      }
    }
  };

  const render = () => {
    renderGameScreen();

    if (state.phase === 'gameover') {
      gameOverHud.render(state.maxChips);
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
