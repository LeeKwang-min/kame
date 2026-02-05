'use client';
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setup2048, T2048Callbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function G2048() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('2048');
  const { mutateAsync: createSession } = useGameSession('2048');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: T2048Callbacks = {
      onGameStart: async () => {
        try {
          const gameSession = await createSession();
          sessionTokenRef.current = gameSession.token;
        } catch (error) {
          console.error('Failed to create game session:', error);
        }
      },
      onScoreSave: async (score) => {
        if (!sessionTokenRef.current) return { saved: false };
        const result = await saveScore({
          gameType: '2048',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setup2048(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center items-start">
      <canvas ref={canvasRef} className="border-none rounded-md" />
    </div>
  );
}

export default G2048;
