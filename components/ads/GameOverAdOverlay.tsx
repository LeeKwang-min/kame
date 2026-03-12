'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAds } from './AdProvider';
import { AD_SLOTS } from './config';
import { TSaveResult } from '@/lib/game';

type TGameOverAdOverlayProps = {
  visible: boolean;
  score: number;
  isLoggedIn: boolean;
  onSave: (score: number) => Promise<TSaveResult>;
  onSkip: () => void;
  onRestart: () => void;
  onClose: () => void;
};

export function GameOverAdOverlay({
  visible,
  score,
  isLoggedIn,
  onSave,
  onSkip,
  onRestart,
  onClose,
}: TGameOverAdOverlayProps) {
  const { adsEnabled, hideAnchor, showAnchor } = useAds();
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);
  const isSaving = useRef(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  useEffect(() => {
    if (visible) {
      hideAnchor();
    } else {
      showAnchor();
    }
  }, [visible, hideAnchor, showAnchor]);

  useEffect(() => {
    if (!visible || !adsEnabled || isLoaded.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      isLoaded.current = true;
    } catch {
      // 광고 로드 실패해도 오버레이는 유지 (SAVE/SKIP 기능은 작동)
    }
  }, [visible, adsEnabled]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') {
        onClose();
        onRestart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose, onRestart]);

  const handleSave = useCallback(async () => {
    if (isSaving.current) return;
    isSaving.current = true;
    setSaveState('saving');
    try {
      await onSave(score);
      setSaveState('saved');
    } catch {
      setSaveState('failed');
    } finally {
      isSaving.current = false;
    }
  }, [onSave, score]);

  useEffect(() => {
    if (!visible) {
      isLoaded.current = false;
      isSaving.current = false;
      setSaveState('idle');
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 rounded-2xl">
      <div className="flex flex-col items-center gap-4 p-6 max-w-[360px] w-full">
        <div className="text-center">
          <p className="text-white/80 text-sm font-mono">GAME OVER</p>
          <p className="text-cyan-400 text-3xl font-bold font-mono">{Math.floor(score)}</p>
        </div>

        {adsEnabled && (
          <ins
            ref={adRef}
            className="adsbygoogle block"
            style={{ display: 'block', width: 300, height: 250 }}
            data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
            data-ad-slot={AD_SLOTS.gameover}
          />
        )}

        <div className="flex gap-3">
          {isLoggedIn && saveState !== 'saved' && (
            <button
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg text-sm hover:bg-cyan-400 transition-colors disabled:opacity-50"
            >
              {saveState === 'saving' ? 'SAVING...' : saveState === 'failed' ? 'RETRY' : 'SAVE'}
            </button>
          )}
          {saveState === 'saved' && (
            <span className="px-4 py-2 text-green-400 font-bold text-sm font-mono">SAVED!</span>
          )}
          <button
            onClick={() => {
              onSkip();
              onClose();
            }}
            className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors"
          >
            SKIP
          </button>
        </div>

        <p className="text-white/40 text-xs font-mono">Press R to restart</p>
      </div>
    </div>
  );
}
