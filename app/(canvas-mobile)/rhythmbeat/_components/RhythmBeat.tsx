'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupRhythmBeat, TRhythmBeatCallbacks } from '../_lib/game';
import { CANVAS_WIDTH, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT } from '../_lib/config';
import { useCreateScore, useGameSession } from '@/service/scores';

function RhythmBeat() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('rhythmbeat');
  const { mutateAsync: createSession } = useGameSession('rhythmbeat');
  const isLoggedIn = !!session;

  const getCanvasHeight = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return MIN_CANVAS_HEIGHT;
    const container = wrapper.parentElement;
    if (!container) return MIN_CANVAS_HEIGHT;
    const available = container.clientHeight;
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
    };

    cleanupRef.current = setupRhythmBeat(canvas, canvasHeight, callbacks);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [saveScore, createSession, isLoggedIn, getCanvasHeight]);

  return (
    <div className="w-full h-full flex justify-center">
      <div>
        <div ref={wrapperRef}>
          <canvas
            ref={canvasRef}
            className="border border-white/20 rounded-2xl shadow-lg touch-none"
          />
        </div>
      </div>
    </div>
  );
}

export default RhythmBeat;
