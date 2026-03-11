import {
  createGameOverHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { BET_AMOUNTS, INITIAL_COINS, REEL_COUNT, SYMBOL_DISPLAY, SYMBOLS } from './config';
import { ReelSymbol, SlotState } from './types';
import { calculateWin, generateReelResult, getWinMessage } from './utils';

export type TSlotCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
  onGameOver?: (score: number) => void;
  shouldShowAdRef?: { current: boolean };
  restartRef?: { current: (() => void) | null };
};

type Button = {
  x: number;
  y: number;
  w: number;
  h: number;
  action: () => void;
  label: string;
};

// 릴 스트립 설정 - 각 릴에 배치될 심볼 순서
const REEL_STRIP_LENGTH = 20;
const SYMBOL_HEIGHT = 80; // 각 심볼이 차지하는 세로 높이
const VISIBLE_SYMBOLS = 3; // 화면에 보이는 심볼 수 (위, 중앙, 아래)

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
  // 각 릴의 심볼 스트립 (원형 배열처럼 동작)
  let reelStrips: ReelSymbol[][] = [[], [], []];
  // 각 릴의 현재 오프셋 (픽셀 단위)
  let reelOffsets: number[] = [0, 0, 0];
  // 각 릴의 회전 속도
  let reelSpeeds: number[] = [0, 0, 0];
  // 각 릴이 멈추기 시작했는지
  let reelStopping: boolean[] = [false, false, false];
  // 각 릴이 멈출 목표 위치 (심볼 인덱스)
  let reelTargetIndex: number[] = [0, 0, 0];
  // 각 릴이 완전히 멈췄는지
  let reelStopped: boolean[] = [false, false, false];
  let pendingResult: ReelSymbol[] | null = null;
  let globalTime = 0;
  let winAnimationTime = 0;
  let showWinAnimation = false;
  let buttons: Button[] = [];
  let hoveredButton: Button | null = null;

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'slot', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  const resetGame = async () => {
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
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
    initializeReelStrips();
    gameOverHud.reset();
  };

  if (callbacks?.restartRef) {
    callbacks.restartRef.current = resetGame;
  }

  // 릴 스트립 초기화 (각 릴에 심볼 배치)
  const initializeReelStrips = () => {
    reelStrips = [];
    for (let i = 0; i < REEL_COUNT; i++) {
      const strip: ReelSymbol[] = [];
      for (let j = 0; j < REEL_STRIP_LENGTH; j++) {
        strip.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      }
      // 현재 릴 결과를 스트립의 시작 부분에 배치
      strip[1] = state.reels[i];
      reelStrips.push(strip);
    }
    // 중앙 심볼(인덱스 1)이 보이도록 오프셋 설정
    reelOffsets = [SYMBOL_HEIGHT, SYMBOL_HEIGHT, SYMBOL_HEIGHT];
  };

  // 스핀 시작 시 릴 스트립 재생성
  const generateSpinningReels = () => {
    for (let i = 0; i < REEL_COUNT; i++) {
      // 기존 스트립에 랜덤 심볼 추가
      const strip: ReelSymbol[] = [];
      for (let j = 0; j < REEL_STRIP_LENGTH; j++) {
        strip.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      }
      reelStrips[i] = strip;
    }
  };

  const spin = () => {
    if (state.phase !== 'playing') return;
    if (state.coins < state.betAmount) return;

    state.coins -= state.betAmount;
    state.phase = 'spinning';
    state.lastWin = 0;
    spinProgress = 0;
    showWinAnimation = false;

    // 릴 상태 초기화
    reelStopping = [false, false, false];
    reelStopped = [false, false, false];
    // 각 릴 회전 속도 설정 (왼쪽에서 오른쪽으로 점점 빠르게)
    reelSpeeds = [25, 28, 31];

    generateSpinningReels();
    pendingResult = generateReelResult();

    // 결과 심볼을 릴 스트립에 배치 (멈출 위치에)
    if (pendingResult) {
      for (let i = 0; i < REEL_COUNT; i++) {
        // 목표 인덱스는 스트립 중간쯤 (충분히 돌고나서 멈추기 위해)
        reelTargetIndex[i] = Math.floor(REEL_STRIP_LENGTH / 2) + i * 2;
        reelStrips[i][reelTargetIndex[i]] = pendingResult[i];
      }
    }
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
        callbacks?.onGameOver?.(state.maxCoins);
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

  // 럭키세븐 그리기 (릴용 - 큰 사이즈)
  const drawLucky7 = (x: number, y: number, size: number, isCenter: boolean) => {
    ctx.save();
    ctx.translate(x, y);

    const scale = size / 50;
    ctx.scale(scale, scale);

    // 외곽 글로우 효과
    if (isCenter) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
    }

    // 7 배경 (금색 테두리 원)
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.7, '#FFA500');
    gradient.addColorStop(1, '#FF4500');

    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 내부 원 (빨간색)
    const innerGradient = ctx.createRadialGradient(0, -5, 0, 0, 0, 22);
    innerGradient.addColorStop(0, '#FF2222');
    innerGradient.addColorStop(0.5, '#CC0000');
    innerGradient.addColorStop(1, '#880000');

    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fillStyle = innerGradient;
    ctx.fill();

    // 7 글자 (금색 그라데이션)
    const textGradient = ctx.createLinearGradient(-12, -15, 12, 15);
    textGradient.addColorStop(0, '#FFFF00');
    textGradient.addColorStop(0.3, '#FFD700');
    textGradient.addColorStop(0.6, '#FFA500');
    textGradient.addColorStop(1, '#FFFF00');

    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textGradient;
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText('7', 0, 2);

    // 하이라이트
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.ellipse(-8, -12, 8, 5, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
  };

  // 미니 럭키세븐 (페이테이블용)
  const drawMiniLucky7 = (x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);

    const scale = size / 20;
    ctx.scale(scale, scale);

    // 배경 원
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(1, '#FF4500');

    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 내부 원
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#CC0000';
    ctx.fill();

    // 7 글자
    ctx.font = 'bold 12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('7', 0, 1);

    ctx.restore();
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
    const machineH = 240;
    const machineX = cx - machineW / 2;
    const machineY = 90;

    // 외곽 프레임 (금속 느낌)
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
    const reelH = machineH - 20;
    const reelY = machineY + 10;
    const symbolH = SYMBOL_HEIGHT;

    for (let i = 0; i < REEL_COUNT; i++) {
      const reelX = machineX + 15 + i * (reelW + 15);

      // 릴 배경 그라데이션 (원통형 느낌)
      const reelGradient = ctx.createLinearGradient(reelX, reelY, reelX, reelY + reelH);
      reelGradient.addColorStop(0, '#0a0a0a');
      reelGradient.addColorStop(0.15, '#2a2a2a');
      reelGradient.addColorStop(0.5, '#3a3a3a');
      reelGradient.addColorStop(0.85, '#2a2a2a');
      reelGradient.addColorStop(1, '#0a0a0a');

      ctx.fillStyle = reelGradient;
      ctx.beginPath();
      ctx.roundRect(reelX, reelY, reelW, reelH, 8);
      ctx.fill();

      // 클리핑 영역 설정 (릴 내부만 심볼이 보이도록)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(reelX + 2, reelY + 2, reelW - 4, reelH - 4, 6);
      ctx.clip();

      // 현재 오프셋으로 심볼들 렌더링
      const offset = reelOffsets[i];
      const stripLength = reelStrips[i].length;
      const totalHeight = stripLength * symbolH;

      // 현재 보이는 영역의 첫 번째 심볼 인덱스
      const startOffset = offset % totalHeight;
      const startIndex = Math.floor(startOffset / symbolH);

      // VISIBLE_SYMBOLS + 2개의 심볼을 그려서 스크롤 시 빈 공간 없게
      for (let j = -1; j <= VISIBLE_SYMBOLS + 1; j++) {
        const symbolIndex = (startIndex + j + stripLength) % stripLength;
        const symbol = reelStrips[i][symbolIndex];

        // 심볼의 y 위치 계산
        const baseY = reelY + j * symbolH - (startOffset % symbolH) + symbolH / 2;

        // 릴 영역 내부인 경우만 그리기 (클리핑이 처리하지만 최적화)
        if (baseY > reelY - symbolH && baseY < reelY + reelH + symbolH) {
          // 중앙 심볼 강조 (페이라인)
          const centerY = reelY + reelH / 2;
          const distFromCenter = Math.abs(baseY - centerY);
          const isCenter = distFromCenter < symbolH * 0.4;

          // 회전 중일 때 모션 블러 효과
          if (state.phase === 'spinning' && !reelStopped[i]) {
            const speed = reelSpeeds[i];
            const blurIntensity = Math.min(speed / 30, 0.6);
            ctx.globalAlpha = 1 - blurIntensity * 0.3;

            // 빠른 회전 시 잔상 효과 (7은 제외)
            if (speed > 10 && symbol !== '7') {
              ctx.fillStyle = 'rgba(255,255,255,0.2)';
              ctx.font = '52px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(SYMBOL_DISPLAY[symbol], reelX + reelW / 2, baseY - 8);
              ctx.fillText(SYMBOL_DISPLAY[symbol], reelX + reelW / 2, baseY + 8);
            }
          } else {
            ctx.globalAlpha = 1;
          }

          // 심볼 그리기
          if (symbol === '7') {
            // 럭키세븐은 커스텀 렌더링
            const size = isCenter ? 58 : 44;
            drawLucky7(reelX + reelW / 2, baseY, size, isCenter);
          } else {
            ctx.font = isCenter ? 'bold 58px sans-serif' : '48px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isCenter ? '#fff' : 'rgba(255,255,255,0.6)';

            // 중앙 심볼에 그림자 효과
            if (isCenter && state.phase !== 'spinning') {
              ctx.shadowColor = '#FFD700';
              ctx.shadowBlur = 10;
            }

            ctx.fillText(SYMBOL_DISPLAY[symbol], reelX + reelW / 2, baseY);
            ctx.shadowBlur = 0;
          }
          ctx.globalAlpha = 1;
        }
      }

      ctx.restore();

      // 릴 테두리 (빛나는 효과)
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(reelX, reelY, reelW, reelH, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 위아래 그라데이션 오버레이 (입체감)
      const topGrad = ctx.createLinearGradient(reelX, reelY, reelX, reelY + 40);
      topGrad.addColorStop(0, 'rgba(0,0,0,0.7)');
      topGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(reelX, reelY, reelW, 40);

      const botGrad = ctx.createLinearGradient(reelX, reelY + reelH - 40, reelX, reelY + reelH);
      botGrad.addColorStop(0, 'rgba(0,0,0,0)');
      botGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = botGrad;
      ctx.fillRect(reelX, reelY + reelH - 40, reelW, 40);
    }

    // 페이라인 (중앙 가로선)
    const lineY = reelY + reelH / 2;
    if (showWinAnimation && state.lastWin > 0) {
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
      ctx.moveTo(machineX - 5, lineY);
      ctx.lineTo(machineX + machineW + 5, lineY);
      ctx.stroke();
    }

    // 페이라인 양쪽 표시기
    ctx.fillStyle = '#FF1493';
    ctx.shadowColor = '#FF1493';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(machineX - 20, lineY);
    ctx.lineTo(machineX - 5, lineY - 10);
    ctx.lineTo(machineX - 5, lineY + 10);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(machineX + machineW + 20, lineY);
    ctx.lineTo(machineX + machineW + 5, lineY - 10);
    ctx.lineTo(machineX + machineW + 5, lineY + 10);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

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
      ctx.translate(cx, 360);
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
    const btnY = 510;

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
      y: 570,
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
    const startX = 20;
    const startY = 390;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(startX - 10, startY - 25, rect.width - 20, 100, 10);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PAYOUTS', startX, startY - 5);

    // 3열로 변경하고 2 Match를 별도 위치에 배치
    const payouts = [
      { symbol: '7', payout: '100x', color: '#FF4500', isLucky7: true },
      { symbol: '🎰×3', payout: '50x', color: '#FFD700', isLucky7: false },
      { symbol: '🍒×3', payout: '25x', color: '#FF69B4', isLucky7: false },
      { symbol: '🔔×3', payout: '15x', color: '#FFD700', isLucky7: false },
      { symbol: '🍋×3', payout: '10x', color: '#FFFF00', isLucky7: false },
      { symbol: '🍊×3', payout: '8x', color: '#FFA500', isLucky7: false },
      { symbol: '🍇×3', payout: '5x', color: '#9400D3', isLucky7: false },
    ];

    ctx.font = '13px sans-serif';
    payouts.forEach((p, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = startX + col * 145;
      const y = startY + 22 + row * 26;

      if (p.isLucky7) {
        // 럭키세븐 미니 아이콘 그리기
        drawMiniLucky7(x + 5, y - 6, 14);
        ctx.fillStyle = '#fff';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('×3 = ', x + 22, y);
        ctx.fillStyle = p.color;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(p.payout, x + 55, y);
      } else {
        ctx.fillStyle = '#fff';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${p.symbol} = `, x, y);
        ctx.fillStyle = p.color;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(p.payout, x + 55, y);
      }
    });

    // 2 Match를 3번째 줄에 배치
    ctx.fillStyle = '#aaa';
    ctx.font = '12px sans-serif';
    ctx.fillText('2 Match = 2x', startX + 435, startY + 48);
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
  let spinStartTime = 0;
  const REEL_STOP_DELAYS = [1000, 1600, 2200]; // 각 릴이 멈추기 시작하는 시간 (ms)
  const DECELERATION = 0.015; // 감속률

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    const dt = t - lastTime;
    lastTime = t;
    globalTime = t;

    if (state.phase === 'spinning') {
      if (spinStartTime === 0) spinStartTime = t;
      const elapsed = t - spinStartTime;

      for (let i = 0; i < REEL_COUNT; i++) {
        if (reelStopped[i]) continue;

        // 멈추기 시작하는 시점 체크
        if (!reelStopping[i] && elapsed >= REEL_STOP_DELAYS[i]) {
          reelStopping[i] = true;

          // 목표 위치 계산 (결과 심볼이 중앙에 오도록)
          const targetOffset = reelTargetIndex[i] * SYMBOL_HEIGHT + SYMBOL_HEIGHT;

          // 현재 오프셋에서 가장 가까운 미래의 목표 위치 찾기
          const stripLength = reelStrips[i].length;
          const totalHeight = stripLength * SYMBOL_HEIGHT;
          const currentOffset = reelOffsets[i] % totalHeight;

          // 최소 1바퀴 이상 더 돌고 멈추도록
          let targetWithExtraSpins = targetOffset;
          while (targetWithExtraSpins < currentOffset + totalHeight) {
            targetWithExtraSpins += totalHeight;
          }

          reelTargetIndex[i] = targetWithExtraSpins;
        }

        if (reelStopping[i]) {
          // 감속하면서 목표 위치로 접근
          const targetOffset = reelTargetIndex[i];
          const currentOffset = reelOffsets[i];
          const distance = targetOffset - currentOffset;

          if (distance > 0) {
            // 거리에 비례한 속도로 이동 (감속 효과)
            const speed = Math.max(2, distance * DECELERATION * (3 - i * 0.5));
            reelOffsets[i] += Math.min(speed * dt * 0.1, distance);
            reelSpeeds[i] = speed;

            // 목표에 거의 도달했으면 스냅
            if (distance < 1) {
              reelOffsets[i] = targetOffset;
              reelStopped[i] = true;
              reelSpeeds[i] = 0;

              // 결과 반영
              if (pendingResult) {
                state.reels[i] = pendingResult[i];
              }
            }
          } else {
            reelStopped[i] = true;
            reelSpeeds[i] = 0;
          }
        } else {
          // 일정 속도로 회전
          reelOffsets[i] += reelSpeeds[i] * dt * 0.1;
        }
      }

      // 모든 릴이 멈추면 스핀 종료
      if (reelStopped.every(s => s)) {
        spinStartTime = 0;
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
      if (!callbacks?.shouldShowAdRef?.current) {
        gameOverHud.render(state.maxCoins);
      }
    }
  };

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    raf = requestAnimationFrame(draw);
  };

  resize();
  initializeReelStrips();
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
      if (callbacks?.restartRef) {
      callbacks.restartRef.current = null;
    }
  };
};
