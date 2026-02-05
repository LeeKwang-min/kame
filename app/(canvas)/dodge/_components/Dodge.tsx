'use client';

import { useEffect, useRef } from 'react';
import { setupDodge, TDodgeCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function Dodge() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('dodge');
  const { mutateAsync: createSession } = useGameSession('dodge');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TDodgeCallbacks = {
      onGameStart: async () => {
        try {
          const session = await createSession();
          sessionTokenRef.current = session.token;
        } catch (error) {
          console.error('Failed to create game session:', error);
        }
      },
      onScoreSave: async (score) => {
        if (!sessionTokenRef.current) return { saved: false };
        const result = await saveScore({
          gameType: 'dodge',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
    };

    return setupDodge(canvas, callbacks);
  }, [saveScore, createSession]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none bg-white" />
    </div>
  );
}

export default Dodge;
