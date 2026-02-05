'use client';

import { useEffect, useRef } from 'react';
import { setupHighLow, THighLowCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function HighLow() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('highlow');
  const { mutateAsync: createSession } = useGameSession('highlow');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: THighLowCallbacks = {
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
          gameType: 'highlow',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
    };

    return setupHighLow(canvas, callbacks);
  }, [saveScore, createSession]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[620px] h-[620px] border touch-none bg-white"
      />
    </div>
  );
}

export default HighLow;
