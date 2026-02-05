'use client';

import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Crown } from 'lucide-react';

type TotalRank = {
  rank: number;
  initials: string;
  totalScore: number;
};

async function fetchTotalRanking(): Promise<TotalRank[]> {
  const res = await fetch('/api/scores/total');
  if (!res.ok) throw new Error('Failed to fetch ranking');
  const data = await res.json();
  return data.data;
}

function TotalRankingBoard() {
  const { data: rankings, isLoading } = useQuery({
    queryKey: ['totalRanking'],
    queryFn: fetchTotalRanking,
    staleTime: 60000,
  });

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-2">
        <Trophy className="text-arcade-yellow" size={18} />
        <span className="text-sm font-bold text-arcade-text">TOTAL RANKING</span>
      </div>

      <div
        className={cn(
          'rounded-lg overflow-hidden',
          'bg-arcade-bg/50 border border-arcade-border',
        )}>
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-6 bg-arcade-border/50 rounded animate-pulse"
              />
            ))}
          </div>
        ) : !rankings || rankings.length === 0 ? (
          <div className="p-4 text-center text-arcade-text/50 text-xs">
            랭킹 데이터가 없습니다
          </div>
        ) : (
          <div className="divide-y divide-arcade-border/50">
            {rankings.slice(0, 5).map((rank) => (
              <div
                key={rank.rank}
                className={cn(
                  'flex items-center justify-between px-3 py-2',
                  rank.rank === 1 && 'bg-arcade-yellow/10',
                )}>
                <div className="flex items-center gap-2">
                  {rank.rank === 1 ? (
                    <Crown size={14} className="text-arcade-yellow" />
                  ) : (
                    <span
                      className={cn(
                        'w-4 text-center text-xs font-mono',
                        rank.rank === 2
                          ? 'text-gray-400'
                          : rank.rank === 3
                            ? 'text-amber-600'
                            : 'text-arcade-text/50',
                      )}>
                      {rank.rank}
                    </span>
                  )}
                  <span
                    className={cn(
                      'font-mono text-sm font-bold',
                      rank.rank === 1
                        ? 'text-arcade-yellow'
                        : 'text-arcade-text',
                    )}>
                    {rank.initials}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-xs font-mono',
                    rank.rank === 1
                      ? 'text-arcade-yellow'
                      : 'text-arcade-cyan/70',
                  )}>
                  {rank.totalScore.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TotalRankingBoard;
