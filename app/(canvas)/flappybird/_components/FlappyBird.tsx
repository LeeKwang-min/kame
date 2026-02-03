'use client';

import { useEffect, useRef } from 'react';
import { setupFlappyBird, TFlappyBirdCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('flappybird');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TFlappyBirdCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'flappybird',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupFlappyBird(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );
}

export default FlappyBird;
