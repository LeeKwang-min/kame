import { cn } from '@/lib/utils';

interface IProps {
  controls: {
    key: string;
    action: string;
  }[];
}

function ControlInfoTable({ controls }: IProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className={cn(
        'rounded-xl overflow-hidden',
        'bg-arcade-surface border border-arcade-border',
      )}>
        <table className="w-full">
          <thead>
            <tr className="bg-arcade-cyan/20">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-arcade-cyan">
                Key
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-arcade-cyan">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-arcade-border">
            {controls.map((control) => (
              <tr
                key={control.key}
                className="hover:bg-arcade-border/30 transition-colors">
                <td className="px-4 py-3">
                  <kbd className={cn(
                    'px-2.5 py-1.5 text-sm font-mono font-semibold rounded-lg',
                    'bg-arcade-bg border border-arcade-border',
                    'text-arcade-text',
                    'shadow-[0_2px_0_0_rgba(0,0,0,0.3)]',
                  )}>
                    {control.key}
                  </kbd>
                </td>
                <td className="px-4 py-3 text-sm text-arcade-text">{control.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ControlInfoTable;
