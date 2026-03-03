'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, BRUSH_SIZES } from '../_lib/config';
import { TStroke, TStrokePoint } from '../_lib/types';

type TProps = {
  onStroke: (stroke: TStroke) => void;
  onClear: () => void;
  onUndo: () => void;
  remoteStrokes: TStroke[];
  myId: string;
};

function WhiteboardCanvas({ onStroke, onClear, onUndo, remoteStrokes, myId }: TProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<TStrokePoint[]>([]);
  const allStrokesRef = useRef<TStroke[]>([]);

  const [color, setColor] = useState<string>(COLORS[0]);
  const [brushSize, setBrushSize] = useState<number>(BRUSH_SIZES[1]);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const stroke of allStrokesRef.current) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    allStrokesRef.current = remoteStrokes;
    redrawAll();
  }, [remoteStrokes, redrawAll]);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDrawingRef.current = true;
      const pos = getCanvasPos(e.clientX, e.clientY);
      currentPointsRef.current = [pos];
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getCanvasPos]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;

      const pos = getCanvasPos(e.clientX, e.clientY);
      const points = currentPointsRef.current;

      if (points.length > 0) {
        const prev = points[points.length - 1];
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }

      points.push(pos);
    },
    [color, brushSize, getCanvasPos]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const points = currentPointsRef.current;
    if (points.length < 2) return;

    const stroke: TStroke = {
      playerId: myId,
      points: [...points],
      color,
      width: brushSize,
    };

    allStrokesRef.current.push(stroke);
    onStroke(stroke);
    currentPointsRef.current = [];
  }, [myId, color, brushSize, onStroke]);

  useEffect(() => {
    const updateScale = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const container = wrapper.parentElement;
      if (!container) return;
      const containerWidth = container.clientWidth;
      const scale = Math.min(containerWidth / CANVAS_WIDTH, 1);
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.transformOrigin = 'top center';
      wrapper.style.height = `${CANVAS_HEIGHT * scale}px`;
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition ${
                color === c ? 'border-arcade-cyan scale-110' : 'border-arcade-border'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex gap-1.5">
          {BRUSH_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition ${
                brushSize === size
                  ? 'border-arcade-cyan bg-arcade-cyan/20'
                  : 'border-arcade-border bg-arcade-surface'
              }`}
            >
              <div className="rounded-full bg-arcade-text" style={{ width: size, height: size }} />
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={onUndo}
            className="px-3 py-1.5 text-sm border border-arcade-border rounded-lg text-arcade-text hover:bg-arcade-surface transition"
          >
            되돌리기
          </button>
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-sm border border-red-800 rounded-lg text-red-400 hover:bg-red-900/20 transition"
          >
            전체 지우기
          </button>
        </div>
      </div>

      <div className="w-full flex justify-center">
        <div ref={wrapperRef} style={{ width: CANVAS_WIDTH, minHeight: CANVAS_HEIGHT }}>
          <canvas
            ref={canvasRef}
            className="border border-arcade-border rounded-xl cursor-crosshair touch-none bg-white"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
      </div>
    </div>
  );
}

export default WhiteboardCanvas;
