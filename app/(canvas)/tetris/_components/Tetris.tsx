'use client';

import { useEffect, useRef } from 'react';
import { setupTetris, TTetrisCallbacks } from '../_lib/game';
import { CELL, COLS, ROWS, SIDE_PANEL_WIDTH } from '../_lib/config';
import { useCreateScore } from '@/service/scores';

function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('tetris');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TTetrisCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'tetris',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupTetris(canvas, callbacks);
  }, [saveScore]);

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
