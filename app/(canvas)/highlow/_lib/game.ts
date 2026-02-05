import {
  createGameOverHud,
  TGameOverCallbacks,
} from '@/lib/game';
import { RANK_LABELS, SUIT_COLORS, SUIT_SYMBOLS } from './config';
import { Card, Guess, HighLowState } from './types';
import { checkGuess, createDeck, drawCard, shuffleDeck } from './utils';

export type THighLowCallbacks = {
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

export const setupHighLow = (
  canvas: HTMLCanvasElement,
  callbacks?: THighLowCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let state: HighLowState = {
    phase: 'playing',
    currentCard: null,
    nextCard: null,
    guess: null,
    streak: 0,
    maxStreak: 0,
    deck: [],
  };

  let revealProgress = 0;
  let resultMessage = '';
  let globalTime = 0;
  let resultTime = 0;
  let cardFlipProgress = 0;
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

  const gameOverHud = createGameOverHud(canvas, ctx, 'highlow', gameOverCallbacks);

  const initDeck = () => {
    state.deck = shuffleDeck(createDeck());
    const draw = drawCard(state.deck);
    if (draw) {
      state.currentCard = draw.card;
      state.deck = draw.remainingDeck;
    }
  };

  const resetGame = () => {
    state = {
      phase: 'playing',
      currentCard: null,
      nextCard: null,
      guess: null,
      streak: 0,
      maxStreak: 0,
      deck: [],
    };
    revealProgress = 0;
    resultMessage = '';
    cardFlipProgress = 0;
    gameOverHud.reset();
    initDeck();
  };

  const makeGuess = (guess: Guess) => {
    if (state.phase !== 'playing' || !state.currentCard) return;

    state.guess = guess;

    // 바로 게임 진행
    const draw = drawCard(state.deck);
    if (!draw) {
      state.deck = shuffleDeck(createDeck());
      const newDraw = drawCard(state.deck);
      if (newDraw) {
        state.nextCard = newDraw.card;
        state.deck = newDraw.remainingDeck;
      }
    } else {
      state.nextCard = draw.card;
      state.deck = draw.remainingDeck;
    }

    state.phase = 'revealing';
    revealProgress = 0;
    cardFlipProgress = 0;
  };

  const processResult = () => {
    if (!state.currentCard || !state.nextCard) return;

    const result = checkGuess(state.currentCard, state.nextCard, state.guess);
    resultTime = globalTime;

    if (result === 'win') {
      state.streak++;
      if (state.streak > state.maxStreak) {
        state.maxStreak = state.streak;
      }
      resultMessage = 'CORRECT!';
      state.currentCard = state.nextCard;
      state.nextCard = null;
      state.guess = null;
      state.phase = 'playing';
    } else if (result === 'tie') {
      resultMessage = 'TIE!';
      state.currentCard = state.nextCard;
      state.nextCard = null;
      state.guess = null;
      state.phase = 'playing';
    } else {
      resultMessage = 'WRONG!';
      state.phase = 'gameover';
    }
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
      const handled = gameOverHud.onKeyDown(e, state.maxStreak);
      if (handled) return;
    }

    if (e.code === 'KeyR') {
      resetGame();
      return;
    }

    if (state.phase === 'playing') {
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        makeGuess('high');
        return;
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault();
        makeGuess('low');
        return;
      }
    }
  };

  // ========== 렌더링 ==========

  const renderBackground = () => {
    const rect = canvas.getBoundingClientRect();

    const bgGradient = ctx.createRadialGradient(
      rect.width / 2, rect.height / 2, 0,
      rect.width / 2, rect.height / 2, rect.width * 0.7
    );
    bgGradient.addColorStop(0, '#1a5c1a');
    bgGradient.addColorStop(0.7, '#0d3d0d');
    bgGradient.addColorStop(1, '#052505');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = 'rgba(255,215,0,0.1)';
    ctx.lineWidth = 1;
    const spacing = 40;
    for (let x = 0; x < rect.width; x += spacing) {
      for (let y = 0; y < rect.height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x + 10, y);
        ctx.lineTo(x, y + 10);
        ctx.lineTo(x - 10, y);
        ctx.closePath();
        ctx.stroke();
      }
    }

    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.roundRect(10, 10, rect.width - 20, rect.height - 20, 20);
    ctx.stroke();

    ctx.strokeStyle = '#D4A574';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(15, 15, rect.width - 30, rect.height - 30, 18);
    ctx.stroke();
  };

  const renderCard = (
    x: number,
    y: number,
    w: number,
    h: number,
    card: Card | null,
    faceDown: boolean = false,
    flipProgress: number = 1
  ) => {
    ctx.save();

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    const scaleX = Math.abs(Math.cos(flipProgress * Math.PI));
    const showBack = flipProgress < 0.5;

    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(scaleX || 0.01, 1);
    ctx.translate(-w / 2, -h / 2);

    const cardGradient = ctx.createLinearGradient(0, 0, w, h);
    if (showBack || faceDown || !card) {
      cardGradient.addColorStop(0, '#1a237e');
      cardGradient.addColorStop(0.5, '#283593');
      cardGradient.addColorStop(1, '#1a237e');
    } else {
      cardGradient.addColorStop(0, '#ffffff');
      cardGradient.addColorStop(1, '#f5f5f5');
    }

    ctx.fillStyle = cardGradient;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = showBack || faceDown || !card ? '#3949ab' : '#ddd';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (showBack || faceDown || !card) {
      ctx.fillStyle = '#3949ab';
      ctx.beginPath();
      ctx.roundRect(8, 8, w - 16, h - 16, 8);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 15) {
        ctx.beginPath();
        ctx.moveTo(i, 8);
        ctx.lineTo(i, h - 8);
        ctx.stroke();
      }
      for (let i = 0; i < h; i += 15) {
        ctx.beginPath();
        ctx.moveTo(8, i);
        ctx.lineTo(w - 8, i);
        ctx.stroke();
      }

      ctx.fillStyle = '#FFD700';
      ctx.font = '40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', w / 2, h / 2);
    } else if (card) {
      const color = SUIT_COLORS[card.suit];
      const symbol = SUIT_SYMBOLS[card.suit];
      const label = RANK_LABELS[card.rank];

      ctx.fillStyle = color;
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, 12, 12);
      ctx.font = '24px sans-serif';
      ctx.fillText(symbol, 12, 42);

      ctx.font = '72px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, w / 2, h / 2);

      ctx.save();
      ctx.translate(w - 12, h - 12);
      ctx.rotate(Math.PI);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(label, 0, 0);
      ctx.font = '24px sans-serif';
      ctx.fillText(symbol, 0, 30);
      ctx.restore();
    }

    ctx.restore();
  };

  const renderVS = (cx: number, cy: number) => {
    const pulse = 1 + Math.sin(globalTime * 0.005) * 0.1;

    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;

    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${32 * pulse}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', cx, cy);

    ctx.shadowBlur = 0;
  };

  const renderButtons = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const btnY = 410;
    const btnW = 130;
    const btnH = 55;
    const gap = 25;

    // HIGH 버튼
    const highBtn: Button = {
      x: cx - gap - btnW,
      y: btnY,
      w: btnW,
      h: btnH,
      action: () => makeGuess('high'),
      label: '⬆ HIGH',
    };
    buttons.push(highBtn);

    const highGradient = ctx.createLinearGradient(highBtn.x, highBtn.y, highBtn.x, highBtn.y + highBtn.h);
    const isHighHovered = hoveredButton === highBtn;
    if (isHighHovered) {
      highGradient.addColorStop(0, '#4CAF50');
      highGradient.addColorStop(1, '#2E7D32');
    } else {
      highGradient.addColorStop(0, '#388E3C');
      highGradient.addColorStop(1, '#1B5E20');
    }

    ctx.fillStyle = highGradient;
    ctx.shadowColor = isHighHovered ? '#4CAF50' : 'transparent';
    ctx.shadowBlur = isHighHovered ? 20 : 0;
    ctx.beginPath();
    ctx.roundRect(highBtn.x, highBtn.y, highBtn.w, highBtn.h, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = isHighHovered ? '#81C784' : '#4CAF50';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(highBtn.label, highBtn.x + highBtn.w / 2, highBtn.y + highBtn.h / 2);

    // LOW 버튼
    const lowBtn: Button = {
      x: cx + gap,
      y: btnY,
      w: btnW,
      h: btnH,
      action: () => makeGuess('low'),
      label: 'LOW ⬇',
    };
    buttons.push(lowBtn);

    const lowGradient = ctx.createLinearGradient(lowBtn.x, lowBtn.y, lowBtn.x, lowBtn.y + lowBtn.h);
    const isLowHovered = hoveredButton === lowBtn;
    if (isLowHovered) {
      lowGradient.addColorStop(0, '#f44336');
      lowGradient.addColorStop(1, '#c62828');
    } else {
      lowGradient.addColorStop(0, '#d32f2f');
      lowGradient.addColorStop(1, '#b71c1c');
    }

    ctx.fillStyle = lowGradient;
    ctx.shadowColor = isLowHovered ? '#f44336' : 'transparent';
    ctx.shadowBlur = isLowHovered ? 20 : 0;
    ctx.beginPath();
    ctx.roundRect(lowBtn.x, lowBtn.y, lowBtn.w, lowBtn.h, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = isLowHovered ? '#ef9a9a' : '#f44336';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.fillText(lowBtn.label, lowBtn.x + lowBtn.w / 2, lowBtn.y + lowBtn.h / 2);
  };

  const renderStreak = () => {
    const rect = canvas.getBoundingClientRect();

    if (state.streak > 0) {
      const streakX = rect.width / 2;
      const streakY = 50;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.roundRect(streakX - 80, streakY - 20, 160, 45, 10);
      ctx.fill();

      const pulse = 1 + Math.sin(globalTime * 0.008) * 0.1;
      ctx.font = `bold ${24 * pulse}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FF6B35';
      ctx.shadowColor = '#FF6B35';
      ctx.shadowBlur = 10;
      ctx.fillText(`🔥 ${state.streak} STREAK`, streakX, streakY + 5);
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Best: ${state.maxStreak}`, 25, 35);

    ctx.textAlign = 'right';
    ctx.fillText(`Deck: ${state.deck.length}`, rect.width - 25, 35);
  };

  const renderResult = () => {
    if (!resultMessage) return;

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const elapsed = globalTime - resultTime;
    const fadeOut = Math.max(0, 1 - elapsed / 2000);

    if (fadeOut <= 0) {
      resultMessage = '';
      return;
    }

    ctx.globalAlpha = fadeOut;

    let color = '#FFD700';
    if (resultMessage === 'CORRECT!') color = '#4CAF50';
    else if (resultMessage === 'WRONG!') color = '#f44336';
    else if (resultMessage === 'TIE!') color = '#FF9800';

    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.fillStyle = color;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(resultMessage, cx, 540);
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 1;
  };

  const renderRestartButton = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;

    const restartBtn: Button = {
      x: cx - 50,
      y: 580,
      w: 100,
      h: 30,
      action: resetGame,
      label: '재시작 (R)',
    };
    buttons.push(restartBtn);

    ctx.fillStyle = hoveredButton === restartBtn ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 5);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(restartBtn.label, cx, restartBtn.y + restartBtn.h / 2 + 4);
  };

  const renderGameScreen = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;

    buttons = [];

    renderBackground();
    renderStreak();

    const cardW = 140;
    const cardH = 200;
    const cardY = 150;
    const cardGap = 80;

    renderCard(cx - cardW - cardGap / 2, cardY, cardW, cardH, state.currentCard, false);

    renderVS(cx, cardY + cardH / 2);

    const showNext = state.phase === 'revealing' || state.phase === 'gameover';
    renderCard(
      cx + cardGap / 2,
      cardY,
      cardW,
      cardH,
      showNext ? state.nextCard : null,
      !showNext,
      showNext ? cardFlipProgress : 0
    );

    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('다음 카드가 높을까요, 낮을까요?', cx, cardY - 30);

    if (state.phase === 'playing') {
      renderButtons();
    }

    renderResult();
    renderRestartButton();
  };

  let lastTime = 0;
  const REVEAL_DURATION = 600;

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    const dt = t - lastTime;
    lastTime = t;
    globalTime = t;

    if (state.phase === 'revealing') {
      revealProgress += dt / REVEAL_DURATION;
      cardFlipProgress = Math.min(1, revealProgress * 1.5);

      if (revealProgress >= 1) {
        revealProgress = 1;
        cardFlipProgress = 1;
        processResult();
      }
    }
  };

  const render = () => {
    renderGameScreen();

    if (state.phase === 'gameover') {
      gameOverHud.render(state.maxStreak);
    }
  };

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    raf = requestAnimationFrame(draw);
  };

  resize();
  initDeck();
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
