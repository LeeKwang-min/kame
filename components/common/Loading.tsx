import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface IProps {
  size?: number;
  className?: string;
}

function Loading({ size = 6, className }: IProps) {
  return (
    <div
      className={cn(
        'w-full min-h-[500px] h-full flex items-center justify-center',
        className,
      )}>
      <Loader2 size={size * 4} className="animate-spin" />
    </div>
  );
}

export default Loading;
