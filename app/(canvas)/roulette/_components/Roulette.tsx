'use client';

import { useEffect, useRef } from 'react';
import { setupRoulette, TRouletteCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function Roulette() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('roulette');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TRouletteCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'roulette',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupRoulette(canvas, callbacks);
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

export default Roulette;
