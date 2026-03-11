'use client';

import { useCallback, useRef, useState } from 'react';
import { GAME_OVER_AD_INTERVAL } from './config';

export function useGameOverAd() {
  const gameOverCountRef = useRef(0);
  const shouldShowAdRef = useRef(false);
  const restartRef = useRef<(() => void) | null>(null);
  const [showAdOverlay, setShowAdOverlay] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);

  const onGameOver = useCallback((score: number) => {
    gameOverCountRef.current += 1;
    const isAdRound = gameOverCountRef.current % GAME_OVER_AD_INTERVAL === 0;
    shouldShowAdRef.current = isAdRound;
    if (isAdRound) {
      setCurrentScore(score);
      setShowAdOverlay(true);
    }
  }, []);

  const closeOverlay = useCallback(() => {
    setShowAdOverlay(false);
    shouldShowAdRef.current = false;
  }, []);

  const handleRestart = useCallback(() => {
    closeOverlay();
    restartRef.current?.();
  }, [closeOverlay]);

  return {
    showAdOverlay,
    currentScore,
    shouldShowAdRef,
    restartRef,
    onGameOver,
    closeOverlay,
    handleRestart,
  };
}
