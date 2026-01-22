import {
  INITIALS_KEY_COLS,
  INITIALS_KEY_ROWS,
  INITIALS_MOVE_DIR,
} from '@/app/(game)/dodge/_lib/config';
import { initialLabelAt } from '@/app/(game)/dodge/_lib/utils';

export const gameOver = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) => {
  let initials = '';
  let sel = { r: 0, c: 0 };

  let focusEnd = false;

  let isSubmitting = false;
  let isSaved = false;

  const isEndEnabled = () => initials.length >= 3 && !isSubmitting && !isSaved;

  const applyChoice = (label: string) => {
    if (label === 'DEL') {
      initials = initials.slice(0, -1);
      return;
    }
    if (label === 'SPC') {
      if (initials.length < 3) initials += ' ';
      return;
    }
    if (/^[A-Z]$/.test(label)) {
      if (initials.length < 3) initials += label;
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

  const onEnter = async () => {
    if (focusEnd) {
      if (!isEndEnabled()) return;
      isSubmitting = true;
      try {
        // await onSave(initials);
        isSaved = true;
      } finally {
        isSubmitting = false;
      }
      return;
    }

    const label = initialLabelAt(sel.r, sel.c);
    applyChoice(label);
  };

  const resetInitial = () => {
    initials = '';
    sel = { r: 0, c: 0 };
    isSubmitting = false;
    isSaved = false;
  };

  const onInitialKeyDown = (e: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
      const { dr, dc } =
        INITIALS_MOVE_DIR[e.code as keyof typeof INITIALS_MOVE_DIR];
      initialMove(dr, dc);
      e.preventDefault();
      return;
    }

    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      void onEnter(); // async지만 keydown에서 await는 안 해도 됨
      e.preventDefault();
      return;
    }

    if (e.code === 'Backspace') {
      applyChoice('DEL');
      e.preventDefault();
      return;
    }
  };

  const gameOverHud = (score: number) => {
    const rect = canvas.getBoundingClientRect();
    const totalScore = Math.floor(score);

    const cx = rect.width / 2;

    // 1) 오버레이 배경
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 2) 헤더 텍스트
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'black';

    ctx.font = '52px sans-serif';
    ctx.fillText('GAME OVER', cx, 110);

    ctx.font = '22px sans-serif';
    ctx.fillText(`Score: ${totalScore}`, cx, 155);

    // 3) 이니셜 표시(3칸 고정)
    const padded = (initials + '___').slice(0, 3); // 남은 칸은 _ 로
    const initialsText = padded.split('').join(' ');
    ctx.font = '24px monospace';
    ctx.fillText(`${initialsText}`, cx, 200);

    // 안내 문구
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillText(
      'Arrow: Move   Enter: Select   Backspace: DEL   R: Restart',
      cx,
      230,
    );

    // 4) 그리드 레이아웃 계산(중앙 정렬, 반응형)
    const cols = INITIALS_KEY_COLS; // 7
    const rows = INITIALS_KEY_ROWS; // 4

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
    const startY = 260; // 헤더 아래에서 시작 (원하면 조절)

    // 5) 그리드 렌더링(A-Z, DEL, SPC)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const label = initialLabelAt(r, c);
        const x = startX + c * (cellW + gap);
        const y = startY + r * (cellH + gap);

        const isSelected = !focusEnd && sel.r === r && sel.c === c;

        // 셀 배경
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x, y, cellW, cellH);

        // 선택 하이라이트
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

        // 라벨 텍스트
        ctx.fillStyle = 'black';
        ctx.font = label.length === 1 ? '18px monospace' : '14px monospace';
        ctx.fillText(label, x + cellW / 2, y + cellH / 2);
      }
    }

    // 6) END 버튼(3글자 이상일 때만 활성)
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

    // END 비활성 힌트 / 저장 상태 표시
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';

    if (isSubmitting) {
      ctx.fillText('Saving...', cx, endY + endH + 18);
    } else if (isSaved) {
      ctx.fillText('Saved! Press R to restart.', cx, endY + endH + 18);
    } else if (!endEnabled) {
      ctx.fillText('END is enabled after 3 characters.', cx, endY + endH + 18);
    }

    ctx.restore();
  };

  return {
    resetInitial,
    gameOverHud,
    onInitialKeyDown,
  };
};

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
