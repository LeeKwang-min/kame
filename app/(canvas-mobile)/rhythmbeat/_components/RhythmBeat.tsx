'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupRhythmBeat, TRhythmBeatCallbacks } from '../_lib/game';
import { CANVAS_WIDTH, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT } from '../_lib/config';
import { useCreateScore, useGameSession } from '@/service/scores';
import { GameOverAdOverlay, useGameOverAd } from '@/components/ads';

function RhythmBeat() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('rhythmbeat');
  const { mutateAsync: createSession } = useGameSession('rhythmbeat');
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

  const getCanvasHeight = useCallback(() => {
    // 헤더(~56px) + 패딩(32px) + 갭(40px) + 여유(20px) = ~148px 오버헤드
    const overhead = 148;
    const available = window.innerHeight - overhead;
    return Math.max(MIN_CANVAS_HEIGHT, Math.min(MAX_CANVAS_HEIGHT, available));
  }, []);

  const updateScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const container = wrapper.parentElement;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const canvasHeight = getCanvasHeight();
    const scale = Math.min(containerWidth / CANVAS_WIDTH, 1);
    wrapper.style.transform = `scale(${scale})`;
    wrapper.style.transformOrigin = 'top center';
    wrapper.style.width = `${CANVAS_WIDTH}px`;
    wrapper.style.height = `${canvasHeight}px`;
    const outerDiv = wrapper.parentElement;
    if (outerDiv) {
      outerDiv.style.height = `${canvasHeight * scale}px`;
    }
  }, [getCanvasHeight]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasHeight = getCanvasHeight();

    const callbacks: TRhythmBeatCallbacks = {
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
          gameType: 'rhythmbeat',
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

    cleanupRef.current = setupRhythmBeat(canvas, canvasHeight, callbacks);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [saveScore, createSession, isLoggedIn, getCanvasHeight, onGameOver, shouldShowAdRef, restartRef]);

  return (
    <div className="w-full h-full flex justify-center">
      <div>
        <div ref={wrapperRef}>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="border border-white/20 rounded-2xl shadow-lg touch-none"
            />
            <GameOverAdOverlay
              visible={showAdOverlay}
              score={currentScore}
              isLoggedIn={isLoggedIn}
              onSave={async (score) => {
                if (!sessionTokenRef.current) return { saved: false };
                const result = await saveScore({
                  gameType: 'rhythmbeat',
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
    </div>
  );
}

export default RhythmBeat;
