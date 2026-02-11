'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupRandomDefense, TRandomDefenseCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function RandomDefense() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('randomdefense');
  const { mutateAsync: createSession } = useGameSession('randomdefense');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TRandomDefenseCallbacks = {
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
          gameType: 'randomdefense',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupRandomDefense(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[1200px] h-[800px] border border-white/20 rounded-2xl shadow-lg"
      />
    </div>
  );
}

export default RandomDefense;
