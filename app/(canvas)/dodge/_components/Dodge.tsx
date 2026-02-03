'use client';

import { useEffect, useRef } from 'react';
import { setupDodge, TDodgeCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function Dodge() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('dodge');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TDodgeCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'dodge',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupDodge(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );
}

export default Dodge;
