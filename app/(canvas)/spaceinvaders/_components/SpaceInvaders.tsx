'use client';
import { useEffect, useRef } from 'react';
import { setupSpaceInvaders, TSpaceInvadersCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function SpaceInvaders() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('spaceinvaders');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TSpaceInvadersCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'spaceinvaders',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupSpaceInvaders(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );
}

export default SpaceInvaders;
