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
    gameOverHud.reset();
    initDeck();
  };

  const makeGuess = (guess: Guess) => {
    if (state.phase !== 'playing' || !state.currentCard) return;
    if (state.guess !== null) return;

    state.guess = guess;
  };

  const confirmGuess = () => {
    if (state.phase !== 'playing' || !state.currentCard || !state.guess) return;

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
  };

  const processResult = () => {
    if (!state.currentCard || !state.nextCard) return;

    const result = checkGuess(state.currentCard, state.nextCard, state.guess);

    if (result === 'win') {
      state.streak++;
      if (state.streak > state.maxStreak) {
        state.maxStreak = state.streak;
      }
      resultMessage = 'Correct!';
      state.currentCard = state.nextCard;
      state.nextCard = null;
      state.guess = null;
      state.phase = 'playing';
    } else if (result === 'tie') {
      resultMessage = 'Tie! Try again.';
      state.currentCard = state.nextCard;
      state.nextCard = null;
      state.guess = null;
      state.phase = 'playing';
    } else {
      resultMessage = 'Wrong!';
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

      if ((e.code === 'Enter' || e.code === 'NumpadEnter') && state.guess) {
        e.preventDefault();
        confirmGuess();
        return;
      }
    }
  };

  const renderCard = (x: number, y: number, w: number, h: number, card: Card | null, faceDown: boolean = false) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    if (faceDown || !card) {
      ctx.fillStyle = '#1a237e';
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 5, w - 10, h - 10, 4);
      ctx.fill();

      ctx.strokeStyle = '#3949ab';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 15 + i * 15);
        ctx.lineTo(x + w - 10, y + 15 + i * 15);
        ctx.stroke();
      }
      return;
    }

    const color = SUIT_COLORS[card.suit];
    const symbol = SUIT_SYMBOLS[card.suit];
    const label = RANK_LABELS[card.rank];

    ctx.fillStyle = color;
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x + 10, y + 10);
    ctx.fillText(symbol, x + 10, y + 35);

    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x + w / 2, y + h / 2);

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.save();
    ctx.translate(x + w - 10, y + h - 10);
    ctx.rotate(Math.PI);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, 0, 0);
    ctx.fillText(symbol, 0, 25);
    ctx.restore();
  };

  const renderGameScreen = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;

    ctx.fillStyle = '#0d5c0d';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = 'white';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Streak: ${state.streak}`, 20, 30);
    ctx.fillText(`Best: ${state.maxStreak}`, 20, 55);

    ctx.textAlign = 'right';
    ctx.fillText(`Deck: ${state.deck.length}`, rect.width - 20, 30);

    const cardW = 120;
    const cardH = 170;
    const cardY = 150;

    renderCard(cx - cardW - 40, cardY, cardW, cardH, state.currentCard, false);

    ctx.fillStyle = 'white';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VS', cx, cardY + cardH / 2);

    const showNextCard = state.phase === 'revealing' || state.phase === 'gameover';
    renderCard(cx + 40, cardY, cardW, cardH, showNextCard ? state.nextCard : null, !showNextCard);

    const guessY = cardY + cardH + 50;

    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('Will the next card be Higher or Lower?', cx, guessY);

    const btnW = 120;
    const btnH = 50;
    const btnY = guessY + 30;

    ctx.fillStyle = state.guess === 'high' ? '#4CAF50' : '#2E7D32';
    ctx.beginPath();
    ctx.roundRect(cx - btnW - 20, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = '20px sans-serif';
    ctx.fillText('← HIGH', cx - btnW / 2 - 20, btnY + btnH / 2 + 7);

    ctx.fillStyle = state.guess === 'low' ? '#F44336' : '#C62828';
    ctx.beginPath();
    ctx.roundRect(cx + 20, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.fillText('LOW →', cx + btnW / 2 + 20, btnY + btnH / 2 + 7);

    if (state.guess && state.phase === 'playing') {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '14px sans-serif';
      ctx.fillText('Press Enter to confirm', cx, btnY + btnH + 30);
    }

    if (resultMessage) {
      ctx.font = 'bold 28px sans-serif';
      ctx.fillStyle = resultMessage === 'Correct!' ? '#4CAF50' :
                       resultMessage === 'Tie! Try again.' ? '#FF9800' : '#F44336';
      ctx.fillText(resultMessage, cx, 520);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.fillText('R: Restart', cx, 580);
  };

  let lastTime = 0;
  const REVEAL_DURATION = 500;

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    const dt = t - lastTime;
    lastTime = t;

    if (state.phase === 'revealing') {
      revealProgress += dt / REVEAL_DURATION;
      if (revealProgress >= 1) {
        revealProgress = 1;
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

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
  };
};
