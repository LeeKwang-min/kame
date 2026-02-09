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
  GRID_COLS,
  GRID_ROWS,
  TOTAL_CARDS,
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_SPACING,
  CARD_BORDER_RADIUS,
  TIME_LIMIT,
  FLIP_ANIMATION_DURATION,
  MATCH_DELAY,
  MISMATCH_DELAY,
  MATCH_SCORE,
  COMBO_MULTIPLIER,
  MISS_PENALTY,
  TIME_BONUS_MULTIPLIER,
  CARD_EMOJIS,
  CARD_BACK_COLOR,
  CARD_FRONT_COLOR,
  CARD_BORDER_COLOR,
  CARD_MATCHED_COLOR,
  CARD_HIGHLIGHT_COLOR,
} from './config';
import { TCard, TGameState } from './types';

export type TMatchPairsCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupMatchPairs = (
  canvas: HTMLCanvasElement,
  callbacks?: TMatchPairsCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // --- State ---
  let cards: TCard[] = [];
  let score = 0;
  let timeLeft = TIME_LIMIT;
  let matchedPairs = 0;
  let comboCount = 0;
  let totalFlips = 0;
  let misses = 0;

  let state: TGameState = 'start';
  let selectedCards: TCard[] = [];
  let isLocked = false; // 카드 선택 잠금

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
    'matchpairs',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Helpers ---
  const shuffle = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // --- Initialize Cards ---
  const initializeCards = () => {
    // 카드 쌍 생성
    const pairs = [...CARD_EMOJIS, ...CARD_EMOJIS];
    const shuffledEmojis = shuffle(pairs);

    // 그리드 시작 위치 계산 (중앙 정렬)
    const gridWidth = GRID_COLS * CARD_WIDTH + (GRID_COLS - 1) * CARD_SPACING;
    const gridHeight = GRID_ROWS * CARD_HEIGHT + (GRID_ROWS - 1) * CARD_SPACING;
    const startX = (CANVAS_WIDTH - gridWidth) / 2;
    const startY = 100; // 상단에서 100px 떨어진 곳부터 시작

    cards = [];
    let id = 0;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = startX + col * (CARD_WIDTH + CARD_SPACING);
        const y = startY + row * (CARD_HEIGHT + CARD_SPACING);

        cards.push({
          id,
          emoji: shuffledEmojis[id],
          gridX: col,
          gridY: row,
          x,
          y,
          isFlipped: false,
          isMatched: false,
          flipProgress: 0,
          isFlipping: false,
        });
        id++;
      }
    }
  };

  // --- Reset ---
  const resetGame = () => {
    initializeCards();
    score = 0;
    timeLeft = TIME_LIMIT;
    matchedPairs = 0;
    comboCount = 0;
    totalFlips = 0;
    misses = 0;
    state = 'start';
    selectedCards = [];
    isLocked = false;
    gameOverHud.reset();
  };

  // --- Start ---
  const startGame = async () => {
    if (state === 'loading') return;
    state = 'loading';
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    state = 'playing';
    score = 0;
    timeLeft = TIME_LIMIT;
    matchedPairs = 0;
    comboCount = 0;
    totalFlips = 0;
    misses = 0;
    selectedCards = [];
    isLocked = false;
    initializeCards();
  };

  // --- Check Match ---
  const checkMatch = () => {
    if (selectedCards.length !== 2) return;

    const [card1, card2] = selectedCards;

    if (card1.emoji === card2.emoji) {
      // 매치 성공!
      card1.isMatched = true;
      card2.isMatched = true;
      matchedPairs++;
      comboCount++;

      // 점수 계산
      const baseScore = MATCH_SCORE;
      const comboBonus = comboCount > 1 ? (comboCount - 1) * COMBO_MULTIPLIER : 0;
      const gainedScore = baseScore + comboBonus;
      score += gainedScore;

      selectedCards = [];
      isLocked = false;

      // 게임 완료 체크
      if (matchedPairs === CARD_EMOJIS.length) {
        // 모든 카드 매치 완료!
        // 시간 보너스 추가
        const timeBonus = Math.floor(timeLeft * TIME_BONUS_MULTIPLIER);
        score += timeBonus;
        state = 'completed';
      }
    } else {
      // 미스!
      comboCount = 0;
      misses++;
      score = Math.max(0, score - MISS_PENALTY);

      // 1초 후 카드 뒤집기
      setTimeout(() => {
        card1.isFlipped = false;
        card2.isFlipped = false;
        card1.isFlipping = true;
        card2.isFlipping = true;
        selectedCards = [];
        isLocked = false;
      }, MISMATCH_DELAY);
    }
  };

  // --- Handle Click ---
  const handleClick = (x: number, y: number) => {
    if (state !== 'playing' || isLocked) return;

    // 클릭한 카드 찾기
    const clickedCard = cards.find(
      (card) =>
        !card.isMatched &&
        !card.isFlipped &&
        x >= card.x &&
        x <= card.x + CARD_WIDTH &&
        y >= card.y &&
        y <= card.y + CARD_HEIGHT,
    );

    if (!clickedCard) return;

    // 카드 뒤집기
    clickedCard.isFlipped = true;
    clickedCard.isFlipping = true;
    selectedCards.push(clickedCard);
    totalFlips++;

    // 2장 선택되면 매치 체크
    if (selectedCards.length === 2) {
      isLocked = true;
      setTimeout(() => {
        checkMatch();
      }, MATCH_DELAY);
    }
  };

  // --- Get Canvas Position ---
  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  // --- Mouse Handler ---
  const handleMouseDown = (e: MouseEvent) => {
    if (state !== 'playing') return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    handleClick(pos.x, pos.y);
  };

  // --- Touch Handler ---
  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (state !== 'playing') return;
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    handleClick(pos.x, pos.y);
  };

  // --- Keyboard Handler ---
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    // Game over HUD handles keys first
    if (state === 'gameover' || state === 'completed') {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    switch (e.code) {
      case 'KeyS':
        if (state === 'start') {
          startGame();
        } else if (state === 'paused') {
          state = 'playing';
        }
        break;
      case 'KeyP':
        if (state === 'playing') {
          state = 'paused';
        }
        break;
      case 'KeyR':
        if (state !== 'gameover' && state !== 'completed') {
          resetGame();
        }
        break;
    }
  };

  // --- Update ---
  const update = (dt: number) => {
    if (state !== 'playing') return;

    // 시간 감소
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      state = 'gameover';
      return;
    }

    // 카드 뒤집기 애니메이션
    for (const card of cards) {
      if (card.isFlipping) {
        if (card.isFlipped) {
          // 앞면으로 뒤집기
          card.flipProgress += dt * (1000 / FLIP_ANIMATION_DURATION);
          if (card.flipProgress >= 1) {
            card.flipProgress = 1;
            card.isFlipping = false;
          }
        } else {
          // 뒷면으로 뒤집기
          card.flipProgress -= dt * (1000 / FLIP_ANIMATION_DURATION);
          if (card.flipProgress <= 0) {
            card.flipProgress = 0;
            card.isFlipping = false;
          }
        }
      }
    }
  };

  // --- Render ---
  const render = () => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 배경 그라디언트
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1e3c72');
    gradient.addColorStop(1, '#2a5298');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 카드 그리기
    for (const card of cards) {
      drawCard(card);
    }

    // HUD
    drawHud();

    // 오버레이
    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
    } else if (state === 'start') {
      gameStartHud(canvas, ctx);
    } else if (state === 'paused') {
      gamePauseHud(canvas, ctx);
    } else if (state === 'gameover' || state === 'completed') {
      gameOverHud.render(score);
    }
  };

  const drawCard = (card: TCard) => {
    ctx.save();

    // 카드 중심점으로 이동
    const centerX = card.x + CARD_WIDTH / 2;
    const centerY = card.y + CARD_HEIGHT / 2;
    ctx.translate(centerX, centerY);

    // 뒤집기 애니메이션 (3D 효과)
    const scaleX = Math.abs(Math.cos((card.flipProgress * Math.PI) / 2));
    ctx.scale(scaleX, 1);

    // 카드 색상 결정
    let cardColor = CARD_BACK_COLOR;
    if (card.flipProgress > 0.5) {
      if (card.isMatched) {
        cardColor = CARD_MATCHED_COLOR;
      } else {
        cardColor = CARD_FRONT_COLOR;
      }
    }

    // 선택된 카드 하이라이트
    if (selectedCards.includes(card) && !card.isMatched) {
      ctx.shadowColor = CARD_HIGHLIGHT_COLOR;
      ctx.shadowBlur = 20;
    }

    // 카드 배경
    ctx.fillStyle = cardColor;
    ctx.strokeStyle = CARD_BORDER_COLOR;
    ctx.lineWidth = 3;

    const halfW = CARD_WIDTH / 2;
    const halfH = CARD_HEIGHT / 2;

    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, CARD_WIDTH, CARD_HEIGHT, CARD_BORDER_RADIUS);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // 카드 내용
    if (card.flipProgress > 0.5) {
      // 앞면 (이모지)
      ctx.font = '60px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#2c3e50';
      ctx.scale(1 / scaleX, 1); // 텍스트는 늘어나지 않게
      ctx.fillText(card.emoji, 0, 0);
    } else {
      // 뒷면 (물음표)
      ctx.font = 'bold 70px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.scale(1 / scaleX, 1);
      ctx.fillText('?', 0, 0);
    }

    ctx.restore();
  };

  const drawHud = () => {
    if (state === 'start') return;

    ctx.save();

    // 점수 (좌측 상단)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText(`Score: ${score}`, 20, 20);
    ctx.fillText(`Score: ${score}`, 20, 20);

    // 시간 (우측 상단)
    ctx.textAlign = 'right';
    const timeText = `Time: ${Math.ceil(timeLeft)}s`;
    const timeColor = timeLeft <= 10 ? '#e74c3c' : '#ffffff';
    ctx.fillStyle = timeColor;
    ctx.strokeText(timeText, CANVAS_WIDTH - 20, 20);
    ctx.fillText(timeText, CANVAS_WIDTH - 20, 20);

    // 매치 진행도 (중앙 상단)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    const progressText = `${matchedPairs} / ${CARD_EMOJIS.length} Pairs`;
    ctx.strokeText(progressText, CANVAS_WIDTH / 2, 20);
    ctx.fillText(progressText, CANVAS_WIDTH / 2, 20);

    // 콤보 표시
    if (comboCount > 1) {
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#f39c12';
      const comboText = `COMBO x${comboCount}!`;
      ctx.strokeText(comboText, CANVAS_WIDTH / 2, 55);
      ctx.fillText(comboText, CANVAS_WIDTH / 2, 55);
    }

    // 통계 (하단)
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#ecf0f1';
    ctx.textAlign = 'left';
    const statsText = `Flips: ${totalFlips} | Misses: ${misses}`;
    ctx.strokeText(statsText, 20, CANVAS_HEIGHT - 30);
    ctx.fillText(statsText, 20, CANVAS_HEIGHT - 30);

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

  // --- Setup ---
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('keydown', handleKeyDown);

  lastTime = performance.now();
  initializeCards();
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('keydown', handleKeyDown);
  };
};
