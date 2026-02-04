'use client';

import { useEffect, useRef } from 'react';
import { setupSnake, TSnakeCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function Snake() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('snake');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TSnakeCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'snake',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupSnake(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[640px] h-[640px] border touch-none"
      />
    </div>
  );
}

export default Snake;
