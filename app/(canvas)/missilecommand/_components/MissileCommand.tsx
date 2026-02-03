'use client';
import { useEffect, useRef } from 'react';
import { setupMissileCommand, TMissileCommandCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

function MissileCommand() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('missilecommand');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TMissileCommandCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: 'missilecommand',
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupMissileCommand(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );
}

export default MissileCommand;
