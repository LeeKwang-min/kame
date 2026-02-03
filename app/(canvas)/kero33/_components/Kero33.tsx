'use client';
import { useEffect, useRef } from 'react';
import { setupKero33, TKero33Callbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function Kero33() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('kero33');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TKero33Callbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'kero33',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupKero33(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-[600px] h-[600px]">
      <canvas ref={canvasRef} className="w-full h-full border touch-none" />
    </div>
  );
}

export default Kero33;
