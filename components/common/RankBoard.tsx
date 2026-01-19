import { cn } from "@/lib/utils";

interface IProps {
  data: {
    initials: string;
    score: number;
  }[];
  className?: string;
}

function RankBoard({ data, className }: IProps) {
  return (
    <div className={cn("w-full h-full border-2 rounded-md overflow-y-auto", className)}>
      <h1 className="text-2xl w-full text-center py-2">Rank</h1>
      <ol className="list-decimal list-inside divide-y divide-gray-200">
        {data.map((item, index) => (
          <li key={`${item.initials}-${item.score}`} className="w-full flex gap-2 px-2 py-4 text-xl">
            <span>{index + 1}.</span>
            <div className="w-full flex justify-between">
            <span>{item.initials}</span>
            <span>{item.score}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default RankBoard;