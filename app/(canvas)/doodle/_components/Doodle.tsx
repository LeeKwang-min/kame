'use client';
import { useEffect, useRef } from 'react';
import { setupDoodle, TDoodleCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function Doodle() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('doodle');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TDoodleCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'doodle',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupDoodle(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );
}

export default Doodle;
