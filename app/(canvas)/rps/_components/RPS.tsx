'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupRPS, TRPSCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';
import { GameOverAdOverlay, useGameOverAd } from '@/components/ads';

function RPS() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('rps');
  const { mutateAsync: createSession } = useGameSession('rps');
  const isLoggedIn = !!session;
  const {
    showAdOverlay,
    currentScore,
    shouldShowAdRef,
    restartRef,
    onGameOver,
    closeOverlay,
    handleRestart,
  } = useGameOverAd();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TRPSCallbacks = {
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
          gameType: 'rps',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
      onGameOver,
      shouldShowAdRef,
      restartRef,
    };

    return setupRPS(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn, onGameOver, shouldShowAdRef, restartRef]);

  return (
    <div className="w-full h-full flex justify-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-[620px] h-[620px] border touch-none bg-white"
        />
        <GameOverAdOverlay
          visible={showAdOverlay}
          score={currentScore}
          isLoggedIn={isLoggedIn}
          onSave={async (score) => {
            if (!sessionTokenRef.current) return { saved: false };
            const result = await saveScore({
              gameType: 'rps',
              score: Math.floor(score),
              sessionToken: sessionTokenRef.current,
            });
            sessionTokenRef.current = null;
            return result;
          }}
          onSkip={closeOverlay}
          onRestart={handleRestart}
          onClose={closeOverlay}
        />
      </div>
    </div>
  );
}

export default RPS;
