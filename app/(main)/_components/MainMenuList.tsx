"use client";

import { TMenu } from "@/@types/menus";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMenus } from "@/service/menus";
import {
  Binary,
  BookText,
  Film,
  Gamepad2,
  Lock,
  UserRoundSearch,
  Webhook,
} from "lucide-react";
import Link from "next/link";

export const CATEGORY_ICON = {
  Fun: <Gamepad2 size={18} />,
  Content: <BookText size={18} />,
  Development: <Binary size={18} />,
  Media: <Film size={18} />,
  About: <UserRoundSearch size={18} />,
  "Web APIs": <Webhook size={18} />,
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
    <div className="w-full flex flex-col gap-6">
      {categories?.map((category) => (
        <div key={category} className="w-full flex flex-col gap-1.5">
          <h3 className="font-bold flex items-center gap-1.5">
            {CATEGORY_ICON[category as keyof typeof CATEGORY_ICON]}
            {category}
          </h3>
          <div className="w-full grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {menus?.[category]?.map((menu) => (
              <MainMenuItem key={menu.name.eng} menu={menu} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MainMenuList;

function MainMenuItem({ menu }: { menu: TMenu }) {
  if (menu.disabled)
    return (
      <div className="relative px-6 py-4 border border-gray-300 rounded-md transition-all duration-300 hover:blur-[2px] cursor-not-allowed">
        {/* <span className="text-sm text-gray-500 pb-2">{menu.category}</span> */}
        <h3 className="text-lg font-bold mb-2">{menu.name.kor}</h3>
        <p className="text-sm text-gray-500">{menu.name.eng}</p>
        <Lock
          size={18}
          className="absolute top-2 right-2 size-4 text-gray-800"
        />
      </div>
    );

  return (
    <Link href={menu.href} target={menu.target ?? "_self"}>
      <div className="px-6 py-4 border border-gray-300 rounded-md cursor-pointer hover:scale-105 transition-all duration-300">
        {/* <span className="text-sm text-gray-500 pb-2">{menu.category}</span> */}
        <h3 className="text-lg font-bold mb-2">{menu.name.kor}</h3>
        <p className="text-sm text-gray-500">{menu.name.eng}</p>
      </div>
    </Link>
  );
}

function MainMenuListSkeleton() {
  return (
    <div className="w-full flex flex-col gap-6">
      {new Array(6).fill(0).map((_, idx) => (
        <div key={`category-${idx}`} className="w-full flex flex-col gap-1.5">
          <Skeleton className="h-4 w-[160px]" />
          <div className="w-full grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {new Array(4).fill(0).map((_, index) => (
              <Skeleton
                key={`menu-${index}`}
                className="h-[90px] w-full rounded-md"
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
      <p className="text-center text-sm text-gray-400 font-bold">
        검색 결과가 없습니다.
      </p>
      <p className="text-center text-sm text-gray-400 font-bold">
        No menus found
      </p>
    </div>
  );
}
