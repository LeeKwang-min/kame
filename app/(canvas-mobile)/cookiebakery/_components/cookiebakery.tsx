'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupCookieBakery, TCookieBakeryCallbacks } from '../_lib/game';
import { CANVAS_SIZE } from '../_lib/config';
import { useCreateScore, useGameSession } from '@/service/scores';

function CookieBakery() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('cookiebakery');
  const { mutateAsync: createSession } = useGameSession('cookiebakery');
  const isLoggedIn = !!session;

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

    const callbacks: TCookieBakeryCallbacks = {
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
          gameType: 'cookiebakery',
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
      isLoggedIn,
    };

    return setupCookieBakery(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn]);

  return (
    <div className="w-full flex justify-center">
      <div
        ref={wrapperRef}
        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
      >
        <canvas
          ref={canvasRef}
          className="border border-white/20 rounded-2xl shadow-lg touch-none"
          style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
        />
      </div>
    </div>
  );
}

export default CookieBakery;
