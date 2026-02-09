'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupAimTrainer, TAimTrainerCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function AimTrainer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('aimtrainer');
  const { mutateAsync: createSession } = useGameSession('aimtrainer');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TAimTrainerCallbacks = {
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
          gameType: 'aimtrainer',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupAimTrainer(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[800px] h-[600px] border border-white/20 rounded-2xl cursor-crosshair shadow-lg"
      />
    </div>
  );
}

export default AimTrainer;
