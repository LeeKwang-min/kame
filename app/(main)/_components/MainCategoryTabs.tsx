'use client';

import { useRef, useEffect, useState } from 'react';
import {
  Clover,
  Dice5,
  Gamepad2,
  LucideIcon,
  Puzzle,
  Star,
  Wrench,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/provider/LocaleProvider';

const TAB_ICONS: Record<string, LucideIcon> = {
  Dice5,
  Star,
  Gamepad2,
  Puzzle,
  Zap,
  Clover,
  Wrench,
};

const TABS = [
  { id: 'ALL', iconName: 'Dice5', labelKey: 'all' as const },
  { id: 'FEATURED', iconName: 'Star', labelKey: 'featured' as const },
  { id: 'Arcade', iconName: 'Dice5', labelKey: 'arcade' as const },
  { id: 'Action', iconName: 'Gamepad2', labelKey: 'action' as const },
  { id: 'Puzzle', iconName: 'Puzzle', labelKey: 'puzzle' as const },
  { id: 'Reflex', iconName: 'Zap', labelKey: 'reflex' as const },
  { id: 'Good Luck', iconName: 'Clover', labelKey: 'goodLuck' as const },
  { id: 'Utility', iconName: 'Wrench', labelKey: 'utility' as const },
];

interface IProps {
  category: string;
  setCategory: (value: string) => void;
}

function MainCategoryTabs({ category, setCategory }: IProps) {
  const { t } = useLocale();
  const tabsRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Animated sliding underline
  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const activeTab = container.querySelector(
      `[data-tab-id="${category}"]`,
    ) as HTMLElement;
    if (!activeTab) return;

    setIndicatorStyle({
      left: activeTab.offsetLeft,
      width: activeTab.offsetWidth,
    });
  }, [category]);

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div ref={tabsRef} className="relative flex items-center gap-0.5 min-w-max">
        {TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.iconName];
          const isActive = category === tab.id;
          const label = t.category[tab.labelKey];

          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => setCategory(tab.id)}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium',
                'transition-colors duration-200 relative whitespace-nowrap',
                'rounded-t-lg',
                isActive
                  ? 'text-arcade-cyan'
                  : 'text-arcade-text/40 hover:text-arcade-text/70 hover:bg-arcade-surface/50',
              )}
            >
              {Icon && (
                <Icon
                  size={15}
                  className={cn(
                    'transition-colors duration-200',
                    isActive ? 'text-arcade-cyan' : '',
                  )}
                />
              )}
              {label}
            </button>
          );
        })}

        {/* Sliding underline indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-arcade-border" />
        <div
          className="absolute bottom-0 h-[2px] bg-arcade-cyan rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(34,211,211,0.3)]"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
      </div>
    </div>
  );
}

export default MainCategoryTabs;
