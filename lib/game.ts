export {
  createGameOverHud,
  type TGameOverCallbacks,
  type TGameOverHudState,
} from './game/gameOverHud';
export { gamePauseHud } from './game/gamePauseHud';
export {
  INITIALS_KEY_COLS,
  INITIALS_KEY_GRID,
  INITIALS_KEY_ROWS,
  INITIALS_MOVE_DIR,
} from './game/config';
export { initialLabelAt } from './game/utils';

export const gameStartHud = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) => {
  const rect = canvas.getBoundingClientRect();

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = 'white';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("Press 'S' for start", rect.width / 2, rect.height / 2);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText("P: Pause  R: Restart", rect.width / 2, rect.height / 2 + 35);
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
  const rect = canvas.getBoundingClientRect();
  const totalScore = Math.floor(score);

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, rect.width, rect.height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 2;

  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = rect.width / 2;

  ctx.font = '52px sans-serif';
  ctx.fillText('GAME OVER', cx, rect.height / 2 - 40);

  ctx.font = '22px sans-serif';
  ctx.fillText(`Score: ${totalScore}`, cx, rect.height / 2 + 18);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillText('Press R for Restart', cx, rect.height / 2 + 58);

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
