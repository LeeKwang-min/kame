'use client';

import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Gamepad2 } from 'lucide-react';
import { useLocale } from '@/provider/LocaleProvider';

type GameScore = {
  gameType: string;
  highScore: number;
  totalGames: number;
  rank: number | null;
};

async function fetchUserScores(): Promise<GameScore[]> {
  const res = await fetch('/api/user/scores');
  if (!res.ok) throw new Error('Failed to fetch scores');
  const data = await res.json();
  return data.data;
}

const GAME_NAMES: Record<string, string> = {
  tetris: '테트리스',
  snake: '뱀 게임',
  kero33: '키어로33',
  '2048': '2048',
  dodge: '닷지',
  flappybird: '플래피 버드',
  breakout: '벽돌 깨기',
  asteroid: '소행성',
  pong: '탁구',
  dino: '공룡 달리기',
  doodle: '두들 점프',
  spaceinvaders: '스페이스 인베이더',
  missilecommand: '미사일 커맨드',
  platformer: '플랫포머',
  enhance: '강화 시뮬레이터',
  slot: '슬롯머신',
  highlow: '하이로우',
  roulette: '룰렛',
  rps: '가위바위보',
};

function GameHistory() {
  const { t } = useLocale();
  const { data: scores, isLoading, error } = useQuery({
    queryKey: ['userScores'],
    queryFn: fetchUserScores,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-arcade-text flex items-center gap-2">
          <Trophy className="text-arcade-yellow" size={20} />
          {t.myPage.gameHistory}
        </h3>
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-arcade-surface animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-arcade-text flex items-center gap-2">
          <Trophy className="text-arcade-yellow" size={20} />
          {t.myPage.gameHistory}
        </h3>
        <p className="text-arcade-text/60 text-sm">{t.common.error}</p>
      </div>
    );
  }

  if (!scores || scores.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-arcade-text flex items-center gap-2">
          <Trophy className="text-arcade-yellow" size={20} />
          {t.myPage.gameHistory}
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-arcade-text/60">
          <Gamepad2 size={48} className="mb-4 opacity-50" />
          <p className="text-sm">{t.myPage.noGameRecords}</p>
          <p className="text-xs mt-1">{t.myPage.playAndRecord}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-bold text-arcade-text flex items-center gap-2">
        <Trophy className="text-arcade-yellow" size={20} />
        {t.myPage.gameHistory}
      </h3>
      <div className="grid gap-3">
        {scores.map((score) => (
          <div
            key={score.gameType}
            className={cn(
              'p-4 rounded-lg',
              'bg-arcade-surface border border-arcade-border',
              'hover:border-arcade-cyan/50 transition-colors',
            )}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-arcade-text">
                  {GAME_NAMES[score.gameType] || score.gameType}
                </h4>
                <p className="text-xs text-arcade-text/60">
                  {score.totalGames}{t.myPage.gamesPlayed}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-mono text-arcade-cyan">
                  {score.highScore.toLocaleString()}
                </p>
                {score.rank && (
                  <p className="text-xs text-arcade-yellow">
                    {t.myPage.rank} #{score.rank}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GameHistory;
