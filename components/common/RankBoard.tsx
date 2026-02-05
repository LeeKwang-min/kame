'use client';

import { cn } from '@/lib/utils';

const countryToFlag = (countryCode: string | null): string => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

interface IProps {
  data: {
    initials: string;
    score: number;
    country?: string | null;
  }[];
  className?: string;
  showCountry?: boolean;
  isLoading?: boolean;
}

function RankBoard({
  data,
  className,
  showCountry = false,
  isLoading = false,
}: IProps) {
  return (
    <div className={cn('w-full max-w-md mx-auto', className)}>
      <div className={cn(
        'rounded-xl overflow-hidden max-h-[300px] flex flex-col',
        'bg-arcade-surface border border-arcade-border',
      )}>
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-arcade-cyan/20">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-12 text-arcade-cyan">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-arcade-cyan">
                Name
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-arcade-cyan">
                Score
              </th>
            </tr>
          </thead>
        </table>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-arcade-text/50">로딩 중...</p>
            </div>
          ) : (
            <table className="w-full">
              <tbody className="divide-y divide-arcade-border">
                {data.map((item, index) => (
                  <tr
                    key={`${item.initials}-${item.score}-${index}`}
                    className="hover:bg-arcade-border/30 transition-colors">
                    <td className="px-4 py-3 w-12">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full',
                          index === 0 && 'bg-arcade-yellow text-black',
                          index === 1 && 'bg-gray-400 text-gray-800',
                          index === 2 && 'bg-amber-600 text-amber-100',
                          index > 2 && 'bg-arcade-border text-arcade-text',
                        )}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-arcade-text">
                      <span className="flex items-center gap-2">
                        {item.initials}
                        {showCountry && item.country && (
                          <span className="text-base">
                            {countryToFlag(item.country)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-arcade-text">
                      {item.score.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!isLoading && data.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-arcade-text/50">아직 기록이 없습니다</p>
              <p className="text-xs text-arcade-text/30 mt-1">
                지금 바로 도전해 보세요!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RankBoard;
