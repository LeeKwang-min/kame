'use client';

import { useEffect, useRef } from 'react';
import { setupSnake, TSnakeCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function Snake() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { mutateAsync: saveScore } = useCreateScore('snake');
  const { mutateAsync: createSession } = useGameSession('snake');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TSnakeCallbacks = {
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
          gameType: 'snake',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
    };

    return setupSnake(canvas, callbacks);
  }, [saveScore, createSession]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[640px] h-[640px] border touch-none bg-white"
      />
    </div>
  );
}

export default Snake;
