type TGamePauseHudOptions = {
  resumeKey?: string;
};

export const gamePauseHud = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  options?: TGamePauseHudOptions,
) => {
  const rect = canvas.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const resumeKey = options?.resumeKey || 'S';

  ctx.save();

  // 반투명 오버레이
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, rect.width, rect.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // PAUSED 텍스트
  ctx.fillStyle = 'white';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('PAUSED', cx, cy - 40);

  // 안내 텍스트
  ctx.font = '18px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(`Press '${resumeKey}' to Resume`, cx, cy + 20);
  ctx.fillText("Press 'R' to Restart", cx, cy + 50);

  ctx.restore();
};
