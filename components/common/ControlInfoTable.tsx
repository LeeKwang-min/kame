interface IProps {
  controls: {
    key: string;
    action: string;
  }[];
}

function ControlInfoTable({ controls }: IProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-xl border border-gray-700/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Key
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-400/30">
            {controls.map((control, index) => (
              <tr
                key={control.key}
                className="hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3">
                  <kbd className="px-2.5 py-1.5 text-sm font-mono font-semibold text-gray-200 bg-gray-700 rounded-lg border border-gray-600 shadow-[0_2px_0_0_rgba(0,0,0,0.3)]">
                    {control.key}
                  </kbd>
                </td>
                <td className="px-4 py-3 text-sm">{control.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ControlInfoTable;
