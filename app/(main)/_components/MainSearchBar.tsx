'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useLocale } from '@/provider/LocaleProvider';

interface IProps {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  onSearchChange?: () => void;
}

function MainSearchBar({ search, setSearch, onSearchChange }: IProps) {
  const { t } = useLocale();
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(debouncedSearch);
      if (debouncedSearch && onSearchChange) {
        onSearchChange();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [debouncedSearch, setSearch, onSearchChange]);

  useEffect(() => {
    if (search === '' && debouncedSearch !== '') {
      setDebouncedSearch('');
    }
  }, [search]);

  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-arcade-text/50" aria-hidden="true" />
      <Input
        type="text"
        aria-label={t.common.searchGames}
        placeholder={t.common.searchGames}
        autoComplete="off"
        value={debouncedSearch}
        onChange={(e) => setDebouncedSearch(e.target.value)}
        className={cn(
          'w-full h-9 sm:h-10 pl-9 sm:pl-10 pr-3 sm:pr-4 rounded-lg text-sm',
          'bg-arcade-surface border-arcade-border',
          'text-arcade-text placeholder:text-arcade-text/40',
          'focus:border-arcade-cyan focus:ring-arcade-cyan/20',
          'transition-[border-color,box-shadow] duration-300',
        )}
      />
    </div>
  );
}

export default MainSearchBar;
