'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupNonogram, TNonogramCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function Nonogram() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('nonogram');
  const { mutateAsync: createSession } = useGameSession('nonogram');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TNonogramCallbacks = {
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
          gameType: 'nonogram',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupNonogram(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[700px] h-[700px] border border-white/20 rounded-2xl shadow-lg"
      />
    </div>
  );
}

export default Nonogram;
