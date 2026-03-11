'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupGomoku, TGomokuCallbacks } from '../_lib/game';
import { CANVAS_SIZE } from '../_lib/config';
import { useCreateScore, useGameSession } from '@/service/scores';
import { GameOverAdOverlay, useGameOverAd } from '@/components/ads';

function Gomoku() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('gomoku' as Parameters<typeof useCreateScore>[0]);
  const { mutateAsync: createSession } = useGameSession('gomoku' as Parameters<typeof useGameSession>[0]);
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

  const updateScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const container = wrapper.parentElement;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const scale = Math.min(containerWidth / CANVAS_SIZE, 1);
    wrapper.style.transform = `scale(${scale})`;
    wrapper.style.transformOrigin = 'top center';
    wrapper.style.height = `${CANVAS_SIZE * scale}px`;
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TGomokuCallbacks = {
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
          gameType: 'gomoku' as Parameters<typeof saveScore>[0]['gameType'],
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

    return setupGomoku(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn, onGameOver, shouldShowAdRef, restartRef]);

  return (
    <div className="w-full flex justify-center">
      <div
        ref={wrapperRef}
        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
      >
        <div className="relative">
          <canvas
          ref={canvasRef}
          className="border border-white/20 rounded-2xl shadow-lg touch-none"
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
        />
          <GameOverAdOverlay
            visible={showAdOverlay}
            score={currentScore}
            isLoggedIn={isLoggedIn}
            onSave={async (score) => {
              if (!sessionTokenRef.current) return { saved: false };
              const result = await saveScore({
                gameType: 'gomoku',
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
    </div>
  );
}

export default Gomoku;
