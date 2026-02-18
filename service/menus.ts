import { TMenuList } from '@/@types/menus';
import { useQuery } from '@tanstack/react-query';
import { request } from './api';

export const getMenus = async (
  keyword: string,
  category: string,
  mobile = false,
) => {
  const res = await request<{ data: Record<string, TMenuList> }>({
    url: `/api/menus?keyword=${keyword}&category=${category}&mobile=${mobile}`,
    options: { method: 'GET' },
  });
  const { data } = res;
  return data;
};

export const useGetMenus = (
  keyword: string,
  category: string,
  mobile = false,
) => {
  return useQuery({
    queryKey: ['menus', keyword, category, mobile],
    queryFn: async ({ queryKey }) =>
      await getMenus(
        queryKey[1] as string,
        queryKey[2] as string,
        queryKey[3] as boolean,
      ),
  });
};
