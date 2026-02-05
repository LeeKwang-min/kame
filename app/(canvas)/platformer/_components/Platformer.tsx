'use client';
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupPlatformer, TPlatformerCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function Platformer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('platformer');
  const { mutateAsync: createSession } = useGameSession('platformer');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TPlatformerCallbacks = {
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
          gameType: 'platformer',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupPlatformer(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[1200px] max-h-[800px] mx-auto border touch-none bg-white"
      />
    </div>
  );
}

export default Platformer;
