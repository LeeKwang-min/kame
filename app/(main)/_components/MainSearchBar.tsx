'use client';

import { Input } from '@/components/ui/input';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

interface IProps {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
}

function MainSearchBar({ search, setSearch }: IProps) {
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(debouncedSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [debouncedSearch, setSearch]);

  return (
    <Input
      type="text"
      placeholder="Keyword"
      value={debouncedSearch}
      onChange={(e) => setDebouncedSearch(e.target.value)}
      className="w-full h-10 rounded-md border border-gray-300 p-2 px-4"
    />
  );
}

export default MainSearchBar;
