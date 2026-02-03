'use client';

import { useEffect, useRef } from 'react';
import { setupAsteroid, TAsteroidCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function Asteroid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('asteroid');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TAsteroidCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'asteroid',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupAsteroid(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );
}

export default Asteroid;
