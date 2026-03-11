'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupTypingfall, TTypingfallCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';
import { GameOverAdOverlay, useGameOverAd } from '@/components/ads';

function Typingfall() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('typingfall');
  const { mutateAsync: createSession } = useGameSession('typingfall');
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

    const callbacks: TTypingfallCallbacks = {
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
          gameType: 'typingfall',
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

    return setupTypingfall(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn, onGameOver, shouldShowAdRef, restartRef]);

  return (
    <div className="w-full h-full flex justify-center">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-[800px] h-[600px] border border-white/20 rounded-2xl shadow-lg"
        />
        <GameOverAdOverlay
          visible={showAdOverlay}
          score={currentScore}
          isLoggedIn={isLoggedIn}
          onSave={async (score) => {
            if (!sessionTokenRef.current) return { saved: false };
            const result = await saveScore({
              gameType: 'typingfall',
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

export default Typingfall;
