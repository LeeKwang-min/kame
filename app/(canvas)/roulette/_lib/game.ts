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
import { Bet, BetType, RouletteState } from './types';
import { calculateTotalWin, getNumberColor, getWheelIndex, spinWheel } from './utils';

export type TRouletteCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (initials: string, score: number) => Promise<void>;
};

type Button = {
  x: number;
  y: number;
  w: number;
  h: number;
  action: () => void;
  label: string;
  type?: string;
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
  let globalTime = 0;
  let resultTime = 0;
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

  const gameOverHud = createGameOverHud(canvas, ctx, 'roulette', gameOverCallbacks);

  const resetGame = async () => {
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
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

  const selectBetType = (type: BetType) => {
    if (state.phase !== 'betting') return;
    state.currentBetType = type;
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
    spinSpeed = 0.4;
    ballSpeed = -0.6;
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
    resultTime = globalTime;
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

  // ========== 렌더링 ==========

  const renderBackground = () => {
    const rect = canvas.getBoundingClientRect();

    const bgGradient = ctx.createRadialGradient(
      rect.width / 2, rect.height / 2, 0,
      rect.width / 2, rect.height / 2, rect.width * 0.8
    );
    bgGradient.addColorStop(0, '#1a3d1a');
    bgGradient.addColorStop(0.6, '#0d2d0d');
    bgGradient.addColorStop(1, '#051505');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 360; i += 10) {
      const angle = (i * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(rect.width / 2, rect.height / 2);
      ctx.lineTo(
        rect.width / 2 + Math.cos(angle) * rect.width,
        rect.height / 2 + Math.sin(angle) * rect.height
      );
      ctx.stroke();
    }
  };

  const renderWheel = (cx: number, cy: number, radius: number) => {
    const segments = WHEEL_NUMBERS.length;
    const angleStep = (Math.PI * 2) / segments;

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 8;
    ctx.shadowColor = '#D4AF37';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    const woodGradient = ctx.createRadialGradient(cx, cy, radius, cx, cy, radius + 25);
    woodGradient.addColorStop(0, '#8B4513');
    woodGradient.addColorStop(0.5, '#A0522D');
    woodGradient.addColorStop(1, '#654321');
    ctx.fillStyle = woodGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 20, 0, Math.PI * 2);
    ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2, true);
    ctx.fill();

    for (let i = 0; i < segments; i++) {
      const num = WHEEL_NUMBERS[i];
      const startAngle = state.wheelAngle + i * angleStep - Math.PI / 2;
      const endAngle = startAngle + angleStep;

      const color = getNumberColor(num);

      const midAngle = startAngle + angleStep / 2;
      const gradientX = cx + Math.cos(midAngle) * radius * 0.5;
      const gradientY = cy + Math.sin(midAngle) * radius * 0.5;
      const segGradient = ctx.createRadialGradient(gradientX, gradientY, 0, cx, cy, radius);

      if (color === 'red') {
        segGradient.addColorStop(0, '#ff4444');
        segGradient.addColorStop(1, '#aa0000');
      } else if (color === 'black') {
        segGradient.addColorStop(0, '#444444');
        segGradient.addColorStop(1, '#111111');
      } else {
        segGradient.addColorStop(0, '#44aa44');
        segGradient.addColorStop(1, '#116611');
      }

      ctx.fillStyle = segGradient;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 1;
      ctx.stroke();

      const textAngle = startAngle + angleStep / 2;
      const textR = radius * 0.78;
      const tx = cx + Math.cos(textAngle) * textR;
      const ty = cy + Math.sin(textAngle) * textR;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 3;
      ctx.fillText(String(num), 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    const centerGradient = ctx.createRadialGradient(cx, cy - 10, 0, cx, cy, radius * 0.35);
    centerGradient.addColorStop(0, '#D4AF37');
    centerGradient.addColorStop(0.5, '#8B6914');
    centerGradient.addColorStop(1, '#5C4A08');
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
    ctx.stroke();

    const jewelGradient = ctx.createRadialGradient(cx, cy - 5, 0, cx, cy, radius * 0.12);
    jewelGradient.addColorStop(0, '#fff');
    jewelGradient.addColorStop(0.3, '#E8D5B7');
    jewelGradient.addColorStop(1, '#8B6914');
    ctx.fillStyle = jewelGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.1, 0, Math.PI * 2);
    ctx.fill();

    const ballR = radius * 0.88;
    const ballX = cx + Math.cos(state.ballAngle) * ballR;
    const ballY = cy + Math.sin(state.ballAngle) * ballR;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(ballX + 2, ballY + 2, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const ballGradient = ctx.createRadialGradient(ballX - 3, ballY - 3, 0, ballX, ballY, 10);
    ballGradient.addColorStop(0, '#ffffff');
    ballGradient.addColorStop(0.3, '#f0f0f0');
    ballGradient.addColorStop(0.7, '#cccccc');
    ballGradient.addColorStop(1, '#888888');
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ballX, ballY, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#D4AF37';
    ctx.shadowColor = '#D4AF37';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius - 25);
    ctx.lineTo(cx - 12, cy - radius - 8);
    ctx.lineTo(cx + 12, cy - radius - 8);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const renderChipStack = () => {
    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#D4AF37';
    ctx.shadowBlur = 5;
    ctx.fillText(`💰 ${state.chips.toLocaleString()}`, 20, 35);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#aaa';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Best: ${state.maxChips.toLocaleString()}`, 20, 55);
  };

  const renderBettingPanel = () => {
    const rect = canvas.getBoundingClientRect();
    const panelX = 15;
    const panelY = 355;
    const panelW = rect.width - 30;
    const panelH = 235;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 15);
    ctx.fill();

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PLACE YOUR BETS', panelX + 15, panelY + 25);

    // 베팅 타입 버튼들
    const typeStartY = panelY + 45;
    const btnW = 115;
    const btnH = 28;

    BET_TYPES.forEach((type, i) => {
      const isSelected = type === state.currentBetType;
      const col = i < 5 ? 0 : 1;
      const row = i % 5;
      const x = panelX + 15 + col * 130;
      const y = typeStartY + row * 32;

      const btn: Button = {
        x: x,
        y: y,
        w: btnW,
        h: btnH,
        action: () => selectBetType(type),
        label: type,
        type: 'betType',
      };
      buttons.push(btn);

      const isHovered = hoveredButton === btn;

      if (isSelected) {
        ctx.fillStyle = 'rgba(212, 175, 55, 0.3)';
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      } else {
        ctx.fillStyle = 'transparent';
      }

      ctx.beginPath();
      ctx.roundRect(x - 3, y - 3, btnW + 6, btnH + 6, 5);
      ctx.fill();

      ctx.fillStyle = isSelected ? '#D4AF37' : isHovered ? '#fff' : 'rgba(255,255,255,0.6)';
      ctx.font = isSelected ? 'bold 13px sans-serif' : '13px sans-serif';
      ctx.textAlign = 'left';

      let label = BET_TYPE_LABELS[type];
      if (type === 'single') {
        const numColor = getNumberColor(state.selectedNumber);
        const colorIcon = numColor === 'red' ? '🔴' : numColor === 'black' ? '⚫' : '🟢';
        label += ` [${state.selectedNumber}${colorIcon}]`;
      }

      ctx.fillText((isSelected ? '▶ ' : '   ') + label, x, y + btnH / 2 + 4);
    });

    // 숫자 선택 (single일 때)
    if (state.currentBetType === 'single') {
      const numY = typeStartY + 10;

      const numDownBtn: Button = {
        x: panelX + 280,
        y: numY,
        w: 35,
        h: 30,
        action: () => changeSelectedNumber(-1),
        label: '◀',
      };
      buttons.push(numDownBtn);

      ctx.fillStyle = hoveredButton === numDownBtn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(numDownBtn.x, numDownBtn.y, numDownBtn.w, numDownBtn.h, 5);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('◀', numDownBtn.x + numDownBtn.w / 2, numDownBtn.y + numDownBtn.h / 2 + 4);

      const numUpBtn: Button = {
        x: panelX + 370,
        y: numY,
        w: 35,
        h: 30,
        action: () => changeSelectedNumber(1),
        label: '▶',
      };
      buttons.push(numUpBtn);

      ctx.fillStyle = hoveredButton === numUpBtn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(numUpBtn.x, numUpBtn.y, numUpBtn.w, numUpBtn.h, 5);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('▶', numUpBtn.x + numUpBtn.w / 2, numUpBtn.y + numUpBtn.h / 2 + 4);

      const numColor = getNumberColor(state.selectedNumber);
      ctx.fillStyle = numColor === 'red' ? '#ff4444' : numColor === 'black' ? '#888' : '#44aa44';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(String(state.selectedNumber), panelX + 340, numY + 20);
    }

    // 베팅 금액 선택
    const amountY = typeStartY + 55;
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Bet Amount:', panelX + 280, amountY);

    const amtDownBtn: Button = {
      x: panelX + 280,
      y: amountY + 10,
      w: 35,
      h: 30,
      action: () => changeBetAmount(-1),
      label: '◀',
    };
    buttons.push(amtDownBtn);

    ctx.fillStyle = hoveredButton === amtDownBtn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(amtDownBtn.x, amtDownBtn.y, amtDownBtn.w, amtDownBtn.h, 5);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◀', amtDownBtn.x + amtDownBtn.w / 2, amtDownBtn.y + amtDownBtn.h / 2 + 4);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(String(state.currentBetAmount), panelX + 340, amountY + 30);

    const amtUpBtn: Button = {
      x: panelX + 370,
      y: amountY + 10,
      w: 35,
      h: 30,
      action: () => changeBetAmount(1),
      label: '▶',
    };
    buttons.push(amtUpBtn);

    ctx.fillStyle = hoveredButton === amtUpBtn ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(amtUpBtn.x, amtUpBtn.y, amtUpBtn.w, amtUpBtn.h, 5);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText('▶', amtUpBtn.x + amtUpBtn.w / 2, amtUpBtn.y + amtUpBtn.h / 2 + 4);

    // 베팅하기 버튼
    const placeBetBtn: Button = {
      x: panelX + 280,
      y: amountY + 55,
      w: 130,
      h: 38,
      action: placeBet,
      label: '베팅하기',
    };
    buttons.push(placeBetBtn);

    const placeBtnHovered = hoveredButton === placeBetBtn;
    const placeBtnGradient = ctx.createLinearGradient(placeBetBtn.x, placeBetBtn.y, placeBetBtn.x, placeBetBtn.y + placeBetBtn.h);
    if (placeBtnHovered) {
      placeBtnGradient.addColorStop(0, '#FFD700');
      placeBtnGradient.addColorStop(1, '#FFA000');
    } else {
      placeBtnGradient.addColorStop(0, '#4CAF50');
      placeBtnGradient.addColorStop(1, '#2E7D32');
    }

    ctx.fillStyle = placeBtnGradient;
    ctx.shadowColor = placeBtnHovered ? '#FFD700' : '#4CAF50';
    ctx.shadowBlur = placeBtnHovered ? 10 : 5;
    ctx.beginPath();
    ctx.roundRect(placeBetBtn.x, placeBetBtn.y, placeBetBtn.w, placeBetBtn.h, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(placeBetBtn.label, placeBetBtn.x + placeBetBtn.w / 2, placeBetBtn.y + placeBetBtn.h / 2 + 5);

    // 베팅 정보
    ctx.fillStyle = '#aaa';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Bets: ${state.bets.length}`, panelX + 430, amountY);

    if (state.bets.length > 0) {
      const totalBet = state.bets.reduce((sum, b) => sum + b.amount, 0);
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`Total: ${totalBet}`, panelX + 430, amountY + 20);
    }

    // 배당률
    const payout = BET_PAYOUTS[state.currentBetType];
    ctx.fillStyle = '#888';
    ctx.fillText(`Payout: ${payout}:1`, panelX + 430, amountY + 45);

    // 스핀 버튼
    if (state.bets.length > 0) {
      const spinBtn: Button = {
        x: panelX + 420,
        y: amountY + 60,
        w: 150,
        h: 45,
        action: spin,
        label: '🎲 SPIN!',
      };
      buttons.push(spinBtn);

      const spinBtnHovered = hoveredButton === spinBtn;
      const spinGradient = ctx.createLinearGradient(spinBtn.x, spinBtn.y, spinBtn.x, spinBtn.y + spinBtn.h);
      if (spinBtnHovered) {
        spinGradient.addColorStop(0, '#FFD700');
        spinGradient.addColorStop(1, '#FFA000');
      } else {
        spinGradient.addColorStop(0, '#E91E63');
        spinGradient.addColorStop(1, '#AD1457');
      }

      ctx.fillStyle = spinGradient;
      ctx.shadowColor = spinBtnHovered ? '#FFD700' : '#E91E63';
      ctx.shadowBlur = spinBtnHovered ? 15 : 8;
      ctx.beginPath();
      ctx.roundRect(spinBtn.x, spinBtn.y, spinBtn.w, spinBtn.h, 10);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(spinBtn.label, spinBtn.x + spinBtn.w / 2, spinBtn.y + spinBtn.h / 2 + 6);
    }

    // 재시작 버튼
    const restartBtn: Button = {
      x: panelX + panelW - 100,
      y: panelY + 10,
      w: 85,
      h: 28,
      action: resetGame,
      label: '재시작 (R)',
    };
    buttons.push(restartBtn);

    ctx.fillStyle = hoveredButton === restartBtn ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 5);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(restartBtn.label, restartBtn.x + restartBtn.w / 2, restartBtn.y + restartBtn.h / 2 + 4);
  };

  const renderResult = () => {
    if (state.phase !== 'result' || state.result === null) return;

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const elapsed = globalTime - resultTime;
    const pulse = 1 + Math.sin(elapsed * 0.01) * 0.05;

    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.beginPath();
    ctx.roundRect(cx - 180, 355, 360, 200, 15);
    ctx.fill();

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3;
    ctx.stroke();

    const color = getNumberColor(state.result);
    const numColor = color === 'red' ? '#ff4444' : color === 'black' ? '#333' : '#44aa44';

    ctx.save();
    ctx.translate(cx, 420);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = numColor;
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(state.result), 0, 0);
    ctx.restore();

    ctx.fillStyle = numColor;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(color.toUpperCase(), cx, 480);

    if (state.lastWin > 0) {
      ctx.fillStyle = '#4CAF50';
      ctx.shadowColor = '#4CAF50';
      ctx.shadowBlur = 10;
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`WIN! +${state.lastWin.toLocaleString()}`, cx, 515);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#f44336';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('No win this round', cx, 515);
    }

    // 계속 버튼
    const continueBtn: Button = {
      x: cx - 70,
      y: 535,
      w: 140,
      h: 40,
      action: nextRound,
      label: '계속하기',
    };
    buttons.push(continueBtn);

    const contBtnHovered = hoveredButton === continueBtn;
    ctx.fillStyle = contBtnHovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(continueBtn.x, continueBtn.y, continueBtn.w, continueBtn.h, 8);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText('계속하기 (Space)', cx, continueBtn.y + continueBtn.h / 2 + 5);
  };

  const renderSpinning = () => {
    if (state.phase !== 'spinning') return;

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';

    const dots = '.'.repeat(Math.floor(globalTime / 300) % 4);
    ctx.fillText(`Spinning${dots}`, cx, 400);
  };

  const renderGameScreen = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;

    buttons = [];

    renderBackground();
    renderChipStack();
    renderWheel(cx, 190, 145);

    if (state.phase === 'betting') {
      renderBettingPanel();
    } else if (state.phase === 'spinning') {
      renderSpinning();
    } else if (state.phase === 'result') {
      renderResult();
    }
  };

  let lastTime = 0;

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    const dt = (t - lastTime) / 1000;
    lastTime = t;
    globalTime = t;

    if (state.phase === 'spinning') {
      state.wheelAngle += spinSpeed * dt * 10;
      state.ballAngle += ballSpeed * dt * 10;

      spinSpeed *= 0.992;
      ballSpeed *= 0.988;

      if (Math.abs(spinSpeed) < 0.008 && Math.abs(ballSpeed) < 0.015) {
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
