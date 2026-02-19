export {
  createGameOverHud,
  type TGameOverCallbacks,
  type TGameOverHudState,
  type TGameOverOptions,
  type TSaveResult,
} from './game/gameOverHud';
export { gamePauseHud } from './game/gamePauseHud';

// Legacy exports (이니셜 입력이 필요한 경우 사용)
export {
  createGameOverHud as createGameOverHudLegacy,
  type TGameOverCallbacks as TGameOverCallbacksLegacy,
  type TGameOverHudState as TGameOverHudStateLegacy,
} from './game/gameOverHudLegacy';
export {
  INITIALS_KEY_COLS,
  INITIALS_KEY_GRID,
  INITIALS_KEY_ROWS,
  INITIALS_MOVE_DIR,
} from './game/config';
export { initialLabelAt, getCanvasLogicalSize } from './game/utils';

// 내부 사용을 위한 inline 헬퍼 (순환 참조 방지)
// ctx.getTransform()의 실제 스케일 팩터를 사용하여 DPR 적용/미적용 게임 모두 정확
const _logicalSize = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) => {
  const transform = ctx.getTransform();
  const scaleX = transform.a || 1;
  const scaleY = transform.d || 1;
  return { width: canvas.width / scaleX, height: canvas.height / scaleY };
};

export const gameLoadingHud = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) => {
  const { width, height } = _logicalSize(canvas, ctx);
  const cx = width / 2;
  const cy = height / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, width, height);

  // 회전 스피너
  const angle = ((performance.now() / 600) * Math.PI * 2) % (Math.PI * 2);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy - 10, 20, angle, angle + Math.PI * 1.5);
  ctx.stroke();

  // Loading 텍스트
  ctx.fillStyle = 'white';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Loading...', cx, cy + 30);
  ctx.restore();
};

export const gameStartHud = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) => {
  const { width, height } = _logicalSize(canvas, ctx);
  const cx = width / 2;
  const cy = height / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'white';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("Press 'S' or Tap to start", cx, cy);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText("P: Pause  R: Restart", cx, cy + 35);
  ctx.restore();
};

export const gameHud = (
  ctx: CanvasRenderingContext2D,
  score: number,
  sec: number,
) => {
  ctx.save();
  const time = sec;
  const totalScore = Math.floor(score);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'left';
  ctx.fillText(`Time: ${time.toFixed(0)}s`, 12, 22);
  ctx.fillText(`Score: ${totalScore}`, 12, 44);
  ctx.restore();
};

export const gameOverHud = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  score: number,
) => {
  const { width, height } = _logicalSize(canvas, ctx);
  const totalScore = Math.floor(score);

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 2;

  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = width / 2;

  ctx.font = '52px sans-serif';
  ctx.fillText('GAME OVER', cx, height / 2 - 40);

  ctx.font = '22px sans-serif';
  ctx.fillText(`Score: ${totalScore}`, cx, height / 2 + 18);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillText('Press R for Restart', cx, height / 2 + 58);

  ctx.restore();
};

export const drawHud = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  score: number,
  sec: number,
  isStarted: boolean,
  isGameOver: boolean,
) => {
  if (!isStarted) {
    gameStartHud(canvas, ctx);
    return;
  }

  if (isGameOver) {
    gameOverHud(canvas, ctx, score);
    return;
  }

  gameHud(ctx, score, sec);
};

export const drawHudWithoutPlay = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  score: number,
  isStarted: boolean,
  isGameOver: boolean,
) => {
  if (!isStarted) {
    gameStartHud(canvas, ctx);
    return;
  }

  if (isGameOver) {
    gameOverHud(canvas, ctx, score);
    return;
  }
};
