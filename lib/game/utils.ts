import { INITIALS_KEY_COLS, INITIALS_KEY_GRID } from './config';

export const initialLabelAt = (r: number, c: number): string => {
  return INITIALS_KEY_GRID[r * INITIALS_KEY_COLS + c];
};

// 캔버스 논리적 크기 계산 (CSS transform 스케일링에도 정확)
// ctx.getTransform()의 실제 스케일 팩터로 나눠서 논리적 크기를 구한다
// DPR 스케일링 적용 게임(setTransform(dpr,0,0,dpr,0,0))과 미적용 게임 모두 정확
export const getCanvasLogicalSize = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) => {
  const transform = ctx.getTransform();
  const scaleX = transform.a || 1;
  const scaleY = transform.d || 1;
  return {
    width: canvas.width / scaleX,
    height: canvas.height / scaleY,
  };
};
