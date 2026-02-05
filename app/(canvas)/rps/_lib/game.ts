import {
  createGameOverHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { CHOICES, CHOICE_COLORS, CHOICE_EMOJI, CHOICE_LABELS, LED_PATTERNS } from './config';
import { RPSChoice, RPSState } from './types';
import { determineResult, getRandomChoice, getResultColor, getResultMessage } from './utils';

export type TRPSCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

type Button = {
  x: number;
  y: number;
  w: number;
  h: number;
  action: () => void;
  label: string;
  choice: RPSChoice;
};

export const setupRPS = (
  canvas: HTMLCanvasElement,
  callbacks?: TRPSCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let state: RPSState = {
    phase: 'playing',
    playerChoice: null,
    computerChoice: null,
    result: null,
    streak: 0,
    maxStreak: 0,
  };

  let globalTime = 0;
  let revealProgress = 0;
  let resultTime = 0;
  let gameOverTime = 0;
  let displayChoice: RPSChoice = 'rock';
  let lastChoiceChange = 0;
  let buttons: Button[] = [];
  let hoveredButton: Button | null = null;
  let showGameOverHud = false;

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

  const gameOverHud = createGameOverHud(canvas, ctx, 'rps', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  const resetGame = async () => {
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    state = {
      phase: 'playing',
      playerChoice: null,
      computerChoice: null,
      result: null,
      streak: 0,
      maxStreak: 0,
    };
    revealProgress = 0;
    showGameOverHud = false;
    gameOverHud.reset();
  };

  const makeChoice = (choice: RPSChoice) => {
    if (state.phase !== 'playing') return;

    state.playerChoice = choice;
    state.computerChoice = getRandomChoice();
    state.phase = 'revealing';
    revealProgress = 0;
  };

  const processResult = () => {
    if (!state.playerChoice || !state.computerChoice) return;

    const result = determineResult(state.playerChoice, state.computerChoice);
    state.result = result;
    state.phase = 'result';
    resultTime = globalTime;

    if (result === 'win') {
      state.streak++;
      if (state.streak > state.maxStreak) {
        state.maxStreak = state.streak;
      }
    }
  };

  const continueGame = () => {
    if (state.result === 'lose') {
      // 한 번 지면 바로 게임 오버
      state.phase = 'gameover';
      gameOverTime = globalTime;
      showGameOverHud = false;
    } else {
      // 이기거나 비기면 계속 진행
      state.playerChoice = null;
      state.computerChoice = null;
      state.result = null;
      state.phase = 'playing';
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
    if (state.phase === 'gameover' && showGameOverHud) return;

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
    if (state.phase === 'gameover' && showGameOverHud) {
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
        makeChoice('scissors');
        return;
      }

      if (e.code === 'ArrowUp') {
        e.preventDefault();
        makeChoice('rock');
        return;
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault();
        makeChoice('paper');
        return;
      }
    }
  };

  // ========== 렌더링 ==========

  const renderBackground = () => {
    const rect = canvas.getBoundingClientRect();

    // 놀이동산 느낌의 그라데이션 배경
    const bgGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    bgGradient.addColorStop(0, '#667eea');
    bgGradient.addColorStop(0.5, '#764ba2');
    bgGradient.addColorStop(1, '#f093fb');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 반짝이는 별들
    for (let i = 0; i < 30; i++) {
      const x = (i * 73.7 + globalTime * 0.02) % rect.width;
      const y = (i * 47.3 + Math.sin(globalTime * 0.001 + i) * 20) % rect.height;
      const alpha = 0.3 + Math.sin(globalTime * 0.005 + i * 0.7) * 0.3;
      const size = 2 + Math.sin(globalTime * 0.003 + i) * 1;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 메인 프레임
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(20, 20, rect.width - 40, rect.height - 40, 30);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();
  };


  const renderStreak = () => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.roundRect(40, 25, 150, 45, 15);
    ctx.fill();

    if (state.streak > 0) {
      const pulse = 1 + Math.sin(globalTime * 0.008) * 0.1;
      ctx.font = `bold ${22 * pulse}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 15;
      ctx.fillText(`🔥 ${state.streak} 연승!`, 55, 55);
      ctx.shadowBlur = 0;
    } else {
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFF';
      ctx.fillText('🎮 가위바위보!', 55, 55);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Best: ${state.maxStreak}`, 55, 75);
  };

  const renderLEDDisplay = (
    centerX: number,
    centerY: number,
    radius: number,
    choice: RPSChoice,
    color: string
  ) => {
    const pattern = LED_PATTERNS[choice];
    const rows = pattern.length;
    const cols = pattern[0].length;

    // LED 영역 크기 (원 안에 들어갈 정사각형)
    const ledAreaSize = radius * 1.5;
    const dotSpacing = ledAreaSize / Math.max(rows, cols);
    const dotRadius = dotSpacing * 0.35;

    // LED 시작 위치 (중앙 정렬)
    const startX = centerX - (cols * dotSpacing) / 2 + dotSpacing / 2;
    const startY = centerY - (rows * dotSpacing) / 2 + dotSpacing / 2;

    // LED 디스플레이 배경 (원형)
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 15, 0, Math.PI * 2);
    ctx.fill();

    // 무지개 테두리 링
    const ringGradient = ctx.createLinearGradient(
      centerX - radius, centerY - radius,
      centerX + radius, centerY + radius
    );
    ringGradient.addColorStop(0, '#FF6B9D');
    ringGradient.addColorStop(0.25, '#FFD93D');
    ringGradient.addColorStop(0.5, '#6BCB77');
    ringGradient.addColorStop(0.75, '#4D96FF');
    ringGradient.addColorStop(1, '#FF6B9D');

    ctx.strokeStyle = ringGradient;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
    ctx.stroke();

    // 전구 장식
    const bulbCount = 16;
    for (let i = 0; i < bulbCount; i++) {
      const angle = (Math.PI * 2 * i) / bulbCount - Math.PI / 2;
      const bulbX = centerX + Math.cos(angle) * (radius + 20);
      const bulbY = centerY + Math.sin(angle) * (radius + 20);
      const isOn = Math.sin(globalTime * 0.005 + i * 0.5) > 0;

      ctx.fillStyle = isOn ? '#FFD700' : '#553300';
      ctx.shadowColor = isOn ? '#FFD700' : 'transparent';
      ctx.shadowBlur = isOn ? 8 : 0;
      ctx.beginPath();
      ctx.arc(bulbX, bulbY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 원형 클리핑 적용
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    // LED 도트 그리기
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * dotSpacing;
        const y = startY + row * dotSpacing;
        const isOn = pattern[row][col] === 1;

        // 원 안에 있는지 확인 (추가 체크)
        const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (dist > radius - dotRadius) continue;

        if (isOn) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;

          const ledGradient = ctx.createRadialGradient(x, y, 0, x, y, dotRadius);
          ledGradient.addColorStop(0, '#FFFFFF');
          ledGradient.addColorStop(0.3, color);
          ledGradient.addColorStop(1, color);

          ctx.fillStyle = ledGradient;
        } else {
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#2a2a3e';
        }

        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
    ctx.shadowBlur = 0;
  };

  const renderMainDisplay = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const displayY = 200;
    const displayRadius = 90;

    let currentChoice: RPSChoice;
    let ledColor: string;

    if (state.phase === 'playing') {
      currentChoice = displayChoice;
      ledColor = CHOICE_COLORS[currentChoice];
    } else {
      currentChoice = state.computerChoice || 'rock';
      ledColor = CHOICE_COLORS[currentChoice];
    }

    renderLEDDisplay(cx, displayY, displayRadius, currentChoice, ledColor);

    // 상대방 선택 라벨
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFF';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 5;

    if (state.phase === 'playing') {
      ctx.fillText('상대의 선택은?', cx, displayY + displayRadius + 50);
    } else if (state.computerChoice) {
      ctx.fillText(`상대: ${CHOICE_EMOJI[state.computerChoice]} ${CHOICE_LABELS[state.computerChoice]}`, cx, displayY + displayRadius + 50);
    }
    ctx.shadowBlur = 0;
  };

  const renderPlayerChoice = () => {
    if (!state.playerChoice) return;

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(cx - 130, 355, 260, 50, 15);
    ctx.fill();

    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = CHOICE_COLORS[state.playerChoice];
    ctx.shadowColor = CHOICE_COLORS[state.playerChoice];
    ctx.shadowBlur = 10;
    ctx.fillText(
      `나의 선택: ${CHOICE_EMOJI[state.playerChoice]} ${CHOICE_LABELS[state.playerChoice]}`,
      cx,
      388
    );
    ctx.shadowBlur = 0;
  };

  const renderResult = () => {
    if (!state.result || state.phase === 'playing' || state.phase === 'revealing') return;

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const elapsed = globalTime - resultTime;
    const fadeIn = Math.min(1, elapsed / 200);

    ctx.globalAlpha = fadeIn;

    const resultColor = getResultColor(state.result);
    const resultMsg = getResultMessage(state.result);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(cx - 130, 415, 260, 70, 20);
    ctx.fill();

    const scale = 1 + Math.sin(globalTime * 0.015) * 0.08;
    ctx.save();
    ctx.translate(cx, 455);
    ctx.scale(scale, scale);

    ctx.shadowColor = resultColor;
    ctx.shadowBlur = 25;
    ctx.fillStyle = resultColor;
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(resultMsg, 0, 0);

    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  };

  const renderGameOverMessage = () => {
    if (state.phase !== 'gameover') return;

    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const elapsed = globalTime - gameOverTime;

    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.7, elapsed / 1000)})`;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const fadeIn = Math.min(1, elapsed / 500);
    ctx.globalAlpha = fadeIn;

    const bounce = Math.sin(globalTime * 0.005) * 5;

    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FF6B6B';
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', cx, 280 + bounce);

    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    ctx.fillText(`최고 연승: ${state.maxStreak}`, cx, 340);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  };

  const renderButtons = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const btnY = 500;
    const btnW = 140;
    const btnH = 95;
    const gap = 20;

    const choices: { choice: RPSChoice; label: string; key: string; emoji: string }[] = [
      { choice: 'scissors', label: '가위', key: '←', emoji: '✌️' },
      { choice: 'rock', label: '바위', key: '↑', emoji: '✊' },
      { choice: 'paper', label: '보', key: '→', emoji: '🖐️' },
    ];

    const isDisabled = state.phase !== 'playing';

    choices.forEach((item, i) => {
      const btnX = cx - (btnW * 1.5 + gap) + i * (btnW + gap);

      const btn: Button = {
        x: btnX,
        y: btnY,
        w: btnW,
        h: btnH,
        action: () => makeChoice(item.choice),
        label: item.label,
        choice: item.choice,
      };
      buttons.push(btn);

      const isHovered = hoveredButton === btn && !isDisabled;

      // 버튼 배경
      const gradient = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      if (isDisabled) {
        gradient.addColorStop(0, '#555');
        gradient.addColorStop(1, '#333');
      } else if (isHovered) {
        gradient.addColorStop(0, CHOICE_COLORS[item.choice]);
        gradient.addColorStop(1, '#444');
      } else {
        gradient.addColorStop(0, '#5a5a6e');
        gradient.addColorStop(1, '#3a3a4e');
      }

      ctx.shadowColor = isHovered ? CHOICE_COLORS[item.choice] : 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = isHovered ? 20 : 10;
      ctx.shadowOffsetY = 5;

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 15);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.strokeStyle = isHovered ? '#FFF' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 이모지
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.emoji, btnX + btnW / 2, btnY + 28);

      // 라벨
      ctx.fillStyle = isDisabled ? '#777' : '#FFF';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(item.label, btnX + btnW / 2, btnY + 55);

      // 화살표 키 힌트 (크고 선명하게)
      const keyY = btnY + btnH - 18;

      // 키 힌트 배경 박스
      ctx.fillStyle = isDisabled ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(btnX + btnW / 2 - 25, keyY - 12, 50, 24, 6);
      ctx.fill();

      // 화살표 (크게)
      ctx.fillStyle = isDisabled ? '#666' : '#FFF';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(item.key, btnX + btnW / 2, keyY + 1);
    });
  };

  const renderRestartButton = () => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;

    const restartBtn: Button = {
      x: cx - 55,
      y: 605,
      w: 110,
      h: 28,
      action: resetGame,
      label: '재시작 (R)',
      choice: 'rock',
    };
    buttons.push(restartBtn);

    const isHovered = hoveredButton === restartBtn;
    ctx.fillStyle = isHovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 8);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(restartBtn.label, cx, restartBtn.y + restartBtn.h / 2);
  };

  const renderGameScreen = () => {
    buttons = [];

    renderBackground();
    renderStreak();
    renderMainDisplay();
    renderPlayerChoice();
    renderResult();
    renderButtons();
    renderRestartButton();

    if (state.phase === 'gameover') {
      renderGameOverMessage();
    }
  };

  let lastTime = 0;
  const REVEAL_DURATION = 600;
  const RESULT_DISPLAY_TIME = 1800;
  const GAME_OVER_DELAY = 2500;
  const CHOICE_INTERVAL = 100;

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    const dt = t - lastTime;
    lastTime = t;
    globalTime = t;

    if (state.phase === 'playing') {
      if (t - lastChoiceChange > CHOICE_INTERVAL) {
        const currentIndex = CHOICES.indexOf(displayChoice);
        displayChoice = CHOICES[(currentIndex + 1) % CHOICES.length];
        lastChoiceChange = t;
      }
    }

    if (state.phase === 'revealing') {
      revealProgress += dt / REVEAL_DURATION;

      if (revealProgress >= 1) {
        revealProgress = 1;
        processResult();
      }
    }

    if (state.phase === 'result') {
      const elapsed = globalTime - resultTime;
      if (elapsed > RESULT_DISPLAY_TIME) {
        continueGame();
      }
    }

    if (state.phase === 'gameover' && !showGameOverHud) {
      const elapsed = globalTime - gameOverTime;
      if (elapsed > GAME_OVER_DELAY) {
        showGameOverHud = true;
      }
    }
  };

  const render = () => {
    renderGameScreen();

    if (state.phase === 'gameover' && showGameOverHud) {
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
