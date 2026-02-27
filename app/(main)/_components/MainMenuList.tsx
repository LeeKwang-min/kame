'use client';

import { useGetMenus } from '@/service/menus';
import {
  Binary,
  BookText,
  Clover,
  Dice5,
  Film,
  Gamepad2,
  Loader2,
  Puzzle,
  UserRoundSearch,
  Webhook,
  Wrench,
  Zap,
} from 'lucide-react';
import GameCard from '@/components/common/GameCard';
import { cn } from '@/lib/utils';
import { FEATURED_GAMES } from '@/lib/config';
import { TMenu } from '@/@types/menus';

export const CATEGORY_ICON = {
  Arcade: <Dice5 size={18} className="text-arcade-cyan" />,
  Action: <Gamepad2 size={18} className="text-arcade-yellow" />,
  Puzzle: <Puzzle size={18} className="text-arcade-magenta" />,
  Reflex: <Zap size={18} className="text-arcade-cyan" />,
  'Good Luck': <Clover size={18} className="text-arcade-yellow" />,
  Utility: <Wrench size={18} className="text-arcade-magenta" />,
  Fun: <Gamepad2 size={18} className="text-arcade-cyan" />,
  Content: <BookText size={18} className="text-arcade-cyan" />,
  Development: <Binary size={18} className="text-arcade-cyan" />,
  Media: <Film size={18} className="text-arcade-cyan" />,
  About: <UserRoundSearch size={18} className="text-arcade-cyan" />,
  'Web APIs': <Webhook size={18} className="text-arcade-cyan" />,
};

const featuredHrefs = new Set(FEATURED_GAMES.map((f) => f.href));

interface IProps {
  keyword: string;
  category: string;
  isMobile: boolean;
}

function MainMenuList({ keyword, category, isMobile }: IProps) {
  const apiCategory = category === 'FEATURED' ? 'ALL' : category;
  const { data: menus, isLoading } = useGetMenus(keyword, apiCategory, isMobile);

  if (isLoading) return <MainMenuListLoading />;

  const categories = Object.keys(menus || {});
  if (categories.length === 0) return <MainMenuListEmpty />;

  // FEATURED tab: flatten all categories, filter by FEATURED_GAMES
  if (category === 'FEATURED') {
    const allMenus: TMenu[] = categories.flatMap((cat) => menus?.[cat] || []);
    const featuredMenus = allMenus.filter((menu) => featuredHrefs.has(menu.href));
    if (featuredMenus.length === 0) return <MainMenuListEmpty />;

    return (
      <div className="w-full grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {featuredMenus.map((menu) => (
          <GameCard key={menu.name.eng} menu={menu} />
        ))}
      </div>
    );
  }

  // Specific category tab (not ALL): flat grid, no category heading
  if (category !== 'ALL') {
    const allMenus: TMenu[] = categories.flatMap((cat) => menus?.[cat] || []);
    return (
      <div className="w-full grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {allMenus.map((menu) => (
          <GameCard key={menu.name.eng} menu={menu} />
        ))}
      </div>
    );
  }

  // ALL tab: grouped by category (existing behavior)
  return (
    <div className="w-full flex flex-col gap-8">
      {categories.map((cat) => (
        <div key={cat} className="w-full flex flex-col gap-3">
          <h3
            className={cn(
              'font-bold flex items-center gap-2',
              'text-arcade-text text-lg',
              'pb-2 border-b border-arcade-border',
            )}
          >
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

function MainMenuListLoading() {
  return (
    <div className="w-full flex items-center justify-center min-h-[250px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="text-arcade-cyan animate-spin" />
        <p className="text-sm text-arcade-text/40 font-medium">Loading...</p>
      </div>
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
