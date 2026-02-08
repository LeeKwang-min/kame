import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  INITIAL_TIME,
  TIME_BONUS,
  BASE_SCORE,
  INGREDIENTS,
  GRID_COLS,
  INGREDIENT_HEIGHT,
  INGREDIENT_WIDTH,
  FALL_SPEED,
} from './config';
import { GameState, IngredientType, FallingAnimation, Ingredient } from './types';
import { generateRandomBurger, getIngredientByType, calculateScore, getTimeBonus } from './utils';

export type TBurgerCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

const initialState: GameState = {
  phase: 'start',
  timeLeft: INITIAL_TIME,
  score: 0,
  level: 1,
  combo: 0,
  targetBurger: [],
  playerBurger: [],
  selectedIndex: 0,
  failMessage: '',
  successMessage: '',
};

export const setupBurger = (
  canvas: HTMLCanvasElement,
  callbacks?: TBurgerCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let state: GameState = { ...initialState };
  let isLoading = false;
  let fallingAnimations: FallingAnimation[] = [];
  let displayIngredients: Ingredient[] = [...INGREDIENTS];
  let globalTime = 0;
  let lastTimerTick = 0;
  let shakeAmount = 0;
  let flashAlpha = 0;
  let flashColor = '#4CAF50';
  let shuffleFlashAlpha = 0;

  const shuffleIngredients = () => {
    for (let i = displayIngredients.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [displayIngredients[i], displayIngredients[j]] = [displayIngredients[j], displayIngredients[i]];
    }
    shuffleFlashAlpha = 0.6;
  };

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'burger', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  const resetGame = () => {
    state = {
      ...initialState,
      phase: 'start',
      targetBurger: [],
      playerBurger: [],
    };
    fallingAnimations = [];
    displayIngredients = [...INGREDIENTS];
    shakeAmount = 0;
    flashAlpha = 0;
    shuffleFlashAlpha = 0;
    gameOverHud.reset();
  };

  const startGame = async () => {
    if (state.phase !== 'start' || isLoading) return;
    isLoading = true;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isLoading = false;
    state = {
      ...initialState,
      phase: 'playing',
      targetBurger: generateRandomBurger(1),
      playerBurger: [],
    };
    fallingAnimations = [];
    displayIngredients = [...INGREDIENTS];
    lastTimerTick = globalTime;
  };

  const startNewOrder = () => {
    state.targetBurger = generateRandomBurger(state.level);
    state.playerBurger = [];
    fallingAnimations = [];
  };

  const getStackY = (stackIndex: number): number => {
    const rect = canvas.getBoundingClientRect();
    const baseY = rect.height - 80;
    return baseY - stackIndex * (INGREDIENT_HEIGHT - 4);
  };

  const addIngredient = (type: IngredientType) => {
    if (state.phase !== 'playing') return;

    const currentIndex = state.playerBurger.length;
    const expectedType = state.targetBurger[currentIndex];

    const targetY = getStackY(currentIndex);
    fallingAnimations.push({
      type,
      y: 150,
      targetY,
      stackIndex: currentIndex,
    });

    if (type !== expectedType) {
      state.phase = 'fail';
      state.failMessage = 'WRONG!';
      state.combo = 0;
      shakeAmount = 15;
      flashAlpha = 0.5;
      flashColor = '#F44336';

      setTimeout(() => {
        if (state.phase === 'fail') {
          state.phase = 'playing';
          startNewOrder();
        }
      }, 800);
    } else {
      state.playerBurger.push(type);

      if (state.playerBurger.length === state.targetBurger.length) {
        state.phase = 'success';
        state.combo++;
        const earnedScore = calculateScore(state.level, BASE_SCORE, state.combo);
        const earnedTime = getTimeBonus(state.level, TIME_BONUS);
        state.score += earnedScore;
        state.timeLeft = Math.min(state.timeLeft + earnedTime, 99);
        state.level++;

        // 5개 성공할 때마다 재료 순서 셔플
        if ((state.level - 1) % 5 === 0 && state.level > 1) {
          shuffleIngredients();
          state.successMessage = `+${earnedScore}점! +${earnedTime}초! 🔀셔플!`;
        } else {
          state.successMessage = `+${earnedScore}점! +${earnedTime}초!`;
        }

        flashAlpha = 0.4;
        flashColor = '#4CAF50';

        setTimeout(() => {
          if (state.phase === 'success') {
            state.phase = 'playing';
            startNewOrder();
          }
        }, 1000);
      }
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
    // S키: 일시정지 해제 또는 게임 시작
    if (e.code === 'KeyS') {
      if (state.phase === 'paused') {
        state.phase = 'playing';
        lastTimerTick = globalTime;
        return;
      }
      if (state.phase === 'start') {
        startGame();
        return;
      }
    }

    // P키: 일시정지 (플레이 중일 때만)
    if (e.code === 'KeyP' && state.phase === 'playing') {
      state.phase = 'paused';
      return;
    }

    // 게임오버 HUD 처리
    if (state.phase === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, state.score);
      if (handled) return;
    }

    // R키: 재시작 (게임오버가 아니고 일시정지가 아닐 때)
    if (e.code === 'KeyR' && state.phase !== 'gameover' && state.phase !== 'paused') {
      resetGame();
      return;
    }

    // 시작 화면에서 Space/Enter로 게임 시작
    if ((e.code === 'Space' || e.code === 'Enter') && state.phase === 'start') {
      startGame();
      return;
    }

    if (state.phase !== 'playing' && state.phase !== 'success' && state.phase !== 'fail') return;

    switch (e.code) {
      case 'ArrowLeft':
        e.preventDefault();
        state.selectedIndex = (state.selectedIndex - 1 + displayIngredients.length) % displayIngredients.length;
        break;
      case 'ArrowRight':
        e.preventDefault();
        state.selectedIndex = (state.selectedIndex + 1) % displayIngredients.length;
        break;
      case 'ArrowUp':
        e.preventDefault();
        state.selectedIndex = (state.selectedIndex - GRID_COLS + displayIngredients.length) % displayIngredients.length;
        break;
      case 'ArrowDown':
        e.preventDefault();
        state.selectedIndex = (state.selectedIndex + GRID_COLS) % displayIngredients.length;
        break;
      case 'Space':
      case 'Enter':
        e.preventDefault();
        if (state.phase === 'playing') {
          addIngredient(displayIngredients[state.selectedIndex].type);
        }
        break;
    }
  };

  // ========== 렌더링 함수들 ==========

  const drawIngredientShape = (
    x: number,
    y: number,
    width: number,
    height: number,
    ingredient: Ingredient,
  ) => {
    ctx.save();

    const hw = width / 2;
    const hh = height / 2;

    ctx.fillStyle = ingredient.color;
    ctx.strokeStyle = darkenColor(ingredient.color, 30);
    ctx.lineWidth = 2;

    switch (ingredient.shape) {
      case 'top-bun':
        ctx.beginPath();
        ctx.moveTo(x - hw, y + hh);
        ctx.lineTo(x - hw, y);
        ctx.quadraticCurveTo(x - hw, y - hh, x, y - hh);
        ctx.quadraticCurveTo(x + hw, y - hh, x + hw, y);
        ctx.lineTo(x + hw, y + hh);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (width > 50) {
          ctx.fillStyle = '#F5DEB3';
          for (let i = 0; i < 5; i++) {
            const sx = x - hw + 20 + i * (width - 40) / 4;
            const sy = y - hh / 2 + Math.sin(i * 1.5) * 3;
            ctx.beginPath();
            ctx.ellipse(sx, sy, 4, 2, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;

      case 'bottom-bun':
        ctx.beginPath();
        ctx.moveTo(x - hw, y - hh);
        ctx.lineTo(x + hw, y - hh);
        ctx.lineTo(x + hw, y + hh - 5);
        ctx.quadraticCurveTo(x + hw, y + hh, x + hw - 5, y + hh);
        ctx.lineTo(x - hw + 5, y + hh);
        ctx.quadraticCurveTo(x - hw, y + hh, x - hw, y + hh - 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'patty':
        ctx.beginPath();
        ctx.roundRect(x - hw, y - hh, width, height, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = darkenColor(ingredient.color, 20);
        for (let i = 0; i < 8; i++) {
          const px = x - hw + 10 + Math.random() * (width - 20);
          const py = y - hh + 5 + Math.random() * (height - 10);
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'cheese':
        ctx.beginPath();
        ctx.moveTo(x - hw - 10, y - hh);
        ctx.lineTo(x + hw + 10, y - hh);
        ctx.lineTo(x + hw + 5, y + hh);
        ctx.lineTo(x + hw - 15, y + hh + 8);
        ctx.lineTo(x, y + hh);
        ctx.lineTo(x - hw + 15, y + hh + 5);
        ctx.lineTo(x - hw - 5, y + hh);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'lettuce':
        ctx.beginPath();
        ctx.moveTo(x - hw - 8, y);
        for (let i = 0; i <= 10; i++) {
          const px = x - hw - 8 + (width + 16) * (i / 10);
          const py = y + Math.sin(i * 1.2) * 8 - (i % 2 === 0 ? 3 : -3);
          ctx.lineTo(px, py);
        }
        for (let i = 10; i >= 0; i--) {
          const px = x - hw - 8 + (width + 16) * (i / 10);
          const py = y + Math.sin(i * 1.2) * 5 + (i % 2 === 0 ? 5 : 8);
          ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'tomato':
        ctx.beginPath();
        ctx.ellipse(x, y, hw + 5, Math.max(hh, 1), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FF8A80';
        ctx.beginPath();
        ctx.ellipse(x, y, Math.max(hw - 10, 5), Math.max(hh - 5, 2), 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'onion':
        ctx.beginPath();
        ctx.ellipse(x, y, hw + 3, Math.max(hh, 1), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = lightenColor(ingredient.color, 30);
        ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) {
          const rx = Math.max((hw + 3) - i * 8, 2);
          const ry = Math.max(hh - i * 3, 1);
          if (rx > 2 && ry > 1) {
            ctx.beginPath();
            ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        break;

      case 'pickle':
        ctx.beginPath();
        ctx.ellipse(x, y, hw + 5, Math.max(hh - 2, 1), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = darkenColor(ingredient.color, 15);
        for (let i = 0; i < 4; i++) {
          const bx = x - hw / 2 + i * (hw / 2);
          ctx.beginPath();
          ctx.ellipse(bx, y, 3, Math.max(hh - 3, 2), 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }

    ctx.restore();
  };

  const darkenColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
    const b = Math.max(0, (num & 0x0000FF) - amount);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  };

  const lightenColor = (hex: string, amount: number): string => {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
    const b = Math.min(255, (num & 0x0000FF) + amount);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  };

  const drawStar = (x: number, y: number, size: number, color: string, alpha: number = 1) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawSparkle = (x: number, y: number, size: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.moveTo(x - size * 0.6, y - size * 0.6);
    ctx.lineTo(x + size * 0.6, y + size * 0.6);
    ctx.moveTo(x + size * 0.6, y - size * 0.6);
    ctx.lineTo(x - size * 0.6, y + size * 0.6);
    ctx.stroke();
    ctx.restore();
  };

  const drawDecorations = (rect: DOMRect) => {
    const time = globalTime * 0.001;

    // 배경 별들
    const starPositions = [
      { x: 50, y: 50 }, { x: 150, y: 80 }, { x: 320, y: 40 },
      { x: 450, y: 60 }, { x: 600, y: 45 }, { x: 680, y: 90 },
      { x: 100, y: rect.height - 30 }, { x: 300, y: rect.height - 50 },
    ];

    starPositions.forEach((pos, i) => {
      const twinkle = 0.3 + Math.sin(time * 2 + i) * 0.3;
      drawStar(pos.x, pos.y, 4 + Math.sin(time + i) * 2, '#FFE082', twinkle);
    });
  };

  const drawIngredientButton = (
    x: number,
    y: number,
    width: number,
    height: number,
    ingredient: Ingredient,
    isSelected: boolean,
  ) => {
    ctx.save();

    // 선택 시 귀여운 효과
    if (isSelected) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;

      // 반짝이는 테두리
      const gradient = ctx.createLinearGradient(x - 4, y - 4, x + width + 4, y + height + 4);
      gradient.addColorStop(0, '#FFD700');
      gradient.addColorStop(0.5, '#FFF8E1');
      gradient.addColorStop(1, '#FFD700');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x - 5, y - 5, width + 10, height + 10, 14);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 작은 별 장식
      const time = globalTime * 0.003;
      drawStar(x - 2, y - 2, 5, '#FFF', 0.8 + Math.sin(time) * 0.2);
      drawStar(x + width + 2, y - 2, 4, '#FFF', 0.6 + Math.sin(time + 1) * 0.2);
    }

    // 버튼 배경 (그라데이션)
    const btnGradient = ctx.createLinearGradient(x, y, x, y + height);
    btnGradient.addColorStop(0, '#4a4a6a');
    btnGradient.addColorStop(1, '#2a2a4a');
    ctx.fillStyle = btnGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 10);
    ctx.fill();

    // 버튼 하이라이트
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, width - 4, height / 3, 8);
    ctx.fill();

    drawIngredientShape(x + width / 2, y + height / 2 - 6, width * 0.65, 18, ingredient);

    ctx.fillStyle = isSelected ? '#FFD700' : '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(ingredient.name.kor, x + width / 2, y + height - 3);

    ctx.restore();
  };

  const drawBurgerStack = (
    cx: number,
    baseY: number,
    burger: IngredientType[],
    scale: number = 1,
    opacity: number = 1,
  ) => {
    ctx.save();
    ctx.globalAlpha = opacity;

    const w = INGREDIENT_WIDTH * scale;
    const h = INGREDIENT_HEIGHT * scale;
    const gap = (h - 4) * scale;

    burger.forEach((type, index) => {
      const ingredient = getIngredientByType(type);
      if (!ingredient) return;

      const y = baseY - index * gap;
      drawIngredientShape(cx, y, w, h, ingredient);
    });

    ctx.restore();
  };

  const drawFallingAnimations = (cx: number) => {
    fallingAnimations.forEach((anim) => {
      const ingredient = getIngredientByType(anim.type);
      if (!ingredient) return;

      drawIngredientShape(cx, anim.y, INGREDIENT_WIDTH, INGREDIENT_HEIGHT, ingredient);
    });
  };

  const drawHUD = () => {
    const rect = canvas.getBoundingClientRect();

    // 레벨 배지
    ctx.fillStyle = '#FF7043';
    ctx.beginPath();
    ctx.roundRect(15, 15, 90, 32, 16);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv.${state.level}`, 60, 37);

    // 점수 배지
    ctx.fillStyle = '#7E57C2';
    ctx.beginPath();
    ctx.roundRect(rect.width / 2 - 60, 15, 120, 32, 16);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(`⭐ ${state.score}`, rect.width / 2, 37);

    // 시간 표시 (크게)
    ctx.textAlign = 'center';
    const timeColor = state.timeLeft <= 5 ? '#FF5252' : state.timeLeft <= 10 ? '#FFD700' : '#66BB6A';
    ctx.fillStyle = timeColor;

    const baseSize = 42;
    if (state.timeLeft <= 5) {
      const pulse = 1 + Math.sin(globalTime * 0.015) * 0.15;
      ctx.font = `bold ${baseSize * pulse}px sans-serif`;
      ctx.shadowColor = '#FF5252';
      ctx.shadowBlur = 20;
    } else {
      ctx.font = `bold ${baseSize}px sans-serif`;
    }
    ctx.fillText(`${state.timeLeft}`, rect.width / 2, 90);
    ctx.shadowBlur = 0;

    // 콤보 배지
    if (state.combo > 1) {
      const comboX = 15;
      const comboY = 55;
      ctx.fillStyle = '#FFA726';
      ctx.beginPath();
      ctx.roundRect(comboX, comboY, 85, 26, 13);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🔥 x${state.combo}`, comboX + 42, comboY + 18);
    }
  };

  const drawNextIngredientHint = () => {
    const nextIndex = state.playerBurger.length;
    if (nextIndex >= state.targetBurger.length) return;

    const nextType = state.targetBurger[nextIndex];
    const nextIngredient = getIngredientByType(nextType);
    if (!nextIngredient) return;

    const rect = canvas.getBoundingClientRect();

    // 힌트 배경
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(70, rect.height - 38, 140, 28, 14);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`다음 👉 ${nextIngredient.name.kor}`, 140, rect.height - 19);
  };

  const renderGameScreen = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;

    ctx.save();
    if (shakeAmount > 0) {
      const shakeX = (Math.random() - 0.5) * shakeAmount;
      const shakeY = (Math.random() - 0.5) * shakeAmount;
      ctx.translate(shakeX, shakeY);
    }

    // 따뜻한 그라데이션 배경
    const bgGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    bgGradient.addColorStop(0, '#2D1B4E');
    bgGradient.addColorStop(0.5, '#1E3A5F');
    bgGradient.addColorStop(1, '#0D2137');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 배경 장식
    drawDecorations(rect);

    if (flashAlpha > 0) {
      ctx.fillStyle = flashColor + Math.floor(flashAlpha * 255).toString(16).padStart(2, '0');
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    drawHUD();

    const gridStartX = 30;
    const gridStartY = 120;
    const btnWidth = 70;
    const btnHeight = 55;
    const btnGap = 8;

    // 재료 선택 영역 배경
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(gridStartX - 12, gridStartY - 12, GRID_COLS * (btnWidth + btnGap) + 16, 2 * (btnHeight + btnGap) + 16, 15);
    ctx.fill();

    // 셔플 효과
    if (shuffleFlashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 215, 0, ${shuffleFlashAlpha})`;
      ctx.beginPath();
      ctx.roundRect(gridStartX - 12, gridStartY - 12, GRID_COLS * (btnWidth + btnGap) + 16, 2 * (btnHeight + btnGap) + 16, 15);
      ctx.fill();
    }

    displayIngredients.forEach((ingredient, index) => {
      const col = index % GRID_COLS;
      const row = Math.floor(index / GRID_COLS);
      const x = gridStartX + col * (btnWidth + btnGap);
      const y = gridStartY + row * (btnHeight + btnGap);
      drawIngredientButton(x, y, btnWidth, btnHeight, ingredient, index === state.selectedIndex);
    });

    // 주문서 영역 (더 귀엽게)
    const orderX = rect.width - 200;
    const orderY = 55;
    const orderW = 160;
    const orderH = rect.height - 100;

    // 주문서 배경
    ctx.fillStyle = 'rgba(255, 183, 77, 0.15)';
    ctx.beginPath();
    ctx.roundRect(orderX, orderY, orderW, orderH, 15);
    ctx.fill();

    // 주문서 테두리 (이중)
    ctx.strokeStyle = '#FFB74D';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(orderX, orderY, orderW, orderH, 15);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 183, 77, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(orderX + 5, orderY + 5, orderW - 10, orderH - 10, 12);
    ctx.stroke();

    // 주문서 타이틀
    ctx.fillStyle = '#FFB74D';
    ctx.beginPath();
    ctx.roundRect(orderX + 20, orderY + 8, orderW - 40, 28, 14);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📋 주문서', rect.width - 120, orderY + 27);

    const targetCenterX = rect.width - 120;
    const targetBaseY = rect.height - 80;
    drawBurgerStack(targetCenterX, targetBaseY, state.targetBurger, 1.1);

    // 내 햄버거 영역 (더 귀엽게)
    const myX = 50;
    const myY = 250;
    const myW = 180;
    const myH = rect.height - 305;

    // 내 햄버거 배경
    ctx.fillStyle = 'rgba(129, 199, 132, 0.15)';
    ctx.beginPath();
    ctx.roundRect(myX, myY, myW, myH, 15);
    ctx.fill();

    // 내 햄버거 테두리
    ctx.strokeStyle = '#81C784';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(myX, myY, myW, myH, 15);
    ctx.stroke();

    // 내 햄버거 타이틀
    ctx.fillStyle = '#81C784';
    ctx.beginPath();
    ctx.roundRect(myX + 25, myY + 8, myW - 50, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍔 내 햄버거', 140, myY + 26);

    const playerCenterX = 140;
    const playerBaseY = rect.height - 80;

    const landedIngredients = state.playerBurger.filter((_, idx) => {
      const anim = fallingAnimations.find(a => a.stackIndex === idx);
      return !anim || anim.y >= anim.targetY;
    });
    drawBurgerStack(playerCenterX, playerBaseY, landedIngredients);
    drawFallingAnimations(playerCenterX);

    drawNextIngredientHint();

    // 귀여운 접시
    // 내 햄버거 접시
    const plateGradient1 = ctx.createLinearGradient(50, rect.height - 60, 50, rect.height - 40);
    plateGradient1.addColorStop(0, '#A1887F');
    plateGradient1.addColorStop(1, '#8D6E63');
    ctx.fillStyle = plateGradient1;
    ctx.beginPath();
    ctx.ellipse(140, rect.height - 50, 95, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6D4C41';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 주문서 접시
    const plateGradient2 = ctx.createLinearGradient(rect.width - 200, rect.height - 60, rect.width - 200, rect.height - 40);
    plateGradient2.addColorStop(0, '#A1887F');
    plateGradient2.addColorStop(1, '#8D6E63');
    ctx.fillStyle = plateGradient2;
    ctx.beginPath();
    ctx.ellipse(rect.width - 120, rect.height - 50, 85, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6D4C41';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 실패 화면
    if (state.phase === 'fail') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // 실패 배지
      ctx.fillStyle = '#EF5350';
      ctx.shadowColor = '#B71C1C';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.roundRect(cx - 120, rect.height / 2 - 50, 240, 100, 20);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('😵 WRONG!', cx, rect.height / 2 - 10);

      ctx.font = '16px sans-serif';
      ctx.fillText('다시 도전하세요!', cx, rect.height / 2 + 30);
    }

    // 성공 화면
    if (state.phase === 'success') {
      // 반짝이는 별 효과
      const time = globalTime * 0.003;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + time;
        const dist = 120 + Math.sin(time * 2 + i) * 20;
        const sx = cx + Math.cos(angle) * dist;
        const sy = rect.height / 2 + Math.sin(angle) * dist;
        drawStar(sx, sy, 8 + Math.sin(time + i) * 3, '#FFD700', 0.8);
      }

      // 성공 배지
      ctx.fillStyle = '#66BB6A';
      ctx.shadowColor = '#2E7D32';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.roundRect(cx - 140, rect.height / 2 - 60, 280, 120, 25);
      ctx.fill();
      ctx.shadowBlur = 0;

      const bounceY = Math.sin(globalTime * 0.01) * 5;

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎉 SUCCESS!', cx, rect.height / 2 - 20 + bounceY);

      ctx.fillStyle = '#FFEB3B';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(state.successMessage, cx, rect.height / 2 + 25 + bounceY);
    }

    ctx.restore();
  };

  let lastTime = 0;

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    const dt = t - lastTime;
    lastTime = t;
    globalTime = t;

    if (shakeAmount > 0) {
      shakeAmount *= 0.9;
      if (shakeAmount < 0.5) shakeAmount = 0;
    }

    if (flashAlpha > 0) {
      flashAlpha -= 0.02;
      if (flashAlpha < 0) flashAlpha = 0;
    }

    if (shuffleFlashAlpha > 0) {
      shuffleFlashAlpha -= 0.015;
      if (shuffleFlashAlpha < 0) shuffleFlashAlpha = 0;
    }

    fallingAnimations = fallingAnimations.filter((anim) => {
      anim.y += FALL_SPEED;
      if (anim.y >= anim.targetY) {
        anim.y = anim.targetY;
        return false;
      }
      return true;
    });

    if (state.phase === 'playing') {
      if (t - lastTimerTick >= 1000) {
        state.timeLeft--;
        lastTimerTick = t;

        if (state.timeLeft <= 0) {
          state.phase = 'gameover';
        }
      }
    }
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();

    if (state.phase === 'start') {
      const bgGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      bgGradient.addColorStop(0, '#1a1a2e');
      bgGradient.addColorStop(1, '#16213e');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, rect.width, rect.height);
      if (isLoading) {
        gameLoadingHud(canvas, ctx);
      } else {
        gameStartHud(canvas, ctx);
      }
      return;
    }

    if (state.phase === 'paused') {
      renderGameScreen();
      gamePauseHud(canvas, ctx, { showRestartHint: false });
      return;
    }

    renderGameScreen();

    if (state.phase === 'gameover') {
      gameOverHud.render(state.score);
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
  window.addEventListener('resize', resize);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', resize);
  };
};
