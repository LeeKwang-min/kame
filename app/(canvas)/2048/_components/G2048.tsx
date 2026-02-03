'use client';
import { useEffect, useRef } from 'react';
import { setup2048, T2048Callbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function G2048() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('2048');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: T2048Callbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: '2048',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setup2048(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-full h-full flex justify-center items-start">
      <canvas ref={canvasRef} className="border-none rounded-md" />
    </div>
  );
}

export default G2048;
