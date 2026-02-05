import {
  TGameSession,
  TGameType,
  TScoreCreateWithToken,
  TScoreRank,
} from '@/@types/scores';
import { request } from '@/service/api';
import { TSaveResult } from '@/lib/game';

export const getScores = async (gameType: TGameType) => {
  const res = await request<{ data: TScoreRank[] }>({
    url: `/api/scores?gameType=${gameType}`,
    options: { method: 'GET' },
  });
  return res.data;
};

type TScoreResponse = {
  data?: { id: string };
  error?: string;
  message?: string;
  currentBest?: number;
  created?: boolean;
  updated?: boolean;
};

export const createScore = async (data: TScoreCreateWithToken): Promise<TSaveResult> => {
  const res = await request<TScoreResponse>({
    url: '/api/scores',
    options: {
      method: 'POST',
      body: JSON.stringify(data),
    },
  });

  // SCORE_NOT_HIGHER 에러 처리
  if (res.error === 'SCORE_NOT_HIGHER') {
    return {
      saved: false,
      message: res.message,
      currentBest: res.currentBest,
    };
  }

  // 성공 (created 또는 updated)
  return {
    saved: true,
  };
};

export const createGameSession = async (gameType: TGameType) => {
  const res = await request<{ data: TGameSession }>({
    url: '/api/game-session',
    options: {
      method: 'POST',
      body: JSON.stringify({ gameType }),
    },
  });
  return res.data;
};
