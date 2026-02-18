import { MENU_LIST } from '@/lib/config';
import { makeCategoryMenuList } from '@/lib/utils';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const keyword = searchParams.get('keyword') ?? '';
  const category =
    searchParams.get('category') === 'ALL' ? '' : searchParams.get('category');
  const mobile = searchParams.get('mobile') === 'true';

  try {
    let filteredMenuList = MENU_LIST;

    // 모바일에서는 platform: 'both'인 게임만 표시
    if (mobile) {
      filteredMenuList = filteredMenuList.filter(
        (menu) => menu.platform === 'both',
      );
    }

    if (keyword) {
      filteredMenuList = filteredMenuList.filter(
        (menu) =>
          menu.name.kor.includes(keyword) ||
          menu.name.eng.toLowerCase().includes(keyword.toLowerCase()),
      );
    }

    if (category) {
      filteredMenuList = filteredMenuList.filter(
        (menu) => menu.category === category,
      );
    }

    return Response.json(
      {
        data: makeCategoryMenuList(filteredMenuList),
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    return Response.json(
      {
        data: [],
      },
      {
        status: 500,
      },
    );
  }
}
