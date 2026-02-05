'use client';
import { useEffect, useRef } from 'react';
import { setupKero33, TKero33Callbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function Kero33() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('kero33');
  const { mutateAsync: createSession } = useGameSession('kero33');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TKero33Callbacks = {
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
          gameType: 'kero33',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
    };

    return setupKero33(canvas, callbacks);
  }, [saveScore, createSession]);

  return (
    <div className="w-[600px] h-[600px]">
      <canvas ref={canvasRef} className="w-full h-full border touch-none bg-white" />
    </div>
  );
}

export default Kero33;
