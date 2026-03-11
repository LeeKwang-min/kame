'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { setupSuperHexagon, TSuperHexagonCallbacks } from '../_lib/game';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../_lib/config';
import { useCreateScore, useGameSession } from '@/service/scores';
import { GameOverAdOverlay, useGameOverAd } from '@/components/ads';
import { useIsMobile } from '@/hooks/use-mobile';

function SuperHexagon() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { data: session } = useSession();
  const { mutateAsync: saveScore } = useCreateScore('superhexagon');
  const { mutateAsync: createSession } = useGameSession('superhexagon');
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
  const isMobile = useIsMobile();

  const updateScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const container = wrapper.parentElement;
    if (!container) return;

    if (isMobile) {
      // 모바일: 90도 회전 → 800px가 세로, 500px가 가로
      const availableWidth = container.clientWidth;
      const availableHeight = Math.max(container.clientHeight, window.innerHeight - 56);

      // 회전 후: 가로에는 CANVAS_HEIGHT(500)이, 세로에는 CANVAS_WIDTH(800)이 들어감
      const scale = Math.min(
        availableWidth / CANVAS_HEIGHT,
        availableHeight / CANVAS_WIDTH,
      );

      wrapper.style.width = `${CANVAS_WIDTH}px`;
      wrapper.style.height = `${CANVAS_HEIGHT}px`;
      wrapper.style.transform = `rotate(90deg) scale(${scale})`;
      wrapper.style.transformOrigin = 'center center';
      // flex justify-center items-center가 wrapper 중심을 컨테이너 중심에 배치
      // transform은 중심 기준으로 적용되므로 margin 보정 불필요
      wrapper.style.marginLeft = '';
      wrapper.style.marginTop = '';
    } else {
      // 데스크탑: 가로 방향 그대로
      const containerWidth = container.clientWidth;
      const scale = Math.min(containerWidth / CANVAS_WIDTH, 1);
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.transformOrigin = 'top center';
      wrapper.style.height = `${CANVAS_HEIGHT * scale}px`;
      wrapper.style.width = `${CANVAS_WIDTH}px`;
      wrapper.style.marginLeft = '';
      wrapper.style.marginTop = '';
    }
  }, [isMobile]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TSuperHexagonCallbacks = {
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
          gameType: 'superhexagon',
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

    return setupSuperHexagon(canvas, callbacks);
  }, [saveScore, createSession, isLoggedIn, onGameOver, shouldShowAdRef, restartRef]);

  return (
    <div className="w-full h-full flex justify-center items-center overflow-hidden">
      <div
        ref={wrapperRef}
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <div className="relative">
          <canvas
          ref={canvasRef}
          className="border border-white/20 rounded-2xl shadow-lg touch-none"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        />
          <GameOverAdOverlay
            visible={showAdOverlay}
            score={currentScore}
            isLoggedIn={isLoggedIn}
            onSave={async (score) => {
              if (!sessionTokenRef.current) return { saved: false };
              const result = await saveScore({
                gameType: 'superhexagon',
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

export default SuperHexagon;
