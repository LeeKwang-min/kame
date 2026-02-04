'use client';

import { useEffect, useRef } from 'react';
import { setupSlot, TSlotCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function Slot() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('slot');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TSlotCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'slot',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupSlot(canvas, callbacks);
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

export default Slot;
