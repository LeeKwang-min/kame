'use client';
import { useState, useCallback } from 'react';
import MainMenuList from './MainMenuList';
import MainSearchBar from './MainSearchBar';
import MainCategoryTabs from './MainCategoryTabs';
import LoginSidebar from '@/components/auth/LoginSidebar';
import MainBanner from './MainBanner';
import { useIsMobile } from '@/hooks/use-mobile';

function MainSection() {
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('ALL');
  const isMobile = useIsMobile();

  const handleSearchChange = useCallback(() => {
    setCategory('ALL');
  }, []);

  const handleCategoryChange = useCallback((newCategory: string) => {
    setCategory(newCategory);
    setSearch('');
  }, []);

  return (
    <div className="flex gap-6 grow">
      <LoginSidebar className="hidden lg:flex" />
      <div className="flex flex-col gap-4 grow">
        <MainBanner />
        <MainSearchBar
          search={search}
          setSearch={setSearch}
          onSearchChange={handleSearchChange}
        />
        <MainCategoryTabs
          category={category}
          setCategory={handleCategoryChange}
        />
        <MainMenuList keyword={search} category={category} isMobile={isMobile} />
      </div>
    </div>
  );
}

export default MainSection;
