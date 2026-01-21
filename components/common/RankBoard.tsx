import { cn } from '@/lib/utils';

interface IProps {
  data: {
    initials: string;
    score: number;
  }[];
  className?: string;
}

function RankBoard({ data, className }: IProps) {
  return (
    <div className={cn('w-full max-w-md mx-auto', className)}>
      <div className="rounded-xl border border-gray-700/50 overflow-hidden max-h-[300px] flex flex-col">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                Score
              </th>
            </tr>
          </thead>
        </table>
        <div className="overflow-y-auto flex-1">
          <table className="w-full">
            <tbody className="divide-y divide-gray-400/30">
              {data.map((item, index) => (
                <tr
                  key={`${item.initials}-${item.score}-${index}`}
                  className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 w-12">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full',
                        index === 0 && 'bg-yellow-500 text-yellow-900',
                        index === 1 && 'bg-gray-300 text-gray-700',
                        index === 2 && 'bg-amber-600 text-amber-100',
                        index > 2 && 'bg-gray-700 text-gray-300',
                      )}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {item.initials}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {item.score.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">아직 기록이 없습니다</p>
              <p className="text-xs text-gray-400 mt-1">
                랭킹 시스템은 추후 도입 예정입니다.
              </p>
              {/* <p className="text-xs text-gray-400 mt-1">지금 바로 도전해 보세요!</p> */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RankBoard;
