'use client';

import { useEffect, useRef } from 'react';
import { setupTemplate, TTemplateCallbacks } from '../_lib/game';
import { useCreateScore, useGameSession } from '@/service/scores';

// TODO: 'dodge'를 실제 게임 타입으로 변경하세요
const GAME_TYPE = 'dodge' as const;

function Template() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const { mutateAsync: saveScore } = useCreateScore(GAME_TYPE);
  const { mutateAsync: createSession } = useGameSession(GAME_TYPE);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TTemplateCallbacks = {
      onGameStart: async () => {
        try {
          const session = await createSession();
          sessionTokenRef.current = session.token;
        } catch (error) {
          console.error('Failed to create game session:', error);
        }
      },
      onScoreSave: async (score) => {
        if (!sessionTokenRef.current) return { saved: false };
        const result = await saveScore({
          gameType: GAME_TYPE,
          score: Math.floor(score),
          sessionToken: sessionTokenRef.current,
        });
        sessionTokenRef.current = null;
        return result;
      },
    };

    return setupTemplate(canvas, callbacks);
  }, [saveScore, createSession]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none bg-white" />
    </div>
  );
}

export default Template;
