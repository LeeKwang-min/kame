import { TGameType, TScoreCreateWithToken } from '@/@types/scores';
import { createGameSession, createScore, getScores } from '@/lib/scores/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const useGetScores = (gameType: TGameType) => {
  return useQuery({
    queryKey: ['scores', gameType],
    queryFn: () => getScores(gameType),
  });
};

export const useCreateScore = (gameType: TGameType) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TScoreCreateWithToken) => createScore(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scores', gameType] });
    },
  });
};

export const useGameSession = (gameType: TGameType) => {
  return useMutation({
    mutationFn: () => createGameSession(gameType),
  });
};
