'use client';

import { useEffect, useRef } from 'react';
import { setupDino, TDinoCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function Dino() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('dino');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TDinoCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'dino',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupDino(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );
}

export default Dino;
