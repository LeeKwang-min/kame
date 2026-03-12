import { Heart } from 'lucide-react';

const KOFI_URL = 'https://ko-fi.com/leekwangmin';

function KofiButton() {
  return (
    <a
      href={KOFI_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border border-arcade-border bg-arcade-surface text-arcade-text text-sm font-medium hover:border-arcade-cyan/50 hover:text-arcade-cyan transition-colors"
    >
      <Heart size={16} className="text-red-400" />
      <span>Support Kame</span>
    </a>
  );
}

export default KofiButton;
