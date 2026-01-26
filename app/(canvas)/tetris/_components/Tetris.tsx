'use client';
import { useEffect, useRef } from 'react';
import { setupTetris } from '../_lib/game';
import { CELL, COLS, ROWS, SIDE_PANEL_WIDTH } from '../_lib/config';

function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    return setupTetris(canvas);
  }, []);

  return (
    <div className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="border touch-none mx-auto"
        style={{
          width: COLS * CELL + SIDE_PANEL_WIDTH,
          height: ROWS * CELL,
        }}
      />
    </div>
  );
}

export default Tetris;
