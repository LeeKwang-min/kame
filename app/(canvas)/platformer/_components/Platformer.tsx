'use client';
import { useEffect, useRef } from 'react';
import { setupPlatformer, TPlatformerCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function Platformer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('platformer');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TPlatformerCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'platformer',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupPlatformer(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[1200px] max-h-[800px] mx-auto border touch-none"
      />
    </div>
  );
}

export default Platformer;
