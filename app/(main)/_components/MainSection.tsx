'use client';
import { useState } from 'react';
import MainMenuList from './MainMenuList';
import MainSearchBar from './MainSearchBar';
import MainCategorySelect from './MainCategorySelect';
import LoginSidebar from '@/components/auth/LoginSidebar';

function MainSection() {
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('ALL');

  return (
    <div className="flex gap-6 grow">
      <LoginSidebar className="hidden lg:flex" />
      <div className="flex flex-col gap-4 grow">
        <div className="flex items-center gap-2 flex-wrap">
          <MainSearchBar search={search} setSearch={setSearch} />
          <MainCategorySelect category={category} setCategory={setCategory} />
        </div>
        <MainMenuList keyword={search} category={category} />
      </div>
    </div>
  );
}

export default MainSection;
