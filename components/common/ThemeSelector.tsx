'use client';

import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 p-1 rounded-lg bg-arcade-border/30">
        <div className="w-7 h-7" />
        <div className="w-7 h-7" />
        <div className="w-7 h-7" />
      </div>
    );
  }

  const themes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'system', icon: Monitor, label: 'System' },
    { value: 'dark', icon: Moon, label: 'Dark' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-arcade-border/30 dark:bg-arcade-border/30">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={cn(
            'p-1.5 rounded transition-all',
            theme === value
              ? 'bg-arcade-cyan/20 text-arcade-cyan dark:bg-arcade-cyan/20 dark:text-arcade-cyan'
              : 'text-arcade-text/50 hover:text-arcade-text dark:text-arcade-text/50 dark:hover:text-arcade-text',
          )}>
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}

export default ThemeSelector;
