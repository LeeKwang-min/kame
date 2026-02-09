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
  BUTTON_RADIUS,
  BUTTON_POSITIONS,
  BUTTON_FREQUENCIES,
  PATTERN_SHOW_DURATION,
  PATTERN_GAP_DURATION,
  INPUT_TIMEOUT,
  BASE_SCORE_PER_ROUND,
  SPEED_BONUS_MAX,
  SPEED_REDUCTION_INTERVAL,
  SPEED_REDUCTION_RATE,
  BUTTON_GLOW_SIZE,
  SCORE_POPUP_DURATION,
} from './config';
import { TGameState, TButton, TScorePopup } from './types';

export type TSimonCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn: boolean;
};

export function setupSimon(
  canvas: HTMLCanvasElement,
  callbacks: TSimonCallbacks,
): () => void {
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // Web Audio API 초기화
  const audioContext = new AudioContext();

  // 게임 상태
  let state: TGameState = 'start';
  let animationId: number;
  let isPaused = false;

  // 게임 데이터
  let pattern: number[] = [];
  let userInput: number[] = [];
  let currentRound = 0;
  let score = 0;
  let showingIndex = 0;
  let inputStartTime = 0;

  // 버튼 상태
  const buttons: TButton[] = BUTTON_POSITIONS.map((pos) => ({
    ...pos,
    isActive: false,
    isPressing: false,
  }));

  // 애니메이션 효과
  const scorePopups: TScorePopup[] = [];

  // Game Over HUD 초기화
  const gameOverHudCallbacks = {
    onScoreSave: async (finalScore: number) => {
      return await callbacks.onScoreSave(finalScore);
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'simon',
    gameOverHudCallbacks,
    {
      isLoggedIn: callbacks.isLoggedIn,
    },
  );

  // 사운드 재생
  function playSound(buttonIndex: number, duration: number = 200) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = BUTTON_FREQUENCIES[buttonIndex];
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration / 1000,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  }

  // 패턴 추가 및 표시
  function addToPattern() {
    const newButton = Math.floor(Math.random() * 4);
    pattern.push(newButton);
    currentRound++;
    showingIndex = 0;
    state = 'showing';
  }

  // 패턴 표시 (타이머 기반)
  let showPatternTimer: number | null = null;

  function showPattern() {
    if (showingIndex >= pattern.length) {
      state = 'input';
      userInput = [];
      inputStartTime = Date.now();
      return;
    }

    const buttonIndex = pattern[showingIndex];
    buttons[buttonIndex].isActive = true;
    playSound(buttonIndex, PATTERN_SHOW_DURATION);

    // 현재 라운드에 따른 속도 조정
    const speedMultiplier =
      1 -
      Math.floor((currentRound - 1) / SPEED_REDUCTION_INTERVAL) *
        SPEED_REDUCTION_RATE;
    const showDuration = PATTERN_SHOW_DURATION * speedMultiplier;
    const gapDuration = PATTERN_GAP_DURATION * speedMultiplier;

    setTimeout(() => {
      buttons[buttonIndex].isActive = false;

      showPatternTimer = window.setTimeout(() => {
        showingIndex++;
        showPattern();
      }, gapDuration);
    }, showDuration);
  }

  // 사용자 입력 처리
  function handleUserInput(buttonIndex: number) {
    if (state !== 'input') return;

    buttons[buttonIndex].isPressing = true;
    playSound(buttonIndex, 150);

    setTimeout(() => {
      buttons[buttonIndex].isPressing = false;
    }, 150);

    userInput.push(buttonIndex);

    // 입력 검증
    const currentIndex = userInput.length - 1;
    if (userInput[currentIndex] !== pattern[currentIndex]) {
      // 틀렸을 때
      state = 'fail';
      setTimeout(() => {
        state = 'gameover';
      }, 500);
      return;
    }

    // 패턴 완성
    if (userInput.length === pattern.length) {
      const inputTime = Date.now() - inputStartTime;
      const timePerButton = inputTime / pattern.length;

      // 점수 계산: 라운드 × 100 + 속도 보너스
      const baseScore = currentRound * BASE_SCORE_PER_ROUND;
      const speedBonus = Math.max(
        0,
        Math.floor(SPEED_BONUS_MAX * (1 - timePerButton / 1000)),
      );
      const roundScore = baseScore + speedBonus;
      score += roundScore;

      // 점수 팝업 표시
      scorePopups.push({
        text: `+${roundScore}`,
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2 - 50,
        alpha: 1,
        createdAt: Date.now(),
      });

      state = 'success';
      setTimeout(() => {
        addToPattern();
        setTimeout(showPattern, 500);
      }, 800);
    }
  }

  // 마우스 클릭 처리
  function handleCanvasClick(e: MouseEvent) {
    if (state !== 'input') return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const dx = x - btn.x;
      const dy = y - btn.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= BUTTON_RADIUS) {
        handleUserInput(i);
        break;
      }
    }
  }

  // 키보드 입력 처리
  function handleKeyDown(e: KeyboardEvent) {
    // Game Over 상태에서는 gameOverHud가 키 입력 처리
    if (state === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    if (e.code === 'KeyS' && state === 'start') {
      startGame();
    } else if (e.code === 'KeyP' && state !== 'start' && state !== 'gameover') {
      togglePause();
    } else if (e.code === 'KeyR') {
      resetGame();
    } else if (state === 'input') {
      // 1, 2, 3, 4 키로 버튼 입력
      if (e.code === 'Digit1') handleUserInput(0);
      else if (e.code === 'Digit2') handleUserInput(1);
      else if (e.code === 'Digit3') handleUserInput(2);
      else if (e.code === 'Digit4') handleUserInput(3);
      // Q, W, A, D 키로도 입력 가능
      else if (e.code === 'KeyQ') handleUserInput(0);
      else if (e.code === 'KeyW') handleUserInput(1);
      else if (e.code === 'KeyA') handleUserInput(2);
      else if (e.code === 'KeyD') handleUserInput(3);
    }
  }

  // 게임 시작
  async function startGame() {
    if (state === 'start') {
      state = 'loading';
      if (callbacks.onGameStart) {
        await callbacks.onGameStart();
      }
    }

    isPaused = false;
    pattern = [];
    userInput = [];
    currentRound = 0;
    score = 0;
    scorePopups.length = 0;

    addToPattern();
    setTimeout(showPattern, 1000);
  }

  // 일시정지
  function togglePause() {
    isPaused = !isPaused;
    if (isPaused && showPatternTimer) {
      clearTimeout(showPatternTimer);
      showPatternTimer = null;
    }
  }

  // 재시작
  function resetGame() {
    if (showPatternTimer) {
      clearTimeout(showPatternTimer);
      showPatternTimer = null;
    }
    state = 'start';
    isPaused = false;
    pattern = [];
    userInput = [];
    currentRound = 0;
    score = 0;
    scorePopups.length = 0;
    buttons.forEach((btn) => {
      btn.isActive = false;
      btn.isPressing = false;
    });
    gameOverHud.reset();
  }

  // 렌더링
  function render() {
    // 배경
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 버튼 렌더링
    buttons.forEach((btn, index) => {
      const isHighlighted = btn.isActive || btn.isPressing;

      // 글로우 효과
      if (isHighlighted) {
        ctx.shadowColor = btn.activeColor;
        ctx.shadowBlur = BUTTON_GLOW_SIZE;
      }

      ctx.fillStyle = isHighlighted ? btn.activeColor : btn.color;
      ctx.beginPath();
      ctx.arc(btn.x, btn.y, BUTTON_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // 버튼 번호 표시
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((index + 1).toString(), btn.x, btn.y);
    });

    // 중앙 정보 표시
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Round ${currentRound}`, CANVAS_WIDTH / 2, 80);

    ctx.font = 'bold 36px Arial';
    ctx.fillText(`${score}`, CANVAS_WIDTH / 2, 120);

    // 상태 메시지
    if (state === 'showing') {
      ctx.fillStyle = '#3498db';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('Watch!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    } else if (state === 'input') {
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('Your Turn!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

      // 입력 진행도 표시
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '18px Arial';
      ctx.fillText(
        `${userInput.length} / ${pattern.length}`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 30,
      );
    } else if (state === 'success') {
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 32px Arial';
      ctx.fillText('Correct!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    } else if (state === 'fail') {
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 32px Arial';
      ctx.fillText('Wrong!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }

    // 점수 팝업 렌더링
    const now = Date.now();
    for (let i = scorePopups.length - 1; i >= 0; i--) {
      const popup = scorePopups[i];
      const elapsed = now - popup.createdAt;
      const progress = elapsed / SCORE_POPUP_DURATION;

      if (progress >= 1) {
        scorePopups.splice(i, 1);
        continue;
      }

      popup.alpha = 1 - progress;
      const offsetY = progress * 30;

      ctx.save();
      ctx.globalAlpha = popup.alpha;
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(popup.text, popup.x, popup.y - offsetY);
      ctx.restore();
    }

    // HUD 렌더링
    if (state === 'start') {
      gameStartHud(canvas, ctx);
    } else if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
    } else if (isPaused) {
      gamePauseHud(canvas, ctx);
    } else if (state === 'gameover') {
      gameOverHud.render(score);
    }
  }

  // 게임 루프
  function gameLoop() {
    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  // 이벤트 리스너 등록
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('click', handleCanvasClick);
  animationId = requestAnimationFrame(gameLoop);

  // cleanup 함수
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('click', handleCanvasClick);
    cancelAnimationFrame(animationId);
    if (showPatternTimer) {
      clearTimeout(showPatternTimer);
    }
    audioContext.close();
  };
}
