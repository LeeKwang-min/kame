import { getCanvasLogicalSize } from './utils';

type TGamePauseHudOptions = {
  resumeKey?: string;
  showRestartHint?: boolean;
};

export const gamePauseHud = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  options?: TGamePauseHudOptions,
) => {
  const { width, height } = getCanvasLogicalSize(canvas);
  const cx = width / 2;
  const cy = height / 2;
  const resumeKey = options?.resumeKey || 'S';
  const showRestartHint = options?.showRestartHint ?? false;

  ctx.save();

  // 반투명 오버레이
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // PAUSED 텍스트
  ctx.fillStyle = 'white';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('PAUSED', cx, cy - 40);

  // 안내 텍스트
  ctx.font = '18px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(`'${resumeKey}' or Tap to Resume`, cx, cy + 20);
  if (showRestartHint) {
    ctx.fillText("Press 'R' to Restart", cx, cy + 50);
  }

  ctx.restore();
};
