'use client';

import { useEffect, useRef } from 'react';
import { setupEnhance, TEnhanceCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function Enhance() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('enhance');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TEnhanceCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'enhance',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupEnhance(canvas, callbacks);
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

export default Enhance;
