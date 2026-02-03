'use client';

import { useEffect, useRef } from 'react';
import { setupBreakOut, TBreakoutCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function BreakOut() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('breakout');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TBreakoutCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'breakout',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupBreakOut(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );
}

export default BreakOut;
