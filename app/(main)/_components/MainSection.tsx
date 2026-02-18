'use client';
import { useState } from 'react';
import MainMenuList from './MainMenuList';
import MainSearchBar from './MainSearchBar';
import MainCategorySelect from './MainCategorySelect';
import LoginSidebar from '@/components/auth/LoginSidebar';
import FeaturedCarousel from './FeaturedCarousel';
import { useIsMobile } from '@/hooks/use-mobile';

function MainSection() {
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('ALL');
  const isMobile = useIsMobile();

  return (
    <div className="flex gap-6 grow">
      <LoginSidebar className="hidden lg:flex" />
      <div className="flex flex-col gap-4 grow">
        <FeaturedCarousel isMobile={isMobile} />
        <div className="flex items-center gap-2 flex-wrap">
          <MainSearchBar search={search} setSearch={setSearch} />
          <MainCategorySelect category={category} setCategory={setCategory} />
        </div>
        <MainMenuList keyword={search} category={category} isMobile={isMobile} />
      </div>
    </div>
  );
}

export default MainSection;
