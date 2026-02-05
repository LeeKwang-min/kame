import { TGameType } from '@/@types/scores';

export type TAuthState = {
  isLoggedIn: boolean;
  hasInitials: boolean;
  initials: string | null;
  userId: string | null;
};

export type TGameOverWithRankingCallbacks = {
  onScoreSave: (score: number) => Promise<void>;
  onRestart: () => void;
  onLogin: () => void;
  onMyPage: () => void;
};

export type TGameOverHudWithRankingState = {
  isSubmitting: boolean;
  isSaved: boolean;
  selectedOption: 'save' | 'skip' | 'login' | 'mypage';
};

export const createGameOverHudWithRanking = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  _gameType: TGameType,
  authState: TAuthState,
  callbacks: TGameOverWithRankingCallbacks,
) => {
  let isSubmitting = false;
  let isSaved = false;
  let selectedOption: 'save' | 'skip' | 'login' | 'mypage' = authState.isLoggedIn
    ? authState.hasInitials
      ? 'save'
      : 'mypage'
    : 'login';

  const getAvailableOptions = (): ('save' | 'skip' | 'login' | 'mypage')[] => {
    if (!authState.isLoggedIn) {
      return ['login'];
    }
    if (!authState.hasInitials) {
      return ['mypage'];
    }
    return ['save', 'skip'];
  };

  const moveSelection = (dir: number) => {
    const options = getAvailableOptions();
    const currentIndex = options.indexOf(selectedOption);
    const newIndex = (currentIndex + dir + options.length) % options.length;
    selectedOption = options[newIndex];
  };

  const onEnter = async (score: number) => {
    if (isSaved || isSubmitting) return;

    if (selectedOption === 'login') {
      callbacks.onLogin();
      return;
    }

    if (selectedOption === 'mypage') {
      callbacks.onMyPage();
      return;
    }

    if (selectedOption === 'skip') {
      return;
    }

    if (selectedOption === 'save' && authState.isLoggedIn && authState.hasInitials) {
      isSubmitting = true;
      try {
        await callbacks.onScoreSave(score);
        isSaved = true;
      } finally {
        isSubmitting = false;
      }
    }
  };

  const reset = () => {
    isSubmitting = false;
    isSaved = false;
    selectedOption = authState.isLoggedIn
      ? authState.hasInitials
        ? 'save'
        : 'mypage'
      : 'login';
  };

  const onKeyDown = (e: KeyboardEvent, score: number) => {
    if (e.code === 'KeyR') {
      callbacks.onRestart();
      e.preventDefault();
      return true;
    }

    if (['ArrowLeft', 'ArrowUp'].includes(e.code)) {
      moveSelection(-1);
      e.preventDefault();
      return true;
    }

    if (['ArrowRight', 'ArrowDown'].includes(e.code)) {
      moveSelection(1);
      e.preventDefault();
      return true;
    }

    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      void onEnter(score);
      e.preventDefault();
      return true;
    }

    return false;
  };

  const render = (score: number) => {
    const rect = canvas.getBoundingClientRect();
    const totalScore = Math.floor(score);
    const cx = rect.width / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00fff5';

    ctx.font = '48px monospace';
    ctx.fillText('GAME OVER', cx, 100);

    ctx.font = '28px monospace';
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(`Score: ${totalScore.toLocaleString()}`, cx, 160);

    const boxW = Math.min(360, rect.width - 40);
    const boxX = cx - boxW / 2;
    let boxY = 200;

    ctx.strokeStyle = '#2d2d44';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, 200);

    if (!authState.isLoggedIn) {
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '16px sans-serif';
      ctx.fillText('Login to save your score', cx, boxY + 50);
      ctx.fillText('to the leaderboard!', cx, boxY + 75);

      const btnY = boxY + 110;
      const btnW = 160;
      const btnH = 44;
      const btnX = cx - btnW / 2;

      const isSelected = selectedOption === 'login';

      ctx.fillStyle = isSelected ? 'rgba(0, 255, 245, 0.2)' : 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeStyle = isSelected ? '#00fff5' : '#2d2d44';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.fillStyle = isSelected ? '#00fff5' : '#e0e0e0';
      ctx.font = '16px monospace';
      ctx.fillText('Login', cx, btnY + btnH / 2);
    } else if (!authState.hasInitials) {
      ctx.fillStyle = '#ffff00';
      ctx.font = '16px sans-serif';
      ctx.fillText('Set your initials first', cx, boxY + 50);
      ctx.fillText('to record your score!', cx, boxY + 75);

      const btnY = boxY + 110;
      const btnW = 180;
      const btnH = 44;
      const btnX = cx - btnW / 2;

      const isSelected = selectedOption === 'mypage';

      ctx.fillStyle = isSelected ? 'rgba(255, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeStyle = isSelected ? '#ffff00' : '#2d2d44';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.fillStyle = isSelected ? '#ffff00' : '#e0e0e0';
      ctx.font = '16px monospace';
      ctx.fillText('Go to My Page', cx, btnY + btnH / 2);
    } else {
      ctx.fillStyle = '#00fff5';
      ctx.font = '24px monospace';
      ctx.fillText(`Initials: ${authState.initials}`, cx, boxY + 40);

      ctx.fillStyle = '#e0e0e0';
      ctx.font = '16px sans-serif';
      ctx.fillText('Save your score to the leaderboard?', cx, boxY + 80);

      const btnY = boxY + 110;
      const btnW = 120;
      const btnH = 44;
      const gap = 20;

      const saveBtnX = cx - btnW - gap / 2;
      const skipBtnX = cx + gap / 2;

      const isSaveSelected = selectedOption === 'save';
      const isSkipSelected = selectedOption === 'skip';

      ctx.globalAlpha = isSaved || isSubmitting ? 0.5 : 1;

      ctx.fillStyle = isSaveSelected ? 'rgba(0, 255, 245, 0.2)' : 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(saveBtnX, btnY, btnW, btnH);
      ctx.strokeStyle = isSaveSelected ? '#00fff5' : '#2d2d44';
      ctx.lineWidth = isSaveSelected ? 3 : 2;
      ctx.strokeRect(saveBtnX, btnY, btnW, btnH);

      ctx.fillStyle = isSaveSelected ? '#00fff5' : '#e0e0e0';
      ctx.font = '16px monospace';
      ctx.fillText(isSubmitting ? 'Saving...' : isSaved ? 'Saved!' : 'Save', saveBtnX + btnW / 2, btnY + btnH / 2);

      ctx.fillStyle = isSkipSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(skipBtnX, btnY, btnW, btnH);
      ctx.strokeStyle = isSkipSelected ? '#e0e0e0' : '#2d2d44';
      ctx.lineWidth = isSkipSelected ? 3 : 2;
      ctx.strokeRect(skipBtnX, btnY, btnW, btnH);

      ctx.fillStyle = isSkipSelected ? '#ffffff' : '#e0e0e0';
      ctx.fillText('Skip', skipBtnX + btnW / 2, btnY + btnH / 2);

      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '14px sans-serif';
    ctx.fillText('Press R to restart', cx, boxY + 180);

    ctx.restore();
  };

  const getState = (): TGameOverHudWithRankingState => ({
    isSubmitting,
    isSaved,
    selectedOption,
  });

  return {
    reset,
    render,
    onKeyDown,
    getState,
  };
};
