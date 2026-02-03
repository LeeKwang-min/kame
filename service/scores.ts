import { TGameType, TScoreCreate } from '@/@types/scores';
import { createScore, getScores } from '@/lib/scores/api';
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
    mutationFn: (data: TScoreCreate) => createScore(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scores', gameType] });
    },
  });
};
