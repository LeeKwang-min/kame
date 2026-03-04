'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  CANVAS_SIZE,
  BOARD_PADDING,
  CELL_SIZE,
  STONE_RADIUS,
  COLORS,
} from '../_lib/config';
import {
  TGomokuStone,
  TGomokuPlacedPayload,
  TGomokuGameOverPayload,
  TGomokuSyncPayload,
  TGomokuRestartPayload,
} from '../_lib/types';
import { BOARD_SIZE, STAR_POINTS, getAllForbiddenPositions } from '@/lib/gomoku';
import type { TPosition } from '@/lib/gomoku';

const RESULT_STYLES = {
  win:  { bg: 'rgba(22, 101, 52, 0.95)', color: '#4ade80', title: 'Victory!', sub: '승리했습니다' },
  lose: { bg: 'rgba(127, 29, 29, 0.95)', color: '#f87171', title: 'Defeat', sub: '패배했습니다' },
  draw: { bg: 'rgba(113, 63, 18, 0.95)', color: '#fbbf24', title: 'Draw', sub: '무승부' },
} as const;

type TProps = {
  myId: string;
  playerOrder: [string, string] | null;
  board: TGomokuStone[][];
  currentTurn: 1 | 2;
  lastMove: TPosition | null;
  winLine: TPosition[] | null;
  winner: 1 | 2 | null;
  isDraw: boolean;
  onPlace: (x: number, y: number) => void;
};

function GomokuBoard({
  myId,
  playerOrder,
  board,
  currentTurn,
  lastMove,
  winLine,
  winner,
  isDraw,
  onPlace,
}: TProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hoverPosRef = useRef<TPosition | null>(null);
  const winLineAlphaRef = useRef(0);
  const winLineDirRef = useRef(1);

  const isGameOver = winner !== null || isDraw;

  // Determine my stone color
  const myStone: 1 | 2 | null =
    playerOrder && playerOrder[0] === myId ? 1 :
    playerOrder && playerOrder[1] === myId ? 2 : null;

  const isMyTurn = myStone === currentTurn && !isGameOver;

  // Compute forbidden positions (only for black's turn)
  const forbiddenPositions = useMemo(() =>
    currentTurn === 1 && !isGameOver
      ? getAllForbiddenPositions(board)
      : [],
    [board, currentTurn, isGameOver]
  );

  // --- Coordinate conversion ---
  const boardToCanvas = useCallback((bx: number, by: number) => ({
    x: BOARD_PADDING + bx * CELL_SIZE,
    y: BOARD_PADDING + by * CELL_SIZE,
  }), []);

  const canvasToBoard = useCallback((cx: number, cy: number): TPosition | null => {
    const bx = Math.round((cx - BOARD_PADDING) / CELL_SIZE);
    const by = Math.round((cy - BOARD_PADDING) / CELL_SIZE);
    if (bx < 0 || bx >= BOARD_SIZE || by < 0 || by >= BOARD_SIZE) return null;
    return { x: bx, y: by };
  }, []);

  // --- CSS transform scaling ---
  useEffect(() => {
    const updateScale = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const container = wrapper.parentElement;
      if (!container) return;
      const containerWidth = container.clientWidth;
      const scale = Math.min(containerWidth / CANVAS_SIZE, 1);
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.transformOrigin = 'top center';
      wrapper.style.height = `${CANVAS_SIZE * scale}px`;
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // --- Canvas init ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(CANVAS_SIZE * dpr);
    canvas.height = Math.round(CANVAS_SIZE * dpr);
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  // --- Rendering ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const render = () => {
      // Board background
      ctx.fillStyle = COLORS.BOARD_BG;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Grid lines
      ctx.strokeStyle = COLORS.BOARD_GRID;
      ctx.lineWidth = 1;

      for (let i = 0; i < BOARD_SIZE; i++) {
        const startH = boardToCanvas(0, i);
        const endH = boardToCanvas(BOARD_SIZE - 1, i);
        ctx.beginPath();
        ctx.moveTo(startH.x, startH.y);
        ctx.lineTo(endH.x, endH.y);
        ctx.stroke();

        const startV = boardToCanvas(i, 0);
        const endV = boardToCanvas(i, BOARD_SIZE - 1);
        ctx.beginPath();
        ctx.moveTo(startV.x, startV.y);
        ctx.lineTo(endV.x, endV.y);
        ctx.stroke();
      }

      // Star points
      for (const [sx, sy] of STAR_POINTS) {
        const p = boardToCanvas(sx, sy);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.STAR_POINT;
        ctx.fill();
      }

      // Stones
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          const stone = board[y][x];
          if (stone === 0) continue;

          const c = boardToCanvas(x, y);

          if (stone === 1) {
            const grad = ctx.createRadialGradient(
              c.x - STONE_RADIUS * 0.3,
              c.y - STONE_RADIUS * 0.3,
              STONE_RADIUS * 0.1,
              c.x,
              c.y,
              STONE_RADIUS,
            );
            grad.addColorStop(0, COLORS.BLACK_STONE_HIGHLIGHT);
            grad.addColorStop(1, COLORS.BLACK_STONE);
            ctx.beginPath();
            ctx.arc(c.x, c.y, STONE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(c.x + 1, c.y + 1, STONE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.WHITE_STONE_SHADOW;
            ctx.fill();

            const grad = ctx.createRadialGradient(
              c.x - STONE_RADIUS * 0.3,
              c.y - STONE_RADIUS * 0.3,
              STONE_RADIUS * 0.1,
              c.x,
              c.y,
              STONE_RADIUS,
            );
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, COLORS.WHITE_STONE);
            ctx.beginPath();
            ctx.arc(c.x, c.y, STONE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = '#bbb';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Last move indicator
      if (lastMove) {
        const c = boardToCanvas(lastMove.x, lastMove.y);
        ctx.beginPath();
        ctx.arc(c.x, c.y, STONE_RADIUS * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.LAST_MOVE_DOT;
        ctx.fill();
      }

      // Forbidden positions (only shown when it's black's turn)
      if (currentTurn === 1 && !isGameOver) {
        ctx.strokeStyle = COLORS.FORBIDDEN_MARK;
        ctx.lineWidth = 2;
        for (const pos of forbiddenPositions) {
          const c = boardToCanvas(pos.x, pos.y);
          const s = STONE_RADIUS * 0.5;
          ctx.beginPath();
          ctx.moveTo(c.x - s, c.y - s);
          ctx.lineTo(c.x + s, c.y + s);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(c.x + s, c.y - s);
          ctx.lineTo(c.x - s, c.y + s);
          ctx.stroke();
        }
      }

      // Hover preview
      const hp = hoverPosRef.current;
      if (hp && isMyTurn) {
        const c = boardToCanvas(hp.x, hp.y);
        ctx.beginPath();
        ctx.arc(c.x, c.y, STONE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = myStone === 1 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
      }

      // Win line highlight
      if (winLine && winLine.length > 0) {
        winLineAlphaRef.current += 0.03 * winLineDirRef.current;
        if (winLineAlphaRef.current >= 1) {
          winLineAlphaRef.current = 1;
          winLineDirRef.current = -1;
        } else if (winLineAlphaRef.current <= 0.3) {
          winLineAlphaRef.current = 0.3;
          winLineDirRef.current = 1;
        }

        for (const pos of winLine) {
          const c = boardToCanvas(pos.x, pos.y);
          ctx.beginPath();
          ctx.arc(c.x, c.y, STONE_RADIUS + 3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(231, 76, 60, ${winLineAlphaRef.current})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      // Turn/status info overlay
      ctx.save();

      if (isGameOver) {
        // --- Large centered game result overlay ---
        const cx = CANVAS_SIZE / 2;
        const cy = CANVAS_SIZE / 2;

        // Dim background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Result box
        const boxW = 280;
        const boxH = 140;
        const boxX = cx - boxW / 2;
        const boxY = cy - boxH / 2;
        const boxRadius = 16;

        // Box shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(boxX + 4, boxY + 4, boxW, boxH, boxRadius);
        ctx.fill();

        // Result style
        const resultType = winner !== null && myStone === winner ? 'win'
          : winner !== null ? 'lose' : 'draw';
        const { bg: boxBg, color: mainColor, title: resultTitle, sub: resultSub } = RESULT_STYLES[resultType];

        // Box background + border (single path)
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, boxRadius);
        ctx.fillStyle = boxBg;
        ctx.fill();
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Result title
        ctx.fillStyle = mainColor;
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(resultTitle, cx, cy - 20);

        // Result subtitle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '16px sans-serif';
        ctx.fillText(resultSub, cx, cy + 22);

        // Stone indicator
        const stoneLabel = myStone === 1 ? '● 흑' : '○ 백';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '13px sans-serif';
        ctx.fillText(stoneLabel, cx, cy + 48);
      } else {
        // --- Small turn indicator (during play) ---
        let statusText = '';
        if (!playerOrder) {
          statusText = '상대를 기다리는 중...';
        } else if (isMyTurn) {
          statusText = '당신의 차례입니다';
        } else {
          statusText = '상대방의 차례입니다';
        }

        if (statusText) {
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';

          const textMetrics = ctx.measureText(statusText);
          const pillW = textMetrics.width + 16;
          const pillH = 24;
          const pillX = 6;
          const pillY = 4;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 4);
          ctx.fill();

          ctx.fillStyle = isMyTurn ? '#4ade80' : '#e0e0e0';
          ctx.fillText(statusText, pillX + 8, pillY + 5);
        }
      }

      // My stone indicator (top-right)
      if (myStone) {
        const stoneLabel = myStone === 1 ? '흑' : '백';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        const labelMetrics = ctx.measureText(stoneLabel);
        const labelPillW = labelMetrics.width + 16;
        const labelPillX = CANVAS_SIZE - 6 - labelPillW;
        const labelPillY = 4;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(labelPillX, labelPillY, labelPillW, 24, 4);
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.fillText(stoneLabel, CANVAS_SIZE - 14, labelPillY + 6);
      }

      ctx.restore();
    };

    let raf: number;
    const loop = () => {
      render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, [board, currentTurn, lastMove, winLine, winner, isDraw, isMyTurn, myStone, playerOrder, forbiddenPositions, isGameOver, boardToCanvas]);

  // --- Mouse events ---
  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((clientY - rect.top) / rect.height) * CANVAS_SIZE,
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isMyTurn) return;

      const pos = getCanvasPos(e.clientX, e.clientY);
      const boardPos = canvasToBoard(pos.x, pos.y);
      if (!boardPos) return;
      if (board[boardPos.y][boardPos.x] !== 0) return;

      // Check forbidden for black
      if (myStone === 1) {
        const isForbiddenPos = forbiddenPositions.some(
          (p) => p.x === boardPos.x && p.y === boardPos.y
        );
        if (isForbiddenPos) return;
      }

      onPlace(boardPos.x, boardPos.y);
    },
    [isMyTurn, getCanvasPos, canvasToBoard, board, myStone, forbiddenPositions, onPlace]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isMyTurn) {
        hoverPosRef.current = null;
        return;
      }

      const pos = getCanvasPos(e.clientX, e.clientY);
      const boardPos = canvasToBoard(pos.x, pos.y);
      if (!boardPos || board[boardPos.y][boardPos.x] !== 0) {
        hoverPosRef.current = null;
        return;
      }

      // Check forbidden for black
      if (myStone === 1) {
        const isForbiddenPos = forbiddenPositions.some(
          (p) => p.x === boardPos.x && p.y === boardPos.y
        );
        if (isForbiddenPos) {
          hoverPosRef.current = null;
          return;
        }
      }

      hoverPosRef.current = boardPos;
    },
    [isMyTurn, getCanvasPos, canvasToBoard, board, myStone, forbiddenPositions]
  );

  const handlePointerLeave = useCallback(() => {
    hoverPosRef.current = null;
  }, []);

  return (
    <div className="w-full flex justify-center">
      <div ref={wrapperRef} style={{ width: CANVAS_SIZE, minHeight: CANVAS_SIZE }}>
        <canvas
          ref={canvasRef}
          className="border border-arcade-border rounded-xl touch-none"
          style={{ cursor: isMyTurn ? 'pointer' : 'default' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        />
      </div>
    </div>
  );
}

export default GomokuBoard;
