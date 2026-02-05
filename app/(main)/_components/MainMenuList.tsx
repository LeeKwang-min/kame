'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useGetMenus } from '@/service/menus';
import {
  Binary,
  BookText,
  Clover,
  Dice5,
  Film,
  Gamepad2,
  UserRoundSearch,
  Webhook,
  Wrench,
} from 'lucide-react';
import GameCard from '@/components/common/GameCard';
import { cn } from '@/lib/utils';

export const CATEGORY_ICON = {
  Game: <Dice5 size={18} className="text-arcade-cyan" />,
  'Good Luck': <Clover size={18} className="text-arcade-yellow" />,
  Utility: <Wrench size={18} className="text-arcade-magenta" />,
  Fun: <Gamepad2 size={18} className="text-arcade-cyan" />,
  Content: <BookText size={18} className="text-arcade-cyan" />,
  Development: <Binary size={18} className="text-arcade-cyan" />,
  Media: <Film size={18} className="text-arcade-cyan" />,
  About: <UserRoundSearch size={18} className="text-arcade-cyan" />,
  'Web APIs': <Webhook size={18} className="text-arcade-cyan" />,
};

interface IProps {
  keyword: string;
  category: string;
}

function MainMenuList({ keyword, category }: IProps) {
  const { data: menus, isLoading } = useGetMenus(keyword, category);

  if (isLoading) return <MainMenuListSkeleton />;

  const categories = Object.keys(menus || {});
  if (categories.length === 0) return <MainMenuListEmpty />;

  return (
    <div className="w-full flex flex-col gap-8">
      {categories?.map((cat) => (
        <div key={cat} className="w-full flex flex-col gap-3">
          <h3
            className={cn(
              'font-bold flex items-center gap-2',
              'text-arcade-text text-lg',
              'pb-2 border-b border-arcade-border',
            )}>
            {CATEGORY_ICON[cat as keyof typeof CATEGORY_ICON]}
            {cat}
          </h3>
          <div className="w-full grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {menus?.[cat]?.map((menu) => (
              <GameCard key={menu.name.eng} menu={menu} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MainMenuList;

function MainMenuListSkeleton() {
  return (
    <div className="w-full flex flex-col gap-8">
      {new Array(3).fill(0).map((_, idx) => (
        <div key={`category-${idx}`} className="w-full flex flex-col gap-3">
          <Skeleton className="h-6 w-[160px] bg-arcade-border" />
          <div className="w-full grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {new Array(6).fill(0).map((_, index) => (
              <Skeleton
                key={`menu-${index}`}
                className="aspect-square w-full rounded-lg bg-arcade-surface"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MainMenuListEmpty() {
  return (
    <div className="w-full flex flex-col gap-2 items-center justify-center h-full min-h-[250px]">
      <p className="text-center text-sm text-arcade-text/50 font-bold">
        검색 결과가 없습니다.
      </p>
      <p className="text-center text-sm text-arcade-text/50 font-bold">
        No menus found
      </p>
    </div>
  );
}
