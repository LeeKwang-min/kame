import { TGameType } from '@/@types/scores';

export type TSaveResult = {
  saved: boolean;
  message?: string;
  currentBest?: number;
};

export type TGameOverCallbacks = {
  onScoreSave: (score: number) => Promise<TSaveResult>;
  onRestart: () => void;
};

export type TGameOverHudState = {
  isSubmitting: boolean;
  isSaved: boolean;
  isSkipped: boolean;
  isNotHigher: boolean;
  currentBest?: number;
};

export type TGameOverOptions = {
  isLoggedIn?: boolean;
};

export const createGameOverHud = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  _gameType: TGameType,
  callbacks: TGameOverCallbacks,
  options?: TGameOverOptions,
) => {
  let selectedButton: 'save' | 'skip' = 'save';
  let isLoggedIn = options?.isLoggedIn ?? false;

  const setLoggedIn = (value: boolean) => {
    isLoggedIn = value;
  };
  let isSubmitting = false;
  let isSaved = false;
  let isSkipped = false;
  let isNotHigher = false;
  let currentBest: number | undefined = undefined;

  const reset = () => {
    selectedButton = 'save';
    isSubmitting = false;
    isSaved = false;
    isSkipped = false;
    isNotHigher = false;
    currentBest = undefined;
  };

  const onSelect = async (score: number) => {
    if (isSubmitting || isSaved || isSkipped || isNotHigher) return;

    if (selectedButton === 'save') {
      isSubmitting = true;
      try {
        const result = await callbacks.onScoreSave(score);
        isSubmitting = false;
        if (result.saved) {
          isSaved = true;
        } else {
          isNotHigher = true;
          currentBest = result.currentBest;
        }
      } catch (error) {
        console.error('Failed to save score:', error);
        isSubmitting = false;
      }
    } else {
      isSkipped = true;
    }
  };

  const onKeyDown = (e: KeyboardEvent, score: number) => {
    if (e.code === 'KeyR') {
      callbacks.onRestart();
      e.preventDefault();
      return true;
    }

    if (isSaved || isSkipped || isNotHigher || !isLoggedIn) return false;

    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      selectedButton = selectedButton === 'save' ? 'skip' : 'save';
      e.preventDefault();
      return true;
    }

    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      void onSelect(score);
      e.preventDefault();
      return true;
    }

    return false;
  };

  const render = (score: number) => {
    const rect = canvas.getBoundingClientRect();
    const totalScore = Math.floor(score);
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    ctx.save();

    // 배경 오버레이
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // GAME OVER 텍스트
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('GAME OVER', cx, cy - 80);

    // 점수
    ctx.font = '24px sans-serif';
    ctx.fillText(`Score: ${totalScore.toLocaleString()}`, cx, cy - 30);

    // 상태 메시지
    if (isSubmitting) {
      ctx.font = '18px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText('저장 중...', cx, cy + 20);
    } else if (isSaved) {
      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#4ade80';
      ctx.fillText('저장 완료!', cx, cy + 20);

      ctx.font = '16px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('R을 눌러 재시작', cx, cy + 60);
    } else if (isNotHigher) {
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('최고 기록 미갱신', cx, cy + 15);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText(`현재 최고: ${currentBest?.toLocaleString() ?? '-'}점`, cx, cy + 40);

      ctx.font = '16px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('R을 눌러 재시작', cx, cy + 75);
    } else if (isSkipped || !isLoggedIn) {
      ctx.font = '18px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('R을 눌러 재시작', cx, cy + 20);
    } else if (isLoggedIn) {
      // 버튼 영역
      const buttonW = 100;
      const buttonH = 44;
      const buttonGap = 20;
      const buttonsY = cy + 30;

      // SAVE 버튼
      const saveX = cx - buttonW - buttonGap / 2;
      const isSaveSelected = selectedButton === 'save';

      ctx.fillStyle = isSaveSelected ? 'rgba(74, 222, 128, 0.9)' : 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(saveX, buttonsY, buttonW, buttonH);

      if (isSaveSelected) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.strokeRect(saveX, buttonsY, buttonW, buttonH);
      }

      ctx.fillStyle = isSaveSelected ? 'black' : 'white';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('저장', saveX + buttonW / 2, buttonsY + buttonH / 2);

      // SKIP 버튼
      const skipX = cx + buttonGap / 2;
      const isSkipSelected = selectedButton === 'skip';

      ctx.fillStyle = isSkipSelected ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(skipX, buttonsY, buttonW, buttonH);

      if (isSkipSelected) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.strokeRect(skipX, buttonsY, buttonW, buttonH);
      }

      ctx.fillStyle = isSkipSelected ? 'black' : 'white';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('건너뛰기', skipX + buttonW / 2, buttonsY + buttonH / 2);

      // 안내 텍스트
      ctx.font = '14px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText('← → 선택  |  Enter 확인  |  R 재시작', cx, buttonsY + buttonH + 30);
    }

    ctx.restore();
  };

  const getState = (): TGameOverHudState => ({
    isSubmitting,
    isSaved,
    isSkipped,
    isNotHigher,
    currentBest,
  });

  return {
    reset,
    render,
    onKeyDown,
    getState,
    setLoggedIn,
  };
};
