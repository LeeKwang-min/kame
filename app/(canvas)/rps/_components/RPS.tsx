'use client';

import { useEffect, useRef } from 'react';
import { setupRPS, TRPSCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function RPS() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('rps');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TRPSCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'rps',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupRPS(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[620px] h-[620px] border touch-none"
      />
    </div>
  );
}

export default RPS;
