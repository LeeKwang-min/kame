'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupLightsOut, TLightsOutCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

function LightsOut() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('lightsout');
  const { mutateAsync: createSession } = useGameSession('lightsout');
  const isLoggedIn = !!session;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TLightsOutCallbacks = {
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
          gameType: 'lightsout',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupLightsOut(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full h-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="w-[500px] h-[600px] border border-white/20 rounded-2xl shadow-lg"
      />
    </div>
  );
}

export default LightsOut;
