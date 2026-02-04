'use client';

import { useEffect, useRef } from 'react';
import { setupHighLow, THighLowCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function HighLow() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('highlow');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: THighLowCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'highlow',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupHighLow(canvas, callbacks);
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

export default HighLow;
