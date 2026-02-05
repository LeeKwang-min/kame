import { TGameType } from '@/@types/scores';
import {
  INITIALS_KEY_COLS,
  INITIALS_KEY_ROWS,
  INITIALS_MOVE_DIR,
} from './config';
import { initialLabelAt } from './utils';

export type TGameOverCallbacks = {
  onScoreSave: (initials: string, score: number) => Promise<void>;
  onRestart: () => void;
};

export type TGameOverHudState = {
  initials: string;
  isSubmitting: boolean;
  isSaved: boolean;
};

export const createGameOverHud = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  _gameType: TGameType,
  callbacks: TGameOverCallbacks,
) => {
  let initials = '';
  let sel = { r: 0, c: 0 };
  let focusEnd = false;
  let isSubmitting = false;
  let isSaved = false;

  const isEndEnabled = () => initials.length >= 1 && !isSubmitting && !isSaved;

  const applyChoice = (label: string) => {
    if (label === 'DEL') {
      initials = initials.slice(0, -1);
      return;
    }
    if (label === 'SPC') {
      if (initials.length < 5) initials += ' ';
      return;
    }
    if (/^[A-Z]$/.test(label)) {
      if (initials.length < 5) initials += label;
      return;
    }
  };

  const initialMove = (dr: number, dc: number) => {
    if (focusEnd) {
      if (dr < 0) focusEnd = false;
      return;
    }

    const nr = sel.r + dr;
    const nc = sel.c + dc;

    if (nr >= INITIALS_KEY_ROWS) {
      focusEnd = true;
      return;
    }

    sel.r = (nr + INITIALS_KEY_ROWS) % INITIALS_KEY_ROWS;
    sel.c = (nc + INITIALS_KEY_COLS) % INITIALS_KEY_COLS;
  };

  const onEnter = async (score: number) => {
    if (focusEnd) {
      if (!isEndEnabled()) return;
      isSubmitting = true;
      try {
        await callbacks.onScoreSave(initials, score);
        isSaved = true;
      } finally {
        isSubmitting = false;
      }
      return;
    }

    const label = initialLabelAt(sel.r, sel.c);
    applyChoice(label);
  };

  const reset = () => {
    initials = '';
    sel = { r: 0, c: 0 };
    focusEnd = false;
    isSubmitting = false;
    isSaved = false;
  };

  const onKeyDown = (e: KeyboardEvent, score: number) => {
    if (e.code === 'KeyR') {
      callbacks.onRestart();
      e.preventDefault();
      return true;
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      const { dr, dc } =
        INITIALS_MOVE_DIR[e.code as keyof typeof INITIALS_MOVE_DIR];
      initialMove(dr, dc);
      e.preventDefault();
      return true;
    }

    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      void onEnter(score);
      e.preventDefault();
      return true;
    }

    if (e.code === 'Backspace') {
      applyChoice('DEL');
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';

    ctx.font = '52px sans-serif';
    ctx.fillText('GAME OVER', cx, 110);

    ctx.font = '22px sans-serif';
    ctx.fillText(`Score: ${totalScore}`, cx, 155);

    const padded = (initials + '_____').slice(0, 5);
    const initialsText = padded.split('').join(' ');

    // 이니셜 배경 박스
    const initialsBoxW = 180;
    const initialsBoxH = 40;
    const initialsBoxX = cx - initialsBoxW / 2;
    const initialsBoxY = 180;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(initialsBoxX, initialsBoxY, initialsBoxW, initialsBoxH);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(initialsBoxX, initialsBoxY, initialsBoxW, initialsBoxH);

    ctx.font = '24px monospace';
    ctx.fillStyle = '#222';
    ctx.fillText(`${initialsText}`, cx, initialsBoxY + initialsBoxH / 2);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(
      'Arrow: Move   Enter: Select   Backspace: DEL   R: Restart',
      cx,
      240,
    );

    const cols = INITIALS_KEY_COLS;
    const rows = INITIALS_KEY_ROWS;

    const padX = Math.min(60, rect.width * 0.08);
    const maxGridW = rect.width - padX * 2;

    const gap = 8;
    const cellW = Math.floor(
      Math.min(64, (maxGridW - gap * (cols - 1)) / cols),
    );
    const cellH = 42;

    const gridW = cols * cellW + gap * (cols - 1);
    const gridH = rows * cellH + gap * (rows - 1);

    const startX = cx - gridW / 2;
    const startY = 260;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const label = initialLabelAt(r, c);
        const x = startX + c * (cellW + gap);
        const y = startY + r * (cellH + gap);

        const isSelected = !focusEnd && sel.r === r && sel.c === c;

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x, y, cellW, cellH);

        if (isSelected) {
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fillRect(x, y, cellW, cellH);
          ctx.strokeStyle = 'rgba(0,0,0,0.65)';
          ctx.lineWidth = 3;
        } else {
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 2;
        }
        ctx.strokeRect(x, y, cellW, cellH);

        ctx.fillStyle = 'black';
        ctx.font = label.length === 1 ? '18px monospace' : '14px monospace';
        ctx.fillText(label, x + cellW / 2, y + cellH / 2);
      }
    }

    const endY = startY + gridH + 18;
    const endW = Math.min(240, gridW * 0.55);
    const endH = 44;
    const endX = cx - endW / 2;

    const endEnabled = isEndEnabled();
    const endSelected = focusEnd;

    ctx.globalAlpha = endEnabled ? 1 : 0.35;

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(endX, endY, endW, endH);

    if (endSelected) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(endX, endY, endW, endH);
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
    }
    ctx.strokeRect(endX, endY, endW, endH);

    ctx.fillStyle = 'black';
    ctx.font = '18px monospace';
    ctx.fillText('END', cx, endY + endH / 2);

    ctx.globalAlpha = 1;

    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

    if (isSubmitting) {
      ctx.fillText('Saving...', cx, endY + endH + 18);
    } else if (isSaved) {
      ctx.fillText('Saved! Press R to restart.', cx, endY + endH + 18);
    } else if (!endEnabled) {
      ctx.fillText('Enter your initials (1-5 chars).', cx, endY + endH + 18);
    }

    ctx.restore();
  };

  const getState = (): TGameOverHudState => ({
    initials,
    isSubmitting,
    isSaved,
  });

  return {
    reset,
    render,
    onKeyDown,
    getState,
  };
};
