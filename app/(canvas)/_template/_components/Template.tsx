'use client';

import { useEffect, useRef } from 'react';
import { setupTemplate, TTemplateCallbacks } from '../_lib/game';
import { useCreateScore } from '@/service/scores';

// TODO: 'dodge'를 실제 게임 타입으로 변경하세요
const GAME_TYPE = 'dodge' as const;

function Template() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { mutateAsync: saveScore } = useCreateScore(GAME_TYPE);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const callbacks: TTemplateCallbacks = {
      onScoreSave: async (initials, score) => {
        await saveScore({
          gameType: GAME_TYPE,
          initials,
          score: Math.floor(score),
        });
      },
    };

    return setupTemplate(canvas, callbacks);
  }, [saveScore]);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );
}

export default Template;
