import { TGameType, TScoreCreate, TScoreRank } from '@/@types/scores';
import { request } from '@/service/api';

export const getScores = async (gameType: TGameType) => {
  const res = await request<{ data: TScoreRank[] }>({
    url: `/api/scores?gameType=${gameType}`,
    options: { method: 'GET' },
  });
  return res.data;
};

export const createScore = async (data: TScoreCreate) => {
  const res = await request<{ data: { id: string } }>({
    url: '/api/scores',
    options: {
      method: 'POST',
      body: JSON.stringify(data),
    },
  });
  return res.data;
};
