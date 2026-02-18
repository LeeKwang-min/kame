import { INITIALS_KEY_COLS, INITIALS_KEY_GRID } from './config';

export const initialLabelAt = (r: number, c: number): string => {
  return INITIALS_KEY_GRID[r * INITIALS_KEY_COLS + c];
};

// 캔버스 논리적 크기 계산 (CSS transform 스케일링에도 정확)
// canvas.width는 DPR이 반영된 버퍼 크기이므로 DPR로 나눠서 논리적 크기를 구한다
export const getCanvasLogicalSize = (canvas: HTMLCanvasElement) => {
  const dpr = window.devicePixelRatio || 1;
  return {
    width: canvas.width / dpr,
    height: canvas.height / dpr,
  };
};
